# Spec: Program

**Status:** In Progress
**Description:** Program

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** Configured via a title and a list of entries, each pairing a planned datetime with a sequence-clock config (the { title, blocks: [...] } object we already built)
- **G-2** The user can choose to run a specific entry rather than being forced through the whole program in a fixed order — a selection UI (e.g. a dropdown) lets them pick which entry to start
- **G-3** Accessibility: native semantic controls (select, button) and an aria-live region announcing entry start/completion (KD-10)

## Non-Goals
- **NG-1** Multi-user accounts or cross-device sync — a program is local to the one browser it's opened in, at least for this spec
- **NG-2** What happens to an entry whose planned datetime has already passed without being run — flagged as missed somehow, or no special handling for this first pass? — Missed-entry handling (a planned datetime that's passed with no actual run recorded) is out of scope for this first pass — deferred until there's a real program to observe behaving oddly around it (was OQ-5)

## Open Questions
- **OQ-1** ~~Is 'datetime' an absolute calendar date+time the entry is planned for (e.g. 'do this Monday at 7am'), or just a relative order/label with no real clock-calendar meaning? What format is it in the JSON?~~ → KD-1
- **OQ-2** ~~Does this component also record the actual datetime an entry was actually run — closing the planned-vs-actual loop from the very first spec's premise — or is that still deferred to a later spec?~~ → KD-2
- **OQ-3** ~~Where is the program's state (which entries are done, actual timestamps if we track them) persisted across a page reload — localStorage, nothing at all (purely ephemeral, matching every component so far), or something else? None of clock-and-clock-configuration or sequence-clock needed persistence; this is the first spec where it might~~ → KD-5
- **OQ-4** ~~Is there a default/suggested entry (e.g. whichever's planned datetime is soonest or today) the UI highlights, or is the dropdown purely manual with no auto-suggestion?~~ → KD-3
- **OQ-5** ~~What happens to an entry whose planned datetime has already passed without being run — flagged as missed somehow, or no special handling for this first pass?~~ → deferred to NG-2
- **OQ-6** ~~When the user picks an entry and runs it, does its sequence-clock render inline in the program view (replacing the dropdown while it runs), navigate to a separate view, or something else? And after it completes, does the program return to the selection list, or something else?~~ → discovery:how-the-program-view-hands-off-to-a-running-sequence-and-back, KD-6, KD-7, KD-8, KD-9
- **OQ-7** ~~Does the dropdown list every entry regardless of date, or is it filtered/sorted (e.g. only today's, or soonest-first)?~~ → KD-4
- **OQ-8** ~~Accessibility parity with the other two components — does this need aria-live announcing entry selection/start/completion, and native semantic controls (select, button) for keyboard/screen-reader use — or is this deferred like everything else has been explicit about it?~~ → KD-10
- **OQ-9** ~~IMPL-2 says each dropdown option is labelled with its planned datetime, but a raw ISO 8601 string ('2026-08-25T07:00:00') is not human-readable in a user-facing list — what's the actual display format?~~ → KD-11
- **OQ-10** ~~KD-3's 'soonest upcoming entry' — does that mean soonest by plannedDatetime among ALL entries, or only among entries that don't already have an actualDatetime? Without excluding done ones, an already-completed entry could keep being re-suggested forever if its plannedDatetime happens to still be the earliest~~ → KD-12

## Key Decisions
- **KD-1** A real calendar date+time, as an ISO 8601 string (e.g. "2026-08-25T07:00:00") — unambiguous, sortable as a plain string, and matches how every other timestamp in this codebase would naturally be written (OQ-1)
- **KD-2** Yes — this component records the actual datetime (also ISO 8601) an entry was actually run, alongside its planned one, closing the loop the very first spec's premise described (OQ-2)
- **KD-3** Yes: the entry with the soonest upcoming planned datetime is highlighted/pre-selected in the dropdown as the suggestion, but the user can still pick any entry regardless (OQ-4)
- **KD-4** Unfiltered for this first pass: every entry is listed, in the order given in the JSON — no date-based filtering or re-sorting of the list itself (the 'suggested' entry from OQ-4 is a separate highlight, not a reordering) (OQ-7)
- **KD-5** Exported JSON: no localStorage, no backend — an 'Export' action downloads the current program (including any actual datetimes recorded) as a JSON file the user saves themselves. The natural counterpart for a no-backend static site: loading a program is via a file picker (<input type=file>) reading that JSON back in, not just configure() from embedding JS — so a session can actually resume across a reload by re-loading the exported file (OQ-3)
- **KD-6** Inline swap within the <cadence-program> element's own light DOM: picking an entry hides the selection list and mounts a fresh, visible <cadence-sequence> element (unlike sequence-clock's headless reuse of the atomic clock — here the user genuinely watches and interacts with it) configured from that entry's data (OQ-6 via discovery:how-the-program-view-hands-off-to-a-running-sequence-and-back)
- **KD-7** A 'Back' affordance sits alongside the running sequence, distinct from the sequence's own internal non-goals (pause/skip/rewind within a run) — this abandons the whole session and returns to the list without recording an actual datetime, for 'wrong one, let me pick again' (OQ-6 via discovery:how-the-program-view-hands-off-to-a-running-sequence-and-back)
- **KD-8** On the sequence's cadence:complete: record now() (ISO 8601) as that entry's actual datetime, discard the <cadence-sequence> element (a fresh one is created next time, no state to bleed between entries), and return to the list — recomputed (new suggested entry, the just-run one now shows its actual datetime) (OQ-6 via discovery:how-the-program-view-hands-off-to-a-running-sequence-and-back)
- **KD-9** <cadence-program> dispatches its own 'cadence:entryComplete' event (detail: the entry and its new actual datetime) each time a run finishes — there's no single 'whole program complete', since entries are chosen freely rather than walked through in order (G-2) (OQ-6 via discovery:how-the-program-view-hands-off-to-a-running-sequence-and-back)
- **KD-10** Same bar as the other components: native <select> and <button> elements (accessible by default, no custom widget to wire up), plus an aria-live region announcing when an entry starts and when it completes — not a continuous state, so no spam risk here anyway (OQ-8)
- **KD-11** Human-readable, via the browser's own locale formatting (Date.toLocaleString()) for display; the raw ISO 8601 string stays the stored/exported value underneath — only the label a person reads is reformatted (OQ-9)
- **KD-12** Among entries without an actualDatetime yet — a completed entry is never re-suggested regardless of how its plannedDatetime compares to the others (OQ-10)

## Prior Art
_No items yet._

## Implementation Details
- [ ] **IMPL-1** New js/cadence-program.js registering <cadence-program>; parse config { title, entries: [{ plannedDatetime, actualDatetime?, sequence: { title, blocks } }] } (G-1, KD-1)
- [ ] **IMPL-2** Render: program title, a native <select> listing every entry unfiltered in given order (each option labelled with its planned datetime and sequence title, marking one done if it has an actualDatetime), pre-selected to the soonest-upcoming entry, a Start button, Export and Load (file input) controls (G-2, G-3, KD-3, KD-4, KD-5)
- [ ] **IMPL-3** Entry launch: Start hides the list and mounts a fresh, visible <cadence-sequence> configured from the selected entry's sequence field, alongside a Back button (KD-6, KD-7)
- [ ] **IMPL-4** Back handling: discards the running <cadence-sequence> without waiting for completion and restores the list exactly as it was — no actualDatetime recorded (KD-7)
- [ ] **IMPL-5** Completion handling: on the running sequence's cadence:complete, record actualDatetime = new Date().toISOString() on that entry, discard the <cadence-sequence>, restore the list recomputed (new suggested entry, the just-run one now shows done), dispatch cadence:entryComplete on <cadence-program> (KD-2, KD-8, KD-9)
- [ ] **IMPL-6** aria-live announcing 'Started <label>' and 'Completed <label>' only — not a continuous state (G-3, KD-10)
- [ ] **IMPL-7** Export: serialize the current config (actualDatetime fields included) to JSON and trigger a browser download via a Blob + synthetic <a download> (KD-5)
- [ ] **IMPL-8** Load: a file input reads a selected JSON file and calls configure() with the parsed object, fully replacing current state (KD-5)
- [ ] **IMPL-9** Playwright test suite backing the verification criteria: config parsing, suggested-entry selection, launch/Back/complete hand-off, actualDatetime recording, export/load round-trip, accessibility
- [ ] **IMPL-10** Demo page section spawning a <cadence-program> with a small multi-entry sample

## Verification Criteria
- [ ] **VC-1** ~~Picking an entry replaces the list with a visible, running <cadence-sequence> for that entry's config; clicking Back abandons it (no actual datetime recorded) and restores the list unchanged; letting it finish records an actual datetime, fires cadence:entryComplete, and restores the list showing that entry as done~~ → superseded by the more granular, mechanically-checked VC-4 (start), VC-5 (back), VC-6 (complete) — same ground, but each independently verifiable instead of one broad attested criterion
- [ ] **VC-2** Given entries with different plannedDatetime values, the entry with the soonest upcoming one is pre-selected in the dropdown, regardless of its position in the JSON (G-1, G-2, KD-3) `npx playwright test tests/program-config.spec.js -g 'suggested'`
- [ ] **VC-3** The dropdown lists every entry, unfiltered, in the exact order given in the JSON (G-1, KD-4) `npx playwright test tests/program-config.spec.js -g 'unfiltered'`
- [ ] **VC-4** Clicking Start on a selected entry mounts a real, visible, running <cadence-sequence> configured from that entry's sequence field, and hides the list (G-2, KD-6) `npx playwright test tests/program-launch.spec.js -g start`
- [ ] **VC-5** Clicking Back during a run discards the sequence and restores the list with no actualDatetime recorded on that entry (KD-7) `npx playwright test tests/program-launch.spec.js -g back`
- [ ] **VC-6** Letting a run finish records actualDatetime (ISO 8601, close to now), fires cadence:entryComplete with that entry, restores the list, and the entry now shows as done (G-1, KD-2, KD-8, KD-9) `npx playwright test tests/program-launch.spec.js -g complete`
- [ ] **VC-7** aria-live announces exactly 'started' and 'completed' text for a run, never a continuous update (G-3, KD-10) `npx playwright test tests/program-a11y.spec.js`
- [ ] **VC-8** Export produces a JSON file whose entries match current state (including any actualDatetime), and loading that same file back via the file input reproduces the identical program state (KD-5) `npx playwright test tests/program-export-load.spec.js`

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
- 2026-08-22: KD-6, KD-7, KD-8, KD-9, VC-1 applied from discovery:how-the-program-view-hands-off-to-a-running-sequence-and-back
- 2026-08-22: OQ-8 added
- 2026-08-22: KD-10 resolves OQ-8
- 2026-08-22: G-3 added
- 2026-08-22: IMPL-1 added
- 2026-08-22: IMPL-2 added
- 2026-08-22: IMPL-3 added
- 2026-08-22: IMPL-4 added
- 2026-08-22: IMPL-5 added
- 2026-08-22: IMPL-6 added
- 2026-08-22: IMPL-7 added
- 2026-08-22: IMPL-8 added
- 2026-08-22: IMPL-9 added
- 2026-08-22: IMPL-10 added
- 2026-08-22: VC-2 added
- 2026-08-22: VC-3 added
- 2026-08-22: VC-4 added
- 2026-08-22: VC-5 added
- 2026-08-22: VC-6 added
- 2026-08-22: VC-7 added
- 2026-08-22: VC-8 added
- 2026-08-22: VC-1 struck
- 2026-08-22: OQ-9 raised by dry run
- 2026-08-22: OQ-10 raised by dry run
- 2026-08-22: KD-11 resolves OQ-9
- 2026-08-22: KD-12 resolves OQ-10
- 2026-08-22: dry run clean — Walked IMPL-1 through IMPL-10: two real gaps (dropdown label formatting, suggested-entry excluding done entries) surfaced and resolved as KD-11/KD-12. Also confirmed the Export/download mechanism needs testing under file:// as well as served, matching the standard already set for the other components — that's a testing-thoroughness note, not a design gap. Nothing else surfaced; the rest is already-decided patterns from the prior two components.
- 2026-08-22: Status: Draft → Ready
- 2026-08-22: Status: Ready → In Progress
