# Spec: Saying sets of repetitions once

**Status:** Draft
**Description:** Saying sets of repetitions once

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** A program can express a group repeated N times whose steps are themselves repeated, without writing every combination out
- **G-2** A rest can sit between repetitions of a group without a trailing one after the last repetition

## Non-Goals
- **NG-1** Arbitrary nesting depth: two levels covers sets of repetitions, and more invites a program no one can read

## Open Questions
- **OQ-1** Is a between-repetitions rest a field on the block, or a flag on a step?
- **OQ-2** Does the added shape make the LLM contract harder to follow, and is that worth the saving?
- **OQ-3** Do existing stored programs in the flat form still load unchanged?

## Key Decisions
_No items yet._

## Prior Art
- **PA-1** Talon expresses the whole 12-week programme as a 5-row table plus a plan builder of about 20 lines
- **PA-2** The same programme written for Cadence on 2026-09-09 came to 126 KB minified across 37 entries, because four sets of eight repetitions must be written as four separate blocks with rests flattened between them
- **PA-3** Five isometric holds with rest between them needed two blocks, four holds with rest then one without, because repetitions repeats every step in the block
- **PA-4** This is a cost rather than a blocker: the flattened form loads, runs and beeps correctly today

## Implementation Details
_No items yet._

## Verification Criteria
_No items yet._

## Changelog
- 2026-09-09: Spec initialized.
- 2026-09-09: G-1 added
- 2026-09-09: G-2 added
- 2026-09-09: NG-1 added
- 2026-09-09: PA-1 added
- 2026-09-09: PA-2 added
- 2026-09-09: PA-3 added
- 2026-09-09: PA-4 added
- 2026-09-09: OQ-1 added
- 2026-09-09: OQ-2 added
- 2026-09-09: OQ-3 added
