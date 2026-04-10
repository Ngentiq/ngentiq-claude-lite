# Getting Started: Plan-to-PR Walkthrough

A practical end-to-end walkthrough showing the complete development lifecycle. Each step shows the command and abbreviated output so you know what to expect.

---

## 1. Install

```bash
git clone https://github.com/ngentiq/ngentiq-claude-lite.git /tmp/ngentiq-claude-lite
bash /tmp/ngentiq-claude-lite/install.sh ~/my-project
```

```
[install] Copying hook to .claude/sdlc/hooks/inject-rules.js
[install] Copying rules to .claude/sdlc/rules/
[install] Copying skills to .claude/skills/
[install] Updating .claude/settings.json (hooks wired)
[install] Done. Restart Claude Code, then run /setup.
```

## 2. Setup

```
/setup
```

The setup skill scans your project and generates a tailored `CLAUDE.md`:

```
Detected Technologies:
  Runtime:    Node.js 20 (package.json)
  Language:   TypeScript 5.4 (tsconfig.json)
  Framework:  Express 4.21
  Testing:    Vitest 2.1
  Build:      tsup
  Linting:    ESLint 9, Prettier

Generated: CLAUDE.md (project conventions, build commands, structure)
Created:   plans/ directory

Next steps:
  /plan <feature>      — start planning a feature
```

## 3. Plan a Feature

```
/plan Add rate limiting to API routes
```

The plan skill produces a structured plan with business and QA acceptance criteria:

```
Created: plans/P-001-rate-limiting/plan.md

Plan: Add Rate Limiting to API Routes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Business Acceptance Criteria (BAC):
  BAC-1  API routes enforce per-client rate limits
  BAC-2  Rate limit headers included in all responses
  BAC-3  Exceeded clients receive 429 with retry-after

QA Acceptance Criteria (QAC):
  QAC-1  Unit tests for rate limiter middleware
  QAC-2  Integration test: 429 returned after limit exceeded
  QAC-3  Headers present in success and failure responses

Impact Analysis:
  New files:     src/middleware/rate-limiter.ts
  Modified:      src/app.ts (middleware registration)
  Test files:    src/middleware/__tests__/rate-limiter.test.ts

Implementation Steps: 4 steps identified
Risk Assessment: Low (isolated middleware, no schema changes)

⚠ HARD STOP — Review the plan before proceeding.
```

## 4. Decompose into Tasks

```
/tasks P-001
```

The tasks skill breaks the plan into numbered, dependency-ordered task files:

```
Created 4 task files in plans/P-001-rate-limiting/:

  T-001  Create rate limiter middleware         (no deps)
         → satisfies BAC-1
  T-002  Add response header injection          (depends: T-001)
         → satisfies BAC-2
  T-003  Register middleware in app.ts           (depends: T-001)
         → satisfies BAC-3
  T-004  Write tests for rate limiter           (depends: T-001, T-002, T-003)
         → satisfies QAC-1, QAC-2, QAC-3
```

## 5. Implement

```
/implement --plan P-001
```

The implement skill delegates all work to agents and coordinates execution:

```
Mode: Plan-driven | Scope: Small (4 tasks, 3 files)
Execution path: Agent Teams

Executing dependency layers:
  Layer 0: T-001 (rate limiter middleware) ............ DONE
  Layer 1: T-002 (response headers), T-003 (registration) .. DONE
  Layer 2: T-004 (tests) ............................. DONE

Verification:
  Conventions check: PASS (matches CLAUDE.md patterns)
  Test execution:    4 passed, 0 failed

Files changed:
  created   src/middleware/rate-limiter.ts
  modified  src/app.ts
  created   src/middleware/__tests__/rate-limiter.test.ts

Acceptance coverage: 3/3 BAC, 3/3 QAC — all satisfied.
```

You can also implement a single task:

```
/implement T-003
```

This locates T-003 in the plan, verifies its dependencies (T-001) are done, and executes it as a single-agent operation.

## 6. Review

```
/review
```

The review skill examines changed files against project standards:

```
Review: 3 files changed vs main
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

src/middleware/rate-limiter.ts
  ✓ No issues

src/app.ts
  warning  L42  Import order: middleware imports should follow route imports
                per project convention (eslint import/order)

src/middleware/__tests__/rate-limiter.test.ts
  info     L8   Consider adding a test for concurrent requests from
                the same client

Summary: 0 critical, 0 error, 1 warning, 1 info
```

## 7. Generate Tests

```
/test src/middleware/rate-limiter.ts
```

The test skill generates additional tests following project conventions:

```
Detected framework: Vitest 2.1
Test pattern:       src/**/__tests__/*.test.ts

Generated: src/middleware/__tests__/rate-limiter.test.ts (updated)
  Added: concurrent request handling test
  Added: custom window size edge case
  Added: Redis store error fallback

Running tests...
  7 passed, 0 failed

Summary: 3 new tests added, all passing.
```

## 8. Create PR

```
/pr --create
```

The PR skill generates a description from your commits and creates the PR:

```
PR #42: Add rate limiting to API routes
Branch: feat/rate-limiting → main

Summary:
  Adds per-client rate limiting middleware to all API routes
  with configurable window/max settings and standard headers.

Changes by Area:
  Middleware:  New rate-limiter.ts with sliding window algorithm
  App setup:   Registered middleware before route handlers
  Tests:       7 tests covering limits, headers, and edge cases

Acceptance Coverage:
  BAC-1 ✓  BAC-2 ✓  BAC-3 ✓
  QAC-1 ✓  QAC-2 ✓  QAC-3 ✓

https://github.com/your-org/your-repo/pull/42
```

---

## What's Next

- [Skill Reference](skills.md) -- Detailed docs for every skill including all arguments and options
- [Customization Guide](customization.md) -- How to add project rules, create agents, and extend the framework
