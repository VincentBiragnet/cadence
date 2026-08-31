# Spec: Program view: a scrolling list instead of a dropdown

**Status:** In Progress
**Description:** Program view: a scrolling list instead of a dropdown

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** The program view fits a 390px phone without the page ever scrolling sideways, whatever length the authored titles are
- **G-2** The picker is a list of every session that scrolls up and down, opening already positioned on the current step
- **G-3** A row says at a glance which session it is, when it is due and what state it is in, without being read character by character
- **G-4** The view says where the program as a whole stands: how much is done, when it is projected to finish, and any overrun against a milestone
- **G-5** A session whose date has passed without being run or dropped reads as stale at a glance, so a backlog is visible without reading every date

## Non-Goals
- **NG-1** The scheduling model itself, which the two previous specs settled and this one only displays
- **NG-2** The clock's own m:ss time format, which renders a 3h38m session as 218:00: a real defect, but in cadence-clock and its own archived spec

## Open Questions
- **OQ-1** ~~What replaces the dropdown~~ → KD-1
- **OQ-2** ~~Does scrolling up and down mean the list simply runs the whole program with no paging, or that it wraps round from the last session to the first~~ → KD-2
- **OQ-3** ~~Does every row sit in the DOM, which is 168 of them for the rehab protocol, or only the ones on screen~~ → KD-5
- **OQ-4** ~~Does tapping a row select it with Start still a separate press, or does tapping run it there and then~~ → KD-3
- **OQ-5** ~~A 107-character title cannot fit 390px on one line, so is it truncated, wrapped over two lines, or does an entry gain a short label of its own for the list to show~~ → KD-4
- **OQ-6** ~~Does the list move itself back to the current step after every completion and drop, or only when the view is first opened~~ → KD-6
- **OQ-7** ~~A native select brings keyboard control and screen reader semantics for nothing, so what replaces them once it is a list of elements~~ → discovery:accessible-listbox-patterns, KD-8, KD-9, KD-10, KD-11, KD-12
- **OQ-8** ~~Where do Start, Drop, Export and the replanning prompt sit once the list is the tall thing on the page, given a phone shows about one screenful~~ → KD-14
- **OQ-9** ~~How do a milestone, a dropped session and a session already done read differently from an ordinary one in a row, without relying on colour alone~~ → KD-13
- **OQ-10** ~~Is the projected finish the last session's expected date, and what does it say when a milestone is already overrun~~ → KD-7
- **OQ-11** ~~Is a session stale the moment its date is behind today, or only once the next one is also due, given a session done in the evening rather than the morning is not a backlog~~ → KD-15
- **OQ-12** ~~Does the list mark where today falls, as a divider between what is behind and what is ahead, or does the stale mark on each row carry it alone~~ → KD-16
- **OQ-13** ~~Stale is a fourth row state after done, dropped and milestone, and those three took the icon at the end of the row: does stale take an icon too, and what carries it in the row's accessible name~~ → KD-17
- **OQ-14** ~~A milestone whose date has passed unreached is stale in a stronger sense than a session, since it cannot be caught up: does it read differently~~ → KD-18
- **OQ-15** ~~IMPL-9 says four existing tests drive the select, but fourteen files hold thirty-four references to cdp-select: what actually happens to them, and does the listbox keep a stable hook that a test can drive the way value and click did~~ → KD-23
- **OQ-16** ~~The list is hidden while a session runs and the running clock takes its place, so what becomes of the docked bar during a run: does Start turn into something else, does the bar go with the list, or does Back move into it~~ → KD-24
- **OQ-17** ~~KD-4 gives an entry a short label for the list, but a milestone already carries a title of its own from the previous spec: are those the same field, and which one does a milestone's row show~~ → KD-25
- **OQ-18** ~~Tapping a row selects it and Start is separate, but with a roving tabindex the arrow keys move focus: does arrowing to a row also select it, or can the focused row and the row Start would run be different ones~~ → discovery:selection-following-focus, KD-19, KD-20, KD-21, KD-22
- **OQ-19** ~~Staleness is computed against today on a page that may sit open for days, so does the view recompute as the day turns, and what makes it notice~~ → KD-26
- **OQ-20** ~~The divider marks where today falls, so where does it go when every session is already behind, when every one is still ahead, and when the program has not been anchored and no session has a date at all~~ → KD-27
- **OQ-21** ~~The projected finish is the last session's expected date, but the last entry may be a milestone, or dropped, or already done: which entry actually supplies it~~ → KD-28
- **OQ-22** ~~The trailing slot holds one icon, and KD-17 reasoned it was free for stale because a stale session is neither done nor dropped, but a milestone already spends that slot on being a milestone and KD-18 has an unreached one read as missed: what does a milestone whose date has passed show there~~ → KD-29
- **OQ-23** ~~A single divider before the first row still ahead assumes the dates climb steadily down the list, but a session left unrun keeps its old date while later ones shift, so a past date can sit below a future one: what does the divider do when the list is not in date order~~ → KD-31
- **OQ-24** ~~G-4 has the view state progress, projected finish and overrun, but KD-14 only placed the controls and KD-24 sends the bar away during a run: where does that summary sit, and is it still there while a session is running~~ → KD-32

## Key Decisions
- **KD-1** A list of every session that scrolls up and down in place of the native select, opening positioned on the current step, which is the first unrun one or whatever the stored state was left on (OQ-1)
- **KD-2** The list runs the whole program once and stops: it has a beginning and an end, because a plan that never ends hides the one thing a training block is for, which is arriving somewhere (OQ-2)
- **KD-3** Tapping a row selects it and Start stays a separate press, which keeps a deliberate second act between choosing and doing and keeps Drop from acting on something a stray tap chose (OQ-4)
- **KD-4** An entry carries a short label of its own for the list to show, falling back to the sequence title when it has none, so the list is legible without the authored title being cut (OQ-5)
- **KD-5** Every row sits in the DOM: 168 rows is nothing for a browser, and virtualising would be measured into existence rather than assumed (OQ-3)
- **KD-6** The list moves back to the current step after every completion and drop, as well as on opening, since both change which step is current (OQ-6)
- **KD-7** The projected finish is the last session's expected date, and when a milestone is already overrun the view says the overrun instead, since the finish is not the news at that point (OQ-10)
- **KD-8** Rows are real focusable elements carrying a roving tabindex rather than aria-activedescendant, because this app is used on a phone first and mobile screen readers ignore aria-activedescendant entirely (OQ-7 via discovery:accessible-listbox-patterns)
- **KD-9** The list is role=listbox labelled by the program title, each row is role=option, and exactly one row carries aria-selected at a time (OQ-7 via discovery:accessible-listbox-patterns)
- **KD-10** Arrow keys move between rows and Home and End jump to the first and last, which the pattern asks for on any list past five options (OQ-7 via discovery:accessible-listbox-patterns)
- **KD-11** Positioning on the current step is done by focusing its row and letting the user agent scroll it into view, rather than by computing a scroll offset, which is the same mechanism assistive technology relies on (OQ-7 via discovery:accessible-listbox-patterns)
- **KD-12** Typeahead is not provided: the list positions itself on the step you want and the short labels repeat across weeks, so typing a letter would jump between look-alike rows rather than help (OQ-7 via discovery:accessible-listbox-patterns)
- **KD-13** ~~A small icon at the end of the row marks a milestone, a dropped session and a done one, and the same distinction is carried in the row's accessible name, so it never rests on the icon alone any more than on colour alone (KD-9) (OQ-9)~~ → superseded by KD-30
- **KD-14** The list owns the screen and the controls sit in a bar docked beneath it: Start within thumb reach, the program-level actions and Drop behind a More menu, with a line in that same bar naming the session Start would run and a control that jumps the list back to the current step (OQ-8)
- **KD-15** A session is stale once its date is strictly behind today and it is neither run nor dropped, so one still due today is never stale and an evening session is not a backlog by lunchtime (OQ-11)
- **KD-16** Both: a divider marks where today falls, which anchors the scroll, and each stale row carries its own mark, which survives the divider being off screen (OQ-12)
- **KD-17** Stale takes the same trailing slot as the other three, which is free because a stale session is by definition neither done nor dropped, and the row's accessible name ends in overdue (OQ-13)
- **KD-18** A milestone whose date has passed unreached reads as missed rather than overdue, because a date that cannot be caught up is a different fact from a session waiting to be done (OQ-14)
- **KD-19** Selection follows focus: arrowing to a row makes it the row Start and Drop act on, so what is on screen and what is armed cannot come apart (OQ-18 via discovery:selection-following-focus)
- **KD-20** Decoupling them was rejected because its safety is theoretical here: the armed row can scroll out of sight, leaving an irreversible confirmation that legitimately names something the user is not looking at, which is a worse failure than an armed target that follows the eye (OQ-18 via discovery:selection-following-focus)
- **KD-21** The jump to the current step targets the soonest session neither run nor dropped, computed from the program and never read from the selection, which is required whichever way selection behaves (OQ-18 via discovery:selection-following-focus)
- **KD-22** The drop confirmation leads with the name of what is being dropped, since it is the last thing standing between a slipped press and lost work and it is read in a hurry (OQ-18 via discovery:selection-following-focus)
- **KD-23** IMPL-9 undercounts: fourteen files hold thirty-four references, but in only four shapes, all of which the listbox answers directly — a row carries a stable class so a test can click the nth row where it set value, read that row's text where it read an option, and read the row carrying aria-selected where it read selectedOptions, so every one is rewritten mechanically and the count in IMPL-9 stands corrected (OQ-15)
- **KD-24** The docked bar goes with the list: while a session runs, the clock and its Back button have the screen to themselves, since Start and the jump have nothing to act on mid-run and Drop least of all (OQ-16)
- **KD-25** One field: an entry's label is the short one the list shows, and where it is missing the row falls back to a milestone's title and then to the sequence title, so the milestone title from the previous spec keeps working untouched (OQ-17)
- **KD-26** Staleness is worked out afresh every time the list renders, and the view re-renders when the page becomes visible again, which is what a phone does to a tab left open for days; no clock ticks towards midnight waiting for the day to turn (OQ-19)
- **KD-27** The divider sits before the first row still ahead, which puts it at the top when nothing is behind and at the very end when everything is; a program with no dates yet has no today to mark and shows no divider at all (OQ-20)
- **KD-28** The projected finish is the latest expected date among the entries neither done nor dropped, a milestone counting as much as a session, and once nothing is left it stops being a projection and says the program is finished (OQ-21)
- **KD-29** The trailing slot carries state alone — done, dropped, stale, missed — because being a milestone is already said by the row's own leading text and its accessible name, which leaves the slot free for the one thing that changes (OQ-22)
- **KD-30** The trailing icon marks state only, and a milestone is told apart by the text the row leads with rather than by that icon (OQ-22) (supersedes KD-13)
- **KD-31** The divider goes before the first row in list order whose date is not behind today, and nothing more is claimed of it: it anchors the scroll, while any past-dated row further down carries its own stale mark, which is exactly why KD-16 asks for both (OQ-23)
- **KD-32** The summary is a header above the list, and it goes when the list goes: a running clock is not the moment to read how the program as a whole is doing (KD-24) (OQ-24)

## Prior Art
- **PA-1** Measured on the current build at 390 by 844: the shipped eight-week example fits, but a sixty-session program with a milestone gives a 107-character label, an 843px select and an 851px page that scrolls sideways
- **PA-2** A native select takes its width from its longest option, and .cdp-select sets no max-width and no min-width, so a flex row wraps but never shrinks it
- **PA-3** The label grows over a program's life: no date before anchoring, then the expected date, then a done or dropped suffix, so the overflow worsens with use
- **PA-4** Three simulated users hit this: sixteen weeks of marathon training, one hundred and sixty-eight rehab sessions, and sixty guitar practices on a phone in hotel rooms
- **PA-5** None of the three prototypes had any notion of a passed date: a grep across all three for today, overdue, stale or late found nothing, and a session missed three weeks ago rendered identically to one three weeks away

## Implementation Details
- [ ] **IMPL-1** Replace the select with a listbox: one focusable row per entry, roving tabindex, arrow keys and Home and End, labelled by the program title (KD-8, KD-9, KD-10)
- [ ] **IMPL-2** Give an entry an optional short label and show it in the row with the entry's date, never the sequence title (KD-4)
- [ ] **IMPL-3** Mark each row's state with a trailing icon and carry the same word in its accessible name (KD-13, KD-17, KD-18)
- [ ] **IMPL-4** Compute staleness against today and render the divider between what is behind and what is ahead (KD-15, KD-16)
- [ ] **IMPL-5** Move the current step into view by focusing its row, on opening and after every completion and drop (KD-6, KD-11)
- [ ] **IMPL-6** Dock the control bar beneath the list: Start, the line naming what it would run, the jump to the current step, and a More menu holding Drop, Export, the replanning prompt and Load (KD-14)
- [ ] **IMPL-7** Show how much of the program is done and its projected finish, giving way to the overrun when there is one (KD-7)
- [ ] **IMPL-8** Constrain the list so a long label cannot widen the page, and cap its width on a desktop viewport (G-1)
- [ ] **IMPL-9** Rewrite the four existing program tests that drive the select onto the listbox

## Verification Criteria
- [ ] **VC-1** The list exposes role=listbox with every row role=option and exactly one row carrying aria-selected true at any time
- [ ] **VC-2** In a sixty-session program the arrow keys move the focused row one at a time, Home and End reach the first and last, and each newly focused row is inside the scrolled viewport without any scroll code of our own
- [ ] **VC-3** Opening the view, and completing or dropping a session, each leave the current step focused and within the visible area of the list
- [ ] **VC-4** With sixty sessions whose titles run past a hundred characters, a 390px viewport reports no horizontal overflow and the layout viewport stays 390 (G-1) `npx playwright test tests/view-width.spec.js`
- [ ] **VC-5** The list holds one row per entry in authored order, the last row is the last entry with nothing after it, and opening the view leaves the current step in view (G-2, KD-2) `npx playwright test tests/view-list.spec.js`
- [ ] **VC-6** A row shows the entry's short label and its date and never the full sequence title, and its accessible name ends with its state (G-3, KD-4, KD-13) `npx playwright test tests/view-row.spec.js`
- [ ] **VC-7** The view states how many sessions are done out of the total and the date the program is projected to finish, and says the overrun in its place once a milestone is overrun (G-4, KD-7) `npx playwright test tests/view-summary.spec.js`
- [ ] **VC-8** A session dated before today and neither run nor dropped is marked stale with overdue in its accessible name, a divider sits between the last past row and the first row still ahead, and a milestone whose date passed unreached reads as missed (G-5, KD-15, KD-16, KD-17, KD-18) `npx playwright test tests/view-stale.spec.js`
- [ ] **VC-9** Start sits in the docked bar and is still reachable with the list scrolled to its end, Drop is reachable only through the More menu, the bar names the session Start would run, and the jump control returns the list to the current step (KD-14) `npx playwright test tests/view-controls.spec.js`
- [ ] **VC-10** Arrowing onto a row makes it the row Start and Drop act on, and the bar names that row
- [ ] **VC-11** After browsing away from it, the jump control returns to the soonest session neither run nor dropped, whatever is selected at the time
- [ ] **VC-12** The drop confirmation opens with the name of the session or milestone being dropped

## Changelog
- 2026-08-31: Spec initialized.
- 2026-08-31: G-1 added
- 2026-08-31: G-2 added
- 2026-08-31: G-3 added
- 2026-08-31: G-4 added
- 2026-08-31: NG-1 added
- 2026-08-31: NG-2 added
- 2026-08-31: PA-1 added
- 2026-08-31: PA-2 added
- 2026-08-31: PA-3 added
- 2026-08-31: PA-4 added
- 2026-08-31: OQ-1 added
- 2026-08-31: KD-1 resolves OQ-1
- 2026-08-31: OQ-2 added
- 2026-08-31: OQ-3 added
- 2026-08-31: OQ-4 added
- 2026-08-31: OQ-5 added
- 2026-08-31: OQ-6 added
- 2026-08-31: OQ-7 added
- 2026-08-31: OQ-8 added
- 2026-08-31: OQ-9 added
- 2026-08-31: OQ-10 added
- 2026-08-31: KD-2 resolves OQ-2
- 2026-08-31: KD-3 resolves OQ-4
- 2026-08-31: KD-4 resolves OQ-5
- 2026-08-31: KD-5 resolves OQ-3
- 2026-08-31: KD-6 resolves OQ-6
- 2026-08-31: KD-7 resolves OQ-10
- 2026-08-31: OQ-7 opened discovery:accessible-listbox-patterns
- 2026-08-31: KD-8, KD-9, KD-10, KD-11, KD-12, VC-1, VC-2, VC-3 applied from discovery:accessible-listbox-patterns
- 2026-08-31: KD-13 resolves OQ-9
- 2026-08-31: G-5 added
- 2026-08-31: PA-5 added
- 2026-08-31: OQ-11 added
- 2026-08-31: OQ-12 added
- 2026-08-31: OQ-13 added
- 2026-08-31: OQ-14 added
- 2026-08-31: KD-14 resolves OQ-8
- 2026-08-31: KD-15 resolves OQ-11
- 2026-08-31: KD-16 resolves OQ-12
- 2026-08-31: KD-17 resolves OQ-13
- 2026-08-31: KD-18 resolves OQ-14
- 2026-08-31: VC-4 added
- 2026-08-31: VC-5 added
- 2026-08-31: VC-6 added
- 2026-08-31: VC-7 added
- 2026-08-31: VC-8 added
- 2026-08-31: VC-9 added
- 2026-08-31: IMPL-1 added
- 2026-08-31: IMPL-2 added
- 2026-08-31: IMPL-3 added
- 2026-08-31: IMPL-4 added
- 2026-08-31: IMPL-5 added
- 2026-08-31: IMPL-6 added
- 2026-08-31: IMPL-7 added
- 2026-08-31: IMPL-8 added
- 2026-08-31: IMPL-9 added
- 2026-08-31: Status: Draft → Ready
- 2026-08-31: OQ-15 raised by dry run
- 2026-08-31: OQ-16 raised by dry run
- 2026-08-31: OQ-17 raised by dry run
- 2026-08-31: OQ-18 raised by dry run
- 2026-08-31: OQ-19 raised by dry run
- 2026-08-31: OQ-20 raised by dry run
- 2026-08-31: OQ-21 raised by dry run
- 2026-08-31: OQ-18 opened discovery:selection-following-focus
- 2026-08-31: KD-19, KD-20, KD-21, KD-22, VC-10, VC-11, VC-12 applied from discovery:selection-following-focus
- 2026-08-31: KD-23 resolves OQ-15
- 2026-08-31: KD-24 resolves OQ-16
- 2026-08-31: KD-25 resolves OQ-17
- 2026-08-31: KD-26 resolves OQ-19
- 2026-08-31: KD-27 resolves OQ-20
- 2026-08-31: KD-28 resolves OQ-21
- 2026-08-31: OQ-22 raised by dry run
- 2026-08-31: OQ-23 raised by dry run
- 2026-08-31: KD-29 resolves OQ-22
- 2026-08-31: KD-30 supersedes KD-13
- 2026-08-31: KD-31 resolves OQ-23
- 2026-08-31: OQ-24 raised by dry run
- 2026-08-31: KD-32 resolves OQ-24
- 2026-08-31: dry run clean — Walked IMPL-1 to IMPL-9 through js/cadence-program.js and css/theme.css: the listbox with its roving tabindex and keys, the short label and the date in each row, the state icon and the accessible name, staleness against today with the divider, moving the current step into view by focusing it, the docked bar with Start and the jump and the More menu, the summary header, the width constraints, and the thirty-four call sites in fourteen test files; checked every implementation item's citations against KD-1 to KD-32 including the superseded KD-13, and found IMPL-9's count already corrected by KD-23
- 2026-08-31: Status: Ready → In Progress
