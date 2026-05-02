#!/usr/bin/env node
// sdlc-hook.js -- Single hook for Claude Code SDLC framework
//
// Usage:
//   node sdlc-hook.js prompt   (UserPromptSubmit: directs Claude to Read RULES.md + PROJECT-RULES.md)
//   node sdlc-hook.js agent    (SubagentStart: directs Claude to Read AGENT-RULES.md, etc.)
//
// Emits a small, size-independent directive block pointing at absolute rule-file
// paths rather than inlining rule content. Claude Code truncates hook output past
// ~10 KB via a <persisted-output> envelope; the directive pattern stays under that
// ceiling regardless of how large the rule files grow. See
// research/HOOK-TRUNCATION-FIX.md for rationale.
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
 * prompt mode: emit a directive block pointing at RULES.md and (if present)
 * PROJECT-RULES.md. The model is instructed to Read each file before responding.
 */
function handlePrompt(projectRoot) {
  const sources = [];

  const rulesPath = path.join(projectRoot, '.claude', 'sdlc', 'rules', 'RULES.md');
  if (fs.existsSync(rulesPath)) {
    sources.push({ label: 'framework governance rules (non-negotiable)', path: rulesPath });
  }

  const projectRulesPath = path.join(projectRoot, '.claude', 'PROJECT-RULES.md');
  if (fs.existsSync(projectRulesPath)) {
    sources.push({ label: 'project governance rules', path: projectRulesPath });
  }

  if (sources.length === 0) return;

  const lines = [];
  lines.push('════════════════════════════════════════════════════════════════════════');
  lines.push('  ***CRITICAL*** GOVERNANCE RULES — READ EACH FILE BEFORE RESPONDING');
  lines.push('════════════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('The files listed below hold the governance rules this session operates');
  lines.push('under. You MUST use the Read tool on EVERY file below BEFORE answering');
  lines.push('the user. Skipping this step means operating without the rules and will');
  lines.push('cause violations. Hook output is intentionally tiny; rules live in files.');
  lines.push('');
  for (const s of sources) {
    lines.push('  ***CRITICAL*** Read this file now: ' + s.path);
    lines.push('                (' + s.label + ')');
    lines.push('');
  }
  lines.push('════════════════════════════════════════════════════════════════════════');

  process.stdout.write(lines.join('\n') + '\n');
}

/**
 * agent mode: emit a directive block pointing at AGENT-RULES.md (and optionally
 * AGENT-RULES-COORDINATOR.md if present and coordinator keywords are detected).
 * A small inline coordinator reminder is still appended for coordinator spawns --
 * it is well under the truncation threshold and useful as an immediate prompt.
 */
function handleAgent(projectRoot) {
  const sources = [];

  const agentRulesPath = path.join(projectRoot, '.claude', 'sdlc', 'rules', 'AGENT-RULES.md');
  if (fs.existsSync(agentRulesPath)) {
    sources.push({ label: 'base subagent rules', path: agentRulesPath });
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

  // Optional coordinator-only rules file if the team has authored one.
  if (isCoordinator) {
    const coordRulesPath = path.join(
      projectRoot,
      '.claude',
      'sdlc',
      'rules',
      'AGENT-RULES-COORDINATOR.md'
    );
    if (fs.existsSync(coordRulesPath)) {
      sources.push({ label: 'coordinator-only rules', path: coordRulesPath });
    }
  }

  if (sources.length === 0) return;

  const lines = [];
  lines.push('════════════════════════════════════════════════════════════════════════');
  lines.push('  ***CRITICAL*** SUBAGENT GOVERNANCE — READ EACH FILE BEFORE RESPONDING');
  lines.push('════════════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('You are a subagent. The files below define the rules you operate under.');
  lines.push('You MUST use the Read tool on EVERY file listed BEFORE starting your');
  lines.push('task. Hook output is intentionally tiny; the rules live in the files.');
  lines.push('');
  for (const s of sources) {
    lines.push('  ***CRITICAL*** Read this file now: ' + s.path);
    lines.push('                (' + s.label + ')');
    lines.push('');
  }

  // Small inline coordinator reminder is still safe here (no truncation risk).
  if (isCoordinator) {
    lines.push('Coordination reminder: decompose into independent parallel units, spawn');
    lines.push('them together, synthesize after all return. Keep your own return 50-200');
    lines.push('tokens, format COMPLETE/FAILED.');
    lines.push('');
  }

  lines.push('════════════════════════════════════════════════════════════════════════');

  process.stdout.write(lines.join('\n') + '\n');
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
