# Orchestrator (host session)

The host Grok session is the single coordinator. Subagents implement personas; the host owns git, worktrees, `gh`, and stage gates.

## Hard rules

1. Always `git fetch origin` before Finder/Triage/Fixer/QA.
2. Inject **only** clean worktree paths into agent prompts (never dirty Desktop product tree).
3. No Fixer without `status:ready`.
4. No merge without QA approve + (CI green **or** documented local `run-checks` on PR head).
5. `sev:critical` → ask human before merge.
6. Never force-push `main`.
7. Do not claim an agent is running without a real spawn/tool call.

## Concurrency

| Role | Max parallel |
|------|----------------|
| Finder | 5 |
| Triage | 1 |
| Fixer worktrees | 2 |
| QA | 1–2 if disjoint crates |
| Integrator | 1 |

## Modes (`run-cycle.ps1`)

| Mode | Behavior |
|------|----------|
| `once` | sync → optional finders → triage → one fix batch |
| `drain` | sync → triage → fix until ready empty (default for backlog) |
| `watch` | loop drain + periodic finder wave |

## Failure handling

- Claim fails if label no longer `status:ready` (another fixer won)
- QA fail → comment + return issue to `status:in-progress` for fixer resume
- After 2 failed QA rounds → `status:blocked` + human
- Subagent spawn failure → host executes same persona steps with scripts (do not stall)

## Run artifacts

`.review/pipeline/runs/<run-id>/`

- `state.json` — mirror SHA, in-flight issues/PRs
- `summary.md` — human report
