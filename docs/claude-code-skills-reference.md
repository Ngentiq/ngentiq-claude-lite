# Claude Code Skill Anatomy — Authoritative Reference

Source: [Claude Code Skills docs](https://code.claude.com/docs/en/skills) (fetched 2026-04-20).

This is the authoritative reference for skill authors working with ngentiq-claude-lite. It captures the full feature surface of Claude Code skills — what a skill *can* be, what its frontmatter supports, and how the runtime behaves — so the knowledge doesn't have to be re-researched each time we add or review a skill.

The quickstart frontmatter table in [`customization.md`](customization.md) is a subset; this file is the full picture.

Keep this doc in sync with upstream. When Anthropic updates the skills page, refresh this file.

---

## 1. A Skill Is a Directory

A skill is **a directory**, not a file. The directory's `SKILL.md` is the required entry point. Supporting files in the same directory — templates, example outputs, reference docs, executable scripts — let a skill carry whatever it needs without bloating the skill listing that Claude loads on every session.

```
my-skill/
├── SKILL.md           # required; entry point
├── template.md        # template for Claude to fill in
├── examples/
│   └── sample.md      # example output showing expected format
└── scripts/
    └── validate.sh    # script Claude can execute via Bash tool
```

Only `SKILL.md` is required. Everything else is optional.

---

## 2. Frontmatter Reference

YAML frontmatter between `---` markers at the top of `SKILL.md`. All fields are optional; only `description` is recommended so Claude can decide when to apply the skill.

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Slash-command name. Lowercase letters, numbers, hyphens only. Max 64 chars. Defaults to directory name. |
| `description` | string | How Claude decides when to auto-invoke. Front-load the key use case. Combined with `when_to_use`, truncated at 1,536 chars in the skill listing. |
| `when_to_use` | string | Additional trigger phrases / example requests. Appended to `description`; counts toward the 1,536-char cap. |
| `argument-hint` | string | Shown in the `/` autocomplete menu. Indicates expected arguments. Example: `"[issue-number]"`, `"[filename] [format]"`. |
| `disable-model-invocation` | boolean | `true` = only humans can invoke (skill is hidden from Claude's context). Default `false`. Use for side-effecting workflows (`/deploy`, `/commit`, `/send-slack`). |
| `user-invocable` | boolean | `false` = hide from `/` menu (only Claude can auto-invoke). Default `true`. Use for background knowledge that isn't a meaningful user command. |
| `allowed-tools` | string or list | Pre-approves tools while this skill is active (no per-use prompt). Does NOT restrict — global permissions still govern non-listed tools. Example: `Bash(git add *) Bash(git commit *)` or YAML list form. |
| `model` | string | Override the model for this skill. |
| `effort` | string | Override effort level: `low`, `medium`, `high`, `xhigh`, `max`. Available levels depend on model. |
| `context` | string | Set to `fork` to run the skill in an isolated subagent with no conversation history. |
| `agent` | string | With `context: fork`, which subagent type: `Explore`, `Plan`, `general-purpose`, or a custom agent from `.claude/agents/`. Default `general-purpose`. |
| `paths` | string or list | Glob patterns. Skill auto-activates only when working with matching files. Same format as path-specific memory rules. |
| `hooks` | object | Hooks scoped to this skill's lifecycle. See the [Hooks docs](https://code.claude.com/docs/en/hooks#hooks-in-skills-and-agents). |
| `shell` | string | `bash` (default) or `powershell` for inline shell blocks. PowerShell requires `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`. |

---

## 3. Types of Skill Content

Thinking about how you want a skill invoked helps guide what to put in it.

**Reference content** — conventions, patterns, style guides, domain knowledge. Runs inline so Claude can apply it alongside the conversation. Good candidates for auto-invocation (default frontmatter).

**Task content** — step-by-step procedures for specific actions (deployments, commits, code generation). Often set `disable-model-invocation: true` so Claude doesn't trigger them unexpectedly.

A single SKILL.md can mix both, but picking one primary purpose per skill keeps it focused.

---

## 4. Supporting Files: Three Patterns

### 4.1 Reference Content (Progressive Disclosure)

Long API specs, checklists, style guides. Cross-reference from `SKILL.md` so Claude knows when to Read each file:

```markdown
## Additional resources
- Full style guide: [style-guide.md](style-guide.md)
- Common violations: [violations.md](violations.md)
```

Claude loads these on demand using the Read tool. Keeps `SKILL.md` short; detail loads only when needed.

### 4.2 Templates

A skeleton file Claude reads, fills in, and writes out. Enforces consistency across generated artifacts.

```
generate-adr/
├── SKILL.md
└── adr-template.md        # Claude reads this and fills in sections
```

### 4.3 Executable Scripts

Any language the host can run. The skill tells Claude to run them via the Bash tool. Use `${CLAUDE_SKILL_DIR}` in script paths so they resolve regardless of working directory:

```
visualize-deps/
├── SKILL.md               # instructs: Run python ${CLAUDE_SKILL_DIR}/scripts/render.py
└── scripts/
    └── render.py
```

Scripts can also preprocess the skill content via shell injection (see §6).

---

## 5. String Substitutions

Dynamic values that expand when the skill is invoked:

| Variable | Expands to |
|----------|-----------|
| `$ARGUMENTS` | Everything typed after the slash command. If not present in content, auto-appended as `ARGUMENTS: <value>`. |
| `$ARGUMENTS[N]` | Specific argument by 0-based index. |
| `$N` | Shorthand for `$ARGUMENTS[N]` (e.g. `$0`, `$1`, `$2`). |
| `${CLAUDE_SKILL_DIR}` | Absolute path to this skill's directory. Survives CWD changes in agent threads. For plugin skills, this is the skill's subdirectory within the plugin. |
| `${CLAUDE_SESSION_ID}` | Current session ID. Useful for per-session logs or file correlation. |

Indexed arguments use shell-style quoting. `/my-skill "hello world" second` → `$0` is `hello world`, `$1` is `second`. `$ARGUMENTS` always expands to the full raw string.

---

## 6. Shell Command Injection (Dynamic Context)

Inline form: `` !`<command>` `` runs the command **before** Claude sees the skill; the output replaces the placeholder. Claude only ever sees the command output, not the command.

```markdown
---
name: pr-summary
allowed-tools: [Bash(gh *)]
---
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
```

Multi-line form opens a fenced block with ` ```! `:

````markdown
## Environment
```!
node --version
npm --version
git status --short
```
````

This is **preprocessing**, not tool use — Claude doesn't execute the command, the runtime does. Can be disabled per-policy via `disableSkillShellExecution: true` in settings (primarily for managed settings). Bundled and managed skills are not affected by that policy.

---

## 7. Progressive Disclosure

Skill descriptions are always in Claude's context so it knows what's available. Full `SKILL.md` content only loads **when the skill is invoked**. Supporting files load only when `SKILL.md` tells Claude to Read them.

Implications:

- Cheap to have many skills — the always-on cost is just the description line
- A complex skill (hundreds of lines of reference) pays its full cost only when used
- Long reference docs don't force you to inline everything in `SKILL.md`

**Official guideline: keep `SKILL.md` under 500 lines.** Move detail to supporting files.

### Context Lifecycle

When invoked, rendered `SKILL.md` content enters the conversation as a single message and **stays there for the rest of the session**. Claude Code does not re-read the file on later turns. Write guidance as standing instructions, not one-time steps.

Auto-compaction re-attaches the most recent invocation of each skill after the summary, keeping the first 5,000 tokens of each. Re-attached skills share a 25,000-token combined budget, filled from most-recent to least. Older skills can drop entirely after compaction. If a skill seems to stop working, re-invoke it.

---

## 8. Invocation Control

Two frontmatter fields gate who can invoke a skill:

| Frontmatter | Human `/skill-name` | Claude auto-invokes | When SKILL.md enters context |
|-------------|--------------------|--------------------|------------------------------|
| Default | Yes | Yes | Description always in context; full content loads on invocation |
| `disable-model-invocation: true` | Yes | No | Description NOT in context; loads only on human invocation |
| `user-invocable: false` | No | Yes | Description always in context; loads on Claude invocation |

Use `disable-model-invocation: true` for anything with side effects — `/deploy`, `/commit`, `/send-slack-message`. You don't want Claude deciding to deploy because the code looks ready.

Use `user-invocable: false` for background knowledge — e.g., a `legacy-system-context` skill that Claude should know when relevant but isn't a command users run.

### Permission Rules for Skills

Global permission rules still apply. Syntax: `Skill(name)` for exact match, `Skill(name *)` for prefix match.

```
# deny rules
Skill(deploy *)

# allow rules
Skill(commit)
Skill(review-pr *)
```

---

## 9. Running Skills in a Subagent (`context: fork`)

Adding `context: fork` makes the skill run in an isolated subagent. The `SKILL.md` body becomes the subagent's task prompt; no conversation history is inherited.

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:
1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

On invocation:
1. New isolated context created
2. Subagent receives the rendered skill content as its entire task
3. `agent` field determines execution environment (model, tools, permissions)
4. Results summarized and returned to the main conversation

**Caveat:** `context: fork` only works for skills with explicit imperative tasks. A skill that's just reference material ("use these conventions") gives the subagent nothing to do and returns without meaningful output.

### Skill-vs-Subagent Orthogonality

| Approach | System prompt | Task | Also loads |
|----------|---------------|------|------------|
| Skill with `context: fork` | From agent type (`Explore`, `Plan`, etc.) | SKILL.md content | CLAUDE.md |
| Subagent with `skills` field | Subagent's markdown body | Claude's delegation message | Preloaded skills + CLAUDE.md |

---

## 10. Skill Discovery Locations & Precedence

Claude Code discovers skills from multiple locations. Higher-priority locations override lower-priority ones on name collision.

| Location | Scope |
|----------|-------|
| Enterprise (managed settings) | All org users |
| Personal — `~/.claude/skills/` | All your projects |
| Project — `.claude/skills/` | This project only |
| Plugin — `<plugin>/skills/` | Where plugin is enabled (namespaced `plugin:skill-name`) |

**Resolution order: enterprise > personal > project.** Plugin skills are namespaced so they can't collide with the other tiers.

Skills and legacy commands coexist. A skill at `.claude/skills/deploy/SKILL.md` and a command at `.claude/commands/deploy.md` both create `/deploy`; if both exist with the same name, the **skill wins**. Skills are recommended for all new work because only skills support supporting files, the full frontmatter surface, and hooks.

### Where ngentiq-claude-lite Installs Skills

ngentiq-claude-lite installs its 9 built-in skills directly into `.claude/skills/` (the project tier). There is no separate managed tier in lite — skills live where Claude Code discovers them. Custom skills you add under `.claude/skills/` sit alongside the installed ones and are preserved across framework upgrades (the installer doesn't delete files it didn't install).

### Additional Directories

The `--add-dir` flag loads `.claude/skills/` from added directories (an exception to the general rule that additional directories grant file access, not configuration discovery). Nested `.claude/skills/` directories are also auto-discovered — for example, `packages/frontend/.claude/skills/` is discovered when editing files in `packages/frontend/`. This supports monorepo setups.

---

## 11. Live Reload

Adding, editing, or deleting a skill takes effect in the current session **immediately** — no restart.

One exception: creating a **new top-level skills directory** that didn't exist at session start requires restarting Claude Code so the directory can be watched.

---

## 12. Legacy `.claude/commands/` Compatibility

> "Custom commands have been merged into skills." — official docs

Files at `.claude/commands/<name>.md` still work and support the same frontmatter. Skills are recommended for new work because only skills support:

- A directory for supporting files (templates, examples, scripts)
- Frontmatter controls like `context: fork`, `agent`, `paths`, hooks
- Auto-invocation by Claude based on `description`

---

## 13. Skill vs Subagent vs Hook

| Mechanism | File form | Entry point | Use for |
|-----------|-----------|------------|---------|
| **Skill** | Directory with `SKILL.md` (+ optional supporting files) | `/skill-name` or Claude auto-invoke | Named, reusable playbooks; reference content; procedures |
| **Subagent** | `.claude/agents/<name>/` | Task tool; spawned by Claude or a skill | Delegated, isolated work with a distinct tool/permission profile |
| **Hook** | Script registered in `settings.json` | Lifecycle events (SessionStart, UserPromptSubmit, etc.) | Deterministic context injection; enforcement; automation |

Skills and subagents compose: a skill with `context: fork` runs in a subagent; a subagent with `skills: [...]` preloads skills as reference material.

---

## 14. Troubleshooting

**Skill not triggering.**
- Description missing keywords users actually say
- Verify skill appears in "What skills are available?"
- Rephrase request to match description
- Invoke directly with `/skill-name` if user-invocable

**Skill triggers too often.**
- Make description more specific
- Add `disable-model-invocation: true` for manual-only invocation

**Skill descriptions cut short.**
- Skill listing has a budget (1% of context, fallback 8,000 chars)
- Each entry (description + when_to_use) capped at 1,536 chars
- Front-load the key use case; trim rambling context
- Increase budget via `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var

---

## 15. Best Practices (from official docs + ngentiq-claude experience)

- **Keep `SKILL.md` under 500 lines.** Move detail to supporting files.
- **Front-load the description.** The first clause decides whether Claude picks your skill over another.
- **Be explicit about inputs and outputs.** "Read `standards/coding-standards.md`", not "consult the team's standards."
- **One responsibility per skill.** A skill that plans *and* implements is two skills.
- **Use `context: fork` for research/review.** Isolate from the main conversation.
- **Set `disable-model-invocation: true` on side-effecting skills.** Deploys, commits, Slack messages.
- **Cross-reference supporting files explicitly.** Claude doesn't know to load them unless `SKILL.md` says so.
- **Prefer standing instructions over one-time steps.** Skill content stays in context; Claude doesn't re-read it.

---

## 16. Keeping This Doc Current

When Anthropic updates the [Claude Code Skills docs](https://code.claude.com/docs/en/skills):

1. Diff against this file
2. Update frontmatter table, string substitutions, precedence rules as needed
3. Update the fetched date at the top
4. Note behavior changes in the relevant section

If this doc drifts from the upstream spec, every skill author works from stale assumptions.
