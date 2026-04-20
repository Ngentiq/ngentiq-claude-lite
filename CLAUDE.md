# ngentiq-claude-lite

## What This Is

ngentiq-claude-lite is a lightweight SDLC framework for Claude Code. It solves a fundamental problem: CLAUDE.md instructions fade as conversations grow, causing Claude to lose track of rules, conventions, and delegation patterns. This framework uses Claude Code hooks to re-inject critical rules on every prompt, guaranteeing consistent behavior regardless of conversation length.

Closed-source, published as @ngentiq/claude-lite on npm. Source repo is private.

## Architecture

The framework has four layers:

### 1. Hook Layer (`.claude/sdlc/hooks/sdlc-hook.js`)

A single plain JavaScript file registered in `.claude/settings.json` for two Claude Code hook events:

- **`UserPromptSubmit`**: Reads `RULES.md` and optionally `PROJECT-RULES.md`, outputs them to stdout. Claude Code captures this as a `system-reminder` visible in every prompt.
- **`SubagentStart`**: Reads `AGENT-RULES.md`, outputs to stdout. Detects coordinator keywords in the agent prompt to inject coordination-specific instructions.

The hook finds the project root via `CLAUDE_PROJECT_DIR` (set by Claude Code) or by walking up directories to find `.claude/`. It handles missing files gracefully and never crashes.

### 2. Rules Layer (`.claude/sdlc/rules/`)

- **`RULES.md`**: Three rules injected on every prompt -- Delegation (substantive work to agents), Context Discipline (agent returns under 200 tokens), Truthfulness (no fabrication). A Bash Discipline preamble enforces one command per Bash tool call.
- **`AGENT-RULES.md`**: Six rules for spawned agents -- Identity/Scope, Return Format (COMPLETE/FAILED), File Operations, Communication, Tool Preferences, Boundaries.
- **`PROJECT-RULES.md`** (user-created): Optional extension point where teams add their own rules, injected alongside framework rules.

### 3. Skills Layer (`.claude/skills/`)

Nine skills covering the SDLC lifecycle, each with a `SKILL.md` and a template file:

| Skill | Purpose | Template |
|-------|---------|----------|
| `/setup` | Project onboarding: detect tech stack, generate CLAUDE.md, verify hooks | claude-md-template.md |
| `/plan` | Feature planning with BAC/QAC acceptance criteria | plan-template.md |
| `/tasks` | Decompose plans into numbered task files with traceability | task-template.md |
| `/implement` | Execute via Agent Teams with sequential fallback | completion-report-template.md |
| `/review` | Code review with severity-based findings | review-template.md |
| `/test` | Generate tests following project conventions | test-plan-template.md |
| `/explain` | Layered code explanation (read-only) | explanation-template.md |
| `/commit` | Conventional commit messages with user approval | commit-template.md |
| `/pr` | PR description generation from branch commits | pr-template.md |

Key design principles:
- Every skill has a template for consistent output formatting
- `/plan` and `/tasks` enforce a HARD STOP -- they produce output and wait for approval before proceeding
- `/implement` requires Agent Teams first, falls back to sequential Task agents only if Teams is unavailable, and never implements in the main context
- BAC (Business Acceptance Criteria) and QAC (QA Acceptance Criteria) are first-class throughout the plan-to-PR pipeline
- All skills check `.claude/agents/` for project-defined sub-agents before delegating work

### 4. Documentation Layer

- `README.md` -- Installation, skills reference, customization
- `docs/walkthrough.md` -- End-to-end plan-to-PR lifecycle example
- `docs/skills.md` -- Detailed reference for each skill
- `docs/customization.md` -- How to extend the framework
- `examples/CLAUDE.md.example` -- Example generated CLAUDE.md for a Node.js project

## Project Structure

```
ngentiq-claude-lite/
├── .claude/
│   ├── sdlc/
│   │   ├── hooks/sdlc-hook.js          # The hook (plain JS, no build)
│   │   └── rules/
│   │       ├── RULES.md                 # Injected every prompt
│   │       └── AGENT-RULES.md           # Injected on agent spawn
│   ├── skills/                          # 9 skills, each with SKILL.md + template
│   │   ├── setup/
│   │   ├── plan/
│   │   ├── tasks/
│   │   ├── implement/
│   │   ├── review/
│   │   ├── test/
│   │   ├── explain/
│   │   ├── commit/
│   │   └── pr/
│   └── settings.json                    # Hook wiring + permissions
├── docs/                                # User documentation
├── examples/                            # Example files
├── tests/                               # Hook unit tests (Node built-in test runner)
├── install.sh                           # Unix/macOS/WSL installer
├── install.ps1                          # Windows PowerShell installer
├── version.json                         # Semantic version tracking
├── package.json                         # Test runner script
├── LICENSE                              # MIT
└── README.md
```

## Development

### Running Tests

```
node --test tests/sdlc-hook.test.js
```

11 tests covering prompt mode, agent mode, coordinator detection, error handling, and project root resolution. Uses Node's built-in `node:test` runner -- no dependencies.

### Installing to a Target Project

```
bash install.sh /path/to/target
```

The installer copies `.claude/sdlc/` and `.claude/skills/` to the target, merges hook entries into the target's `settings.json` (preserving existing settings), and creates a `PROJECT-RULES.md` placeholder.

### Versioning

Version is tracked in `version.json`. Follow semver: patch for fixes, minor for new skills or features, major for breaking changes to hook API or rule format.

## Relationship to ngentiq-claude

This project is a lightweight extraction of patterns from [ngentiq-claude](https://github.com/Ngentiq/ngentiq-claude), the full governance and productivity system. Key differences:

| Aspect | ngentiq-claude | ngentiq-claude-lite |
|--------|---------------|---------------------|
| Hooks | 13 entries across 9 events | 2 entries across 2 events |
| Skills | 39+ with `/nq-` prefix | 9 with standard names |
| Config | YAML with 250+ lines | None (zero-config) |
| Build | TypeScript requiring compilation | Plain JavaScript |
| Task tracking | Automatic per-prompt lifecycle | None |
| Rules | 7 laws + orchestration | 3 rules + bash preamble |
| License | Proprietary | Proprietary (Personal Non-Commercial) |
