# Spec: Program

**Status:** Draft
**Description:** Program

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** Configured via a title and a list of entries, each pairing a planned datetime with a sequence-clock config (the { title, blocks: [...] } object we already built)
- **G-2** The user can choose to run a specific entry rather than being forced through the whole program in a fixed order — a selection UI (e.g. a dropdown) lets them pick which entry to start

## Non-Goals
- **NG-1** Multi-user accounts or cross-device sync — a program is local to the one browser it's opened in, at least for this spec

## Open Questions
- **OQ-1** Is 'datetime' an absolute calendar date+time the entry is planned for (e.g. 'do this Monday at 7am'), or just a relative order/label with no real clock-calendar meaning? What format is it in the JSON?
- **OQ-2** Does this component also record the actual datetime an entry was actually run — closing the planned-vs-actual loop from the very first spec's premise — or is that still deferred to a later spec?
- **OQ-3** Where is the program's state (which entries are done, actual timestamps if we track them) persisted across a page reload — localStorage, nothing at all (purely ephemeral, matching every component so far), or something else? None of clock-and-clock-configuration or sequence-clock needed persistence; this is the first spec where it might
- **OQ-4** Is there a default/suggested entry (e.g. whichever's planned datetime is soonest or today) the UI highlights, or is the dropdown purely manual with no auto-suggestion?
- **OQ-5** What happens to an entry whose planned datetime has already passed without being run — flagged as missed somehow, or no special handling for this first pass?
- **OQ-6** When the user picks an entry and runs it, does its sequence-clock render inline in the program view (replacing the dropdown while it runs), navigate to a separate view, or something else? And after it completes, does the program return to the selection list, or something else?
- **OQ-7** Does the dropdown list every entry regardless of date, or is it filtered/sorted (e.g. only today's, or soonest-first)?

## Key Decisions
_No items yet._

## Prior Art
_No items yet._

## Implementation Details
_No items yet._

## Verification Criteria
_No items yet._

## Changelog
- 2026-08-22: Spec initialized.
- 2026-08-22: G-1 added
- 2026-08-22: G-2 added
- 2026-08-22: NG-1 added
- 2026-08-22: OQ-1 added
- 2026-08-22: OQ-2 added
- 2026-08-22: OQ-3 added
- 2026-08-22: OQ-4 added
- 2026-08-22: OQ-5 added
- 2026-08-22: OQ-6 added
- 2026-08-22: OQ-7 added
