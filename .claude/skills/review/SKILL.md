---
name: review
description: "Code review with severity-based findings against project standards and best practices"
argument-hint: "[file-or-scope] [--staged] [--branch <ref>]"
context: fork
allowed-tools: ["Read", "Grep", "Glob", "Bash(git log:*)", "Bash(git diff:*)", "Bash(git status:*)", "Bash(git branch:*)"]
---

# Code Review

Review code against project standards and best practices. Analyzes diffs or specified files for correctness, security, performance, and maintainability issues. Outputs a structured review report to stdout.

**Target**: $ARGUMENTS (optional file paths or flags)

## Prerequisites

1. **Git repository**: For diff-based review modes, the project must be a git repository. If not a git repo and no file arguments provided: `ERROR: Not a git repository and no files specified. Provide file paths: /review <path> [<path>...]`
2. **CLAUDE.md** (informational): If `CLAUDE.md` exists, load it for project conventions. If not, review uses general best practices only.

## Behavior

### Step 1: Load Project Context

Read `CLAUDE.md` (if it exists) to determine:
- Language and framework conventions
- Build and test commands
- Naming conventions, error handling patterns
- Any project-specific rules or constraints

Detect linting/formatting configuration by scanning for:
- `.eslintrc*`, `eslint.config.*` (ESLint)
- `.prettierrc*`, `prettier.config.*` (Prettier)
- `pyproject.toml` `[tool.ruff]` / `[tool.pylint]` sections
- `.golangci.yml` (Go)
- `.editorconfig`

These inform review context but the review does not run linters -- it applies human-level judgment.

### Step 2: Determine Review Scope

| Mode | Trigger | What Is Reviewed |
|------|---------|-----------------|
| **Changed files** (default) | No file arguments | Files changed in current branch vs default branch (`git diff --name-only`) |
| **Specific files** | File paths as arguments | Only the specified files or directories |
| **Branch comparison** | `--branch <ref>` flag | Diff between current HEAD and the specified ref |
| **Staged changes** | `--staged` flag | Files in the git staging area (`git diff --cached --name-only`) |

If no changed files are found in diff mode, report: `No changed files detected. Provide specific paths or use --branch to compare against a different ref.`

### Step 3: Spawn Review Agents

Delegate all file reading and analysis to Task agents. Spawn agents per quality dimension:

| Agent | Review Focus |
|-------|-------------|
| **Correctness** | Logic errors, potential bugs, off-by-one errors, null/undefined risks, race conditions, incorrect API usage |
| **Security** | Injection vulnerabilities (SQL, XSS, command), authentication/authorization gaps, secrets exposure, unsafe deserialization, OWASP Top 10 |
| **Performance** | Unnecessary allocations, N+1 queries, missing indexes, unbounded loops, blocking operations in async contexts, memory leaks |
| **Maintainability** | Unclear naming, excessive complexity, duplicated logic, missing error handling, tight coupling, convention violations from CLAUDE.md |

Each agent receives:
- The list of files to review (with full content)
- For diff-based modes: the diff context showing what changed
- Project conventions from CLAUDE.md (if available)
- Detected linting configuration context

Each agent reports findings with:
- `file:line` reference
- Severity level
- Description of the issue
- Suggested fix (brief, actionable)

Think as a **principal engineer** reviewing code -- not checkbox compliance. Focus on issues that matter: correctness bugs, security holes, performance traps, and patterns that will cause pain during maintenance.

### Step 4: Collect and Prioritize Results

Merge results from all agents. Deduplicate issues flagged by multiple agents. Sort by:
1. Severity (critical > error > warning > info)
2. File path
3. Line number

**Severity definitions**:
- **critical**: Security vulnerability, data loss risk, crash in production, authentication bypass
- **error**: Logic bug, correctness issue, standards violation with functional impact
- **warning**: Style deviation, minor convention mismatch, code smell, potential future issue
- **info**: Observation, suggestion for improvement, notable pattern (use sparingly)

### Step 5: Output Review Report

Use the template at [review-template.md](review-template.md) to generate the review report. Populate all `{placeholder}` values with actual findings from the review agents:

- **Summary**: total files reviewed and finding counts by severity
- **Findings sections**: one entry per finding, numbered sequentially within severity (C-001, E-001, W-001, I-001). Each finding must include file:line, description, and a specific suggested fix
- **Omit empty sections**: if no findings exist for a severity level, omit that section entirely
- **Summary Table**: aggregate counts with action guidance per severity
- **Top Recommendations**: the 3 most impactful, actionable items distilled from all findings

### Step 6: Suggest Next Steps

```
---
Next: `/test` (generate tests) | `/pr` (generate PR description) | `/implement` (fix issues)
```

## Constraints

- **Read-only**: This skill does NOT modify source code
- **Delegate all file access**: All file reading and review MUST happen via Task agents, not in main context
- **Severity accuracy**: Do not inflate severity. Critical is reserved for security, data loss, or crash risks. Most convention violations are warning-level
- **Actionable findings**: Every finding must include a specific suggested fix, not generic advice
- **No padding**: Only report real issues. If the code is clean, say so. Do not manufacture findings to appear thorough
- **Expert perspective**: Review as a principal engineer would -- prioritize issues that affect production reliability, security, and long-term maintainability

## Sub-Agent Awareness

Before spawning review agents, check `.claude/agents/` for a code-reviewer sub-agent. If one exists, prefer it for review delegation. Project sub-agents carry domain knowledge specific to this codebase. See https://code.claude.com/docs/en/sub-agents.
