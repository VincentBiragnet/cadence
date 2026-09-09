# Spec: Harness feedback

**Status:** Done
**Description:** Harness feedback

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** The feedback heuristic judges a rehearsal by whether it settles, not by how many questions it found, so a thorough first round is not mistaken for friction

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** ~~dry runs average 7.2 raised question(s) per clean run across 4 clean run(s) — Open Questions/Key Decisions may need a stronger prompt in the spec template so they surface before the first dry run~~ → discovery:rehearsal-yield-as-a-signal, KD-1, KD-2, KD-3
- **OQ-2** ~~'multi-week-program-relative-scheduling-and-run-state' rehearsed 3 times and the rounds did not shrink (6, 1, 1) — the walkthrough is not settling, so the spec is being decided during the rehearsal rather than before it~~ → KD-4

## Key Decisions
- **KD-1** Raw questions per clean run is the wrong measure: a thorough first walkthrough of a rich spec looks identical to a thin spec, and the harness cannot tell them apart from a count (OQ-1 via discovery:rehearsal-yield-as-a-signal)
- **KD-2** The signal is the shape of the rounds: a rehearsal that keeps finding as much as it did last time has not converged, while six then two then one has (OQ-1 via discovery:rehearsal-yield-as-a-signal)
- **KD-3** Report on rounds that fail to converge — three or more rounds where the last is not smaller than the one before — and say that the walkthrough is not settling rather than that the template needs a stronger prompt (OQ-1 via discovery:rehearsal-yield-as-a-signal)
- **KD-4** Raised by the first version of the convergence rule, which asked that every round beat the one before it and so read 6, 1, 1 as unsettled; the rule now asks that the last round has fallen to half the first, and this spec passes it (OQ-2)

## Prior Art
_No items yet._

## Implementation Details
_No items yet._

## Verification Criteria
- [x] **VC-1** A spec whose rehearsal raised many questions in a single round, then came back clean, produces no finding `bash sdd/scripts/test_spec.sh` → passed 2026-09-09 (ran: exit 0 — 1. a new spec starts in Draft ok status reads back 2. ids are allocated in order ok first )
- [x] **VC-2** A spec whose rehearsal rounds do not shrink produces a finding that names the rounds rather than an average `bash sdd/scripts/test_spec.sh` → passed 2026-09-09 (ran: exit 0 — 1. a new spec starts in Draft ok status reads back 2. ids are allocated in order ok first )

## Changelog
- 2026-08-31: Spec initialized.
- 2026-08-31: OQ-1 raised by feedback
- 2026-08-31: OQ-1 opened discovery:rehearsal-yield-as-a-signal
- 2026-08-31: KD-1, KD-2, KD-3, VC-1, VC-2 applied from discovery:rehearsal-yield-as-a-signal
- 2026-08-31: OQ-2 raised by feedback
- 2026-08-31: KD-4 resolves OQ-2
- 2026-09-09: G-1 added
- 2026-09-09: VC-1 passed
- 2026-09-09: VC-2 passed
- 2026-09-09: Status: Draft → Done
