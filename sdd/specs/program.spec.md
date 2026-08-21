# Spec: Program

**Status:** Draft
**Description:** Program

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** Configured via a title and a list of entries, each pairing a planned datetime with a sequence-clock config (the { title, blocks: [...] } object we already built)
- **G-2** The user can choose to run a specific entry rather than being forced through the whole program in a fixed order — a selection UI (e.g. a dropdown) lets them pick which entry to start

## Non-Goals
- **NG-1** Multi-user accounts or cross-device sync — a program is local to the one browser it's opened in, at least for this spec
- **NG-2** What happens to an entry whose planned datetime has already passed without being run — flagged as missed somehow, or no special handling for this first pass? — Missed-entry handling (a planned datetime that's passed with no actual run recorded) is out of scope for this first pass — deferred until there's a real program to observe behaving oddly around it (was OQ-5)

## Open Questions
- **OQ-1** ~~Is 'datetime' an absolute calendar date+time the entry is planned for (e.g. 'do this Monday at 7am'), or just a relative order/label with no real clock-calendar meaning? What format is it in the JSON?~~ → KD-1
- **OQ-2** ~~Does this component also record the actual datetime an entry was actually run — closing the planned-vs-actual loop from the very first spec's premise — or is that still deferred to a later spec?~~ → KD-2
- **OQ-3** ~~Where is the program's state (which entries are done, actual timestamps if we track them) persisted across a page reload — localStorage, nothing at all (purely ephemeral, matching every component so far), or something else? None of clock-and-clock-configuration or sequence-clock needed persistence; this is the first spec where it might~~ → KD-5
- **OQ-4** ~~Is there a default/suggested entry (e.g. whichever's planned datetime is soonest or today) the UI highlights, or is the dropdown purely manual with no auto-suggestion?~~ → KD-3
- **OQ-5** ~~What happens to an entry whose planned datetime has already passed without being run — flagged as missed somehow, or no special handling for this first pass?~~ → deferred to NG-2
- **OQ-6** When the user picks an entry and runs it, does its sequence-clock render inline in the program view (replacing the dropdown while it runs), navigate to a separate view, or something else? And after it completes, does the program return to the selection list, or something else? → discovery:how-the-program-view-hands-off-to-a-running-sequence-and-back
- **OQ-7** ~~Does the dropdown list every entry regardless of date, or is it filtered/sorted (e.g. only today's, or soonest-first)?~~ → KD-4

## Key Decisions
- **KD-1** A real calendar date+time, as an ISO 8601 string (e.g. "2026-08-25T07:00:00") — unambiguous, sortable as a plain string, and matches how every other timestamp in this codebase would naturally be written (OQ-1)
- **KD-2** Yes — this component records the actual datetime (also ISO 8601) an entry was actually run, alongside its planned one, closing the loop the very first spec's premise described (OQ-2)
- **KD-3** Yes: the entry with the soonest upcoming planned datetime is highlighted/pre-selected in the dropdown as the suggestion, but the user can still pick any entry regardless (OQ-4)
- **KD-4** Unfiltered for this first pass: every entry is listed, in the order given in the JSON — no date-based filtering or re-sorting of the list itself (the 'suggested' entry from OQ-4 is a separate highlight, not a reordering) (OQ-7)
- **KD-5** Exported JSON: no localStorage, no backend — an 'Export' action downloads the current program (including any actual datetimes recorded) as a JSON file the user saves themselves. The natural counterpart for a no-backend static site: loading a program is via a file picker (<input type=file>) reading that JSON back in, not just configure() from embedding JS — so a session can actually resume across a reload by re-loading the exported file (OQ-3)

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
- 2026-08-22: KD-1 resolves OQ-1
- 2026-08-22: KD-2 resolves OQ-2
- 2026-08-22: KD-3 resolves OQ-4
- 2026-08-22: KD-4 resolves OQ-7
- 2026-08-22: KD-5 resolves OQ-3
- 2026-08-22: NG-2 defers OQ-5
- 2026-08-22: OQ-6 opened discovery:how-the-program-view-hands-off-to-a-running-sequence-and-back
