---
name: implement
description: "Execute implementation from a plan or ad-hoc description using agent delegation with continuous verification"
argument-hint: "<plan-reference | description>"
context: fork
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash(ls:*)", "Bash(mkdir:*)", "Bash(date:*)", "Task", "TeamCreate", "SendMessage"]
---

# HARD STOP -- READ THIS BEFORE DOING ANYTHING

**You MUST follow the instructions in this skill file and its orchestration.md EXACTLY as written. Every step. In order. No exceptions.**

- **Do NOT improvise.** Do not ad-hoc your own approach. Do not override, skip, reorder, or "improve" any instruction in this skill or orchestration.md.
- **Do NOT create files, spawn agents, or make orchestration decisions** outside of what this skill and orchestration.md explicitly define.
- **Follow the steps EXACTLY as written.** Every step, in the order they appear. No shortcuts.
- **The main context is a COORDINATOR, not an implementer.** You read, plan, delegate, and report. You NEVER write source code or test files directly.
- **Agent delegation is non-negotiable.** If you write a single line of implementation code in the main context, you have FAILED this skill.

---

# Implement

Execute implementation work in two modes: plan-driven (execute existing plan with task files) or ad-hoc (description-based, scope-scaled delegation). Both modes delegate all file modifications to agents and verify against project conventions.

**Input**: $ARGUMENTS

## Prerequisites

1. **Argument provided**: An implementation target must be given. If no argument is provided, stop and report:

```
ERROR: No implementation target specified.

Usage:
  /implement --plan <plan-reference>    # Plan-driven (execute task files)
  /implement T-NNN                      # Single task from a plan
  /implement <description>              # Ad-hoc implementation

Examples:
  /implement --plan P-001
  /implement --plan plans/P-001-rate-limiting
  /implement T-003
  /implement Add rate limiting middleware to the API routes
```

2. **CLAUDE.md** (optional but recommended): If present, load for project conventions and technology context.

## Step 1: Detect Execution Mode

Parse the argument to determine which mode to use:

| Argument Pattern | Mode | Detection Logic |
|------------------|------|-----------------|
| `--plan <ref>`, `P-NNN`, path containing `plans/` | **Plan-driven** | Argument references an existing plan |
| `T-NNN` or path containing `T-` (e.g., `T-003`, `plans/P-001-rate-limiting/T-003.md`) | **Task-reference** | Single task from an existing plan |
| Anything else | **Ad-hoc** | Free-text description |

**Note on ambiguity**: `P-NNN` (uppercase P) is a plan reference. `T-NNN` (uppercase T) is a task reference. If the argument matches both patterns (unlikely), prefer task-reference.

## Step 2: Load Context

1. Read `CLAUDE.md` if it exists (project conventions, tech stack)
2. Check for `standards/` directory. Read all `*.md` files found. Store as STANDARDS_CONTEXT. Pass alongside CLAUDE.md to orchestration.md. Priority order: CLAUDE.md > standards/ files > auto-detection > general best practices. The absence of standards files does not disable agent judgment.
3. For plan-driven: read `plan.md` and all `T-NNN.md` task files
4. For task-reference:
   - Locate the task file: search `plans/` directories for a file matching the `T-NNN` pattern (e.g., `plans/*/T-003.md`). If a path is given directly, use it.
   - If not found, stop with error: `ERROR: Task file T-NNN not found in any plan directory under plans/.`
   - Read the parent `plan.md` (same directory as the task file) for full project context
   - Read the task file and extract frontmatter: `task`, `status`, `depends-on`, `satisfies-bac`, `satisfies-qac`
   - Verify all `depends-on` tasks have `status: done`. If any dependency is not done, stop with error: `ERROR: Task T-NNN has unsatisfied dependencies: T-XXX (status: pending), T-YYY (status: pending). Complete those tasks first.`
5. For ad-hoc: parse the description for scope and intent

## Step 3: Hand Off to Orchestration

After mode detection and context loading, all execution logic lives in [orchestration.md](orchestration.md). Do not proceed with any implementation logic in this file.

Pass the following context:
- **Mode**: Plan-driven, Task-reference, or Ad-hoc
- **Input**: parsed plan reference, task file + parent plan, or description
- **Project context**: CLAUDE.md contents if available

For task-reference mode, pass to orchestration as a "trivial" or "small" scope (single task = single agent). The orchestration engine treats it like plan-driven mode but with a single ready task.

**This skill file ends here.** All execution, team setup, verification, and completion logic is defined in orchestration.md.

## Constraints

- **Coordinator rule**: The main context NEVER writes source code, test files, or configuration files. It reads, plans, delegates, and reports. Period.
- **Agent delegation is mandatory**: All file modifications happen through agents. No exceptions, regardless of how small the change seems.
- **CLAUDE.md conventions**: If conventions exist, agents must follow them. Verification checks against them.
- **Task status updates**: In plan-driven mode, update task frontmatter status as work progresses.
- **Failure handling**: A failed task blocks its dependents but not independent tasks. Report failures clearly.

## Sub-Agent Awareness

Before creating teams or spawning agents, check `.claude/agents/` for project-defined sub-agents. If a sub-agent exists whose description matches the work being delegated (e.g., a database architect for schema changes, a frontend expert for UI work), prefer using it via the Agent tool with the matching `subagent_type`. Project sub-agents carry domain knowledge and conventions specific to this codebase. See https://code.claude.com/docs/en/sub-agents.
