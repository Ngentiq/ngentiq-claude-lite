#!/usr/bin/env node
// sdlc-hook.js -- Single hook for Claude Code SDLC framework
//
// Usage:
//   node sdlc-hook.js prompt   (UserPromptSubmit: injects RULES.md + PROJECT-RULES.md)
//   node sdlc-hook.js agent    (SubagentStart: injects AGENT-RULES.md)
//
// Plain JavaScript. No build step. No dependencies beyond Node.js.
// MIT License

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Walk up from startDir to find the nearest directory containing a .claude/ folder.
 * Returns the project root (parent of .claude/) or null if not found.
 */
function findProjectRoot(startDir) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (dir !== root) {
    const candidate = path.join(dir, '.claude');
    try {
      const stat = fs.statSync(candidate);
      if (stat.isDirectory()) {
        return dir;
      }
    } catch (_) {
      // .claude not found here, keep walking up
    }
    dir = path.dirname(dir);
  }

  return null;
}

/**
 * Read a file and return its contents, or empty string if missing/unreadable.
 */
function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return '';
  }
}

/**
 * prompt mode: inject RULES.md and optionally PROJECT-RULES.md
 */
function handlePrompt(projectRoot) {
  const output = [];

  const rulesPath = path.join(projectRoot, '.claude', 'sdlc', 'rules', 'RULES.md');
  const rulesContent = safeReadFile(rulesPath);
  if (rulesContent) {
    output.push(rulesContent);
  }

  const projectRulesPath = path.join(projectRoot, '.claude', 'PROJECT-RULES.md');
  const projectRulesContent = safeReadFile(projectRulesPath);
  if (projectRulesContent) {
    output.push('');
    output.push(projectRulesContent);
  }

  if (output.length > 0) {
    process.stdout.write(output.join('\n') + '\n');
  }
}

/**
 * agent mode: inject AGENT-RULES.md
 *
 * Reads stdin JSON to detect coordinator keywords in the prompt.
 * If coordinator keywords are found, appends coordinator rules.
 */
function handleAgent(projectRoot) {
  const output = [];

  const agentRulesPath = path.join(projectRoot, '.claude', 'sdlc', 'rules', 'AGENT-RULES.md');
  const agentRulesContent = safeReadFile(agentRulesPath);
  if (agentRulesContent) {
    output.push(agentRulesContent);
  }

  // Detect coordinator keywords from stdin (SubagentStart provides JSON with prompt field)
  let isCoordinator = false;
  try {
    const stdinData = fs.readFileSync(0, 'utf8');
    if (stdinData) {
      const parsed = JSON.parse(stdinData);
      const prompt = (parsed.prompt || '').toLowerCase();
      const coordinatorPattern = /\b(coordinator|orchestrator|orchestrate|delegat(?:e|ing)|team[\s-]lead)\b/;
      isCoordinator = coordinatorPattern.test(prompt);
    }
  } catch (_) {
    // No stdin or parse error -- default to leaf agent rules
  }

  if (isCoordinator) {
    output.push('');
    output.push('## Coordination');
    output.push('');
    output.push('You are a coordinator. Delegate all file operations to task agents.');
    output.push('- Decompose work into independent, parallelizable units.');
    output.push('- Spawn independent tasks simultaneously.');
    output.push('- After all agents complete, synthesize results.');
    output.push('- Your return follows the same format (50-200 tokens, COMPLETE/FAILED).');
  }

  if (output.length > 0) {
    process.stdout.write(output.join('\n') + '\n');
  }
}

// --- Main ---

try {
  const mode = process.argv[2];

  if (!mode || (mode !== 'prompt' && mode !== 'agent')) {
    process.stderr.write('Usage: node sdlc-hook.js <prompt|agent>\n');
    process.exit(0);
  }

  // Use CLAUDE_PROJECT_DIR if available, otherwise walk up from cwd
  const projectRoot = process.env.CLAUDE_PROJECT_DIR || findProjectRoot(process.cwd());

  if (!projectRoot) {
    // No project root found -- exit silently (don't break the hook chain)
    process.exit(0);
  }

  if (mode === 'prompt') {
    handlePrompt(projectRoot);
  } else if (mode === 'agent') {
    handleAgent(projectRoot);
  }
} catch (err) {
  // Hooks must never crash Claude Code -- log to stderr and exit cleanly
  process.stderr.write('[sdlc-hook] Error: ' + (err.message || String(err)) + '\n');
  process.exit(0);
}
