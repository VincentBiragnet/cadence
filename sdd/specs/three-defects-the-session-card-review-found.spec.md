# Spec: Three defects the session-card review found

**Status:** Done
**Description:** Three defects the session-card review found

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** A milestone cannot be recorded by a single unconfirmed press of a button labelled Start
- **G-2** The overrun warning fires for someone who has stopped, which is exactly who needs it
- **G-3** Opening a programme shows its sessions, not a screenful of its standing rules

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** ~~Does marking a milestone reached still anchor the schedule, given _anchor runs on launch and the reach path returns early?~~ → KD-4
- **OQ-2** ~~Does the effective-date change make an already-overdue programme without milestones report anything it did not before?~~ → KD-5
- **OQ-3** ~~Where does programme guidance go on the run view, given it is already hidden there, and does moving it below the list change the empty state?~~ → KD-6

## Key Decisions
- **KD-1** A milestone is marked reached, never started: the control says so, and recording it takes a confirmation naming its date, because it is the anchor every computed date in the programme hangs from (supersedes the archived milestones spec KD-22, which put it on Start with nothing in between)
- **KD-2** An unrun session's effective date is the later of its planned date and today, since a session in the past cannot be done in the past. That is what makes the warning fire for someone standing still, and it changes nothing for someone on schedule
- **KD-3** Programme guidance renders below the list, the same rule the guidance spec's KD-20 applied to the clock: the unbounded thing goes under the thing you came for
- **KD-4** Yes, unchanged: _anchor already runs before the reach branch, and a milestone's own date is what anchoring reads, so confirming or declining changes nothing about the schedule. Only the recording of actualDate is now gated (OQ-1)
- **KD-5** No. Overrun is measured against a milestone and there is no milestone to overrun, so a programme without one reports nothing whatever its dates. The change only moves the comparison date for unrun sessions that are already behind (OQ-2)
- **KD-6** It stays hidden on the run view, which is already decided, and moves below the list on the list view. The empty state is untouched: it has no programme and therefore no guidance (OQ-3)

## Prior Art
- **PA-1** ~~Reproduced in the real app: selecting a milestone dated 2026-12-25 and pressing Start recorded actualDate as today, with no confirmation and no undo. The whole schedule anchors to milestones~~ → Half wrong, and the wrong half was mine. The real app already labels the control Mark reached and the bar Start will record; my probe read the label after the click, when selection had moved to a session. What is real, and reproduced, is that no confirmation stands between the press and the write
- **PA-2** Reproduced: _overrun compares the planned dates of unrun sessions to the milestone, and planned dates only slide when something is completed, so a person who has stopped never trips it. A reviewer eleven sessions short of a fixed date thirteen days away saw only 5 of 37 done, finishes 2026-12-04
- **PA-3** Reproduced at 390x844 with the HSR programme: the first session row sits at y=1126 and Start at y=1642 on an 844-tall screen, because programme guidance renders above the list. This is a regression from the guidance work, not an old fault
- **PA-4** Reproduced in the real app: selecting a milestone dated 2026-12-25 and pressing its control wrote actualDate 2026-09-10 with no confirmation dialog and no undo. The control is correctly labelled Mark reached; what was missing is anything between the press and the write

## Implementation Details
- [x] **IMPL-1** Ask before recording a milestone as reached, naming its date
- [x] **IMPL-2** Take the later of an unrun session's planned date and today when measuring overrun
- [x] **IMPL-3** Render programme guidance below the list instead of above it

## Verification Criteria
- [x] **VC-1** Selecting a milestone offers to mark it reached rather than start it, a decline records nothing, and an accept records it and names the date in the confirmation `npx playwright test tests/milestone-reach.spec.js` → passed 2026-09-10 (ran: exit 0 — Running 4 tests using 1 worker ✓ 1 tests/milestone-reach.spec.js:31:5 › it offers to mark )
- [x] **VC-2** A programme whose unrun sessions are all in the past reports an overrun against a milestone that is still ahead, and a programme on schedule reports none `npx playwright test tests/overrun-today.spec.js` → passed 2026-09-10 (ran: exit 0 — Running 4 tests using 1 worker ✓ 1 tests/overrun-today.spec.js:37:5 › a stalled programme )
- [x] **VC-3** With the HSR programme loaded at 390x844, the first session row and the Start control are both within the first screen `npx playwright test tests/list-not-buried.spec.js` → passed 2026-09-10 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/list-not-buried.spec.js:34:5 › the HSR protocol o)

## Changelog
- 2026-09-10: Spec initialized.
- 2026-09-10: G-1 added
- 2026-09-10: G-2 added
- 2026-09-10: G-3 added
- 2026-09-10: PA-1 added
- 2026-09-10: PA-2 added
- 2026-09-10: PA-3 added
- 2026-09-10: KD-1 added
- 2026-09-10: KD-2 added
- 2026-09-10: KD-3 added
- 2026-09-10: VC-1 added
- 2026-09-10: VC-2 added
- 2026-09-10: VC-3 added
- 2026-09-10: Status: Draft → Ready
- 2026-09-10: OQ-1 raised by dry run
- 2026-09-10: OQ-2 raised by dry run
- 2026-09-10: OQ-3 raised by dry run
- 2026-09-10: KD-4 resolves OQ-1
- 2026-09-10: KD-5 resolves OQ-2
- 2026-09-10: KD-6 resolves OQ-3
- 2026-09-10: dry run clean — Walked it: _launch routes a milestone through a confirmation naming its date before _reach, and the bar and the start control both say Mark reached for a milestone; _overrun takes the later of an unrun session's planned date and today; the programme guidance element moves after the list in the run-view markup so the list is what a loaded programme opens on
- 2026-09-10: Status: Ready → In Progress
- 2026-09-10: PA-1 struck
- 2026-09-10: PA-4 added
- 2026-09-10: IMPL-1 added
- 2026-09-10: IMPL-2 added
- 2026-09-10: IMPL-3 added
- 2026-09-10: IMPL-1, IMPL-2, IMPL-3 checked
- 2026-09-10: VC-1 passed
- 2026-09-10: VC-2 passed
- 2026-09-10: VC-3 passed
- 2026-09-10: Status: In Progress → Done
