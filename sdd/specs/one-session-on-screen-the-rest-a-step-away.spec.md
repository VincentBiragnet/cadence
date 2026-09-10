# Spec: One session on screen, the rest a step away

**Status:** In Progress
**Description:** One session on screen, the rest a step away

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** Opening the app shows the one session you are meant to do, not every session in the program
- **G-2** Reaching any other session takes one deliberate move, and getting back takes another
- **G-3** A program of 172 sessions opens the same way a program of 24 does

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** ~~How do you reach a session that is not the one offered, and how do you get back?~~ → discovery:how-you-reach-a-session-that-is-not-the-next-one, KD-1, KD-2, KD-3, KD-4
- **OQ-2** ~~What does the one card actually show, beyond a title and a Start?~~ → KD-5
- **OQ-3** ~~What is offered when nothing is due: the next one ahead, the one you missed, or something that says you are done?~~ → KD-6
- **OQ-4** ~~Where does the card live: a third view inside cadence-program beside the list and the run, or a separate element the page composes?~~ → KD-7
- **OQ-5** ~~Does the card replace the list as what restore() opens on, and what happens to a page that has always shown the list?~~ → KD-8
- **OQ-6** ~~What does the card do while a session is running, given the run view already replaces the list?~~ → KD-9
- **OQ-7** ~~How is how-many-behind counted, given a dropped session is settled but never done?~~ → KD-10
- **OQ-8** ~~What does the fit calculation use for a rate, given the programme's own stated rules are prose in a guidance block that nothing parses?~~ → KD-11

## Key Decisions
- **KD-1** The shape is B: one card, with the full dated list one deliberate press away and a press back. The dropdown is refused outright, since it carries no dates, renders dropped as done and hides how far behind you are; the arrows are refused as a way to cross a programme, though stepping to the adjacent session stays reasonable (OQ-1 via discovery:how-you-reach-a-session-that-is-not-the-next-one)
- **KD-2** The card carries orientation, not just a title: how many sessions are behind, the next fixed date and how long until it, and whether the plan still fits before it. Every reviewer counted those by hand off the list, which is the work the card exists to save (OQ-1 via discovery:how-you-reach-a-session-that-is-not-the-next-one)
- **KD-3** A card showing anything other than the session you are due must say so unmistakably and offer a way back to today. NEXT UP and CHOSEN currently render identically, and no treatment has a way home (OQ-1 via discovery:how-you-reach-a-session-that-is-not-the-next-one)
- **KD-4** The card names what pressing the button will do, the way the list bar already does, because a browsed session and the due one are otherwise one identical tap apart (OQ-1 via discovery:how-you-reach-a-session-that-is-not-the-next-one)
- **KD-5** What it is and when it was due; what pressing the button will do, named; and the orientation every reviewer counted by hand, which is how many sessions are behind and whether the plan still fits before the next fixed date. Nothing else: the card is what you look at instead of the list, not a second list (OQ-2)
- **KD-6** It says the programme is finished and offers nothing to start, because offering tomorrow's session under NEXT UP is what made a reviewer at 7pm think the day was not done. A programme that has not begun offers its first session and says when it is due rather than pretending it is now (OQ-3)
- **KD-7** A third view inside cadence-program, beside the list and the run. The element already owns selection, the schedule, the anchor and every date the card wants to state; a separate element would have to be handed all of it and kept in step, which is exactly the two-cursor bug the prototype had (OQ-4)
- **KD-8** Yes, the card is what a loaded programme opens on, and the list becomes a place you go. Nothing else changes: restore still returns whether there was a programme, and the page still asks (OQ-5)
- **KD-9** Nothing. The run view already replaces the list and will replace the card the same way, and the card is rebuilt on the way back out through the single teardown path (OQ-6)
- **KD-10** Behind means dated before today, not settled, and not a milestone: a dropped session was decided about and is not owed, and a milestone is a date rather than work. That is the count a person means by how far behind am I (OQ-7)
- **KD-11** From the programme's own history, not from its prose: the observed rate is what has actually been done per week so far, and before anything has been done, the plan's own spacing between the remaining sessions. Parsing three sessions a week out of a guidance block would be guessing at prose in whatever language it was written in (OQ-8)

## Prior Art
- **PA-1** Said by the user on 2026-09-10: the screen is bloated with all the sessions; I should see only the one I am supposed to do and have a way to switch to all sessions and choose one, like Talon
- **PA-2** Talon puts one card on its home screen, the current week's session with its sets, reps, RM and the flags that apply to that week, and a small week select in the header as the only way to move; the list of every session does not exist as a screen at all
- **PA-3** Cadence today opens on a listbox of every entry, which for the HSR protocol is 37 rows and for the AM/PM rehab example is 172, with the current one selected somewhere inside it
- **PA-4** The archived program-view spec chose that scrolling list deliberately, over a dropdown, and its decisions about keyboard handling, the roving focus, the today marker and the stale divider all belong to the list. This spec changes what opens, not whether a list can exist
- **PA-5** Twenty-five test files had to be told to open the list, which is the measure of how much of this app was written on the assumption that the list is the app

## Implementation Details
- [x] **IMPL-1** Give cadence-program a card view beside the list and the run
- [x] **IMPL-2** Open a loaded or restored programme on the card, and route every exit from a run back to it
- [x] **IMPL-3** State the standing position: how many are behind, the next fixed date, and whether what remains still fits
- [x] **IMPL-4** Mark a browsed session as such and give it a way back to the due one
- [x] **IMPL-5** Name what the button will do, on the card as on the list bar
- [x] **IMPL-6** Say a programme is complete rather than offering the next thing
- [x] **IMPL-7** Move focus to the card's action on the way out of a run

## Verification Criteria
- [ ] **VC-1** With sessions overdue and a milestone ahead, the card states the number behind and the days remaining, and says plainly when what is still due cannot fit before the milestone at the programme's own stated rate
- [ ] **VC-2** A card showing a session other than the due one is visibly marked as such and carries a control that returns to the due one in one press
- [ ] **VC-3** Opening the full list scrolls to the current session rather than to the top, on a 37-entry programme and on a 172-entry one
- [x] **VC-4** With a programme loaded, the app opens on one session and no list, and the list is reachable and dismissable in one press each (G-1, G-2) `npx playwright test tests/card-open.spec.js` → passed 2026-09-10 (ran: exit 0 — Running 5 tests using 1 worker ✓ 1 tests/card-open.spec.js:47:5 › a loaded programme opens)
- [x] **VC-5** A 172-session programme opens the same way a 25-session one does, with the same controls in the same places and no scrolling to reach Start (G-3) `npx playwright test tests/card-scale.spec.js` → passed 2026-09-10 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/card-scale.spec.js:39:5 › 25 sessions and 172 ope)

## Changelog
- 2026-09-10: Spec initialized.
- 2026-09-10: G-1 added
- 2026-09-10: G-2 added
- 2026-09-10: G-3 added
- 2026-09-10: PA-1 added
- 2026-09-10: PA-2 added
- 2026-09-10: PA-3 added
- 2026-09-10: PA-4 added
- 2026-09-10: Status: Draft → Ready
- 2026-09-10: OQ-1 added
- 2026-09-10: OQ-2 added
- 2026-09-10: OQ-3 added
- 2026-09-10: OQ-1 opened discovery:how-you-reach-a-session-that-is-not-the-next-one
- 2026-09-10: KD-1, KD-2, KD-3, KD-4, VC-1, VC-2, VC-3 applied from discovery:how-you-reach-a-session-that-is-not-the-next-one
- 2026-09-10: KD-5 resolves OQ-2
- 2026-09-10: KD-6 resolves OQ-3
- 2026-09-10: VC-4 added
- 2026-09-10: VC-5 added
- 2026-09-10: OQ-4 raised by dry run
- 2026-09-10: OQ-5 raised by dry run
- 2026-09-10: OQ-6 raised by dry run
- 2026-09-10: OQ-7 raised by dry run
- 2026-09-10: OQ-8 raised by dry run
- 2026-09-10: KD-7 resolves OQ-4
- 2026-09-10: KD-8 resolves OQ-5
- 2026-09-10: KD-9 resolves OQ-6
- 2026-09-10: KD-10 resolves OQ-7
- 2026-09-10: KD-11 resolves OQ-8
- 2026-09-10: dry run clean — Walked it: cadence-program gains a card view that a loaded programme opens on, rebuilt from the same selection and dates the list uses; it states what the session is, when it was due, what the button will do, how many are behind and whether what remains still fits before the next milestone; a session other than the due one is marked and carries a way back; All sessions swaps to the list, which scrolls to the current step, and Back returns; a finished programme says so and offers nothing
- 2026-09-10: Status: Ready → In Progress
- 2026-09-10: IMPL-1 added
- 2026-09-10: IMPL-2 added
- 2026-09-10: IMPL-3 added
- 2026-09-10: IMPL-4 added
- 2026-09-10: IMPL-5 added
- 2026-09-10: IMPL-6 added
- 2026-09-10: IMPL-7 added
- 2026-09-10: IMPL-1, IMPL-2, IMPL-3, IMPL-4, IMPL-5, IMPL-6, IMPL-7 checked
- 2026-09-10: PA-5 added
- 2026-09-10: VC-4 passed
- 2026-09-10: VC-5 passed
