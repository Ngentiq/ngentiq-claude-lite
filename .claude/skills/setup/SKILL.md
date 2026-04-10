---
name: setup
description: "Project onboarding: detect technologies, create CLAUDE.md, verify hooks, initialize plans directory"
argument-hint: ""
context: fork
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash(ls:*)", "Bash(mkdir:*)", "Bash(node:*)", "Bash(git:*)"]
---

# Setup

Project onboarding skill. Run this first in any new project to detect your technology stack, generate a CLAUDE.md with project context, verify hook wiring, and prepare the plans directory.

## Prerequisites

None. This is the entry point for new projects.

## Behavior

### Step 1: Detect Project Root

Identify the project root by looking for these markers (in priority order):

1. `.git/` directory
2. `package.json`
3. `pyproject.toml` or `requirements.txt`
4. `go.mod`
5. `Cargo.toml`
6. `*.csproj` or `*.sln`
7. `pom.xml` or `build.gradle`
8. `Gemfile`
9. `composer.json`

If none found, use the current working directory and warn:

```
WARNING: No project markers detected. Using current directory as project root.
```

### Step 2: Scan for Technologies

Scan manifest files at the project root to detect the technology stack. For each file found, extract relevant information:

| Manifest File | What to Extract |
|---------------|-----------------|
| `package.json` | name, dependencies (frameworks: react, vue, angular, express, next, nest, etc.), devDependencies (test tools: jest, vitest, mocha, playwright, cypress), scripts |
| `tsconfig.json` | TypeScript usage |
| `requirements.txt` | Python packages (django, flask, fastapi, pytest, etc.) |
| `pyproject.toml` | Python project metadata, dependencies, build system |
| `go.mod` | Go module name, dependencies |
| `Cargo.toml` | Rust crate name, dependencies |
| `*.csproj` | .NET target framework, package references |
| `*.sln` | .NET solution structure |
| `pom.xml` | Java/Maven dependencies, plugins |
| `build.gradle` | Java/Kotlin/Gradle dependencies |
| `Gemfile` | Ruby gems (rails, sinatra, rspec, etc.) |
| `composer.json` | PHP packages (laravel, symfony, phpunit, etc.) |
| `Dockerfile` | Container usage |
| `docker-compose.yml` | Service orchestration |
| `.github/workflows/*.yml` | CI/CD pipeline existence |

Build a technology summary:

- **Languages**: detected programming languages
- **Frameworks**: detected application frameworks
- **Test tools**: detected test frameworks and runners
- **Build tools**: detected build systems and bundlers
- **Infrastructure**: Docker, CI/CD, cloud config

### Step 3: Scan Directory Structure

Use Glob to identify the top-level directory structure. For each directory, infer its purpose:

| Common Directory | Likely Purpose |
|-----------------|----------------|
| `src/` | Source code |
| `lib/` | Library code |
| `app/` | Application code |
| `test/`, `tests/`, `__tests__/`, `spec/` | Test files |
| `docs/` | Documentation |
| `scripts/` | Utility scripts |
| `config/` | Configuration |
| `public/`, `static/`, `assets/` | Static assets |
| `migrations/`, `db/` | Database migrations |
| `api/` | API definitions |

### Step 4: Check for Existing CLAUDE.md

If `CLAUDE.md` already exists at the project root:

1. Read its contents
2. Report what exists:
   ```
   CLAUDE.md already exists with the following sections:
   - {list of ## headings found}
   
   Options:
   1. Keep existing (no changes)
   2. Merge detected context into existing file
   3. Replace with fresh detection
   
   Which would you prefer?
   ```
3. Wait for user response before proceeding. Do NOT overwrite without confirmation.

If CLAUDE.md does not exist, proceed to Step 5.

### Step 5: Generate CLAUDE.md

Use the template at [claude-md-template.md](claude-md-template.md) as the structure for the generated file. Write `CLAUDE.md` to the project root, populating all `{placeholder}` values with data gathered in previous steps:

- **{Project Name}**: from the primary manifest file `name` field (e.g., `package.json`), or the directory name if no manifest provides a name
- **Overview**: 2-3 sentences based on detected technologies and project structure
- **Tech Stack**: one row per detected technology, with versions from manifests/lockfiles where available
- **Project Structure**: one row per top-level directory from Step 3
- **Build Commands**: extracted from `package.json` scripts, `Makefile`, `Cargo.toml`, etc.
- **Test Commands**: detected test runner and invocation command
- **Conventions subsections**: leave as placeholders for the team to fill in, unless patterns are clearly detectable from linter configs or existing code

### Step 6: Verify Hook Wiring

Check `.claude/settings.json` exists and contains the expected hook configuration:

1. Read `.claude/settings.json`
2. Verify it has a `hooks` key with `UserPromptSubmit` and `SubagentStart` entries
3. If hooks are properly wired, report: `Hooks: verified`
4. If hooks are missing or misconfigured, report:
   ```
   WARNING: Hook configuration incomplete in .claude/settings.json
   
   Expected hooks:
   - UserPromptSubmit -> .claude/sdlc/hooks/sdlc-hook.js prompt
   - SubagentStart -> .claude/sdlc/hooks/sdlc-hook.js agent
   
   Run the installer to fix: bash install.sh
   ```

### Step 7: Create Plans Directory

If `plans/` does not exist at the project root, create it:

```
mkdir plans
```

If it already exists, skip this step.

### Step 8: Report Summary

Display the onboarding summary:

```
## Setup Complete

### Detected
| Category | Found |
|----------|-------|
| Languages | {list} |
| Frameworks | {list} |
| Test tools | {list} |
| Build tools | {list} |
| Infrastructure | {list} |

### Created
- CLAUDE.md with project context
- plans/ directory for feature plans

### Verified
- Hook wiring: {verified | WARNING: incomplete}

### Next Steps
- Review and customize the Conventions section in CLAUDE.md
- Run /plan <feature> to start planning your first feature
```

## Sub-Agent Awareness

As part of the summary, report any sub-agents found in `.claude/agents/`. If none exist, suggest the built-in `/agents` command for creating new ones. See https://code.claude.com/docs/en/sub-agents for the official sub-agent format.

## Constraints

- **Read-only on source code**: This skill does NOT modify any source code files. It only creates/updates CLAUDE.md and the plans/ directory
- **No overwrite without consent**: If CLAUDE.md exists, always ask before replacing
- **Technology detection is best-effort**: Report what was found, do not guess or fabricate technologies not evidenced by manifest files
- **No configuration files**: This skill does not create or require any configuration beyond CLAUDE.md
- **Idempotent**: Safe to re-run. Detection always reflects current state
