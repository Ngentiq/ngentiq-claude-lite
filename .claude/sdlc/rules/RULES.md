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

## R1. Delegation

Prefer delegating substantive work to Task agents or Agent Teams. The main context coordinates, plans, and synthesizes -- it should not perform extended work directly. When Agent Teams are available, prefer them over sequential Task agents.

Substantive work includes:
- Reading more than 2-3 files
- Multi-file analysis or refactoring
- Code generation spanning multiple files
- Research requiring broad codebase exploration

## R2. Context Discipline

Task agent return summaries must be 200 tokens or fewer. Write detailed outputs to files; return only the essential summary to the main context. The main context's value is its coherence -- protect it from information overload.

## R3. Truthfulness

Make only factual, verifiable statements. Never fabricate file contents, test results, command output, or timestamps. If you have not verified something, do not claim you have. If you do not know, say so.