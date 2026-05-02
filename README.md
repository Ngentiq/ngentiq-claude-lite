# ngentiq-claude-lite

A lightweight SDLC framework for [Claude Code](https://claude.ai/code). One hook injects rules on every prompt to maintain consistent AI behavior -- delegation discipline, concise returns, truthfulness, and command safety. Eleven skills cover the full development lifecycle from planning through PR creation.

Proprietary license (personal non-commercial use free). No build step.

## Why This Framework

CLAUDE.md instructions fade as your conversation grows -- Claude's context window pushes earlier instructions out of working memory. This framework solves that with a hook that re-injects critical rules on every single prompt, guaranteeing consistent behavior regardless of conversation length.

- **Rule persistence via hooks** -- Your delegation, safety, and quality rules survive context drift because they are injected fresh on every prompt, not just written once in CLAUDE.md.
- **Delegation discipline** -- Forces all substantive work to Task agents, keeping the main context clean for coordination. No more 200-line code blocks in the coordinator thread.
- **BAC/QAC traceability** -- Business and QA acceptance criteria are first-class from `/plan` through `/tasks`, `/implement`, and `/pr`. Nothing gets lost between planning and delivery.
- **Senior-level agent personas** -- All agent personas default to senior architect / principal engineer level, producing higher-quality output with less hedging.
- **Single hook, no build step** -- One plain JavaScript file, no dependencies beyond the Node.js that ships with Claude Code.

## Quick Install

**Prerequisites**: Node.js 18+ (Claude Code ships with a recent Node)

### Recommended -- via npm

```bash
npx @ngentiq/claude-lite init /path/to/your/project
```

Works on macOS, Linux, WSL, and Windows. No clone, no shell script.

### Local development (optional)

If you have a local checkout of this repository, the legacy shell installers
still work:

```bash
# Unix / macOS / WSL
bash install.sh /path/to/your/project

# Windows PowerShell
./install.ps1 -Target C:\path\to\your\project
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

1. **`UserPromptSubmit`** -- On every prompt, the hook emits a small directive block listing the absolute paths of `.claude/sdlc/rules/RULES.md` (and `.claude/PROJECT-RULES.md` if present) and instructs Claude to Read each file before responding. Claude Code captures the directive as a `system-reminder` and Claude opens the rule files directly via the Read tool.

2. **`SubagentStart`** -- When Claude spawns a Task agent, the hook emits a similar directive pointing at `.claude/sdlc/rules/AGENT-RULES.md` (and `.claude/sdlc/rules/AGENT-RULES-COORDINATOR.md` if you create one). It parses the agent's prompt for coordinator keywords (e.g., "orchestrate", "delegate") and appends a short inline coordination reminder when detected.

The hook output stays under 2 KB regardless of rule-file size. This is intentional: Claude Code truncates hook stdout above ~10 KB into a `<persisted-output>` envelope that hides everything past the first 2 KB. By emitting Read-file directives instead of inlining rule content, the framework guarantees full rule delivery no matter how large `PROJECT-RULES.md` grows. See [`research/HOOK-TRUNCATION-FIX.md`](research/HOOK-TRUNCATION-FIX.md) for the full rationale.

Because the hook re-issues the directive on every interaction, the rules remain active regardless of how long the conversation gets -- unlike CLAUDE.md instructions, which can drift out of working memory.

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

## Feedback

This is a closed-source product. Bug reports, feature requests, and other
feedback are welcome by email:

- scott@wilkos.net
- licensing@ngentiq.com (commercial inquiries)

## License

Personal Non-Commercial License v1.1 -- see [LICENSE](LICENSE).

Commercial use requires a separate license -- see
[LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md). Naming and trademark usage
is governed by [TRADEMARK.md](TRADEMARK.md).
