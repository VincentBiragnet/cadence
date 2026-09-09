# Spec: A step that waits for the person

**Status:** Draft
**Description:** A step that waits for the person

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** A step can end on a press instead of a duration, so a program can say read this and tap when ready
- **G-2** A timed rest can be a floor rather than an exact length: the clock reaches zero and the session waits

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** Does an untimed step show a counting-up chrono, or nothing at all?
- **OQ-2** Does the aggregate session chrono still predict a total when some steps have no length?
- **OQ-3** When a timed rest reaches zero, does it beep and wait or beep and advance, and is that per step or program-wide?
- **OQ-4** How is an untimed step written in JSON: durationSeconds omitted, or an explicit marker?

## Key Decisions
_No items yet._

## Prior Art
- **PA-1** The Talon HSR page (github.com/VincentBiragnet/talon) puts an untimed exercise card before every set: title, cue, diagram and four blocks of guidance, advanced by a tap
- **PA-2** Converting the 12-week Achilles HSR protocol to Cadence on 2026-09-09 refused every untimed step with needs a durationSeconds that is a positive number of seconds; the exercise cards were dropped from the conversion
- **PA-3** The protocol says rest between sets is 2 to 3 minutes and between exercises 5 minutes because the tendon needs real recovery: a floor, not an exact length

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
