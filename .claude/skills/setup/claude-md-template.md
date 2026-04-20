# {Project Name}

## Overview

{Auto-generated description based on detected technologies, project structure, and manifest metadata. 2-3 sentences covering what the project is and its primary purpose.}

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Language | {detected from manifests} | {from manifest/lockfile} |
| Framework | {detected from dependencies} | {from manifest/lockfile} |
| Testing | {detected test framework} | {from manifest/lockfile} |
| Build | {detected build tool} | {from manifest/lockfile} |
| Infrastructure | {Docker, CI/CD, cloud config} | {if detectable} |

## Project Structure

| Directory | Purpose |
|-----------|---------|
| {dir}/ | {inferred purpose from directory name and contents} |

## Build Commands

| Command | Description | Source |
|---------|-------------|--------|
| {command} | {what it does} | {package.json scripts / Makefile / Cargo.toml / etc.} |

## Test Commands

| Runner | Command | Description |
|--------|---------|-------------|
| {detected test runner} | {full command} | {run all tests, watch mode, coverage, etc.} |

## Development Workflow

Available SDLC skills for this project:

| Skill | Purpose |
|-------|---------|
| `/standards [category]` | Generate or update project coding and architecture standards |
| `/standards-check [path]` | Verify code compliance against project standards |
| `/plan <feature>` | Create a structured feature plan with impact analysis |
| `/tasks <plan-ref>` | Decompose a plan into numbered task files |
| `/implement <plan-or-description>` | Execute implementation with agent delegation |
| `/review` | Code review against project conventions and standards |
| `/test <target>` | Generate tests for uncovered code |
| `/explain <target>` | Layered code explanation: purpose, design, patterns |
| `/commit` | Generate conventional commit message with approval flow |
| `/pr` | Generate PR description from branch commits |

## Conventions

Project standards are maintained in the `standards/` directory. Run `/standards` to generate or update.

{Generate this table dynamically from existing standards files. If no standards files exist yet, show the note below instead of the table.}

> Standards files not yet generated. Run `/standards` to analyze your codebase and generate standards, or `/standards --init` for best-practice templates.

{If standards files exist, list only the files that actually exist -- do NOT show dead links:}

| Standards File | Covers |
|---------------|--------|
| [Coding Standards](standards/coding-standards.md) | Naming, structure, error handling, imports |
{... one row per file that exists in standards/ ...}

> Run `/standards <category>` to add more categories. Run `/standards-check` to verify compliance.

## Agents

Sub-agent definitions live in `.claude/agents/`. Use the built-in `/agents` command to create and manage them. See https://code.claude.com/docs/en/sub-agents for the official format.
