# Spec: Multi-week program: relative scheduling and run state

**Status:** Done
**Description:** Multi-week program: relative scheduling and run state

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** An authored program carries relative positions only: each entry names a week n and a day m, never a calendar date
- **G-2** Launching a program computes an expected datetime for every entry from a single start anchor
- **G-3** A session can be started from its own position in the program, not only the next one due
- **G-4** Export writes the current run state as JSON: relative positions, computed expected datetimes, and what actually ran
- **G-5** Loading an exported state resumes the program with its expected datetimes brought up to date

## Non-Goals
- **NG-1** The calendar layout that displays the program: a separate spec, and it cannot be designed until this data model is settled
- **NG-2** Progression between weeks: each entry still embeds its own full sequence config, with no way to say same circuit plus two reps

## Open Questions
- **OQ-1** ~~What anchors the expected datetimes at launch: a start date the user picks, or the moment Start is first pressed~~ → KD-1
- **OQ-2** ~~Does day m mean the m-th day counting from the program start, or a fixed day of the week, given the two differ whenever a program starts mid-week~~ → KD-2
- **OQ-3** ~~Where does time of day come from, since week n day m alone does not carry one: authored per entry, one default for the program, or a session is undated within its day~~ → KD-3
- **OQ-4** ~~On reload, does bringing expected datetimes up to date mean recomputing from the original anchor, which leaves them unchanged, or re-anchoring to now so a lapsed program slides forward~~ → KD-4
- **OQ-5** ~~What becomes of an entry whose expected datetime passes without it being run: is it marked missed and left behind, or does the remainder of the program shift later~~ → KD-5
- **OQ-6** ~~May an entry be run out of order, for instance week 4 day 2 while week 1 is still unrun, and if so what does that do to the entries it skipped~~ → KD-6
- **OQ-7** ~~Is the exported state the authored shape plus extra fields, so an export can be re-authored and relaunched, or a distinct document the loader tells apart~~ → KD-7
- **OQ-8** ~~Does run state persist automatically between sessions, or is export and load the only durability, given eight weeks guarantees the tab is closed in between~~ → KD-8
- **OQ-9** ~~How does the reschedule of KD-4 place the remaining entries when weekdays are fixed by KD-2: shift the whole remainder by the gap between the entry's expected date and today, or re-lay the remainder onto its authored weekdays starting from today~~ → KD-9
- **OQ-10** ~~At launch the anchor is whatever day Start is pressed (KD-1), so an entry authored for an earlier weekday of week 1 is already in the past on day one: does week 1 begin on the anchor's own week or on the following one~~ → KD-10
- **OQ-11** ~~Since run state persists on its own (KD-8), what identifies a program across loads and can more than one program be part-run at a time, or does loading a program replace whatever was stored~~ → KD-11
- **OQ-12** ~~KD-1 anchors on Start being pressed, but the component's Start button launches the selected entry rather than the program: is the anchor set by running the first entry, or does the program need a separate start-the-program gesture of its own~~ → KD-12
- **OQ-13** ~~Before an anchor exists no entry has an expected date, so what does the list show and in what order, given _suggestedIndex currently sorts by plannedDatetime and would have nothing to sort by~~ → KD-13
- **OQ-14** ~~KD-6 allows running out of order and KD-9 shifts the remainder, so when week 3 day 2 is completed do the still-unrun entries of week 1 shift later too, or does the shift only reach entries that come after the completed one~~ → KD-14
- **OQ-15** ~~The seven existing tests/program-*.spec.js all configure entries with plannedDatetime, which IMPL-1 makes an error: are those tests rewritten as part of this spec, given they are the recorded verification of an archived spec~~ → KD-15
- **OQ-16** ~~KD-3 stores no time of day, so in what form is an expected date held and compared: a calendar date string, or a Date at local midnight, which decides whether the KD-9 day arithmetic can drift across a daylight-saving boundary~~ → KD-16
- **OQ-17** ~~IMPL-7 drives index.html from the eight-week example, which puts about twenty-four entries into the dropdown NG-1 defers replacing: is the unusable dropdown accepted in the interim, or does IMPL-7 wait for the layout spec~~ → KD-17
- **OQ-18** ~~IMPL-1 rejects a config carrying dates, but KD-7 makes an export the authored shape plus computed expected and actual dates and KD-11 has that export loaded back as a program: what distinguishes the dates a load must accept from the dates IMPL-1 must reject~~ → KD-18
- **OQ-19** ~~KD-12 anchors on first launch and KD-11 restores stored state on load, so what happens when an export whose entries already carry expectedDate is loaded: is the stored anchor honoured, or does the next launch re-anchor and overwrite those dates~~ → KD-19
- **OQ-20** ~~KD-9 shifts by the gap in both directions, so finishing a session early pulls every later session earlier and can place them before entries that are still unrun: should the shift apply only when the gap is late, or stay symmetric~~ → KD-20

## Key Decisions
- **KD-1** The anchor is the moment Start is first pressed; there is no start date to pick, so launching is a single gesture (OQ-1)
- **KD-2** Day m is a fixed day of the week, so week 3 day 1 is a Monday rather than the 15th day of the program (OQ-2)
- **KD-3** An entry is undated within its day; no time of day is authored, computed or stored anywhere, which makes every computed value a date rather than a datetime despite the wording of G-2 and G-4 (OQ-3)
- **KD-4** The anchor moves with the work rather than staying fixed at launch: completing an entry records it as today and reschedules every remaining entry from there (OQ-4)
- **KD-5** Nothing is ever missed: the next entry is always the next unrun one whatever today's date, and the schedule slides to meet it, so no missed state exists (OQ-4) (OQ-5)
- **KD-6** Entries may be run out of order; the ones skipped over stay unrun and keep their place in the order (OQ-6)
- **KD-7** The export is the authored shape plus extra fields, so any export can be re-authored and relaunched as a program (OQ-7)
- **KD-8** Run state persists automatically between sessions; export and load stay available but are not the only durability (OQ-8)
- **KD-9** The whole remainder shifts by the gap between the entry's expected date and today, preserving the intervals the author planned; the authored weekdays of KD-2 lay out the initial schedule but drift off those weekdays once a slip has shifted the program (OQ-9)
- **KD-10** Week 1 is the anchor's own week, so an entry whose weekday already passed is simply the next one due and can be run immediately (KD-5) (OQ-10)
- **KD-11** Loading a program replaces the stored run state, so only one program is part-run at a time, and the replacement is warned about before any part-run state is discarded (OQ-11)
- **KD-12** The anchor is set the first time any entry is launched from the program, so there is no separate start-the-program gesture and launching stays a single press (KD-1) (OQ-12)
- **KD-13** Before an anchor exists the list shows each entry as its week and day in authored order, and the first unrun entry in that order is the suggested one (OQ-13)
- **KD-14** The shift reaches only entries after the completed one in authored order; an earlier entry left unrun keeps its date and stays overdue rather than being pushed later (KD-5) (OQ-14)
- **KD-15** The existing tests/program-*.spec.js are rewritten onto week and day as part of this spec; the archived program spec's plannedDatetime behaviour is superseded here, and git keeps the old tests (OQ-15)
- **KD-16** An expected date is held as a calendar date string of the form YYYY-MM-DD and day arithmetic is done on its parts, never on a local Date, so no daylight-saving boundary can shift it (KD-3) (OQ-16)
- **KD-17** IMPL-7 goes ahead with the dropdown as it stands, labelled by week and day; the eight-week example is what makes the dropdown's unfitness concrete, so it comes before the layout spec rather than after it (NG-1) (OQ-17)
- **KD-18** The names distinguish them: an entry's position is week and day only and a plannedDatetime is rejected, while expectedDate and actualDate are computed fields a load accepts and a launch recomputes (KD-7, KD-11) (OQ-18)
- **KD-19** A loaded program that already carries expectedDate keeps them and is treated as already anchored, so only a program with none anchors on its next launch (KD-12) (OQ-19)
- **KD-20** The shift applies backwards only when every entry preceding the completed one has been run; otherwise an early finish records the actual date but moves nothing, so a session can never overtake one still unrun (KD-9) (OQ-20)

## Prior Art
_No items yet._

## Implementation Details
- [x] **IMPL-1** Replace the entry's plannedDatetime with a week and day pair in the authored config, and reject a config that carries dates (KD-2)
- [x] **IMPL-2** Compute the schedule: given an anchor date and the authored weekdays, produce an expected date per entry with week 1 in the anchor's own week (KD-1, KD-10)
- [x] **IMPL-3** Reschedule on completion: record the entry as run today and shift every remaining expected date by the gap between its expected date and today (KD-4, KD-9)
- [x] **IMPL-4** Let any unrun entry be started whatever its expected date, leaving the ones skipped over unrun and in order (KD-6)
- [x] **IMPL-5** Export the authored shape plus the computed expected dates and the actual dates, so an export reloads as a program (KD-7)
- [x] **IMPL-6** Persist run state to localStorage on every change and restore it on load, warning before a newly loaded program replaces it (KD-8, KD-11)
- [x] **IMPL-7** Write the eight-week bodyweight strength program as the worked example and drive index.html from it
- [x] **IMPL-8** Gate the backward shift on every preceding entry having been run, leaving a late shift unconditional (KD-20)

## Verification Criteria
- [x] **VC-1** An authored program whose JSON contains no date field anywhere configures without error and lists every entry by its week and day (G-1) `npx playwright test tests/schedule-authoring.spec.js` → passed 2026-08-27 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/schedule-authoring.spec.js:14:5 › a program whose)
- [x] **VC-2** Pressing Start with the clock fixed to a known Thursday lays out a three-week program on the authored weekdays, week 1 falling in that Thursday's own week (G-2, KD-1, KD-2, KD-10) `npx playwright test tests/schedule-anchor.spec.js` → passed 2026-08-27 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/schedule-anchor.spec.js:19:5 › starting on a Thur)
- [x] **VC-3** Starting week 3 day 2 while week 1 is unrun runs that entry and leaves every skipped entry unrun and in its original position (G-3, KD-6) `npx playwright test tests/schedule-out-of-order.spec.js` → passed 2026-08-27 (ran: exit 0 — Running 1 test using 1 worker ✓ 1 tests/schedule-out-of-order.spec.js:20:5 › starting week)
- [x] **VC-4** Completing an entry two days after its expected date moves every remaining expected date exactly two days later, leaving the intervals between them unchanged (G-5, KD-4, KD-9) `npx playwright test tests/schedule-shift.spec.js` → passed 2026-08-27 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/schedule-shift.spec.js:20:5 › completing two days), passed 2026-08-27 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/schedule-shift.spec.js:20:5 › completing two days)
- [x] **VC-5** Export after one completed entry produces JSON in which every entry still carries its week and day, each carries a computed expected date, and the completed one carries the date it actually ran (G-4, KD-7) `npx playwright test tests/schedule-export.spec.js` → passed 2026-08-27 (ran: exit 0 — Running 1 test using 1 worker ✓ 1 tests/schedule-export.spec.js:17:5 › export carries week)
- [x] **VC-6** Reloading the page with no export or load restores the part-run program with the same expected dates and the same entry marked run (G-5, KD-8) `npx playwright test tests/schedule-persist.spec.js` → passed 2026-08-27 (ran: exit 0 — Running 1 test using 1 worker ✓ 1 tests/schedule-persist.spec.js:17:5 › reloading restores)
- [x] **VC-7** Loading a program while a part-run program is stored warns before the stored state is replaced, and declining the warning leaves the stored state intact (KD-11) `npx playwright test tests/schedule-replace-warning.spec.js` → passed 2026-08-27 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/schedule-replace-warning.spec.js:23:5 › declining)
- [x] **VC-8** Finishing early moves nothing while any earlier session is unrun, and does pull the rest forward once every earlier session has been run (G-5, KD-20) `npx playwright test tests/schedule-shift.spec.js` → passed 2026-08-27 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/schedule-shift.spec.js:20:5 › completing two days)

## Changelog
- 2026-08-27: Spec initialized.
- 2026-08-27: G-1 added
- 2026-08-27: G-2 added
- 2026-08-27: G-3 added
- 2026-08-27: G-4 added
- 2026-08-27: G-5 added
- 2026-08-27: NG-1 added
- 2026-08-27: NG-2 added
- 2026-08-27: OQ-1 added
- 2026-08-27: OQ-2 added
- 2026-08-27: OQ-3 added
- 2026-08-27: OQ-4 added
- 2026-08-27: OQ-5 added
- 2026-08-27: OQ-6 added
- 2026-08-27: OQ-7 added
- 2026-08-27: OQ-8 added
- 2026-08-27: KD-1 resolves OQ-1
- 2026-08-27: KD-2 resolves OQ-2
- 2026-08-27: KD-3 resolves OQ-3
- 2026-08-27: KD-4 resolves OQ-4
- 2026-08-27: KD-5 resolves OQ-5
- 2026-08-27: KD-6 resolves OQ-6
- 2026-08-27: KD-7 resolves OQ-7
- 2026-08-27: KD-8 resolves OQ-8
- 2026-08-27: OQ-9 added
- 2026-08-27: OQ-10 added
- 2026-08-27: OQ-11 added
- 2026-08-27: KD-9 resolves OQ-9
- 2026-08-27: KD-10 resolves OQ-10
- 2026-08-27: KD-11 resolves OQ-11
- 2026-08-27: VC-1 added
- 2026-08-27: VC-2 added
- 2026-08-27: VC-3 added
- 2026-08-27: VC-4 added
- 2026-08-27: VC-5 added
- 2026-08-27: VC-6 added
- 2026-08-27: VC-7 added
- 2026-08-27: IMPL-1 added
- 2026-08-27: IMPL-2 added
- 2026-08-27: IMPL-3 added
- 2026-08-27: IMPL-4 added
- 2026-08-27: IMPL-5 added
- 2026-08-27: IMPL-6 added
- 2026-08-27: IMPL-7 added
- 2026-08-27: OQ-12 raised by dry run
- 2026-08-27: OQ-13 raised by dry run
- 2026-08-27: OQ-14 raised by dry run
- 2026-08-27: OQ-15 raised by dry run
- 2026-08-27: OQ-16 raised by dry run
- 2026-08-27: OQ-17 raised by dry run
- 2026-08-27: KD-12 resolves OQ-12
- 2026-08-27: KD-13 resolves OQ-13
- 2026-08-27: KD-14 resolves OQ-14
- 2026-08-27: KD-15 resolves OQ-15
- 2026-08-27: KD-16 resolves OQ-16
- 2026-08-27: KD-17 resolves OQ-17
- 2026-08-27: OQ-18 raised by dry run
- 2026-08-27: KD-18 resolves OQ-18
- 2026-08-27: OQ-19 raised by dry run
- 2026-08-27: KD-19 resolves OQ-19
- 2026-08-27: dry run clean — Walked IMPL-1 to IMPL-7 through js/cadence-program.js: the authored week and day shape, anchoring on first launch, the shift on completion, out-of-order launching, the export shape, localStorage persistence with the replace warning, and the eight-week example in index.html; checked each implementation item's citations against KD-1 to KD-19 and found no stale ones
- 2026-08-27: Status: Draft → Ready
- 2026-08-27: Status: Ready → In Progress
- 2026-08-27: IMPL-1, IMPL-2, IMPL-3, IMPL-4, IMPL-5, IMPL-6, IMPL-7 checked
- 2026-08-27: VC-1 passed
- 2026-08-27: VC-2 passed
- 2026-08-27: VC-3 passed
- 2026-08-27: VC-4 passed
- 2026-08-27: VC-5 passed
- 2026-08-27: VC-6 passed
- 2026-08-27: VC-7 passed
- 2026-08-27: OQ-20 added
- 2026-08-27: KD-20 resolves OQ-20
- 2026-08-27: IMPL-8 added
- 2026-08-27: VC-8 added
- 2026-08-27: IMPL-8 checked
- 2026-08-27: VC-8 passed
- 2026-08-27: VC-4 passed
- 2026-08-27: Status: In Progress → Done
