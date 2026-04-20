# Standards Compliance Report Template

Use this template to generate the standards compliance report. Replace all `{placeholder}` values with actual findings from the check agents.

---

# Standards Compliance Report

> Checked {N} files against {M} standards files on {date}
> Target: {changed files | staged | all | path}

## Summary

| Standards File | Errors | Warnings | Conflicts | Suppressed |
|----------------|--------|----------|-----------|------------|
| {filename} | {n} | {n} | {n} | {n} |
| **Total** | **{n}** | **{n}** | **{n}** | **{n}** |
| Linter-enforced (skipped) | -- | -- | -- | {n} |

## Conflicts

> Omit this section if no cross-file conflicts were detected.

- **[C-001]** `{file}:{line}` -- {description}
  {standards-file-A} says: "{convention A}"
  {standards-file-B} says: "{convention B}"
  Resolve the conflict in the standards files.

## Findings

> Organize findings by standards file. Within each file, list Errors first, then Warnings. Omit empty subsections.

### {Standards File Name}

#### Errors

- **[E-001]** `{file}:{line}` -- {description}
  Standard: "{quoted convention from standards file}"

- **[E-002]** `{file}:{line}` -- {description}
  Standard: "{quoted convention from standards file}"

#### Warnings

- **[W-001]** `{file}:{line}` -- {description}
  Standard: "{quoted convention from standards file}"

- **[W-002]** `{file}:{line}` -- {description}
  Standard: "{quoted convention from standards file}"

### {Next Standards File Name}

#### Errors

...

#### Warnings

...

## Result: {PASS | {N} errors, {M} warnings, {K} conflicts}
