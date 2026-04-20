# ngentiq-claude-lite

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A lightweight, open-source SDLC framework for [Claude Code](https://claude.ai/code). One hook injects rules on every prompt to maintain consistent AI behavior -- delegation discipline, concise returns, truthfulness, and command safety. Eleven skills cover the full development lifecycle from planning through PR creation.

MIT licensed. No dependencies. No build step.

## Why This Framework

CLAUDE.md instructions fade as your conversation grows -- Claude's context window pushes earlier instructions out of working memory. This framework solves that with a hook that re-injects critical rules on every single prompt, guaranteeing consistent behavior regardless of conversation length.

- **Rule persistence via hooks** -- Your delegation, safety, and quality rules survive context drift because they are injected fresh on every prompt, not just written once in CLAUDE.md.
- **Delegation discipline** -- Forces all substantive work to Task agents, keeping the main context clean for coordination. No more 200-line code blocks in the coordinator thread.
- **BAC/QAC traceability** -- Business and QA acceptance criteria are first-class from `/plan` through `/tasks`, `/implement`, and `/pr`. Nothing gets lost between planning and delivery.
- **Senior-level agent personas** -- All agent personas default to senior architect / principal engineer level, producing higher-quality output with less hedging.
- **Single hook, no build step** -- One plain JavaScript file, no dependencies beyond the Node.js that ships with Claude Code.

## Quick Install

**Prerequisites**: Claude Code (which provides Node.js)

### Unix / macOS / WSL

```bash
git clone https://github.com/Ngentiq/ngentiq-claude-lite.git /tmp/ngentiq-claude-lite
bash /tmp/ngentiq-claude-lite/install.sh /path/to/your/project
```

### Windows PowerShell

```powershell
git clone https://github.com/Ngentiq/ngentiq-claude-lite.git $env:TEMP/ngentiq-claude-lite
& $env:TEMP/ngentiq-claude-lite/install.ps1 -Target C:\path\to\your\project
```

Then restart Claude Code and run:

```
/setup
```

This detects your tech stack, generates a project-specific `CLAUDE.md`, and verifies hook wiring.

## Available Skills

| Skill | Command | Description |
|-------|---------|-------------|
| Setup | `/setup` | Detect technologies, wire hooks, generate CLAUDE.md |
| Standards | `/standards [category]` | Generate or update project coding and architecture standards |
| Standards Check | `/standards-check [path]` | Verify code compliance against project standards |
| Plan | `/plan <feature>` | Feature planning with business/QA acceptance criteria and impact analysis |
| Tasks | `/tasks <plan-ref>` | Decompose a plan into numbered task files with dependencies |
| Implement | `/implement <plan-or-desc>` | Execute implementation with agent delegation and verification |
| Review | `/review [scope]` | Code review with severity-based findings (critical/error/warning/info) |
| Test | `/test <target>` | Generate tests following project conventions, validate by running them |
| Explain | `/explain <target>` | Layered code explanation: purpose, design, relationships, patterns |
| Commit | `/commit [--all]` | Generate conventional commit messages with user approval before committing |
| PR | `/pr [--create]` | Generate PR description from branch commits, optionally create via gh |

## How It Works

The framework installs a single JavaScript file (`.claude/sdlc/hooks/sdlc-hook.js`) registered in `.claude/settings.json` as a Claude Code hook. It fires on two events:

1. **`UserPromptSubmit`** -- On every prompt, the hook reads `.claude/sdlc/rules/RULES.md` (and `.claude/PROJECT-RULES.md` if present) and writes them to stdout. Claude Code captures this stdout as a `system-reminder`, making the rules visible in the model's context window.

2. **`SubagentStart`** -- When Claude spawns a Task agent, the hook reads `.claude/sdlc/rules/AGENT-RULES.md` and writes it to stdout. It also parses the agent's prompt for coordinator keywords (e.g., "orchestrate", "delegate") and appends coordinator-specific instructions when detected.

Because the hook re-injects rules on every interaction, they remain active regardless of how long the conversation gets -- unlike CLAUDE.md instructions, which can drift out of working memory.

## Customization

- **Edit `CLAUDE.md`** -- Add project context, conventions, build commands, and workflow notes
- **Add `PROJECT-RULES.md`** -- Create `.claude/PROJECT-RULES.md` for custom rules injected alongside framework rules
- **Create agents** -- Define sub-agents in `.claude/agents/` for specialized roles. Use the built-in `/agents` command to manage them. See [sub-agents docs](https://code.claude.com/docs/en/sub-agents)
- **Add your own skills** -- Create `.claude/skills/<name>/SKILL.md` following the [skill format](docs/skills.md)
- **Modify framework rules** -- Edit `.claude/sdlc/rules/RULES.md` or `AGENT-RULES.md` directly (see [customization guide](docs/customization.md))

## Documentation

- [Getting Started Walkthrough](docs/walkthrough.md) -- End-to-end plan-to-PR lifecycle example
- [Skill Reference](docs/skills.md) -- Detailed documentation for each skill
- [Customization Guide](docs/customization.md) -- How to extend and adapt the framework
- [Example CLAUDE.md](examples/CLAUDE.md.example) -- Template for a Node.js/TypeScript project

## Contributing

Issues and pull requests are welcome. If you find a bug or have an idea for improvement, please [open an issue](https://github.com/Ngentiq/ngentiq-claude-lite/issues).

## License

MIT -- see [LICENSE](LICENSE) for details.
