# Spec: Program view: a scrolling list instead of a dropdown

**Status:** Draft
**Description:** Program view: a scrolling list instead of a dropdown

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** The program view fits a 390px phone without the page ever scrolling sideways, whatever length the authored titles are
- **G-2** The picker is a list of every session that scrolls up and down, opening already positioned on the current step
- **G-3** A row says at a glance which session it is, when it is due and what state it is in, without being read character by character
- **G-4** The view says where the program as a whole stands: how much is done, when it is projected to finish, and any overrun against a milestone

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
- **OQ-8** Where do Start, Drop, Export and the replanning prompt sit once the list is the tall thing on the page, given a phone shows about one screenful
- **OQ-9** ~~How do a milestone, a dropped session and a session already done read differently from an ordinary one in a row, without relying on colour alone~~ → KD-13
- **OQ-10** ~~Is the projected finish the last session's expected date, and what does it say when a milestone is already overrun~~ → KD-7

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
- **KD-13** A small icon at the end of the row marks a milestone, a dropped session and a done one, and the same distinction is carried in the row's accessible name, so it never rests on the icon alone any more than on colour alone (KD-9) (OQ-9)

## Prior Art
- **PA-1** Measured on the current build at 390 by 844: the shipped eight-week example fits, but a sixty-session program with a milestone gives a 107-character label, an 843px select and an 851px page that scrolls sideways
- **PA-2** A native select takes its width from its longest option, and .cdp-select sets no max-width and no min-width, so a flex row wraps but never shrinks it
- **PA-3** The label grows over a program's life: no date before anchoring, then the expected date, then a done or dropped suffix, so the overflow worsens with use
- **PA-4** Three simulated users hit this: sixteen weeks of marathon training, one hundred and sixty-eight rehab sessions, and sixty guitar practices on a phone in hotel rooms

## Implementation Details
_No items yet._

## Verification Criteria
- [ ] **VC-1** The list exposes role=listbox with every row role=option and exactly one row carrying aria-selected true at any time
- [ ] **VC-2** In a sixty-session program the arrow keys move the focused row one at a time, Home and End reach the first and last, and each newly focused row is inside the scrolled viewport without any scroll code of our own
- [ ] **VC-3** Opening the view, and completing or dropping a session, each leave the current step focused and within the visible area of the list

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
