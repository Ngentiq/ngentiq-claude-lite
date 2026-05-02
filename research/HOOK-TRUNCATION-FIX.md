# ngentiq-claude-lite: Hook Output Truncation — Fix Plan

**Date:** 2026-04-24
**Status:** Applies to ngentiq-claude-lite; not yet implemented
**Reference fix:** ngentiq-claude v2.1.0+ (directive-based rule injection)
**Load this file independently** into a Claude Code session working on `ngentiq-claude-lite` to drive the fix end-to-end.

---

## Problem

Claude Code's hook system truncates hook stdout past ~10 KB via a `<persisted-output>` envelope. When the hook output exceeds the threshold, Claude Code replaces it with a 2 KB preview + a path to a persisted file; everything past the 2 KB mark never reaches the model's context. The hook still reports success. The failure is **silent**.

This defeats the whole point of continuous hook-based rule injection: re-inject rules every prompt so they can't decay. If the rules get truncated, delivery is broken and the model operates without them from the second half of the rule content onward.

Upstream references:
- Claude Code changelog 2.1.90 (2026-04-01): *"Changed hook output over 50K characters to be saved to disk with a file path + preview instead of being injected directly into context"* — the feature. The effective threshold observed in practice is ~10 KB, not 50K characters.
- No documented opt-out, config knob, or env var to raise or disable it.

## Where Lite Is Exposed

`sdlc-hook.js` emits full rule content to stdout for both hook events:

| Event | Code | Reads | Current risk |
|---|---|---|---|
| `UserPromptSubmit` | `handlePrompt` (`:54-73`) | `.claude/sdlc/rules/RULES.md` (~3.5 KB) + `.claude/PROJECT-RULES.md` (user-owned, unbounded) | **HIGH** — PROJECT-RULES.md size is customer-controlled; any team with substantive project rules hits the truncation cliff silently. |
| `SubagentStart` | `handleAgent` (`:81-118`) | `.claude/sdlc/rules/AGENT-RULES.md` (~2.3 KB) + small coordinator append | LOW today (3 KB total) but the same pattern; ready to break if AGENT-RULES.md grows. |

**Today's base files fit under threshold**, but the architecture has no safety margin and no back-pressure. A customer with a 10 KB PROJECT-RULES.md breaks silently.

## Verification Steps (run these to confirm the problem)

1. Inflate PROJECT-RULES.md to >10 KB in a test install:
   ```
   # In a test project with lite installed:
   node -e 'require("fs").writeFileSync(".claude/PROJECT-RULES.md", "# Project Rules\n\n" + "Line of project policy content.\n".repeat(400))'
   ```
2. Start a Claude Code session against that test project.
3. Observe the UserPromptSubmit hook output in the model's system-reminder.
4. **If the output is wrapped in `<persisted-output>` with a "Preview (first 2KB)" marker, the fix below is needed.** The model is no longer receiving the full rules — only the first 2 KB.

Alternatively, run the hook directly to see its total output size:
```
echo '{"session_id":"t"}' > /tmp/in.json
node .claude/sdlc/hooks/sdlc-hook.js prompt < /tmp/in.json > /tmp/out.txt
wc -c /tmp/out.txt
```
If `/tmp/out.txt` exceeds ~10,000 bytes, Claude Code will truncate it when the hook fires in a real session.

## Fix: Directive-Based Injection (same pattern as ngentiq-claude v2.1.0+)

Instead of emitting rule content inline, emit a small **"read this file"** directive per existing rule file. The model Reads each file directly and gets untruncated content regardless of how big the rules grow. The hook output stays under 2 KB regardless of rule size — size-independent by construction.

### Shape of the directive emission (target for both hook modes)

```
════════════════════════════════════════════════════════════════════════
  ***CRITICAL*** GOVERNANCE RULES — READ EACH FILE BEFORE RESPONDING
════════════════════════════════════════════════════════════════════════

The files listed below hold the governance rules this session operates
under. You MUST use the Read tool on EVERY file below BEFORE answering
the user. Skipping this step means you are operating without the rules
and will cause violations. Hook output is intentionally tiny; the rules
live in these files. Read them now.

  ***CRITICAL*** Read this file now:  /abs/path/to/.claude/sdlc/rules/RULES.md
                (framework governance rules)

  ***CRITICAL*** Read this file now:  /abs/path/to/.claude/PROJECT-RULES.md
                (project governance rules)

════════════════════════════════════════════════════════════════════════
```

The directive is imperative, visually distinct, and small. Use absolute paths so the model has no ambiguity about which file to Read.

### Lite-specific adaptation

Lite has fewer tiers than ngentiq-claude. Map them as follows:

| Lite file | Directive label |
|---|---|
| `.claude/sdlc/rules/RULES.md` | `framework governance rules (non-negotiable)` |
| `.claude/PROJECT-RULES.md` (if present) | `project governance rules` |
| `.claude/sdlc/rules/AGENT-RULES.md` | `base subagent rules` |

For the coordinator branch in `handleAgent`, the small inline append (~300 bytes) can stay inline — it's below threshold and doesn't need a separate file. Alternatively, move coordinator text into `.claude/sdlc/rules/AGENT-RULES-COORDINATOR.md` and point at it with a directive, matching ngentiq-claude's structure.

## Implementation Plan

### Step 1: Rewrite `handlePrompt` in `.claude/sdlc/hooks/sdlc-hook.js`

Replace the content-emission logic with a directive generator. Approximate diff:

```js
function handlePrompt(projectRoot) {
  const sources = [];

  const rulesPath = path.join(projectRoot, '.claude', 'sdlc', 'rules', 'RULES.md');
  if (fs.existsSync(rulesPath)) {
    sources.push({ label: 'framework governance rules (non-negotiable)', path: rulesPath });
  }

  const projectRulesPath = path.join(projectRoot, '.claude', 'PROJECT-RULES.md');
  if (fs.existsSync(projectRulesPath)) {
    sources.push({ label: 'project governance rules', path: projectRulesPath });
  }

  if (sources.length === 0) return;

  const lines = [];
  lines.push('════════════════════════════════════════════════════════════════════════');
  lines.push('  ***CRITICAL*** GOVERNANCE RULES — READ EACH FILE BEFORE RESPONDING');
  lines.push('════════════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('The files listed below hold the governance rules this session operates');
  lines.push('under. You MUST use the Read tool on EVERY file below BEFORE answering');
  lines.push('the user. Skipping this step means operating without the rules and will');
  lines.push('cause violations. Hook output is intentionally tiny; rules live in files.');
  lines.push('');
  for (const s of sources) {
    lines.push('  ***CRITICAL*** Read this file now: ' + s.path);
    lines.push('                (' + s.label + ')');
    lines.push('');
  }
  lines.push('════════════════════════════════════════════════════════════════════════');

  process.stdout.write(lines.join('\n') + '\n');
}
```

### Step 2: Rewrite `handleAgent` similarly

```js
function handleAgent(projectRoot) {
  const sources = [];

  const agentRulesPath = path.join(projectRoot, '.claude', 'sdlc', 'rules', 'AGENT-RULES.md');
  if (fs.existsSync(agentRulesPath)) {
    sources.push({ label: 'base subagent rules', path: agentRulesPath });
  }

  // Detect coordinator from stdin prompt; optionally point at a coordinator file if present
  let isCoordinator = false;
  try {
    const stdinData = fs.readFileSync(0, 'utf8');
    if (stdinData) {
      const parsed = JSON.parse(stdinData);
      const prompt = (parsed.prompt || '').toLowerCase();
      isCoordinator = /\b(coordinator|orchestrator|orchestrate|delegat(?:e|ing)|team[\s-]lead)\b/.test(prompt);
    }
  } catch (_) { /* ignore */ }

  // Optional: also support .claude/sdlc/rules/AGENT-RULES-COORDINATOR.md if a team wants it
  if (isCoordinator) {
    const coordRulesPath = path.join(projectRoot, '.claude', 'sdlc', 'rules', 'AGENT-RULES-COORDINATOR.md');
    if (fs.existsSync(coordRulesPath)) {
      sources.push({ label: 'coordinator-only rules', path: coordRulesPath });
    }
  }

  if (sources.length === 0) return;

  const lines = [];
  lines.push('════════════════════════════════════════════════════════════════════════');
  lines.push('  ***CRITICAL*** SUBAGENT GOVERNANCE — READ EACH FILE BEFORE RESPONDING');
  lines.push('════════════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('You are a subagent. The files below define the rules you operate under.');
  lines.push('You MUST use the Read tool on EVERY file listed BEFORE starting your');
  lines.push('task. Hook output is intentionally tiny; the rules live in the files.');
  lines.push('');
  for (const s of sources) {
    lines.push('  ***CRITICAL*** Read this file now: ' + s.path);
    lines.push('                (' + s.label + ')');
    lines.push('');
  }

  // Small inline coordinator note is still safe here (no truncation risk)
  if (isCoordinator) {
    lines.push('Coordination reminder: decompose into independent parallel units, spawn');
    lines.push('them together, synthesize after all return. Keep your own return 50-200');
    lines.push('tokens, format COMPLETE/FAILED.');
  }

  lines.push('════════════════════════════════════════════════════════════════════════');

  process.stdout.write(lines.join('\n') + '\n');
}
```

### Step 3: Update `tests/sdlc-hook.test.js`

The existing tests assert the hook emits RULES.md / AGENT-RULES.md **content**. Under the directive model, they must assert the hook emits the **directive banner and path** instead. Pattern:

| Old assertion | New assertion |
|---|---|
| `assert.match(out, /RULES.md content snippet/)` | `assert.match(out, /\*\*\*CRITICAL\*\*\* GOVERNANCE RULES/)` and `assert.ok(out.includes('/RULES.md'))` |
| `assert.match(out, /specific rule text/)` | `assert.ok(!out.includes('specific rule text'))` (content must NOT be inlined) |
| `assert.match(out, /# Base Agent Rules/)` (coordinator test) | `assert.ok(out.includes('/AGENT-RULES.md'))` and check the coordinator inline reminder text |

Add a new test: output size stays under 2 KB regardless of RULES.md / PROJECT-RULES.md size (write a 20 KB PROJECT-RULES.md, run hook, assert stdout length < 2048).

### Step 4: Documentation updates

- `README.md`: note the directive-based injection; clarify that the model Reads rule files on every prompt per the hook's directive.
- `docs/customization.md`: tell users adding PROJECT-RULES.md that size is no longer a concern — directive scales to any file size.
- `docs/walkthrough.md`: if there are screenshots of the hook output, refresh them.

### Step 5: Version bump

Bump `version.json` (and `package.json` — lite has both). Bump is minor (new feature: size-independent injection) or at minimum a notable fix; **a minor version bump is warranted**. Both files must move together. In ngentiq-claude this exact drift is what caused two failed publish workflows; avoid repeating.

## Reference Implementation — Concrete Examples from ngentiq-claude v2.1.2

Use these as working examples when adapting lite. All paths are relative to the monorepo root `~/src/ngentiq/`.

### Hook source code

- `ngentiq-claude/.claude/ngentiq/src/hooks/inject-rules.ts`
  - The `UserPromptSubmit` reference implementation.
  - Shows per-tier directive generation (managed, team, user, sub-project).
  - See the block labeled `// --- Emit Read-this-file directives for each tier's rules file that exists.`
  - Directly adaptable to lite's two-tier (framework + project) model.

- `ngentiq-claude/.claude/ngentiq/src/hooks/inject-agent-rules.ts`
  - The `SubagentStart` reference implementation.
  - Shows coordinator detection and conditional orchestration directive.
  - Pattern for adding `AGENT-RULES-COORDINATOR.md` as an optional extra tier.

- `ngentiq-claude/.claude/ngentiq/src/hooks/session-start.ts`
  - Continuation-branch directive for post-compaction / resume.
  - Lite does not currently use SessionStart, but if added later, this is the pattern.

### Rule files (structure to emulate)

- `ngentiq-claude/.claude/ngentiq/rules/NGENTIQ-CRITICAL-RULES.md`
  - Managed-tier rules. Model reads this on every prompt via the directive.
  - Note: no CORE/EXTENDED markers needed. Just a well-organized rules file. The hook doesn't parse it.

- `~/src/ngentiq/.claude/TEAM-CRITICAL-RULES.md`
  - Customer-tier rules. Exemplifies how a team extends framework rules.

### Tests

- `ngentiq-claude/.claude/ngentiq/src/hooks/__tests__/inject-rules.test.ts`
- `ngentiq-claude/.claude/ngentiq/src/hooks/__tests__/inject-agent-rules.test.ts`
  - Use these as templates for the lite test rewrite. Note the pattern of asserting directive markers and path strings while asserting rule-content absence (negative tests).

### Architecture doc (full rationale)

- `~/src/ngentiq/research/20260424-hook-injection-fix/architecture.md`
  - The full "why this architecture and not something else" doc.
  - Covers invariants (I1–I5), why magic-size-trimming fails, and the directive-based design rationale.
  - Read this first to understand the design choice before changing lite.

### Release history

- `ngentiq-claude/` git log — look at tags `v2.1.0` (initial directive architecture), `v2.1.1` (test fix-forward), `v2.1.2` (package.json/version.json sync fix-forward).
- Lesson from those three tags:
  1. Tests must be updated in the same commit as the behavior change (v2.1.0 shipped with stale tests and CI failed).
  2. `package.json` and `version.json` must be bumped together (v2.1.1 publish failed because only version.json was bumped).
  3. Run `npm test` locally before committing AND before tagging. L8 Orchestration applies: Finalize is gated on verified work.

## Expected End State for Lite

After the fix:

- `sdlc-hook.js` emits ≤ 2 KB regardless of input file sizes.
- Hook `UserPromptSubmit` output is a directive block pointing at `RULES.md` (and optionally `PROJECT-RULES.md`).
- Hook `SubagentStart` output is a directive block pointing at `AGENT-RULES.md` (and optionally `AGENT-RULES-COORDINATOR.md`), plus a small inline coordinator reminder when matched.
- Tests assert directive structure + path presence, and assert rule content is NOT inlined.
- `tests/sdlc-hook.test.js` passes with `node --test tests/sdlc-hook.test.js`.
- Version bumped in both `version.json` and `package.json` in lockstep.
- A live Claude Code session shows the small directive in the system-reminder (no `<persisted-output>` envelope) regardless of how large `PROJECT-RULES.md` grows.

## Anti-Patterns (reject if proposed)

- "Just keep the rules small." Violates the size-independence requirement. Customer-owned PROJECT-RULES.md is outside our control.
- "Use JSON `hookSpecificOutput.additionalContext` instead of stdout." Empirically verified in ngentiq-claude: same ~10 KB truncation applies. No help.
- "Mirror rules into CLAUDE.md." CLAUDE.md is delivered once at session start and decays; the whole point of the hook architecture is to defeat that decay.
- "Use systemMessage." Undocumented and likely has the same ceiling; unsupported in lite's existing hook event wiring anyway.
- "Trim to fit under a magic number." Bandages the symptom until the next growth pushes past again.

## Load-and-Go

To drive this fix in a fresh Claude Code session against `~/src/ngentiq/ngentiq-claude-lite/`:

1. Start a session in the lite repo.
2. Read this file explicitly: `Read ~/src/ngentiq/ngentiq-claude-lite/research/HOOK-TRUNCATION-FIX.md`.
3. Read the ngentiq-claude reference files listed above.
4. Implement the two `sdlc-hook.js` function rewrites.
5. Update `tests/sdlc-hook.test.js`.
6. Run tests; all must pass.
7. Bump `version.json` and `package.json` in lockstep.
8. Commit, tag, push (verify CI before declaring done).
