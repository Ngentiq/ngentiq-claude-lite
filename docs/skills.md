# Skill Reference

Detailed documentation for each skill in the framework. Skills are invoked as slash commands in Claude Code.

---

## /setup

**Description**: Project onboarding -- detects technologies, wires hooks, and generates a project-specific CLAUDE.md.

**Usage**: `/setup`

**Arguments**: None

**What it produces**:
- `CLAUDE.md` at project root with detected tech stack, project structure, and workflow references
- Verifies `.claude/settings.json` has hooks wired correctly
- Creates `plans/` directory for feature planning
- Creates `standards/` directory for project standards
- Reports a summary of detected technologies, existing standards, and suggests next steps

**Example**:
```
/setup
```

**Notes**: Safe to re-run (idempotent). If CLAUDE.md exists, prompts with options: keep, merge, or replace. Run this first after installation.

---

## /standards

**Description**: Generate or update project coding and architecture standards by analyzing the codebase (brownfield) or applying best practices for the detected tech stack (greenfield).

**Usage**: `/standards [category] [--init] [--review]`

**Arguments**:
| Argument | Required | Description |
|----------|----------|-------------|
| `[category]` | No | Specific category: `coding`, `architecture`, `testing`, or `api`. If omitted, generates all relevant categories. |
| `--init` | No | Force greenfield mode (best practices, no codebase analysis) |
| `--review` | No | Interactively review Observations and make team decisions |

**What it produces**:
- `standards/coding-standards.md` -- naming, module structure, error handling, imports, logging
- `standards/architecture-standards.md` -- module boundaries, dependency rules, layer patterns
- `standards/testing-standards.md` -- test structure, naming, mocking, assertions, coverage
- `standards/api-standards.md` -- endpoint naming, error format, auth, versioning, pagination
- Updated CLAUDE.md Conventions section linking to generated standards files

Each convention includes: Convention, Consistency level (Established/Majority/Observation/Deprecated), Rationale, Scope, and Examples.

**Example**:
```
/standards                    # Generate all relevant categories
/standards coding             # Generate only coding standards
/standards --init             # Force best-practice templates (greenfield)
/standards --review           # Resolve pending Observations interactively
```

**Notes**: Ends with a **hard stop** after generating files -- review standards before committing. Brownfield mode reports what IS (facts only). Greenfield mode marks all conventions as `Established (template)`. Safe to re-run: preserves manual edits outside `<!-- generated -->` markers, detects drift, and appends to Change History. Irrelevant categories (e.g., `api` for CLI tools) are auto-skipped unless explicitly requested.

**Related**: `/setup` -> `/standards` (this skill) -> `/plan`

---

## /standards-check

**Description**: Verify code compliance against project standards files.

**Usage**: `/standards-check [path] [--staged] [--all]`

**Arguments**:
| Argument | Required | Description |
|----------|----------|-------------|
| `[path]` | No | Specific file or directory to check |
| `--staged` | No | Check staged files only |
| `--all` | No | Check all source files (full scan) |

**What it produces**:
- Structured compliance report with findings grouped by standards file:
  - **Error**: Violates Established convention
  - **Warning**: Violates Majority convention
  - **Conflict**: Contradictory findings between standards files
- Summary table with error/warning/conflict/suppressed counts per standards file
- Result line: PASS or counts of errors, warnings, and conflicts

**Example**:
```
/standards-check                     # Check changed files vs default branch
/standards-check src/api/            # Check specific directory
/standards-check --staged            # Check staged files only
/standards-check --all               # Full scan of all source files
```

**Notes**: Read-only -- never modifies source files. Only checks Established and Majority conventions (Observation, Deprecated, Under Review are informational only). Respects Scope fields for multi-stack projects. Loads `.exceptions.md` to suppress known findings. Exits cleanly when no standards files exist.

**Related**: `/standards` -> `/standards-check` (this skill), `/review` + `/standards-check`

---

## /plan

**Description**: Feature planning with business acceptance criteria (BAC), QA acceptance criteria (QAC), impact analysis, and implementation steps.

**Usage**: `/plan <feature description>`

**Arguments**:
| Argument | Required | Description |
|----------|----------|-------------|
| `<feature>` | Yes | Description of the feature to plan |

**What it produces**:
- `plans/P-NNN-{feature-slug}/plan.md` containing:
  - Requirements (business acceptance criteria)
  - QA acceptance criteria (technical verification)
  - Impact analysis (affected files, entry points, data model, integrations)
  - Implementation steps (ordered, with affected files per step)
  - Test plan
  - Risk assessment

**Example**:
```
/plan Add OAuth2 login with Google and GitHub providers
```

**Notes**: After planning, the skill performs a **hard stop** -- it will not proceed to implementation automatically. Review the plan, then use `/tasks` to decompose it or `/implement` to execute it.

**Related**: `/tasks` (decompose plan) -> `/implement` (execute plan)

---

## /tasks

**Description**: Decompose a plan into sequentially numbered task files with dependencies, scope, and acceptance criteria.

**Usage**: `/tasks [plan-reference]`

**Arguments**:
| Argument | Required | Description |
|----------|----------|-------------|
| `[plan-ref]` | No | Path to plan file or plan number (e.g., `P-001`). If omitted, uses the most recent plan in `plans/`. |

**What it produces**:
- `plans/P-NNN-{slug}/T-001.md` through `T-NNN.md` (max 20 tasks), each containing:
  - YAML frontmatter with status, dependencies, and acceptance criteria traceability
  - Scope description (what to do)
  - Acceptance criteria (linked to BAC/QAC from the plan)
  - Files to modify

**Example**:
```
/tasks P-001
/tasks plans/P-001-oauth-login/plan.md
```

**Notes**: Tasks have forward-only dependencies (T-003 can depend on T-001 but not vice versa). Each task traces back to specific BAC/QAC items from the plan.

**Related**: `/plan` (create plan) -> `/tasks` (this skill) -> `/implement` (execute tasks)

---

## /implement

**Description**: Execute implementation from a plan, single task, or ad-hoc description using agent delegation.

**Usage**: `/implement <plan-ref | task-ref | description>`

**Arguments**:
| Argument | Required | Description |
|----------|----------|-------------|
| `<target>` | Yes | Plan reference, task reference, or free-text description |

**Modes**:
| Argument Pattern | Mode | Description |
|------------------|------|-------------|
| `--plan <ref>`, `P-NNN`, path containing `plans/` | Plan-driven | Execute all tasks from an existing plan |
| `T-NNN` or path containing `T-` | Task-reference | Execute a single task from an existing plan (dependencies must be satisfied) |
| Anything else | Ad-hoc | Scope-scaled implementation from a free-text description |

**What it produces**:
- Implemented code changes via delegated Task agents
- Completion report with files modified, tests run, and verification status

**Example**:
```
/implement --plan P-001                                         # Execute full plan
/implement T-003                                                # Execute single task (checks dependencies)
/implement Add input validation to the user registration endpoint   # Ad-hoc
```

**Notes**: For plan-driven mode, spawns multiple Task agents in parallel where dependencies allow. Task-reference mode locates the task file, verifies all dependencies are done, then executes as a single-agent trivial/small scope. Verifies against CLAUDE.md conventions when available. Produces a structured completion report.

**Related**: `/plan` -> `/tasks` -> `/implement` (this skill) -> `/review`

---

## /review

**Description**: Code review with severity-based findings against project standards and best practices.

**Usage**: `/review [file-or-scope] [--staged] [--branch <ref>]`

**Arguments**:
| Argument | Required | Description |
|----------|----------|-------------|
| `[files]` | No | Specific file paths or directories to review |
| `--staged` | No | Review only staged changes |
| `--branch <ref>` | No | Compare against a specific branch/ref |

**What it produces**:
- Structured review report to stdout with findings grouped by severity:
  - **Critical**: Security vulnerabilities, data loss risks, crash potential
  - **Error**: Logic bugs, correctness issues, convention violations with functional impact
  - **Warning**: Style deviations, code smells, potential future issues
  - **Info**: Observations and suggestions (used sparingly)
- Each finding includes: file:line, severity, description, and suggested fix

**Example**:
```
/review                          # Review changed files vs default branch
/review src/auth/                # Review specific directory
/review --staged                 # Review staged changes
/review --branch feature/login   # Compare against a branch
```

**Notes**: Read-only -- never modifies code. Reviews as a principal engineer, not a checkbox. Spawns parallel agents for correctness, security, performance, and maintainability.

**Related**: `/implement` -> `/review` (this skill) -> `/test` -> `/pr`

---

## /test

**Description**: Generate tests for source files following project conventions and the detected test framework.

**Usage**: `/test [file-or-module-path]`

**Arguments**:
| Argument | Required | Description |
|----------|----------|-------------|
| `[target]` | No | File paths or directories. If omitted, targets all uncovered source files |

**What it produces**:
- Test files written following project naming conventions and directory structure
- Each test file covers: happy paths, edge cases, error paths, and integration points
- Validation: generated tests are run, with up to 2 retries to fix generation errors
- Summary report with pass/fail status per test file

**Example**:
```
/test src/auth/middleware.ts      # Generate tests for a specific file
/test src/utils/                  # Generate tests for a directory
/test                             # Generate tests for all uncovered files
```

**Notes**: Detects the test framework automatically (Jest, Vitest, pytest, Go testing, xUnit, etc.). Never overwrites hand-written tests. Only creates new test files or overwrites previously generated ones. If source code needs changes to be testable, flags it in the report rather than modifying source.

**Related**: `/review` -> `/test` (this skill) -> `/pr`

---

## /explain

**Description**: Layered code explanation covering purpose, design, relationships, key patterns, and gotchas.

**Usage**: `/explain <file-or-module-path>`

**Arguments**:
| Argument | Required | Description |
|----------|----------|-------------|
| `<target>` | Yes | File path, directory path, or module/class name |

**What it produces**:
- Explanation to stdout (no files written) with sections:
  - **Purpose**: What it does and why it exists
  - **Design**: Internal structure, key components, how they relate
  - **Relationships**: What it depends on / what depends on it
  - **Key Patterns**: Notable implementation techniques and conventions
  - **Gotchas**: Non-obvious behavior, edge cases, common pitfalls (omitted if none)

**Example**:
```
/explain src/auth/middleware.ts   # Explain a specific file
/explain AuthService              # Search for and explain a class/module
/explain src/utils/               # Explain an entire directory
```

**Notes**: The lightest skill in the framework. Purely read-only. Factual only -- describes what IS, never suggests improvements unless asked. Useful for onboarding onto unfamiliar code.

**Related**: `/explain` (this skill) -> `/review` -> `/test`

---

## /pr

**Description**: Generate a PR description from branch commits with summary, changes by area, test plan, and reviewer notes.

**Usage**: `/pr [--base <branch>] [--create]`

**Arguments**:
| Argument | Required | Description |
|----------|----------|-------------|
| `--base <branch>` | No | Target branch (default: auto-detected default branch) |
| `--create` | No | Create the PR via `gh pr create` instead of outputting to stdout |

**What it produces**:
- Structured PR body with: Summary, Changes by Area, Acceptance Coverage (if plan exists), Test Plan, Reviewer Notes
- With `--create`: creates the PR and returns the URL

**Example**:
```
/pr                    # Output PR description to stdout
/pr --create           # Create PR via gh CLI
/pr --base develop     # Compare against develop branch
/pr --create --base main
```

**Notes**: Without `--create`, this is read-only and outputs to stdout only. The PR description is derived entirely from commits and diffs -- nothing fabricated. If a plan file exists for the current work, the PR includes acceptance criteria coverage.

**Related**: `/review` -> `/test` -> `/pr` (this skill)

---

## /commit

**Description**: Generate conventional commit messages from staged/unstaged changes with user approval before committing.

**Usage**: `/commit [--all] [--amend]`

**Arguments**:
| Argument | Required | Description |
|----------|----------|-------------|
| `--all` | No | Include unstaged changes |
| `--amend` | No | Amend the previous commit (only if explicitly requested) |

**What it produces**:
- Analysis of current changes (staged and/or unstaged diffs)
- A conventional commit message (`type(scope): description`) matching project style
- Commit created only after explicit user approval

**Example**:
```
/commit                  # Commit staged changes
/commit --all            # Stage and commit all modified files
/commit --amend          # Amend the previous commit
```

**Notes**: NEVER commits without showing the message first and getting approval. Skips files matching secrets patterns (`.env`, credentials, keys). Matches the project's existing commit style from `git log`. Uses conventional commit format by default.

**Related**: `/review` -> `/test` -> `/commit` (this skill) -> `/pr`

---

## Typical Workflow

```
/setup                              # 1. Onboard the project
/standards                          # 2. Generate project standards
/plan Add user authentication       # 3. Plan a feature
/tasks P-001                        # 4. Decompose into tasks
/implement P-001                    # 5. Execute implementation
/review                             # 6. Review changes
/standards-check                    # 7. Check standards compliance
/test src/auth/                     # 8. Generate tests
/commit                             # 9. Commit with conventional message
/pr --create                        # 10. Create the PR
```

Each skill is independent -- you can use any skill at any time without following the full workflow.
