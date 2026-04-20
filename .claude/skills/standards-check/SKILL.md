---
name: standards-check
description: "Check code compliance against project standards"
argument-hint: "[path] [--staged] [--all]"
context: fork
allowed-tools: ["Read", "Grep", "Glob", "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git branch:*)", "Bash(git symbolic-ref:*)", "Agent"]
---

# Standards Check

Verify code compliance against project standards files in `standards/`. Produces a structured compliance report with findings organized by severity and standards file.

## Prerequisites

- Standards files must exist in `standards/`. If none exist, run `/standards` first.

## Arguments

| Argument | Description |
|----------|-------------|
| (none) | Check all files changed vs default branch |
| `<path>` | Check specific file or directory |
| `--staged` | Check staged files only |
| `--all` | Check all source files (full scan) |

## Behavior

### Step 1: Load Standards and Exceptions

- Check for `standards/` directory at project root
- Read every `*.md` file in `standards/` (not just the four default categories -- teams may have added custom standards files like `database-standards.md`)
- If no standards files exist: report "No standards files found. Run `/standards` to generate." and stop
- If `standards/.exceptions.md` exists: load exception rules (path patterns + convention names). These suppress specific findings in Step 4.
- Build a standards context from all loaded files

### Step 2: Determine Target Files

Determine which files to check based on the argument:

- **Default** (no argument): files changed vs default branch. Use `git symbolic-ref refs/remotes/origin/HEAD` to find the default branch, falling back to `main` then `master`. Run `git diff --name-only <base>...HEAD` to get changed files.
- **`--staged`**: `git diff --cached --name-only`
- **`--all`**: all source files, excluding `node_modules/`, `vendor/`, `.git/`, `build/`, `dist/`, `__pycache__/`, `bin/`, `obj/`, `target/`, and other common build/dependency output
- **Specific path**: files matching the path (use Glob if directory)

Filter to source files only. Exclude: images, binaries, lock files (`package-lock.json`, `yarn.lock`, `Cargo.lock`), generated code (`*.pb.go`, `*.generated.*`).

If no target files found: report "No files to check." and stop.

### Step 3: Spawn Check Agents

Spawn one agent per standards file that has relevant target files. Each agent receives:
- The full content of its standards file
- The target source files to check
- The loaded exceptions from `.exceptions.md` (if any)
- Instructions to check each Established and Majority convention against target files

**Scope-aware matching**: When a convention has a `Scope` field (e.g., `src/backend/**/*.cs`), the agent only checks that convention against files matching the scope glob. Conventions without a Scope field apply to all target files. This is critical for multi-stack projects where different stacks have different naming conventions.

**Consistency levels NOT checked** (informational only, never produce findings):
- Observation
- Deprecated
- Under Review
- Items in the Suppressed Conventions section

**Linter-enforced conventions**: Conventions with an `Enforced by` field are optionally skipped -- the linter already catches them. Count skipped conventions separately for the report.

**Finding format**: Each agent returns findings with:
- **Severity**: `error` (violates Established convention) or `warning` (violates Majority convention)
- **Location**: `file:line`
- **Standard**: which convention was violated (quoted from the standards file)
- **Description**: what's wrong and what it should be

### Step 4: Collect, Classify, and Reconcile Results

**Exception suppression**: Compare each finding against loaded `.exceptions.md` rules. If a finding's file path matches an exception pattern AND the convention matches: suppress the finding. Count suppressed findings separately.

**Cross-file conflict detection**: If two standards files produce contradictory findings for the same `file:line` (one says correct, another says violation), flag as `conflict` severity:
- Code: `C-NNN`
- Message: "Conflicting standards between {file-A} and {file-B} -- resolve in standards files before enforcing."

**Deduplication**: Remove duplicate findings across agents. If two agents flag the same file:line for the same issue, keep only one.

**Sorting**: conflicts first, then errors, then warnings. Within each severity: sort by file path, then line number.

**Numbering**: Assign sequential codes: `C-001`, `C-002`, ... for conflicts; `E-001`, `E-002`, ... for errors; `W-001`, `W-002`, ... for warnings.

### Step 5: Output Report

Use the template at [report-template.md](report-template.md) for consistent structure. Output to stdout (consistent with `/review`).

The report includes:
- **Header**: files checked, standards files count, date, target mode
- **Summary table**: one row per standards file (dynamic, not hardcoded), Total row, Linter-enforced (skipped) row
- **Conflicts section**: only if cross-file contradictions detected
- **Findings**: organized by standards file, then Errors before Warnings
- **Result line**: `PASS` or `{N} errors, {M} warnings, {K} conflicts`

## Constraints

- **Read-only**: This skill never modifies source files or standards files. It only reads and reports.
- **Convention reference**: Every finding must quote the specific convention it violates from the standards file.
- **Scope enforcement**: Conventions with Scope fields are only checked against matching files. This is non-negotiable for multi-stack correctness.
- **Exception transparency**: Suppressed findings are counted and reported separately, never silently hidden.
- **Established (template)**: Treat `Established (template)` the same as `Established` for checking purposes.
- **No false authority**: The standards file is the source of truth. The agent applies what the file says, it does not invent or infer conventions not written in the file.

## Sub-Agent Awareness

Check `.claude/agents/` for a `code-reviewer` or `standards-checker` agent before spawning check agents. If found, use that agent's definition.
