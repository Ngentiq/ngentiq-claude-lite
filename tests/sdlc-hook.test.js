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

  // Optionally create AGENT-RULES-COORDINATOR.md
  if (opts.coordinatorRules) {
    const coordPath = path.join(rulesDir, 'AGENT-RULES-COORDINATOR.md');
    fs.writeFileSync(coordPath, opts.coordinatorRules, 'utf8');
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

  it('emits directive banner pointing at RULES.md', () => {
    const result = runHook(['prompt'], { env: { CLAUDE_PROJECT_DIR: tmpDir } });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.match(
      result.stdout,
      /\*\*\*CRITICAL\*\*\* GOVERNANCE RULES/,
      'stdout should contain the directive banner'
    );
    assert.ok(
      result.stdout.includes('Read this file now:'),
      'stdout should include the Read-this-file directive'
    );
    assert.ok(
      result.stdout.includes(path.join(tmpDir, '.claude', 'sdlc', 'rules', 'RULES.md')),
      'stdout should include the absolute path to RULES.md'
    );
    // Content must NOT be inlined.
    assert.ok(
      !result.stdout.includes('R1. Delegation'),
      'stdout should NOT inline RULES.md content (content must live in the file)'
    );
  });

  it('emits directive for PROJECT-RULES.md when present', () => {
    const projectRulesContent = '## Project-Specific Rule\n\nThis project uses strict linting.';
    scaffoldProject(tmpDir, { projectRules: projectRulesContent });

    const result = runHook(['prompt'], { env: { CLAUDE_PROJECT_DIR: tmpDir } });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stdout.includes(path.join(tmpDir, '.claude', 'sdlc', 'rules', 'RULES.md')),
      'stdout should include the absolute path to RULES.md'
    );
    assert.ok(
      result.stdout.includes(path.join(tmpDir, '.claude', 'PROJECT-RULES.md')),
      'stdout should include the absolute path to PROJECT-RULES.md'
    );
    assert.ok(
      result.stdout.includes('project governance rules'),
      'stdout should label PROJECT-RULES.md tier'
    );
    // Content must NOT be inlined.
    assert.ok(
      !result.stdout.includes('Project-Specific Rule'),
      'stdout should NOT inline PROJECT-RULES.md content'
    );
  });

  it('omits PROJECT-RULES.md directive when file is absent', () => {
    // Default scaffold has no PROJECT-RULES.md
    const result = runHook(['prompt'], { env: { CLAUDE_PROJECT_DIR: tmpDir } });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stdout.includes(path.join(tmpDir, '.claude', 'sdlc', 'rules', 'RULES.md')),
      'stdout should include RULES.md directive'
    );
    assert.ok(
      !result.stdout.includes('PROJECT-RULES.md'),
      'stdout should not reference PROJECT-RULES.md when file is absent'
    );
  });

  it('output stays under 2 KB regardless of rule file size', () => {
    // Write a 20 KB PROJECT-RULES.md to prove size independence.
    const bigProjectRules = '# Project Rules\n\n' + 'Line of project policy content.\n'.repeat(800);
    scaffoldProject(tmpDir, { projectRules: bigProjectRules });

    const result = runHook(['prompt'], { env: { CLAUDE_PROJECT_DIR: tmpDir } });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stdout.length < 2048,
      `stdout should be under 2 KB even with a 20 KB PROJECT-RULES.md (was ${result.stdout.length} bytes)`
    );
    // And still contain the directive.
    assert.match(
      result.stdout,
      /\*\*\*CRITICAL\*\*\* GOVERNANCE RULES/,
      'directive banner should still be present'
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

  it('emits directive pointing at AGENT-RULES.md', () => {
    const result = runHook(['agent'], {
      env: { CLAUDE_PROJECT_DIR: tmpDir },
      input: '{"prompt":"write tests for the module"}',
    });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.match(
      result.stdout,
      /\*\*\*CRITICAL\*\*\* SUBAGENT GOVERNANCE/,
      'stdout should contain the subagent directive banner'
    );
    assert.ok(
      result.stdout.includes(path.join(tmpDir, '.claude', 'sdlc', 'rules', 'AGENT-RULES.md')),
      'stdout should include absolute path to AGENT-RULES.md'
    );
    // Content must NOT be inlined.
    assert.ok(
      !result.stdout.includes('S1. Identity'),
      'stdout should NOT inline AGENT-RULES.md content'
    );
  });

  it('includes coordinator reminder on coordinator prompts', () => {
    const result = runHook(['agent'], {
      env: { CLAUDE_PROJECT_DIR: tmpDir },
      input: '{"prompt":"orchestrate the team to implement the feature"}',
    });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stdout.includes(path.join(tmpDir, '.claude', 'sdlc', 'rules', 'AGENT-RULES.md')),
      'stdout should include AGENT-RULES.md directive'
    );
    assert.ok(
      result.stdout.includes('Coordination reminder:'),
      'stdout should include the inline coordinator reminder'
    );
    assert.ok(
      result.stdout.includes('COMPLETE/FAILED'),
      'stdout should include the return-format hint'
    );
  });

  it('adds AGENT-RULES-COORDINATOR.md directive when file exists and prompt is coordinator', () => {
    scaffoldProject(tmpDir, { coordinatorRules: '# Coordinator Rules\n' });

    const result = runHook(['agent'], {
      env: { CLAUDE_PROJECT_DIR: tmpDir },
      input: '{"prompt":"orchestrate the team"}',
    });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stdout.includes(
        path.join(tmpDir, '.claude', 'sdlc', 'rules', 'AGENT-RULES-COORDINATOR.md')
      ),
      'stdout should include absolute path to AGENT-RULES-COORDINATOR.md'
    );
    assert.ok(
      result.stdout.includes('coordinator-only rules'),
      'stdout should label the coordinator-only rules tier'
    );
  });

  it('omits coordinator reminder for leaf agents', () => {
    const result = runHook(['agent'], {
      env: { CLAUDE_PROJECT_DIR: tmpDir },
      input: '{"prompt":"write the tests for the login module"}',
    });

    assert.equal(result.status, 0, 'exit code should be 0');
    assert.ok(
      result.stdout.includes(path.join(tmpDir, '.claude', 'sdlc', 'rules', 'AGENT-RULES.md')),
      'stdout should include AGENT-RULES.md directive'
    );
    assert.ok(
      !result.stdout.includes('Coordination reminder:'),
      'stdout should NOT contain coordinator reminder for leaf agents'
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
      result.stdout.includes(path.join(tmpDir, '.claude', 'sdlc', 'rules', 'AGENT-RULES.md')),
      'stdout should still include AGENT-RULES.md directive'
    );
    assert.ok(
      !result.stdout.includes('Coordination reminder:'),
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
      result.stdout.includes('Read this file now:'),
      'should find .claude/ by walking up from nested subdirectory'
    );
    assert.ok(
      result.stdout.includes('RULES.md'),
      'directive should point at RULES.md'
    );
  });
});
