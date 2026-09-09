# Spec: What a session leaves behind

**Status:** Draft
**Description:** What a session leaves behind

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** A session can ask for a few values when it ends, and keep them
- **G-2** The next session shows what was recorded last time, so a progression can actually be followed
- **G-3** Recorded values leave with the export, so a model asked to replan can see how it has been going

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** Who declares the fields: the program JSON, or a fixed set Cadence knows about?
- **OQ-2** What field kinds are needed: a number with a unit, a 0-10 scale, free text?
- **OQ-3** Can a session complete with the fields left blank?
- **OQ-4** Where does the last recorded value show: on the list row, or when the session opens?
- **OQ-5** Does the replanning prompt include this history, and does that make it too long to paste?

## Key Decisions
_No items yet._

## Prior Art
- **PA-1** HSR is progressive overload: raise the load 2.5 to 5 percent at the next session if you finished your sets without difficulty. Without last session's load written down the instruction cannot be followed
- **PA-2** Talon records load per exercise, pain during the session, pain the next morning and free notes, and surfaces the last load when a session starts
- **PA-3** The protocol ships a 36-row weekly tracking sheet whose columns are exactly those fields
- **PA-4** Cadence today keeps only whether a session was reached or dropped; the replanning export carries nothing a person measured

## Implementation Details
_No items yet._

## Verification Criteria
_No items yet._

## Changelog
- 2026-09-09: Spec initialized.
- 2026-09-09: G-1 added
- 2026-09-09: G-2 added
- 2026-09-09: G-3 added
- 2026-09-09: PA-1 added
- 2026-09-09: PA-2 added
- 2026-09-09: PA-3 added
- 2026-09-09: PA-4 added
- 2026-09-09: OQ-1 added
- 2026-09-09: OQ-2 added
- 2026-09-09: OQ-3 added
- 2026-09-09: OQ-4 added
- 2026-09-09: OQ-5 added
