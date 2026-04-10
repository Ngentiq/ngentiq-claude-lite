# Review Report Template

Use this template to generate the code review report. Replace all `{placeholder}` values with actual findings from the review agents.

---

## Code Review: {scope description}

### Summary

| Metric | Value |
|--------|-------|
| Files reviewed | {N} |
| Total findings | {N} |
| Critical | {N} |
| Error | {N} |
| Warning | {N} |
| Info | {N} |

### Critical Findings

> Security vulnerabilities, data loss risks, crash scenarios, authentication bypasses. Omit section if none.

#### C-001: {title}

- **File**: `{file_path}:{line}`
- **Category**: {security | data-loss | crash | auth-bypass}
- **Description**: {what the issue is and why it is critical}
- **Suggested fix**: {specific, actionable fix}

#### C-002: {title}

- **File**: `{file_path}:{line}`
- **Category**: {security | data-loss | crash | auth-bypass}
- **Description**: {what the issue is and why it is critical}
- **Suggested fix**: {specific, actionable fix}

### Error Findings

> Logic bugs, correctness issues, standards violations with functional impact. Omit section if none.

#### E-001: {title}

- **File**: `{file_path}:{line}`
- **Category**: {logic-bug | correctness | convention-violation | type-error}
- **Description**: {what the issue is and its functional impact}
- **Suggested fix**: {specific, actionable fix}

#### E-002: {title}

- **File**: `{file_path}:{line}`
- **Category**: {logic-bug | correctness | convention-violation | type-error}
- **Description**: {what the issue is and its functional impact}
- **Suggested fix**: {specific, actionable fix}

### Warning Findings

> Style deviations, convention mismatches, code smells, potential future issues. Omit section if none.

#### W-001: {title}

- **File**: `{file_path}:{line}`
- **Description**: {what the issue is}
- **Suggested fix**: {specific, actionable fix}

#### W-002: {title}

- **File**: `{file_path}:{line}`
- **Description**: {what the issue is}
- **Suggested fix**: {specific, actionable fix}

### Info Findings

> Observations and suggestions for improvement. Include only when there are noteworthy observations. Omit section if none.

#### I-001: {title}

- **File**: `{file_path}:{line}`
- **Description**: {observation or suggestion}

### Summary Table

| Severity | Count | Action Required |
|----------|-------|-----------------|
| Critical | {N} | Must fix before merge |
| Error | {N} | Should fix before merge |
| Warning | {N} | Consider fixing |
| Info | {N} | No action required |
| **Total** | **{N}** | |

### Top Recommendations

1. {Most impactful actionable recommendation based on findings}
2. {Second most impactful recommendation}
3. {Third most impactful recommendation}

---

Next: `/test` (generate tests) | `/pr` (generate PR description) | `/implement` (fix issues)
