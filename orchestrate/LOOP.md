# Orchestration Loop — how the boss (Claude Code) runs the team

**Boss = Claude Code (Opus 4.8).** Every user command runs through this closed loop.
All same-tier agents are dispatched **in parallel** (multiple Agent tool calls in ONE message).

## Team
| Tier | Agent | Engine | Mode |
|---|---|---|---|
| Design | ui-ux-designer | Claude Code native · Sonnet 5 | design spec only (writes orchestrate/design/) |
| Build | codex-builder | codex exec | sandbox workspace-write |
| Build | flash-scout | agy · Gemini 3.5 Flash (Low) | read-only |
| Build | pro-analyst | agy · Gemini 3.1 Pro (High) | read-only |
| Review | code-reviewer | codex review | read-only |
| Review | bug-hunter | agy · Gemini 3.1 Pro (High) | read-only |
| Review | ui-reviewer | agy · Gemini 3.5 Flash (High) | read-only |
| Review | ux-reviewer | Claude Code native · Sonnet 5 | read-only |
| Review | guardian | Claude Code native · Sonnet 5 | read-only |
| Gate | qa-engineer | agy · Claude Opus 4.6 | read-only |
| Gate | qc-system | project checks + codex review | build/lint/test |

## The loop
```
USER COMMAND
  │
  ▼
[BOSS] break down task, decide who is needed, set acceptance criteria
  │  (boss OWNS design direction: sets the brief, picks the flow, approves the spec)
  ▼
STAGE 0 — DESIGN (UI/UX tasks only):  ui-ux-designer
  │  designs flow + wireframe + states BEFORE code; writes orchestrate/design/<feature>.md
  │  [BOSS] reviews/edits the spec, resolves open_questions → this spec is the build contract
  │  (skip Stage 0 for pure-backend tasks or trivial UI tweaks)
  ▼
STAGE 1 — BUILD (parallel):  flash-scout + pro-analyst + codex-builder
  │  (scout/analyst gather; builder implements AGAINST the approved spec)
  ▼
[BOSS] merge results (pass 1)
  │
  ▼
STAGE 2 — REVIEW (parallel):  code-reviewer + bug-hunter + ui-reviewer + ux-reviewer + guardian
  │
  ▼
[BOSS] read review results (pass 2) — triage real vs false findings
  │
  ▼
STAGE 3 — QUALITY GATE (parallel):  qa-engineer + qc-system
  │
  ▼
  ALL PASS?
   ├── YES → deliver to USER  ✅
   └── NO  → back to [BOSS]: analyze what failed → dispatch codex-builder to fix
              → re-run STAGE 2 + STAGE 3 on the fix
              → repeat  (MAX 3 rounds; if still failing, stop and report to USER with blockers)
```

## Rules
- **Design before build (UI tasks):** boss sets the design brief and owns direction; ui-ux-designer produces the spec; boss approves it before codex-builder writes UI. No new screen/flow gets built without an approved spec in `orchestrate/design/`. ui/ux-reviewer later check the build AGAINST that spec.
- Boss never lets unverified work reach the user — the gate must be green (or explicitly reported as blocked).
- Only dispatch the agents a task actually needs (a pure-backend task skips ui/ux-reviewer).
- Token economy: boss offloads bulk reading to flash-scout and heavy reasoning to pro-analyst; boss spends its own tokens mainly on decisions and final synthesis.
- Independence: reviewers use different engines than the builder, so they catch what the author missed.
- Loop cap = 3 rounds. On cap-out, report remaining blockers honestly — never fake-pass.
- All agent logs land in `orchestrate/logs/`.
