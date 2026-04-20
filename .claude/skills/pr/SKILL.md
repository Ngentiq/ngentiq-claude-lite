---
name: pr
description: "Generate PR description from branch commits with summary, test plan, and reviewer context"
argument-hint: "[--base <branch>] [--create]"
context: fork
allowed-tools: ["Read", "Grep", "Glob", "Bash(git log:*)", "Bash(git diff:*)", "Bash(git status:*)", "Bash(git branch:*)", "Bash(git show:*)", "Bash(git rev-list:*)", "Bash(git symbolic-ref:*)", "Bash(gh:*)"]
---

# Generate PR

Generate a PR description from the current branch's commits with context, affected areas, and test plan. Outputs the PR body to stdout by default, or creates the PR directly with `--create`.

**Arguments**: $ARGUMENTS (optional: `--base <branch>` to specify the target branch, `--create` to invoke `gh pr create` directly)

## Prerequisites

1. **Git repository**: The current directory must be a git repository. If not: `ERROR: Not a git repository.`
2. **Branch state**: The current branch must have commits ahead of the base branch. If zero commits ahead: `ERROR: No commits ahead of {base}. Nothing to generate a PR for.`

## Behavior

### Step 1: Determine Base Branch

Resolve the base branch in order:
1. `--base <branch>` argument if provided
2. `git symbolic-ref refs/remotes/origin/HEAD` (remote default branch)
3. Fall back to `main`, then `master`

### Step 2: Analyze Branch Changes

Spawn a Task agent to gather branch context:

1. Collect all commits on the current branch vs base: `git log --oneline <base>..HEAD`
2. Collect the full diff summary: `git diff --stat <base>..HEAD`
3. Collect the detailed diff: `git diff <base>..HEAD`
4. Identify affected files grouped by change type (added, modified, deleted, renamed)
5. Group changes by directory/concern area
6. If a plan file exists in `plans/` that corresponds to the current branch or recent work, note which acceptance criteria items this PR addresses

The agent returns: commit list, diff summary, affected file groups, area groupings, and acceptance criteria coverage.

If `standards/` exists, pass any relevant conventions (PR format, branch naming) to the agent. Priority order: CLAUDE.md > standards/ files > auto-detection > general best practices. If a plan exists AND standards exist: include a standards compliance note in the PR body.

### Step 3: Generate PR Description

Using the analysis, produce a structured PR description following the structure in [pr-template.md](pr-template.md). The template defines these sections: Summary, Changes by Area, Acceptance Coverage (if plan exists), Test Plan, Reviewer Notes, and Deployment Notes (if applicable).

### Step 4: Output Result

| Mode | Trigger | Action |
|------|---------|--------|
| **stdout** (default) | No `--create` flag | Print the PR body to stdout with a usage hint |
| **create** | `--create` flag | Invoke `gh pr create` with the generated title and body |

For stdout mode, wrap the output:

```
## Generated PR Description

{PR body from Step 3}

---
To create this PR, re-run with --create:
  /pr --create
  /pr --create --base main
```

For create mode:
1. Extract a concise title from the summary (under 70 characters)
2. Run `gh pr create --title "{title}" --body "{body}"` via Bash
3. Report the created PR URL

## Constraints

- **Read-only by default**: Without `--create`, this skill does NOT create any PRs or modify any state
- **Delegate all analysis**: All git operations and diff analysis MUST happen via a Task agent, not in main context
- **Factual only**: Describe what the commits contain. Do not editorialize or add content not supported by the diff
- **No file writes**: Output goes to stdout or to `gh pr create`. No files are written to disk
- **Commit-driven**: The PR description is derived entirely from the commits and diff. Do not fabricate test plans or changes not present in the diff
- **Concise**: Keep the PR description scannable. Reviewers read dozens of PRs -- respect their time

## Sub-Agent Awareness

Before spawning analysis agents, check `.claude/agents/` for a pr-reviewer sub-agent. If one exists, prefer it for branch analysis. Project sub-agents carry domain knowledge specific to this codebase. See https://code.claude.com/docs/en/sub-agents.
