---
name: plan
description: "Structured feature planning with BAC, QAC, impact analysis, and implementation steps"
argument-hint: "<feature-description>"
context: fork
allowed-tools: ["Read", "Grep", "Glob", "Write", "Edit", "Bash(git:*)", "Bash(mkdir:*)", "Bash(ls:*)"]
agent: Plan
---

# Plan

Structured feature planning with business acceptance criteria, QA acceptance criteria, impact analysis, and implementation steps. Produces a plan document in a canonically numbered folder that feeds into task decomposition and implementation.

**Feature description**: $ARGUMENTS

## Prerequisites

Before proceeding, verify:

1. **Argument provided**: A feature description must be given. If no argument is provided, stop and report:

```
ERROR: No feature description specified.

Usage: /plan <feature-description>

Examples:
  /plan Add OAuth2 login flow with Google and GitHub providers
  /plan Migrate user preferences from localStorage to database
  /plan Add rate limiting to public API endpoints
```

2. **CLAUDE.md exists**: `CLAUDE.md` should exist at the project root. If not, warn: `CLAUDE.md not found. Run /setup first for richer plans with project context.`
3. **Output directory**: `plans/` must exist. If not, create it.

## Behavior

### Step 1: Load Project Context

Read `CLAUDE.md` to determine:
- Technology stack (languages, frameworks, test tools)
- Project structure (directories and their purposes)
- Conventions (naming, testing, error handling)
- Available agents

This context shapes the impact analysis and implementation plan. If CLAUDE.md is missing, proceed with reduced context.

### Step 2: Analyze Requirements

Parse the feature description to identify:
- Core functionality being added or changed
- User-facing vs internal scope
- Likely technical domains involved (API, database, UI, auth, messaging, etc.)
- Implicit non-functional requirements (performance, security, accessibility)

### Step 3: Spawn Explore Agents for Impact Analysis

Delegate all codebase reading to Explore agents. Spawn agents to understand the current state of areas the feature will touch:

| Agent | Focus | What to Determine |
|-------|-------|-------------------|
| Entry Points | Routes, controllers, handlers, commands related to the feature domain | Where new entry points should be added or existing ones modified |
| Data Model | Database schemas, migrations, models, types in the feature domain | What data model changes are needed, existing entities to extend |
| Business Logic | Services, use-cases, domain logic in the feature area | Existing patterns to follow, code to extend vs create |
| Integration Points | External services, APIs, message queues the feature may interact with | Dependencies and integration patterns already established |

Only spawn agents relevant to the feature. A purely UI feature does not need a Data Model agent. A background job does not need an Entry Points agent focused on HTTP routes.

Each agent reports:
- Relevant existing files and their roles
- Patterns established in that area (conventions to follow)
- Gaps or extension points for the new feature
- Potential conflicts or concerns

Follow the detailed workflow in [workflow.md](workflow.md) for scope assessment and impact analysis structure.

### Step 4: Synthesize Feature Plan

Using the requirements analysis and agent findings, produce a structured plan.

**Determine the plan folder number:**

Scan `plans/` for existing `P-NNN-*` directories. Find the highest NNN value, increment by 1, and zero-pad to 3 digits. If no plans exist, start at `001`.

**Generate the slug:**

Derive a slug from the feature description: lowercase, replace spaces and non-alphanumeric characters with hyphens, collapse consecutive hyphens, trim leading/trailing hyphens, truncate to max 40 characters (do not truncate mid-word -- trim to the last complete word within 40 chars).

**Create the output folder and write the plan:**

1. Create the folder: `plans/P-{NNN}-{slug}/`
2. Write the plan to: `plans/P-{NNN}-{slug}/plan.md`

**Output format**: Use the template defined in [plan-template.md](plan-template.md). Read that file now to load the output format.

### Step 5: Report Results

Display a summary:

```
## Feature Plan Complete

### Output
- Plan folder: plans/P-{NNN}-{slug}/
- Plan document: plan.md

### Summary
| Metric | Count |
|--------|-------|
| Requirements identified | {N} |
| BAC items | {N} |
| QAC items | {N} |
| Files affected | {N} |
| New files to create | {N} |
| Implementation steps | {N} |
| Tests planned | {N} |
| Open questions | {N} |

### Next Steps
- Review the plan and resolve any open questions
- Run /tasks P-{NNN} to break the plan into implementation task files
```

## Constraints

- **HARD STOP**: This skill produces a plan document and terminates. Do NOT invoke downstream skills, offer to begin implementation, or proceed beyond presenting the plan summary. `/implement` is the only path from plan to code.
- **Read-only analysis**: This command does NOT modify source code. It only creates a plan document
- **Delegate all file access**: All codebase reading MUST happen via Explore agents, not in main context
- **Facts only**: The impact analysis reports what IS in the codebase. Implementation steps describe what WILL be done, not opinions on approach quality
- **Canonical numbering**: Plan folders use `P-NNN` prefix with zero-padded 3-digit numbers, auto-incremented from the highest existing folder
- **Idempotent**: Safe to re-run. Creates a new numbered folder each time (does not overwrite previous plans)
- **BAC and QAC are mandatory**: Every plan must have explicit Business Acceptance Criteria and QA Acceptance Criteria sections. These are not optional.

## Sub-Agent Awareness

Before spawning Explore agents for impact analysis, check `.claude/agents/` for project-defined sub-agents (e.g., an architecture-focused agent). If a matching sub-agent exists, prefer it via the Agent tool with the corresponding `subagent_type`. Project sub-agents carry domain knowledge specific to this codebase. See https://code.claude.com/docs/en/sub-agents.
