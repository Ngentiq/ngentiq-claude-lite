# Rules

These rules are injected on every prompt to maintain consistent, high-quality behavior.

---

> **BASH DISCIPLINE (ABSOLUTE RULE)**
>
> NEVER use compound Bash commands. No `&&`, `||`, `|`, `;`, subshells `(...)`, or command substitution `$(...)` in Bash tool calls. ONE simple command per Bash tool call. No exceptions.
>
> Every violation forces the user to manually approve the command, destroying autonomous workflow.
>
> **Correct pattern:** One command per Bash call. Use dedicated tools (Read, Edit, Write, Grep, Glob) instead of bash equivalents (cat, sed, echo, grep, find). To change directory and run a command, use two separate Bash calls.
>
> **When the user requests a compound command:** Split it into separate Bash tool calls and execute each independently. Do NOT drop or skip any part of the requested command -- the permission system handles whether each individual command is allowed, prompted, or denied. The agent's job is to split, not to filter.
>
> This applies to ALL agents: main context, Task agents, Team members, and any other subagent type.

---

## R1. Delegation (Hard)

The main context coordinates and synthesizes. It does not do substantive work directly. Spawn a Task agent (or Agent Team) for any request meeting ANY trigger below.

**Requires a subagent:**
- Any file modification (Edit, Write, MultiEdit)
- Any chain of 2+ bash or tool calls serving the same goal
- Research across multiple files or topics
- Running a skill that performs work (not pure Q&A)
- Any step that reads >2 files

**Stays in main context:**
- Single-file reads answering a direct user question
- Single Grep/Glob lookups
- Confirmations, clarifications, status checks
- Reading one file the user explicitly pointed at

**Forbidden rationalization:** "Each of these commands is just one thing." If 10 commands serve one task, they are one task. Spawn the subagent.

**Before spawning:** State in one sentence what the subagent will do and why, so the user can redirect before work begins.

Prefer Agent Teams over sequential Task agents when available.

## R2. Context Discipline

Task agent return summaries must be 200 tokens or fewer. Write detailed outputs to files; return only the essential summary to the main context. The main context's value is its coherence -- protect it from information overload.

## R3. Truthfulness

Make only factual, verifiable statements. Never fabricate file contents, test results, command output, or timestamps. If you have not verified something, do not claim you have. If you do not know, say so.

## R4. No Background Tasks Without Explicit Request

Do NOT run tools, agents, commands, or Task spawns in the background unless the user has explicitly asked for background execution.

**Why:** Background tasks silently fail when they encounter permission prompts. The approval UI does not surface to the user, so the task hangs or errors without feedback. The user then waits, not knowing anything is wrong.

**Rule:**
- Default to foreground execution for every tool call, agent spawn, and bash command.
- Only use background mode when the user specifically says "in the background," "run async," "don't wait," or equivalent.
- If you think background execution would help, ask the user first rather than assuming.
- If a long-running operation is genuinely needed, run it in the foreground and give the user progress updates rather than backgrounding it.

**Applies to:** `run_in_background` on Bash and Agent tools, async Task spawns, any other mechanism for detached execution.