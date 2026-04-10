# Claude Code SDLC Framework

A lightweight, open-source SDLC framework for [Claude Code](https://claude.ai/code). One hook injects rules on every prompt to maintain consistent AI behavior -- delegation discipline, concise returns, truthfulness, and command safety. Nine skills cover the full development lifecycle from planning through PR creation.

MIT licensed. No branding. No dependencies. No build step.

## Why This Framework

CLAUDE.md instructions fade as your conversation grows -- Claude's context window pushes earlier instructions out of working memory. This framework solves that with a hook that re-injects critical rules on every single prompt, guaranteeing consistent behavior regardless of conversation length.

- **Rule persistence via hooks** -- Your delegation, safety, and quality rules survive context drift because they are injected fresh on every prompt, not just written once in CLAUDE.md.
- **Delegation discipline** -- Forces all substantive work to Task agents, keeping the main context clean for coordination. No more 200-line code blocks in the coordinator thread.
- **BAC/QAC traceability** -- Business and QA acceptance criteria are first-class from `/plan` through `/tasks`, `/implement`, and `/pr`. Nothing gets lost between planning and delivery.
- **Expert-level defaults** -- All agent personas default to senior architect / principal engineer level. No junior-engineer hedging or filler.
- **Zero config, zero dependencies** -- One plain JavaScript hook, no build step, no external tools beyond the Node.js that ships with Claude Code.

## Quick Install

**Prerequisites**: Claude Code (which provides Node.js)

### Unix / macOS / WSL

```bash
git clone https://github.com/ngentiq/ngentiq-claude-lite.git /tmp/ngentiq-claude-lite
bash /tmp/ngentiq-claude-lite/install.sh /path/to/your/project
```

### Windows PowerShell

```powershell
git clone https://github.com/ngentiq/ngentiq-claude-lite.git $env:TEMP/ngentiq-claude-lite
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
| Plan | `/plan <feature>` | Feature planning with business/QA acceptance criteria and impact analysis |
| Tasks | `/tasks <plan-ref>` | Decompose a plan into numbered task files with dependencies |
| Implement | `/implement <plan-or-desc>` | Execute implementation with agent delegation and verification |
| Review | `/review [scope]` | Code review with severity-based findings (critical/error/warning/info) |
| Test | `/test <target>` | Generate tests following project conventions, validate by running them |
| Explain | `/explain <target>` | Layered code explanation: purpose, design, relationships, patterns |
| Commit | `/commit [--all]` | Generate conventional commit messages with user approval before committing |
| PR | `/pr [--create]` | Generate PR description from branch commits, optionally create via gh |

## How It Works

The framework installs a single JavaScript hook that fires on every prompt (`UserPromptSubmit`) and every agent spawn (`SubagentStart`). The hook reads rule files and injects them as system context, ensuring Claude consistently:

- **Delegates** substantive work to Task agents (keeping the main context for coordination)
- **Returns concisely** (agent outputs stay under 200 tokens; detailed content goes to files)
- **Stays truthful** (no fabricated file contents, test results, or command output)
- **Uses safe commands** (one command per Bash call, no compound operators)

Rules are injected every prompt because Claude's context window causes earlier instructions to fade. The hook solves this by re-injecting critical rules on every interaction.

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

## License

MIT -- see [LICENSE](LICENSE) for details.
