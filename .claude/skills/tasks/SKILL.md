---
name: tasks
description: "Decompose a feature plan into numbered task files with dependencies, BAC/QAC traceability, and acceptance criteria"
argument-hint: "[plan-number]"
context: fork
allowed-tools: ["Read", "Grep", "Glob", "Write", "Edit", "Bash(ls:*)", "Bash(mkdir:*)"]
agent: Plan
---

# Tasks

Decompose a feature plan into sequentially numbered task files (`T-NNN.md`) within the plan folder. Each task file contains a description, scope, acceptance criteria with BAC/QAC traceability, and dependency tracking -- providing implementation-ready work units.

**Plan identifier**: $ARGUMENTS

## Prerequisites

Before proceeding, verify:

1. **Plans directory**: `plans/` must exist with at least one plan folder.
2. **Plan folder exists**: The target plan folder must exist and contain a `plan.md` file. If the argument does not resolve to a valid plan, stop and report:

```
ERROR: Could not locate plan.

Usage: /tasks [plan-number]

Examples:
  /tasks P-001
  /tasks 001
  /tasks 1
  /tasks plans/P-001-some-slug

If no argument is given, the most recent plan folder is used.
```

## Behavior

### Step 1: Parse Arguments and Locate Plan

Accept either:
- A plan number: `P-001` or `001` or `1` -- resolves to `plans/P-001-*/plan.md`
- A folder path: `plans/P-001-some-slug` -- reads `plan.md` within it

If no argument is provided, scan `plans/` for the highest-numbered `P-NNN-*` folder and use that (most recent plan).

Confirm the resolved folder exists and contains `plan.md`. If not, report the error from Prerequisites and stop.

### Step 2: Read and Parse the Plan

Read `plan.md` from the target folder. Extract:

- **Requirements** section -- for context and traceability
- **Business Acceptance Criteria** section -- for BAC traceability in each task
- **QA Acceptance Criteria** section -- for QAC traceability in each task
- **Implementation Plan** section (phases and steps) -- primary source for task decomposition
- **Test Plan** section -- for test task creation and acceptance criteria hints

### Step 3: Decompose into Tasks

Transform implementation steps into task files:

- Each step (or logical group of tightly coupled steps) becomes one task
- Tasks are numbered sequentially: `T-001`, `T-002`, etc.
- Dependencies are derived from the "Dependencies" column in the implementation plan
- Scope is derived from the "Files" column
- Acceptance criteria are split into Business and QA subsections, tracing back to specific BAC/QAC items

**Decomposition guidelines:**

- One task should be completable in a single focused session
- If a step involves both creating and testing, consider splitting into separate tasks
- Group infrastructure/setup steps together if they are trivial
- Test tasks should follow their corresponding implementation tasks
- Maximum 20 tasks per plan; if exceeding this, warn and suggest splitting the plan into phases

**BAC/QAC traceability rules:**

- Every task MUST reference at least one BAC or QAC item in its frontmatter
- Implementation tasks typically satisfy BAC items (the "what" that gets built)
- Test tasks typically satisfy QAC items (the "how" that gets verified)
- A single BAC/QAC item may be satisfied across multiple tasks
- Every BAC and QAC item from the plan must appear in at least one task's `satisfies-bac` or `satisfies-qac` field

After decomposition, verify coverage: if any BAC or QAC item is not referenced by any task, add it to the most relevant task or create a dedicated task for it.

**Status values**: `pending` (not started), `in-progress` (being worked on), `done` (completed), `failed` (attempted but failed), `skipped` (intentionally bypassed).

**Dependency tracking**: The `depends-on` field lists task IDs that must be completed before this task can start. Dependencies always flow forward -- T-003 may depend on T-001 or T-002, never on T-004.

Each task file uses the template defined in [task-template.md](task-template.md). Read that file now to load the output format.

### Step 4: Write Task Files

For each task, write `T-{NNN}.md` to the plan folder (same directory as `plan.md`).

If task files already exist in the folder, warn the user and ask for confirmation before overwriting. Do NOT silently replace existing task files.

Use the Write tool for each file individually. Do NOT use bash loops for file operations.

### Step 5: Report Results

Display a summary:

```
## Task Breakdown Complete

### Output
- Plan folder: plans/P-{NNN}-{slug}/
- Task files: T-001.md through T-{NNN}.md

### Traceability
| BAC/QAC Item | Satisfied By |
|-------------|-------------|
| BAC-1 | T-001, T-003 |
| QAC-1 | T-002, T-004 |
| ... | ... |

### Summary
| Metric | Count |
|--------|-------|
| Tasks created | {N} |
| Tasks with dependencies | {N} |
| BAC items covered | {N}/{total} |
| QAC items covered | {N}/{total} |

### Next Steps
- Review task files and adjust scope or acceptance criteria
- Implementation starts with T-001 (or the first task with no dependencies)
- Run /implement --plan plans/P-{NNN}-{slug} to execute
- Update task status in frontmatter as work progresses
```

## Constraints

- **HARD STOP**: This skill produces task files and terminates. Do NOT invoke downstream skills, offer to begin implementation, or proceed beyond presenting the task summary. `/implement` is the only path from tasks to code.
- **Read-only on source code**: This command does NOT modify source code. It only creates task files within the plan folder
- **Maximum 20 tasks**: Warn if decomposition exceeds 20 tasks and suggest splitting the plan
- **Dependencies flow forward**: A task may only depend on lower-numbered tasks, never on higher-numbered ones
- **Full BAC/QAC coverage**: Every BAC and QAC item from the plan must be referenced by at least one task
- **Idempotent with warning**: Safe to re-run, but must warn before overwriting existing task files
- **No bash loops**: Use the Write tool individually for each task file

## Sub-Agent Awareness

When decomposing tasks, check `.claude/agents/` for project-defined sub-agents. If sub-agents exist that align with specific tasks, note them in the task description so `/implement` can leverage them. See https://code.claude.com/docs/en/sub-agents.
