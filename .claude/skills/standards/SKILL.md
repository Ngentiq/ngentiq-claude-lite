---
name: standards
description: "Generate or update project coding and architecture standards"
argument-hint: "[coding|architecture|testing|api] [--init] [--review]"
context: fork
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash(ls:*)", "Bash(mkdir:*)", "Bash(git log:*)", "Bash(git diff:*)", "Agent"]
---

# Standards

Generate, update, or review project coding and architecture standards. Produces structured standards files in `standards/` that are consumed by `/review`, `/implement`, `/test`, `/plan`, `/commit`, and `/pr`.

## Prerequisites

- CLAUDE.md should exist (run `/setup` first). Standards can be generated without it, but tech stack detection will be limited.

## Arguments

| Argument | Description |
|----------|-------------|
| (none) | Generate all relevant standards files |
| `coding` | Generate only coding-standards.md |
| `architecture` | Generate only architecture-standards.md |
| `testing` | Generate only testing-standards.md |
| `api` | Generate only api-standards.md |
| `--init` | Force greenfield mode (best-practice templates, no codebase analysis) |
| `--review` | Interactively review pending Observations and record team decisions |

## Behavior

### Step 1: Load Project Context

Read CLAUDE.md for tech stack, framework, and language info.

Determine mode:
- **Brownfield**: Project has 10+ non-trivial source files -> analyze existing patterns
- **Greenfield**: Project has <10 non-trivial source files -> generate best-practice standards
- **`--init` flag**: Force greenfield regardless of file count
- **`--review` flag**: Skip generation, go directly to Step 9

**Non-trivial source file**: A file with more than 10 lines of non-comment content in detected languages, excluding generated code, type declarations, config files, and dependency/build output directories (`node_modules/`, `vendor/`, `dist/`, `build/`, `target/`, `bin/`, `obj/`, `__pycache__/`).

**Category relevance detection** (when no category argument specified):
- `coding`: always relevant
- `architecture`: relevant if 3+ source directories exist
- `testing`: relevant if test files or test framework config detected
- `api`: relevant if HTTP framework, route files, or OpenAPI spec detected

Generate only relevant categories by default. The user can force any category with an explicit argument.

### Step 2: Assess Information Sufficiency

Before generating anything, evaluate whether there's enough information to produce useful standards. Ask the user when there isn't -- don't guess.

**Greenfield checks**:
- If CLAUDE.md is missing or has no Tech Stack section: ask "No tech stack detected. What languages, frameworks, and tools will this project use?"
- If languages detected but no frameworks: ask "I detected {languages} but no frameworks. What kind of application is this? (web API, CLI tool, library, data pipeline, desktop app)"
- If detected stack is too sparse for a requested category: "Not enough context to generate {category} standards -- {reason}. Skip this category, or provide more details?"

**Brownfield checks**:
- For each requested category, do a quick probe (Glob/Grep) to confirm relevant files exist:
  - `coding`: source files in detected languages (should always pass)
  - `testing`: test files (`*test*`, `*spec*`, `tests/`, `test/`, `__tests__/`). If none: "No test files detected. Skip testing standards, or generate from best practices?"
  - `architecture`: evidence of structure (multiple directories, module boundaries). If flat: report and ask
  - `api`: route/endpoint/controller files. If none: "No API endpoints detected. Skip API standards?"
- If conflicting patterns found (~50/50 split): surface as a question: "Found split convention: ~50% use {A}, ~50% use {B}. Which should be the standard?"

This step is a gate, not a blocker. Generate what's possible, skip or ask about the rest. Never silently generate thin or speculative standards.

### Step 3: Create Standards Directory

- `mkdir standards` at project root if it doesn't exist
- Check for existing standards files in each requested category
- If a file exists: operate in update mode (see Step 4, Update Mode section)

### Step 4: Generate Standards (Brownfield)

For each requested category, spawn one Explore agent. Each agent receives the **analysis dimensions** for its category -- what to look for, not what to find.

**File selection and sampling**:
- Exclude: `node_modules/`, `vendor/`, `.git/`, `build/`, `dist/`, `__pycache__/`, `bin/Debug/`, `target/`, and common patterns for detected stack
- Exclude: generated code (`*.pb.go`, `*.generated.*`, `*_gen.*`)
- Under 50 source files: analyze all
- 50+ source files: sample up to 50, prioritizing recent commits and core directories. Sample proportionally (minimum 5 per directory). Document sample size in the file header.

**Coding Standards -- analysis dimensions**:
- Naming patterns: variables, functions, classes, files, constants casing
- Module/file structure: import ordering, file organization
- Error handling: exception types, result types, error propagation
- Logging: structured vs unstructured, levels, context

**Architecture Standards -- analysis dimensions**:
- Layer/module boundaries: organizational structure, what references what
- Dependency direction: enforced rules, inward-only references
- Design patterns: recurring structural patterns (whatever the project uses)
- Framework idioms: established framework patterns (detect, don't assume)

**Testing Standards -- analysis dimensions**:
- Test file location: co-located, mirror tree, flat directory
- Naming conventions: file and method naming
- Framework usage: assertion style, mocking approach, organization
- Setup/teardown patterns: shared state management
- Test categories: unit, integration, e2e

**API Standards -- analysis dimensions**:
- Endpoint naming: What URL structure and casing conventions exist?
- Error response format: What error shape is returned? Status code conventions?
- Authentication: What auth pattern is used?
- Versioning: How are API versions managed, if at all?
- Pagination: What pagination style is used, if any?

The dimensions above are starting points. The agent should capture any significant patterns it discovers beyond these categories.

**Consistency ratings** (based on applicable files, not all files):
- **Established** (90%+): Hard rule. Report as "Established (N% -- X of Y applicable files)"
- **Majority** (60-89%): Soft rule
- **Observation** (<60%): Listed for team decision, not enforced
- **Deprecated**: Exists in old code, should not appear in new code. Not enforced.
- **Under Review**: Team has not decided. Not enforced.

**Consistency denominator**: Count only files where the convention is applicable. A naming convention measures against files that define functions, not config or images.

**Linter/formatter awareness**: Scan for linter configs (`.eslintrc*`, `.prettierrc*`, `pyproject.toml [tool.ruff]`, `.editorconfig`, etc.). If a convention is already enforced by tooling, add: `- **Enforced by**: {tool} ({rule name})`

**Multi-stack projects**: When multiple languages/frameworks are detected:
1. Organize conventions by stack with clear section headers (e.g., "## Naming -- Backend (.NET)")
2. Add a `Scope` field to each convention with the glob pattern for that stack's files
3. Never mix conventions from different stacks in the same section

**Update mode** (when standards file already exists):
1. Read existing file, extract conventions with Consistency levels
2. Identify `<!-- generated:... -->` sections (tool-owned) vs unmarked sections (user-owned)
3. Run brownfield analysis as normal
4. For each existing tool-owned convention:
   - Same or higher consistency: preserve unchanged
   - Lower consistency: flag as drift in Observations: "Consistency drift: {convention} was {level}, now detected at {N%}." Do NOT auto-downgrade.
   - Not detected at all: flag: "Convention may be stale: no matching code found."
5. New patterns: add as new generated entries with markers
6. User-owned sections: preserve verbatim
7. Append entry to Change History

**Framework migration detection**: Compare `Source:` header with current stack detection. If changed: "Tech stack change detected. Previous: {old}. Current: {new}. Standards may contain obsolete conventions."

### Step 5: Generate Standards (Greenfield)

When there's not enough code to analyze, use Claude's knowledge of the detected technologies:

1. Read tech stack from CLAUDE.md and Step 2 clarifications
2. Generate best-practice standards for each category
3. Mark all conventions as `Established (template)`
4. Include `{CUSTOMIZE}` markers for team-preference decisions

For multi-stack projects:
- Generate separate sections per stack
- Add `Scope` field to every convention with the appropriate glob
- Section headers identify which stack they apply to

### Step 6: Write Standards Files

Write each file to `standards/{category}-standards.md` using the format from [standards-template.md](standards-template.md).

Every generated section MUST be wrapped in markers:
```
<!-- generated:{category}:{section_slug} -->
...content...
<!-- /generated:{category}:{section_slug} -->
```

Include all sections from the template:
- Header with metadata (date, mode, source)
- Generated convention sections with markers
- Observations Requiring Decision (with decision template)
- Suppressed Conventions (empty initially)
- Change History (first entry)

### Step 6.5: Cross-File Consistency Check

If more than one standards file was generated or updated:

1. Spawn a single agent that reads all standards files
2. Identify contradictions between files (e.g., error handling approach in coding vs api standards)
3. Add contradictions to an `## Inter-Standard Conflicts` section in each affected file
4. Report conflicts in Step 8

If only one file was generated, skip this step.

### Step 7: Update CLAUDE.md Conventions Section

- Scan `standards/` for all `*.md` files that exist (excluding `.exceptions.md`)
- Generate the Conventions table dynamically -- only files that exist, no dead links
- If CLAUDE.md has manually-written conventions: leave intact, append standards table
- If `/setup` previously generated CLAUDE.md: use standards-aware Conventions section

### Step 8: Report Results and HARD STOP

Display:
- Table of files generated/updated with line counts
- Mode used (brownfield/greenfield) per file
- Count of Established/Majority/Observation/Deprecated patterns per file
- Cross-file conflicts found (if any)
- Drift detected (if update mode)

Then HARD STOP:

```
Standards files generated. Review before adopting:
  standards/coding-standards.md ({N} conventions)
  standards/testing-standards.md ({N} conventions)
  {conflicts found: N -- resolve before running /standards-check}

HARD STOP -- Review the generated standards files and make edits before committing.
  - Edit Rationale fields to document WHY conventions were chosen
  - Resolve any Observations Requiring Decision
  - Resolve any Inter-Standard Conflicts
  - Add Scope fields if conventions apply only to specific directories/stacks
Run /standards-check to preview enforcement impact.
```

Do NOT proceed to implementation, review, or any other action. Wait for the user.

### Step 9: --review (Interactive Observation Resolution)

When called with `--review`:

1. Read all standards files in `standards/`
2. Find all items with Consistency: Observation or Decision: pending
3. For each item, present to the user:
   ```
   Observation: ~50% camelCase, ~50% snake_case for function names
   Options:
   1. Promote to Established (enforce as error)
   2. Promote to Majority (enforce as warning)
   3. Mark as Deprecated (visible but not enforced)
   4. Remove (not a standard)
   5. Skip (decide later)
   ```
4. Record decisions: update Consistency, fill in Decision/Decided-by/Date/Rationale fields
5. Append to Change History
6. Report summary of decisions made

## Constraints

- **Read-only on source**: This skill modifies only `standards/` files and the CLAUDE.md Conventions section. Never modifies source code.
- **No overwrite without consent**: If standards files exist, operate in update mode (additive, drift-aware). Never silently overwrite.
- **Brownfield: facts only**: Report what IS, not what should be. No recommendations.
- **Greenfield: clearly marked**: All template conventions marked `Established (template)`.
- **Technology-agnostic**: Never hardcode language-specific conventions. Discover or generate dynamically.
- **Merge algorithm**: Generated sections use `<!-- generated:... -->` markers. On re-run, content inside markers is replaced. Content outside markers is preserved verbatim.
- **HARD STOP**: After generation, always stop and wait for user review.

## Sub-Agent Awareness

Check `.claude/agents/` for an `architect` or `standards` agent before spawning Explore agents. If found, use that agent's definition for analysis.
