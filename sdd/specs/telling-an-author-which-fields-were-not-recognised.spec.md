# Spec: Telling an author which fields were not recognised

**Status:** Draft
**Description:** Telling an author which fields were not recognised

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** A program whose field name is misspelled says so, and still loads and runs

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** Which names count as unrecognised, given a program may legitimately carry fields a later version will read?
- **OQ-2** Does a near miss of a known name read differently from a name nothing resembles?

## Key Decisions
_No items yet._

## Prior Art
- **PA-1** Verified 2026-09-09: unknown fields survive configure verbatim at every level and render nowhere, so a model writing note for notes or cues for cue gets a clean load with its guidance invisible
- **PA-2** The model author reviewing three candidate contracts called this the worst possible failure for a contract whose only reader is a model with no feedback loop, since a clean load is taken as proof of a correct file
- **PA-3** The parent decision KD-3 of guidance-a-program-can-carry keeps unknown fields accepted on purpose, so the fix is a report and never a refusal
- **PA-4** The hostile-file spec's KD-1 already built the channel: the component announces in its live region and the page shows the message beside the load control

## Implementation Details
_No items yet._

## Verification Criteria
_No items yet._

## Changelog
- 2026-09-09: Spec initialized.
- 2026-09-09: G-1 added
- 2026-09-09: PA-1 added
- 2026-09-09: PA-2 added
- 2026-09-09: PA-3 added
- 2026-09-09: PA-4 added
- 2026-09-09: OQ-1 added
- 2026-09-09: OQ-2 added
