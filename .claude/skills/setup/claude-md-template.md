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
| `/plan <feature>` | Create a structured feature plan with impact analysis |
| `/tasks <plan-ref>` | Decompose a plan into numbered task files |
| `/implement <plan-or-description>` | Execute implementation with agent delegation |
| `/review` | Code review against project conventions |
| `/test <target>` | Generate tests for uncovered code |
| `/explain <target>` | Layered code explanation: purpose, design, patterns |
| `/pr` | Generate PR description from branch commits |

## Conventions

### Naming

{Describe naming conventions: file naming, variable/function casing, class naming, constant conventions. Fill in based on detected patterns or leave for team to complete.}

### Error Handling

{Describe error handling approach: exception strategy, error types, logging patterns, user-facing error format.}

### Testing

{Describe test patterns: test file location, naming convention, assertion style, mocking approach, minimum coverage expectations.}

### Git

{Describe git workflow: branch naming, commit message format, PR process, merge strategy.}

## Agents

Sub-agent definitions live in `.claude/agents/`. Use the built-in `/agents` command to create and manage them. See https://code.claude.com/docs/en/sub-agents for the official format.
