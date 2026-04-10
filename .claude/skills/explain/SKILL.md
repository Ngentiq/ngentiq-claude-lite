---
name: explain
description: "Layered explanation of a module: purpose, design, relationships, patterns, and gotchas"
argument-hint: "<file-or-module-path>"
context: fork
allowed-tools: ["Read", "Grep", "Glob", "Bash(git log:*)", "Bash(git diff:*)", "Bash(git status:*)"]
agent: Explore
---

# Explain Code

Produce a layered explanation of a module's purpose, design, and relationships. Outputs directly to stdout -- no files are written.

**Target**: $ARGUMENTS

## Prerequisites

1. Parse the argument to determine the target. If no argument is provided, stop and report:

```
ERROR: No target specified.

Usage: /explain <file-path-or-module-name>

Examples:
  /explain src/auth/middleware.ts
  /explain AuthService
  /explain src/utils/
```

2. Resolve the target:
   - If the argument is a file path, verify the file exists
   - If the argument is a module/directory path, verify the directory exists
   - If the argument is a name (no path separators), search the codebase for matching files, classes, or modules

3. If the target cannot be resolved, stop and report:

```
ERROR: Could not find "{target}" in the project.

Searched for:
- File path: {target}
- Module name match: *{target}*

Try providing a more specific path or check the name.
```

## Behavior

### Step 1: Analyze the Target

Spawn an Explore agent to read and analyze the target code:

1. Read the target file(s) completely
2. Identify imports/dependencies (what the target uses)
3. Search for reverse dependencies (what uses the target) using Grep for import/require/use statements referencing the target
4. Note any configuration, interfaces, or types that the target defines or consumes
5. Identify notable implementation patterns (design patterns, error handling, caching, concurrency, etc.)
6. Check git log for recent change context (why was this last modified?)

The agent returns a structured analysis covering: file contents, imports, exports, dependents, and patterns observed.

### Step 2: Produce Layered Explanation

Using the analysis from Step 1, produce a layered explanation to stdout following the structure in [explanation-template.md](explanation-template.md). The template defines these layers: Purpose, Design, Relationships (with dependency tables), Key Patterns, Gotchas, and Quick Reference.

If the target is a directory/module with multiple files, include a file listing before the layers:

```
### Module Files
| File | Purpose |
|------|---------|
| {file} | {one-line purpose} |
```

### Step 3: Suggest Related Commands

```
---
Related: `/review {target}` | `/test {target}` | `/plan`
```

## Constraints

- **Output to stdout only**: Do not write any files. The explanation is displayed directly
- **Read-only**: This skill never modifies any project files
- **Factual only**: Describe what IS in the code. Do not suggest improvements, refactoring, or alternatives unless the user explicitly asks
- **Scope discipline**: If the target is a single file, explain that file. Do not expand scope to the entire project unless the user provides a directory
- **No padding**: If a section has nothing meaningful to say, omit it. A short, accurate explanation is better than a padded one
- **Lightest skill**: This is the simplest skill in the framework. Keep the output focused and concise

## Sub-Agent Awareness

Before spawning the Explore agent, check `.claude/agents/` for a code-analyst sub-agent. If one exists, prefer it for code analysis. Project sub-agents carry domain knowledge specific to this codebase. See https://code.claude.com/docs/en/sub-agents.
