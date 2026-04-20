#!/usr/bin/env node
/**
 * @ngentiq/claude-lite -- installer CLI
 *
 * Cross-platform Node port of install.sh. Installs the Claude Code SDLC
 * framework (hooks, rules, skills, and settings) into a target project.
 *
 * Usage:
 *   ngentiq-claude-lite init [target-dir]
 *   ngentiq-claude-lite init .
 *   ngentiq-claude-lite --help
 *
 * No runtime dependencies -- uses only Node.js built-ins.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const process = require('process');

// --- Resolve package root (one level up from bin/) ---

const PACKAGE_ROOT = path.resolve(__dirname, '..');

// --- CLI argument parsing ---

function printHelp() {
  const lines = [
    'ngentiq-claude-lite -- Claude Code SDLC framework installer',
    '',
    'Usage:',
    '  ngentiq-claude-lite init [target-dir]',
    '  ngentiq-claude-lite --help',
    '',
    'Commands:',
    '  init [target-dir]   Install framework into target directory (default: current dir)',
    '',
    'Options:',
    '  -h, --help          Show this help message',
    '',
    'What it does:',
    '  1. Copies .claude/sdlc/ (hooks + rules) to target',
    '  2. Copies .claude/skills/ to target',
    '  3. Merges hooks into target .claude/settings.json (non-destructive)',
    '  4. Creates .claude/PROJECT-RULES.md placeholder if missing',
    '',
    'Prerequisites: Node.js 18+',
  ];
  console.log(lines.join('\n'));
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    return { help: true };
  }
  const cmd = args[0];
  if (cmd !== 'init') {
    return { error: `Unknown command: ${cmd}` };
  }
  const target = args[1] || '.';
  return { command: 'init', target };
}

// --- Utility helpers ---

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  ensureDir(dest);
  // Node 16.7+ supports fs.cpSync with recursive
  fs.cpSync(src, dest, { recursive: true });
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

// --- Settings merge logic (mirrors install.sh jq merge) ---

function unionArray(a, b) {
  const set = new Set();
  const out = [];
  for (const item of [...(a || []), ...(b || [])]) {
    const key = typeof item === 'string' ? item : JSON.stringify(item);
    if (!set.has(key)) {
      set.add(key);
      out.push(item);
    }
  }
  return out;
}

function hookHasSdlcHook(hookGroups) {
  if (!Array.isArray(hookGroups)) return false;
  for (const group of hookGroups) {
    const hooks = group && group.hooks;
    if (!Array.isArray(hooks)) continue;
    for (const h of hooks) {
      if (h && typeof h.command === 'string' && h.command.includes('sdlc-hook.js')) {
        return true;
      }
    }
  }
  return false;
}

function mergeSettings(existing, template) {
  const merged = JSON.parse(JSON.stringify(existing));

  merged.permissions = merged.permissions || {};
  const tPerms = template.permissions || {};

  merged.permissions.allow = unionArray(
    merged.permissions.allow,
    tPerms.allow
  );
  merged.permissions.deny = unionArray(
    merged.permissions.deny,
    tPerms.deny
  );

  merged.hooks = merged.hooks || {};
  const tHooks = template.hooks || {};

  for (const event of ['UserPromptSubmit', 'SubagentStart']) {
    const existingGroups = merged.hooks[event] || [];
    const templateGroups = tHooks[event] || [];
    if (hookHasSdlcHook(existingGroups)) {
      merged.hooks[event] = existingGroups;
    } else {
      merged.hooks[event] = existingGroups.concat(templateGroups);
    }
  }

  return merged;
}

// --- PROJECT-RULES.md placeholder content ---

const PROJECT_RULES_PLACEHOLDER = `# Project Rules

<!-- Add project-specific rules here. These are injected after the framework
     rules on every prompt. Use this file for conventions, constraints, and
     preferences specific to your project.

     Examples:
     - Always use snake_case for database column names
     - All API responses must include a request_id field
     - Tests must not make external network calls
-->
`;

// --- Main install flow ---

function runInit(targetArg) {
  const target = path.resolve(targetArg);

  if (!exists(target)) {
    ensureDir(target);
  }

  const targetStat = fs.statSync(target);
  if (!targetStat.isDirectory()) {
    console.error(`[ERROR] Target is not a directory: ${target}`);
    process.exit(1);
  }

  console.log('===========================================');
  console.log('  Claude Code SDLC Framework Installer');
  console.log('===========================================');
  console.log('');
  console.log(`Target: ${target}`);
  console.log('');

  // Preflight: git check (warn only)
  if (!exists(path.join(target, '.git'))) {
    console.log('[WARN]  Target is not a git repository. The framework works best in a git repo.');
    console.log('');
  }

  // --- [1/4] Copy framework files ---

  console.log('[1/4] Copying framework files...');

  const hookSrc = path.join(PACKAGE_ROOT, '.claude', 'sdlc', 'hooks', 'sdlc-hook.js');
  const hookDest = path.join(target, '.claude', 'sdlc', 'hooks', 'sdlc-hook.js');
  copyFile(hookSrc, hookDest);
  console.log('      .claude/sdlc/hooks/sdlc-hook.js');

  for (const rule of ['RULES.md', 'AGENT-RULES.md']) {
    const src = path.join(PACKAGE_ROOT, '.claude', 'sdlc', 'rules', rule);
    const dest = path.join(target, '.claude', 'sdlc', 'rules', rule);
    copyFile(src, dest);
    console.log(`      .claude/sdlc/rules/${rule}`);
  }

  // --- [2/4] Copy skills ---

  console.log('[2/4] Copying skills...');

  const skillsSrc = path.join(PACKAGE_ROOT, '.claude', 'skills');
  if (exists(skillsSrc) && fs.statSync(skillsSrc).isDirectory()) {
    const skillsDest = path.join(target, '.claude', 'skills');
    ensureDir(skillsDest);
    const entries = fs.readdirSync(skillsSrc, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const src = path.join(skillsSrc, entry.name);
      const dest = path.join(skillsDest, entry.name);
      copyDir(src, dest);
      console.log(`      .claude/skills/${entry.name}/`);
    }
  } else {
    console.log('      (no skills directory found in framework -- skipping)');
  }

  // --- [3/4] Merge settings.json ---

  console.log('[3/4] Configuring settings.json...');

  const templatePath = path.join(PACKAGE_ROOT, '.claude', 'settings.json');
  const targetSettingsPath = path.join(target, '.claude', 'settings.json');

  if (!exists(targetSettingsPath)) {
    ensureDir(path.dirname(targetSettingsPath));
    fs.copyFileSync(templatePath, targetSettingsPath);
    console.log('      Created .claude/settings.json (from template)');
  } else {
    const existing = readJson(targetSettingsPath);
    const template = readJson(templatePath);
    const merged = mergeSettings(existing, template);
    writeJson(targetSettingsPath, merged);
    console.log('      Merged hooks into existing .claude/settings.json');
  }

  // --- [4/4] PROJECT-RULES.md placeholder ---

  console.log('[4/4] Setting up project customization...');

  const projectRulesPath = path.join(target, '.claude', 'PROJECT-RULES.md');
  if (!exists(projectRulesPath)) {
    ensureDir(path.dirname(projectRulesPath));
    fs.writeFileSync(projectRulesPath, PROJECT_RULES_PLACEHOLDER);
    console.log('      Created .claude/PROJECT-RULES.md (customize with your project rules)');
  } else {
    console.log('      .claude/PROJECT-RULES.md already exists (preserved)');
  }

  // --- Summary ---

  console.log('');
  console.log('===========================================');
  console.log('  Installation Complete');
  console.log('===========================================');
  console.log('');
  console.log('Installed:');
  console.log('  - Hook:  .claude/sdlc/hooks/sdlc-hook.js');
  console.log('  - Rules: .claude/sdlc/rules/RULES.md');
  console.log('  -        .claude/sdlc/rules/AGENT-RULES.md');
  console.log('  - Config: .claude/settings.json');
  console.log('');
  console.log('Customization:');
  console.log('  - .claude/PROJECT-RULES.md  (add project-specific rules)');
  console.log('  - .claude/sdlc/rules/       (edit framework rules directly)');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Restart Claude Code to pick up the new hooks');
  console.log('  2. Run /setup to detect your project and generate CLAUDE.md');
  console.log('');
}

// --- Entry point ---

function main() {
  const parsed = parseArgs(process.argv);
  if (parsed.help) {
    printHelp();
    process.exit(0);
  }
  if (parsed.error) {
    console.error(`[ERROR] ${parsed.error}`);
    console.error('Run `ngentiq-claude-lite --help` for usage.');
    process.exit(1);
  }

  try {
    if (parsed.command === 'init') {
      runInit(parsed.target);
    }
  } catch (err) {
    console.error(`[ERROR] ${err && err.message ? err.message : err}`);
    if (process.env.DEBUG) {
      console.error(err && err.stack);
    }
    process.exit(1);
  }
}

main();
