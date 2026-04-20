# Customization Guide

How to extend and adapt the framework for your project.

---

## Editing CLAUDE.md

`CLAUDE.md` at your project root is the primary way to give Claude context about your project. The `/setup` skill generates an initial version, but you should customize it.

### Recommended Sections

```markdown
# My Project

## Overview
Brief description of what the project does and its architecture.

## Technology Stack
- Language: TypeScript 5.x
- Runtime: Node.js 22
- Framework: Express 5
- Database: PostgreSQL 16 with Prisma ORM
- Testing: Vitest

## Project Structure
| Directory | Purpose |
|-----------|---------|
| src/      | Application source code |
| src/api/  | REST API routes and controllers |
| src/db/   | Database models and migrations |
| tests/    | Test files |

## Development Workflow
- Plan features with /plan before implementing
- Break plans into tasks with /tasks
- Implement with /implement for structured execution
- Review with /review before committing
- Generate tests with /test for uncovered code
- Create PRs with /pr

## Build Commands
- `npm run build` -- Compile TypeScript
- `npm run dev` -- Start development server
- `npm test` -- Run test suite
- `npm run lint` -- Run linter

## Conventions
- Naming: camelCase for variables/functions, PascalCase for types/classes
- Error handling: throw typed errors, catch at API boundary
- Imports: group by external, internal, relative; alphabetize within groups
- Testing: co-located test files (*.test.ts), describe/it structure

## Agents
See .claude/agents/ for available specialized agents.
```

### Tips

- Keep it factual -- Claude reads this on every prompt, so conciseness matters
- Include build/test commands so skills can detect and use them
- Document conventions that aren't obvious from the code
- Update it as the project evolves (run `/setup` again to refresh auto-detected sections)

---

## Adding PROJECT-RULES.md

Create `.claude/PROJECT-RULES.md` for custom rules that get injected alongside the framework rules on every prompt. This is the extension point for project-specific behavioral constraints.

### Example

```markdown
# Project Rules

## Database
- All database queries must use parameterized statements
- Migrations must be backwards-compatible (no dropping columns in use)

## API
- All endpoints must validate request bodies with Zod schemas
- Error responses must follow RFC 7807 (Problem Details)

## Security
- Never log PII (email, phone, SSN, IP addresses)
- All user input must be sanitized before database insertion

## Git
- Commit messages follow Conventional Commits format
- PRs must reference the plan number (P-NNN) in the description
```

### How It Works

The `sdlc-hook.js` hook reads both `RULES.md` (framework rules) and `PROJECT-RULES.md` (your rules) and injects them together. Your rules appear after the framework rules in the system context.

---

## Creating Custom Agents

Agents are specialized Claude personas defined in `.claude/agents/`. Use the built-in `/agents` command to manage them, or create them manually. See [sub-agents docs](https://code.claude.com/docs/en/sub-agents) for the official format.

### Agent File Structure

Create `.claude/agents/{name}.md`:

```markdown
---
name: database-architect
description: "Senior database architect specializing in PostgreSQL, schema design, and query optimization"
tools: Read, Edit, Write, Glob, Grep, Bash(git:*), Bash(psql:*), Bash(prisma:*)
---

You are a senior database architect with 15+ years of experience in
relational database design, query optimization, and data modeling.

## Expertise
- PostgreSQL internals: query planner, MVCC, indexing strategies
- Schema design: normalization, denormalization tradeoffs, temporal data
- Migration safety: backwards-compatible changes, zero-downtime migrations
- Query optimization: EXPLAIN analysis, index selection, query rewriting

## Priorities
- Data integrity above all else -- constraints, foreign keys, validation
- Query performance with proper indexing (but never premature optimization)
- Migration safety -- every migration must be reversible
- Clear naming: tables are plural nouns, columns describe their content

## Standards
- Always use parameterized queries (never string interpolation)
- Every table has created_at and updated_at timestamps
- Foreign keys have ON DELETE policies explicitly set
- Indexes justify their existence with query patterns

## Example Tasks
- Design a schema for user authentication with OAuth providers
- Optimize a slow query identified in production logs
- Review a migration for safety and backwards compatibility
- Add proper indexing for a new query pattern
```

### Persona Guidelines

- **Always senior/principal/architect level** -- agents should think like experts
- **Strong opinions, loosely held** -- agents should push back on bad patterns but defer when overruled
- **Domain-specific tools** -- tailor the `tools` field to what the agent actually needs
- **Concrete expertise** -- list specific technologies and patterns, not generic buzzwords

### Using Agents

Claude Code automatically discovers agents in `.claude/agents/`. They appear as specialized personas when Claude delegates work. You can also reference them directly by asking Claude to "use the database-architect agent" for specific tasks.

---

## Customizing Standards

The `/standards` skill generates standards files in `standards/` at your project root. These files are team artifacts -- editable, version-controlled, and reviewable via PR.

### Incremental Adoption

Start with one category and expand over time:

```
/standards coding                   # Start here -- coding conventions only
/standards testing                  # Add testing standards when ready
/standards architecture             # Add architecture standards later
```

`/standards-check` only checks against files that exist in `standards/`. Missing categories are ignored, not treated as failures. There is no pressure to generate all categories at once.

### Handling Disagreements

When team members disagree on a convention:

1. Change the convention's Consistency to `Under Review` -- this prevents enforcement by `/standards-check`
2. Add both positions to the Observations Requiring Decision section
3. Decide as a team and record the decision with Rationale, Decided-by, and Date fields
4. Run `/standards --review` to process pending decisions interactively

Standards files support a PR-based review workflow. Propose changes in a branch, review as a team, merge when agreed.

### Framework Migration

When migrating frameworks or languages (e.g., JavaScript to TypeScript, Express to Fastify):

1. Complete the migration in source code first
2. Re-run `/standards` for affected categories
3. Review any split patterns during the transition period
4. Re-run `/standards` again after migration is complete for clean Established markers

The skill detects tech stack changes and warns about potentially stale conventions.

### Onboarding New Team Members

Standards files serve as living documentation for new contributors:

- Point new developers to `standards/` for project conventions
- Have them run `/standards-check --all` to understand current compliance
- Rationale fields explain WHY conventions were chosen, not just what they are
- Observations sections show what the team is still deciding

### Standards Governance

Treat standards files like code:

- Review changes to `standards/` via PR, just like source code
- Consider adding `standards/` to your `CODEOWNERS` file
- Use `/review` on standards file changes to catch inconsistencies
- Use Change History sections to track when and why standards evolved

### Multi-Stack Projects

For projects with multiple languages or frameworks (e.g., .NET backend + Angular frontend):

- Each convention includes a Scope field with a glob pattern (e.g., `src/backend/**/*.cs`)
- `/standards` auto-detects stacks and generates scoped conventions
- `/standards-check` only checks conventions against files matching their Scope
- This prevents cross-stack false positives (e.g., enforcing C# naming in TypeScript files)

### Exceptions

Use `standards/.exceptions.md` to suppress known findings for specific paths:

```markdown
# Standards Exceptions

## Generated Code
- **Pattern**: `src/generated/**`
- **Suppressed conventions**: All
- **Reason**: Auto-generated protobuf output, not hand-written

## Legacy Module
- **Pattern**: `src/legacy/billing/**`
- **Suppressed conventions**: coding-standards/Naming
- **Reason**: Pre-migration code, will be rewritten in Q3
```

Every codebase has justified exceptions -- generated code, legacy modules, third-party integrations. Document the reason for each so future team members understand why the exception exists.

---

## Adding Custom Skills

Skills are slash commands defined by `SKILL.md` files in `.claude/skills/`.

> **See also:** [`claude-code-skills-reference.md`](claude-code-skills-reference.md) — authoritative reference for Claude Code skill anatomy: full frontmatter table (14 fields), supporting files, string substitutions, shell injection, `context: fork`, progressive disclosure, location precedence. The table below is a quickstart subset.

### Skill File Structure

Create `.claude/skills/{name}/SKILL.md`:

```markdown
---
name: my-skill
description: "One-line description of what this skill does"
argument-hint: "<required-arg> [--optional-flag]"
context: fork
allowed-tools: ["Read", "Grep", "Glob", "Write", "Edit"]
---

# Skill Title

Description of what this skill does.

**Target**: $ARGUMENTS

## Prerequisites

{What must be true before this skill can run}

## Behavior

### Step 1: {First action}
{Detailed instructions for what to do}

### Step 2: {Second action}
{Detailed instructions}

## Constraints
- {Rule this skill must follow}
- {Another rule}
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Skill identifier (used in `/name` command) |
| `description` | Yes | One-line description shown in skill listings |
| `argument-hint` | No | Usage hint shown to the user |
| `context` | No | `fork` for isolated context, omit for shared |
| `allowed-tools` | No | Pre-approves these tools (no per-use prompt) while the skill is active. Does not restrict — global permissions still govern. |
| `agent` | No | `Explore` for read-only analysis skills |

### Tips

- Use `context: fork` for skills that spawn agents (prevents context pollution)
- Constrain `allowed-tools` to the minimum needed -- read-only skills should not have Write/Edit
- Write behavior as numbered steps so Claude follows them sequentially
- Include a Constraints section to prevent scope creep

---

## Modifying Framework Rules

The framework ships two rule files that get injected on every interaction:

| File | Injected On | Purpose |
|------|-------------|---------|
| `.claude/sdlc/rules/RULES.md` | Every prompt | Delegation, concise returns, truthfulness, command discipline |
| `.claude/sdlc/rules/AGENT-RULES.md` | Every agent spawn | Scope, return format, file operations, quality |

### When to Modify

- **Add rules**: If you have universal constraints (e.g., "never modify files in vendor/"), add them to `RULES.md` or use `PROJECT-RULES.md` (preferred)
- **Relax rules**: If delegation is too aggressive for your workflow, soften R1 in `RULES.md`
- **Change agent behavior**: If the 200-token return limit is too restrictive, adjust it in `AGENT-RULES.md`

### Caveats

- Framework updates (re-running the installer) will overwrite `RULES.md` and `AGENT-RULES.md`. Use `PROJECT-RULES.md` for changes you want to survive updates
- The rules are deliberately minimal (4 critical rules). Adding too many rules dilutes their effectiveness -- Claude's attention is finite
- Test changes by running a few prompts and verifying the behavior matches your intent
