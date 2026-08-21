# Discovery: How the program view hands off to a running sequence, and back

**Discovery for:** program (OQ-6)
**Question:** When the user picks an entry and runs it, does its sequence-clock render inline in the program view (replacing the dropdown while it runs), navigate to a separate view, or something else? And after it completes, does the program return to the selection list, or something else?

_Edit via `scripts/spec.py`, never by hand._

## Open Questions
_No items yet._

## State of the Art
- **SOTA-1** The master-detail pattern (calendar apps, task lists) is the standard shape for 'pick one of several things, act on it, come back to the list' — select from a list, the detail/action view replaces or overlays it, then the list view returns, now reflecting what changed

## Proposed Decisions
- **PD-1** Inline swap within the <cadence-program> element's own light DOM: picking an entry hides the selection list and mounts a fresh, visible <cadence-sequence> element (unlike sequence-clock's headless reuse of the atomic clock — here the user genuinely watches and interacts with it) configured from that entry's data
- **PD-2** A 'Back' affordance sits alongside the running sequence, distinct from the sequence's own internal non-goals (pause/skip/rewind within a run) — this abandons the whole session and returns to the list without recording an actual datetime, for 'wrong one, let me pick again'
- **PD-3** On the sequence's cadence:complete: record now() (ISO 8601) as that entry's actual datetime, discard the <cadence-sequence> element (a fresh one is created next time, no state to bleed between entries), and return to the list — recomputed (new suggested entry, the just-run one now shows its actual datetime)
- **PD-4** <cadence-program> dispatches its own 'cadence:entryComplete' event (detail: the entry and its new actual datetime) each time a run finishes — there's no single 'whole program complete', since entries are chosen freely rather than walked through in order (G-2)

## Proposed Criteria
- **PC-1** Picking an entry replaces the list with a visible, running <cadence-sequence> for that entry's config; clicking Back abandons it (no actual datetime recorded) and restores the list unchanged; letting it finish records an actual datetime, fires cadence:entryComplete, and restores the list showing that entry as done

## Changelog
- 2026-08-22: Opened for OQ-6 of program.
- 2026-08-22: SOTA-1 added
- 2026-08-22: PD-1 added
- 2026-08-22: PD-2 added
- 2026-08-22: PD-3 added
- 2026-08-22: PD-4 added
- 2026-08-22: PC-1 added
