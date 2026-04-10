# Completion Report Template

Use this template to generate the implementation completion report. Replace all `{placeholder}` values with actual data from the execution.

---

## Implementation Complete

### Execution

- **Mode**: {plan-driven | ad-hoc}
- **Execution path**: {Agent Teams | Sequential Task agents}
- **Scope**: {trivial | small | medium | large}

### Results

| Metric | Count |
|--------|-------|
| Tasks completed | {N} |
| Tasks failed | {N} |
| Tasks skipped | {N} |
| Files created | {N} |
| Files modified | {N} |
| Tests written | {N} |
| Tests passing | {N} |
| Verification issues | {N} |

### Files Changed

| File | Action | Task |
|------|--------|------|
| {path/to/file} | {created \| modified \| deleted} | {T-NNN or work-package reference} |

### Acceptance Criteria Coverage

> Include this section for plan-driven mode only. Omit entirely for ad-hoc mode.

| Item | Status | Satisfied By |
|------|--------|--------------|
| {BAC-N} | {covered \| NOT COVERED} | {T-NNN, T-NNN \| --} |
| {QAC-N} | {covered \| NOT COVERED} | {T-NNN \| --} |

### Issues

> List any problems encountered during implementation. Omit this section entirely if there are no issues.

- **Failed tasks**: {list task IDs and failure reasons, or "None"}
- **Verification issues**: {list convention violations or test failures, or "None"}
- **Uncovered criteria**: {list acceptance criteria not satisfied, or "None"}

### Next Steps

- Run `/review` to check implementation against project conventions
- Run tests to verify: `{detected test command or "check your test runner"}`
- {If issues exist: "Resolve the issues listed above before merging"}
