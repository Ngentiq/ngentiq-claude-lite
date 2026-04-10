# Plan Workflow

Detailed planning workflow referenced by SKILL.md. Covers scope assessment, impact analysis structure, and sizing guidance.

---

## Scope Assessment

Before spawning Explore agents, perform an initial scope assessment based on the feature description. This determines how deep the impact analysis needs to go.

### Sizing Heuristic

| Size | Indicators | Impact Analysis Depth |
|------|-----------|----------------------|
| **Trivial** | Single function change, config update, copy change | 1 Explore agent, minimal plan |
| **Small** | 1-3 files, single domain, no new dependencies | 2 Explore agents, standard plan |
| **Medium** | 4-10 files, crosses 2-3 domains, may add dependencies | 3-4 Explore agents, full plan with phases |
| **Large** | 10+ files, crosses multiple domains, new services or infrastructure | 4 Explore agents, full plan with phases, recommend splitting |

For **large** features, consider recommending the user split into multiple plans before proceeding. Present the recommendation and wait for confirmation.

### Scope Assessment Questions

Ask yourself (do not ask the user):

1. How many existing files will this touch? (check entry points, models, services, tests)
2. Does this introduce new dependencies or external integrations?
3. Does this require data model changes?
4. Does this cross architectural boundaries (e.g., frontend + backend, service A + service B)?
5. Are there existing patterns to follow, or is this greenfield?

## Impact Analysis Structure

Each Explore agent should investigate and report in this format:

### Entry Points Agent

Focus: Routes, controllers, handlers, CLI commands, event listeners in the feature domain.

Report:
- Existing entry points related to this domain (file paths, patterns used)
- Middleware or interceptors in the request path
- Authentication/authorization requirements
- Where new entry points should be added
- Conventions: routing patterns, handler signatures, response formats

### Data Model Agent

Focus: Database schemas, migrations, ORM models, type definitions, validation schemas.

Report:
- Existing entities/tables in this domain
- Relationships between entities
- Migration patterns (tool, naming convention, organization)
- Validation patterns in use
- Where new models/schemas should be added
- Conventions: naming, field types, index patterns

### Business Logic Agent

Focus: Services, use-cases, domain logic, utilities, shared modules.

Report:
- Existing services in this domain
- Dependency injection patterns
- Error handling patterns
- Logging and observability patterns
- Where new logic should be added
- Conventions: service structure, method signatures, return types

### Integration Points Agent

Focus: External APIs, message queues, caches, file storage, third-party services.

Report:
- Existing integrations in the codebase
- Client patterns (HTTP clients, SDK wrappers, queue consumers)
- Retry and error handling for external calls
- Configuration patterns for external services
- Where new integrations should be added

## Synthesizing Findings

After all agents report, synthesize into the plan template:

1. **Requirements**: Derive from the feature description. Number as R1, R2, R3, etc.
2. **BAC items**: For each requirement, define what "done" looks like from a stakeholder perspective. Use user-facing language. Number as BAC-1, BAC-2, etc.
3. **QAC items**: For each requirement, define the quality gates. Use engineering language. Include edge cases, error paths, performance expectations. Number as QAC-1, QAC-2, etc.
4. **Impact Analysis**: Combine agent findings into affected files table and risk assessment.
5. **Architecture / Design**: Describe the approach, key patterns, and decisions. Reference existing patterns from agent findings.
6. **Implementation Plan**: Order steps by dependency. Group into phases if the feature is medium or large. Reference specific files from agent findings.
7. **Test Plan**: Map to QAC items. Identify unit vs integration vs e2e test needs.
8. **Risk Assessment**: Identify what could go wrong. Draw from agent findings (conflicts, missing patterns, complex integrations).
9. **Open Questions**: Capture ambiguities that need resolution before implementation.

## When to Recommend Splitting

Recommend splitting a plan if any of these apply:

- More than 15 implementation steps
- More than 3 distinct architectural domains affected
- Both infrastructure and application changes required
- Estimated to produce more than 20 task files
- Feature has clearly separable phases (e.g., "add the API" then "add the UI")

Present the recommendation:

```
This feature is large enough to benefit from splitting into separate plans:

1. P-{NNN}-{slug-part-1}: {description of phase 1}
2. P-{NNN+1}-{slug-part-2}: {description of phase 2}

This allows independent review, testing, and merging. Proceed with a single plan, or split?
```

Wait for user response.
