# Orchestration

This is the main execution engine for `/implement`. Both modes (plan-driven and ad-hoc) run through this file.

**Agent Teams (via `TeamCreate`) is the REQUIRED execution path.** Sequential Task agent execution is a fallback permitted ONLY when TeamCreate is genuinely unavailable (tool not present in the environment).

## Coordinator Rule (Non-Negotiable)

The coordinator reads, plans, and delegates. It NEVER:
- Writes, edits, or creates source code or test files
- Runs implementation work directly
- Performs any file modification that constitutes implementation

Permitted coordinator actions: reading files for planning, creating teams, spawning agents, sending messages to teammates, reading agent outputs for reporting, writing the completion summary.

**Violation of this rule means the skill has failed, regardless of implementation correctness.**

---

## Phase 0: Mode-Specific Setup

### Plan-Driven Mode

1. **Locate plan**: Resolve the plan reference to a `plans/P-NNN-*/` directory. If not found, stop with error.
2. **Read plan and tasks**: Read `plan.md` for context. Read all `T-NNN.md` files, extract frontmatter: `task`, `status`, `depends-on`, `satisfies-bac`, `satisfies-qac`.
3. **Build dependency graph**: Classify each task as `ready` (no unmet dependencies), `blocked` (has unmet dependencies), `done` (already completed), or `failed` (previous attempt failed).
4. **Resumability**: Tasks with `status: done` are skipped. `status: failed` tasks are retried. Only `pending` and `ready` tasks are executed.
5. Proceed to Phase 1: Scope Assessment.

### Ad-Hoc Mode

1. **Scope assessment**: Spawn an Explore agent to analyze the affected codebase areas:
   - Existing files and patterns in the area
   - Files that need to be created or modified
   - Testing patterns in the project
   - Estimated scope (number of files, complexity)

2. Proceed to Phase 1: Scope Assessment.

---

## Phase 1: Scope Assessment

Determine the scope to decide team size and execution strategy.

| Scope | Definition | Execution Strategy |
|-------|-----------|-------------------|
| **Trivial** | 1 file, single function, < 5 lines changed | Single Task agent. Skip team setup entirely. |
| **Small** | 1-3 files, single domain | 2 teammates (implementer + tester) |
| **Medium** | 4-10 files, crosses 2-3 domains | 2-3 teammates (implementers by domain + tester) |
| **Large** | 10+ files, multiple domains | 3-5 teammates (implementers by domain + tester + reviewer) |

For plan-driven mode, count the `ready` + `pending` tasks and their file scope to determine size.
For ad-hoc mode, use the Explore agent's findings.

**Trivial scope shortcut**: Spawn one Task agent with the work description, file scope, and conventions context. After completion, jump directly to Phase 4: Verification (single pass), then Phase 5: Completion.

---

## Phase 2: Team Setup

This phase applies to small, medium, and large scope only.

### Step 1: Attempt Agent Teams (Required First)

Call `TeamCreate` to create a team. This is mandatory.

**If TeamCreate succeeds**: Create teammates appropriate to the work:

| Role | When to Include | Responsibilities |
|------|----------------|-----------------|
| **Implementer** | Always | Writes source code. One per independent file set or domain. |
| **Test Writer** | Small+ when tests needed | Writes test files. Follows project test patterns. |
| **Reviewer** | Large scope | Reviews implementation for conventions compliance. Does not write code. |

Name teammates by their function: `backend-engineer`, `frontend-engineer`, `test-engineer`, `api-engineer`, etc. Use domain-specific names when the work spans multiple areas.

When sending work to teammates via `SendMessage`, include:
- Clear description of what to implement
- Specific files to create or modify
- Conventions from CLAUDE.md to follow
- For test writers: what to test, expected patterns, QAC items to satisfy
- Mandatory return format: state COMPLETE or FAILED, summarize what was done in under 200 tokens, write all output to files

**If TeamCreate is unavailable** (tool not in available tools list): Fall back to sequential Task agents.

### Step 2: Sequential Fallback (Only If TeamCreate Unavailable)

Announce:
```
Agent Teams unavailable. Using sequential Task agent execution.
```

In fallback mode:
- Group tasks by dependency layer (layer 0 = no dependencies, layer 1 = depends only on layer 0, etc.)
- Spawn all tasks within each layer as parallel Task agents
- Wait for each layer to complete before starting the next
- Each Task agent gets: work description, file scope, conventions context, mandatory COMPLETE/FAILED return format

### Step 3: Verify Execution Path

Before proceeding, confirm which path was taken:
- `EXECUTION PATH: Agent Teams` -- TeamCreate succeeded, teammates created
- `EXECUTION PATH: Sequential Task agents` -- TeamCreate unavailable, using fallback

If neither condition is met, return to Step 1.

---

## Phase 3: Execution

The coordinator delegates and monitors. It does NOT implement.

### Plan-Driven Execution

1. **Dependency ordering**: Execute tasks in dependency order. No task starts before all its `depends-on` tasks complete.
2. **Parallel execution**: Tasks with no mutual dependencies execute simultaneously.
3. **File ownership**: No two agents write the same file simultaneously. If tasks share files, they must be sequential.
4. **Task assignment**:
   - Agent Teams: Send tasks to appropriate teammates via `SendMessage` based on domain/role match
   - Sequential: Spawn Task agents per dependency layer
5. **Status updates**: After each task completes, update its `T-NNN.md` frontmatter:
   - Success: `status: done`
   - Failure: `status: failed`
   - Blocked by failed dependency: `status: skipped`
6. **Failure handling**: A failed task blocks its transitive dependents. Independent tasks continue.

### Ad-Hoc Execution

1. **Work packages**: Break the description into discrete work packages based on scope assessment.
2. **Assignment**: Assign work packages to teammates (Agent Teams) or spawn as Task agents (fallback).
3. **Verification**: After implementation, verify against CLAUDE.md conventions if they exist.

---

## Phase 4: Verification

After implementation completes, verify the work:

1. **Conventions check**: If CLAUDE.md has a Conventions section, spawn a Task agent to review the changed files against those conventions. The agent reports any violations.
2. **Test execution**: If tests were written, attempt to run them. Report pass/fail.
3. **Scope check**: Verify that the implementation matches the plan scope (plan-driven) or the description (ad-hoc). Flag any files modified that were not in scope.

If verification finds issues:
- For conventions violations: send corrections to the responsible agent (Agent Teams) or spawn a fix-up Task agent (sequential)
- Allow up to 2 correction cycles per task. After 2 failed cycles, report the issue and move on.

---

## Phase 5: Completion

### Completion Report

Use the template at [completion-report-template.md](completion-report-template.md) to generate the completion summary. Populate all `{placeholder}` values with actual data from the execution:

- **Execution**: mode, execution path, and scope from Phase 0 and Phase 1
- **Results**: counts gathered during Phase 3 and Phase 4
- **Files Changed**: every file created, modified, or deleted during execution
- **Acceptance Criteria Coverage**: include for plan-driven mode only, mapping BAC/QAC items to the tasks that satisfied them
- **Issues**: include only if there are failed tasks, verification issues, or uncovered criteria
- **Next Steps**: always include `/review` and test command; add issue resolution guidance if issues exist

### Team Shutdown

If Agent Teams was used, the team dissolves naturally when the skill completes. No explicit shutdown needed.
