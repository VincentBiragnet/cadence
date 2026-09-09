# Spec: Pause and resume a session

**Status:** Draft
**Description:** Pause and resume a session

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** A running session can be paused and resumed without losing the step it was on
- **G-2** A session survives the tab closing or the phone locking, and can be picked up where it stopped

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** Does resume restart the current step, or continue it from where it froze?
- **OQ-2** Is there a staleness limit after which an interrupted session is discarded rather than offered back?
- **OQ-3** Does an interrupted session count as reached for the shift-the-schedule rules, or only a completed one?
- **OQ-4** Does the export carry an in-progress session, or only completed ones?

## Key Decisions
_No items yet._

## Prior Art
- **PA-1** js/cadence-program.js records pause, skip and rewind within a run as internal non-goals; this spec revisits that on evidence rather than overturning it silently
- **PA-2** Talon persists the whole active flow to localStorage on every logged event and restores it, and has an explicit pause overlay with a resume button
- **PA-3** The HSR sessions converted on 2026-09-09 run 41 minutes each, of which 21 minutes are rests; losing one to a phone call means repeating the whole session

## Implementation Details
_No items yet._

## Verification Criteria
_No items yet._

## Changelog
- 2026-09-09: Spec initialized.
- 2026-09-09: G-1 added
- 2026-09-09: G-2 added
- 2026-09-09: PA-1 added
- 2026-09-09: PA-2 added
- 2026-09-09: PA-3 added
- 2026-09-09: OQ-1 added
- 2026-09-09: OQ-2 added
- 2026-09-09: OQ-3 added
- 2026-09-09: OQ-4 added
