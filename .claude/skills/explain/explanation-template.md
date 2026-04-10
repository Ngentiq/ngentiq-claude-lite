## {Target Name}

**Type**: {file | module | class | function | directory}
**Path**: {file or directory path}
**Language**: {detected language}
**Lines**: {line count}

### Purpose

{What this code does and why it exists. 2-4 sentences describing its role in the system, the problem it solves, and why it was built this way rather than an alternative approach.}

### Design

{How the module is structured internally. Key classes, functions, and exports with their responsibilities. Notable data structures, state management, and control flow. Focus on the "why" of design decisions -- trade-offs made, patterns chosen, and constraints that shaped the implementation.}

### Relationships

**Depends On** ({count} modules):

| Dependency | Why |
|------------|-----|
| `{import path}` | {what it uses from this dependency and why} |

**Depended On By** ({count} modules):

| Dependent | How |
|-----------|-----|
| `{file path}` | {how it uses this module} |

### Key Patterns

{Notable implementation choices that a developer should understand before modifying this code:

- Design patterns used (e.g., factory, observer, middleware chain)
- Error handling strategy (e.g., fail-fast, error boundaries, result types)
- Performance considerations (e.g., caching, lazy loading, batching)
- Security measures (e.g., input validation, sanitization, auth checks)
- Concurrency model (e.g., async/await patterns, worker threads, locks)

Only include patterns actually present -- do not pad with generic observations.}

### Gotchas

{Non-obvious behavior, edge cases, common pitfalls, or things that have caused bugs historically. Examples:

- Implicit ordering dependencies
- Side effects that aren't obvious from the function signature
- Assumptions about input format that aren't validated
- Behavior differences between environments (dev vs prod)

If there are no gotchas, omit this section entirely rather than inventing concerns.}

### Quick Reference

| Item | Signature / Value |
|------|-------------------|
| {key function/method} | `{signature}` |
| {key constant} | `{value}` |
| {key config point} | `{description}` |
