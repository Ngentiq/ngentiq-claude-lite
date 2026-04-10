## Test Plan: {target}

### Framework

| Property | Value |
|----------|-------|
| Framework | {detected framework, e.g., Vitest, Jest, pytest, Go testing} |
| Runner | {test runner, e.g., vitest, jest, pytest, go test} |
| Config | {config file path, e.g., vitest.config.ts, jest.config.js} |
| Language | {language} |
| Assertion Style | {assertion library/style, e.g., expect, assert, chai} |
| Mocking | {mocking approach, e.g., vi.mock, jest.mock, unittest.mock, testify} |

### Coverage Analysis

| Source File | Exports | Existing Tests | Gap |
|-------------|---------|----------------|-----|
| {source file path} | {exported functions/classes count} | {existing test file or "None"} | {uncovered exports or "Fully covered"} |

### Test Strategy

#### {source-file-1.ts}

| Test Name | Type | Scenario |
|-----------|------|----------|
| should {expected behavior} when {condition} | unit | {what is being verified} |
| should {expected behavior} when {condition} | integration | {what is being verified} |
| should {expected behavior} when {condition} | e2e | {what is being verified} |

#### {source-file-2.ts}

| Test Name | Type | Scenario |
|-----------|------|----------|
| should {expected behavior} when {condition} | unit | {what is being verified} |

### Edge Cases

| Category | Cases |
|----------|-------|
| Boundary conditions | {min/max values, off-by-one, empty collections, single-element} |
| Error paths | {invalid inputs, thrown exceptions, rejected promises, timeout} |
| Null handling | {null, undefined, missing properties, optional parameters} |
| Type coercion | {unexpected types, string/number boundaries, boolean edge cases} |
| Concurrency | {race conditions, parallel execution, shared state -- if applicable} |

### Test File Mapping

| Source File | Test File Path |
|-------------|---------------|
| {src/path/to/source.ts} | {src/path/__tests__/source.test.ts} |

### Execution Plan

| Order | Test File | Dependencies | Rationale |
|-------|-----------|-------------|-----------|
| 1 | {test file path} | None | {why this goes first -- e.g., utility with no deps} |
| 2 | {test file path} | {depends on #1 passing} | {rationale} |
