---
name: test
description: "Generate tests for source files following project conventions and detected framework"
argument-hint: "<file-or-module-path>"
context: fork
allowed-tools: ["Read", "Grep", "Glob", "Write", "Edit", "Bash(git:*)", "Bash(mkdir:*)", "Bash(ls:*)", "Bash(npm:*)", "Bash(npx:*)", "Bash(python:*)", "Bash(pytest:*)", "Bash(go:*)", "Bash(dotnet:*)"]
---

# Generate Tests

Generate tests for source files, following the project's established patterns and detected test framework. Writes new test files and validates them by running the test suite.

**Target**: $ARGUMENTS (one or more file paths or module names, e.g., `src/auth/middleware.ts` or `src/utils/`). If no arguments, generates tests for all uncovered source files.

## Prerequisites

1. **Target resolution**: If arguments are provided, verify each target file or directory exists. If a target cannot be found:

```
ERROR: Could not find "{target}" in the project.

Try providing a more specific path or check the name.
```

2. **CLAUDE.md** (informational): If `CLAUDE.md` exists, load it for test commands and conventions. If not, detect from manifests.

## Behavior

### Step 1: Detect Test Framework and Conventions

Spawn a Task agent to scan the project and determine:

**Framework detection** (check in order, use first match):

| Manifest/Config | Framework | Language |
|----------------|-----------|----------|
| `vitest.config.*` or `vite.config.*` with test | Vitest | TypeScript/JavaScript |
| `jest.config.*` or `package.json` "jest" key | Jest | TypeScript/JavaScript |
| `pytest.ini`, `pyproject.toml` `[tool.pytest]`, `conftest.py` | pytest | Python |
| `*_test.go` files exist | Go testing | Go |
| `*.test.csproj` or `xunit`/`nunit` in `*.csproj` | xUnit/NUnit | .NET |
| `pom.xml` with junit/testng | JUnit/TestNG | Java |

**Convention detection**:
- Test file naming pattern (e.g., `*.test.ts`, `*_test.go`, `test_*.py`)
- Test file location (co-located vs `__tests__/` vs `tests/` directory)
- Import/assertion style from existing test files
- Mocking patterns from existing test files
- Setup/teardown conventions

If `CLAUDE.md` specifies test commands or conventions, those take priority over detection.

If `standards/testing-standards.md` exists: load and merge with detected conventions. Priority order: CLAUDE.md > standards files > auto-detection > general best practices. The absence of a standards file does not disable agent judgment.

### Step 2: Identify Targets

| Mode | Trigger | Files Targeted |
|------|---------|----------------|
| **Specific files** | Arguments provided | Only the specified files/directories |
| **Uncovered files** | No arguments | Source files that have no corresponding test file |

For uncovered mode:
1. Scan the codebase for source files matching detected languages
2. For each source file, check if a corresponding test file exists using the detected naming convention
3. Exclude: generated code, config files, type definition files (`.d.ts`), migrations, build output
4. Return the list of source files with no matching test file

### Step 3: Analyze Source Files

For each target file, spawn a Task agent to analyze the code under test:

1. Read the source file completely
2. Identify all exported functions, classes, and methods
3. Determine function signatures, parameter types, and return types
4. Identify dependencies that need mocking (external services, databases, file system, network calls)
5. Note error paths and edge cases (null checks, boundary conditions, error throws, early returns)
6. Check for existing tests that partially cover this file

The agent returns: exports list, function signatures, dependencies to mock, edge cases, and existing test coverage.

### Step 4: Create Test Plan

Before writing any tests, produce a test plan using the template at [test-plan-template.md](test-plan-template.md). The plan consolidates framework detection, coverage gaps, test strategy per file, edge cases, and execution order. Output the plan to stdout for review.

### Step 5: Generate Test Files

For each analyzed source file, spawn a Task agent to write the test file:

1. Follow the detected test file naming convention
2. Follow the detected test file location convention
3. Structure tests according to project conventions (or framework defaults)
4. Generate tests covering:
   - **Happy path**: Each exported function/method with valid inputs producing expected outputs
   - **Edge cases**: Boundary values, empty inputs, null/undefined handling, zero-length collections
   - **Error paths**: Invalid inputs, expected throws, error propagation, rejected promises
   - **Integration points**: Mocked dependencies returning various states (success, failure, timeout, empty)
5. Use the assertion style consistent with existing tests
6. Set up mocks following project patterns
7. Write the test file using the Write tool

**Test quality standards** (think senior QA engineer, not coverage checklist):
- Each test asserts ONE behavior with a descriptive name stating the expected outcome
- Tests are independent -- no shared mutable state, no order dependency
- Edge cases are not afterthoughts -- boundary conditions, empty inputs, and error paths get equal coverage
- Mocks are minimal -- only mock what crosses a boundary (network, database, file system)
- Test names read as documentation: `should return 404 when user not found` not `test getUserById`

### Step 6: Validate Generated Tests

For each generated test file, attempt to run it:

1. Detect the test runner from Step 1
2. Run the test file in isolation
3. If tests fail due to generation errors (syntax, import paths, type mismatches):
   - Read the error output, fix the issues, and re-run (up to 2 retries)
   - If still failing after retries, keep the test file but flag it in the report
4. If tests fail due to actual bugs found in source code, note this in the report as a potential bug discovery

### Step 7: Report Results

```
## Test Generation Complete

### Output
| Source File | Test File | Tests | Status |
|-------------|-----------|-------|--------|
| {source} | {test-file} | {count} | Pass/Fail/Skipped |

### Summary
| Metric | Count |
|--------|-------|
| Source files analyzed | {N} |
| Test files generated | {N} |
| Total test cases | {N} |
| Tests passing | {N} |
| Tests failing | {N} |
| Bugs potentially found | {N} |

### Failing Tests (if any)
| Test File | Test Name | Failure Reason |
|-----------|-----------|----------------|
| {file} | {name} | {reason} |

### Next Steps
- Review generated tests and adjust assertions as needed
- Run full test suite to verify no regressions
- Run /review to validate test quality
```

## Constraints

- **Writes test files only**: This skill creates new test files but does NOT modify source code
- **Delegate all work**: All source reading, test writing, and test execution MUST happen via Task agents, not in main context
- **No source modifications**: If a source file needs changes to be testable (e.g., missing exports), flag it in the report but do not modify it
- **Framework-aware**: Generated tests must use the correct test framework and assertion library. Do not mix frameworks
- **Idempotent**: Re-running overwrites previously generated test files for the same sources. Existing hand-written tests are NEVER overwritten
- **Runnable output**: Generated tests should run without manual intervention. If they cannot, the report must explain why
- **Expert test design**: Think senior QA engineer -- edge cases, error paths, and boundary conditions are primary concerns, not afterthoughts

## Sub-Agent Awareness

Before spawning test generation agents, check `.claude/agents/` for a test-engineer sub-agent. If one exists, prefer it for test writing and validation. Project sub-agents carry domain knowledge specific to this codebase. See https://code.claude.com/docs/en/sub-agents.
