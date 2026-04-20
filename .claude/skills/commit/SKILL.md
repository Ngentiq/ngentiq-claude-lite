---
name: commit
description: "Generate conventional commit messages from staged/unstaged changes with user approval before committing"
argument-hint: "[--all] [--amend]"
context: fork
allowed-tools: ["Read", "Grep", "Glob", "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git add:*)", "Bash(git commit:*)"]
---

# Commit

Generate a conventional commit message from current changes, present it for approval, then commit. Never commits without explicit user confirmation.

**Arguments**: $ARGUMENTS (optional: `--all` to include unstaged changes, `--amend` to amend the previous commit)

## Prerequisites

1. **Git repository**: The current directory must be a git repository. If not: `ERROR: Not a git repository.`
2. **Changes exist**: There must be staged or unstaged changes. If working tree is clean: `No changes to commit. Working tree is clean.`

## Behavior

### Step 1: Gather Change Context

Run the following to understand the current state:

1. `git status` -- overview of staged, unstaged, and untracked files
2. `git diff --staged` -- detailed diff of staged changes
3. If nothing is staged (or `--all` flag provided): `git diff` -- detailed diff of unstaged changes
4. `git log --oneline -10` -- recent commit messages for style reference

### Step 2: Analyze Changes

Examine the diffs to determine:

| Analysis | How to Determine |
|----------|-----------------|
| **Change type** | New files = `feat`, bug fixes = `fix`, restructuring = `refactor`, tests = `test`, docs = `docs`, build/CI = `chore`, performance = `perf` |
| **Scope** | The primary module, component, or area affected (e.g., `auth`, `api`, `cli`, `config`) |
| **Description** | What changed and why, in imperative mood ("add", "fix", "update", not "added", "fixed") |
| **Breaking changes** | Any changes to public APIs, config schemas, or contracts that could break consumers |

Review recent commit messages from Step 1 to match the project's existing style (e.g., whether they use scopes, capitalization patterns, issue references).

Check `standards/` for any file containing git or commit convention sections. If found, use those conventions. Priority: CLAUDE.md > standards/ files > git log style > conventional commits default.

### Step 3: Generate Commit Message

Produce a conventional commit message following the format in [commit-template.md](commit-template.md). The message must include:

- **Type**: one of `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`, `ci`, `build`
- **Scope** (optional but preferred): the affected area in parentheses
- **Subject line**: imperative mood, no period, under 72 characters total
- **Body** (if needed): explain *why* the change was made, not *what* (the diff shows what)
- **Breaking change footer** (if applicable): `BREAKING CHANGE: description`
- **Co-Authored-By**: include if configured in CLAUDE.md

### Step 4: Present for Approval

**HARD STOP.** Display the proposed commit message and wait for user approval:

```
## Proposed Commit

{formatted commit message}

## Changes to be committed

{summary of files: N files changed, additions, deletions}

Approve this commit message? (approve / edit / cancel)
```

**Do NOT proceed until the user explicitly approves or provides an edited message.** If the user edits the message, use their version exactly.

### Step 5: Stage and Commit

After approval:

1. **Stage files** (if not already staged):
   - Prefer staging specific files by name over `git add -A`
   - **NEVER stage**: `.env`, `.env.*`, `credentials.*`, `*secret*`, `*.key`, `*.pem`, `id_rsa*`, `*.p12`, `token.json`, or any file that appears to contain secrets
   - If `--all` was specified, stage all modified/added files (excluding secrets patterns above)

2. **Create the commit**:
   - Use the approved message
   - If `--amend` was explicitly passed by the user, use `git commit --amend`
   - Otherwise, always create a new commit (never amend by default)

3. **Report result**:

```
Committed: {short hash} {subject line}
{N} files changed, {insertions} insertions(+), {deletions} deletions(-)
```

## Constraints

- **User approval is mandatory**: NEVER create a commit without showing the message first and receiving explicit approval. This is the single most important rule of this skill
- **No amend by default**: Only use `--amend` if the user explicitly passed it. Creating a new commit is always the default
- **No force push**: This skill never pushes. Use `/pr` or manual push after committing
- **Skip secrets**: Never stage files matching secrets patterns. If the only changes are in secret files, report: `All changed files match secrets exclusion patterns. Nothing to commit.`
- **Match project style**: Adapt to the project's existing commit message conventions visible in `git log`
- **Conventional format**: Default to conventional commits (`type(scope): subject`) unless the project clearly uses a different format
- **Imperative mood**: "add feature" not "added feature", "fix bug" not "fixes bug"

## Sub-Agent Awareness

Project-defined sub-agents may exist in `.claude/agents/`. This skill typically operates without delegation, but be aware that sub-agents are available if needed. See https://code.claude.com/docs/en/sub-agents.
