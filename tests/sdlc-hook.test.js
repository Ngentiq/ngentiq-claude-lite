'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOK_PATH = path.resolve(__dirname, '..', '.claude', 'sdlc', 'hooks', 'sdlc-hook.js');

// Helpers

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-hook-test-'));
}

function removeTempDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Scaffold a minimal .claude/sdlc/rules/ structure inside a temp dir
 * and copy the real rule files into it.
 */
function scaffoldProject(tmpDir, opts = {}) {
  const rulesDir = path.join(tmpDir, '.claude', 'sdlc', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  // Copy real RULES.md
  const realRules = path.resolve(__dirname, '..', '.claude', 'sdlc', 'rules', 'RULES.md');
  fs.copyFileSync(realRules, path.join(rulesDir, 'RULES.md'));

  // Copy real AGENT-RULES.md
  const realAgentRules = path.resolve(__dirname, '..', '.claude', 'sdlc', 'rules', 'AGENT-RULES.md');
  fs.copyFileSync(realAgentRules, path.join(rulesDir, 'AGENT-RULES.md'));

  // Optionally create PROJECT-RULES.md
  if (opts.projectRules) {
    const projectRulesPath = path.join(tmpDir, '.claude', 'PROJECT-RULES.md');
    fs.writeFileSync(projectRulesPath, opts.projectRules, 'utf8');
  }

  return tmpDir;
}

function runHook(args, opts = {}) {
  const spawnArgs = [HOOK_PATH, ...args];
  const spawnOpts = {
    encoding: 'utf8',
    timeout: 5000,
    env: { ...process.env, ...opts.env },
  };

  if (opts.input !== undefined) {
    spawnOpts.input = opts.input;
  }

  if (opts.cwd) {
    spawnOpts.cwd = opts.cwd;
  }

  return spawnSync('node', spawnArgs, spawnOpts);
}

// ---------- prompt mode ----------

describe('prompt mode', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempDir();
    scaffoldProject(tmpDir);
  });

  afterEach(() => {
    removeTempDir(tmpDir);
  });

  it('outputs RULES.md content', () => {
    const result = runHook(['prompt'], { env: { CLAUDE_PROJECT_DIR: tmpDir } });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stdout.includes('R1. Delegation'),
      'stdout should contain "R1. Delegation" from RULES.md'
    );
  });

  it('includes PROJECT-RULES.md when present', () => {
    const projectRulesContent = '## Project-Specific Rule\n\nThis project uses strict linting.';
    scaffoldProject(tmpDir, { projectRules: projectRulesContent });

    const result = runHook(['prompt'], { env: { CLAUDE_PROJECT_DIR: tmpDir } });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stdout.includes('R1. Delegation'),
      'stdout should contain RULES.md content'
    );
    assert.ok(
      result.stdout.includes('Project-Specific Rule'),
      'stdout should contain PROJECT-RULES.md content'
    );
  });

  it('works without PROJECT-RULES.md', () => {
    // Default scaffold has no PROJECT-RULES.md
    const result = runHook(['prompt'], { env: { CLAUDE_PROJECT_DIR: tmpDir } });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stdout.includes('R1. Delegation'),
      'stdout should contain RULES.md content'
    );
    assert.ok(
      !result.stdout.includes('PROJECT-RULES'),
      'stdout should not mention PROJECT-RULES when file is absent'
    );
  });

  it('exits cleanly with no .claude directory', () => {
    const emptyDir = createTempDir();
    try {
      const result = runHook(['prompt'], { env: { CLAUDE_PROJECT_DIR: emptyDir } });

      assert.equal(result.status, 0, 'exit code should be 0');
      // stdout may be empty but should not crash
      assert.equal(result.stderr, '', 'stderr should be empty');
    } finally {
      removeTempDir(emptyDir);
    }
  });
});

// ---------- agent mode ----------

describe('agent mode', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempDir();
    scaffoldProject(tmpDir);
  });

  afterEach(() => {
    removeTempDir(tmpDir);
  });

  it('outputs AGENT-RULES.md content', () => {
    const result = runHook(['agent'], {
      env: { CLAUDE_PROJECT_DIR: tmpDir },
      input: '{"prompt":"write tests for the module"}',
    });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stdout.includes('S1. Identity'),
      'stdout should contain "S1. Identity" from AGENT-RULES.md'
    );
  });

  it('detects coordinator keywords', () => {
    const result = runHook(['agent'], {
      env: { CLAUDE_PROJECT_DIR: tmpDir },
      input: '{"prompt":"orchestrate the team to implement the feature"}',
    });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stdout.includes('## Coordination'),
      'stdout should contain Coordination section for coordinator keywords'
    );
    assert.ok(
      result.stdout.includes('Delegate all file operations'),
      'stdout should contain coordinator instructions'
    );
  });

  it('does not include Coordination section for leaf agents', () => {
    const result = runHook(['agent'], {
      env: { CLAUDE_PROJECT_DIR: tmpDir },
      input: '{"prompt":"write the tests for the login module"}',
    });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stdout.includes('S1. Identity'),
      'stdout should contain agent rules'
    );
    assert.ok(
      !result.stdout.includes('## Coordination'),
      'stdout should NOT contain Coordination section for leaf agents'
    );
  });

  it('handles missing stdin gracefully', () => {
    // Pass empty string as input to simulate no meaningful stdin
    const result = runHook(['agent'], {
      env: { CLAUDE_PROJECT_DIR: tmpDir },
      input: '',
    });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stdout.includes('S1. Identity'),
      'stdout should still contain agent rules'
    );
    assert.ok(
      !result.stdout.includes('## Coordination'),
      'should default to leaf agent when stdin is empty'
    );
  });
});

// ---------- error handling ----------

describe('error handling', () => {
  it('invalid mode exits cleanly', () => {
    const result = runHook(['invalid']);

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stderr.includes('Usage:'),
      'stderr should contain usage message'
    );
  });

  it('no arguments exits cleanly', () => {
    const result = runHook([]);

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stderr.includes('Usage:'),
      'stderr should contain usage message'
    );
  });
});

// ---------- findProjectRoot ----------

describe('findProjectRoot', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) {
      removeTempDir(tmpDir);
    }
  });

  it('finds project root from subdirectory', () => {
    tmpDir = createTempDir();
    scaffoldProject(tmpDir);

    // Create a deeply nested subdirectory
    const nestedDir = path.join(tmpDir, 'src', 'components', 'deep');
    fs.mkdirSync(nestedDir, { recursive: true });

    // Run hook from the nested subdirectory WITHOUT CLAUDE_PROJECT_DIR
    // so it falls through to findProjectRoot(cwd)
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;

    const result = runHook(['prompt'], {
      env,
      cwd: nestedDir,
    });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stdout.includes('R1. Delegation'),
      'should find .claude/ by walking up from nested subdirectory'
    );
  });
});
