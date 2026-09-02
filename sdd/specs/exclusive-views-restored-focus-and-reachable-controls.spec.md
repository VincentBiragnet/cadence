# Spec: Exclusive views, restored focus and reachable controls

**Status:** Done
**Description:** Exclusive views, restored focus and reachable controls

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** A view marked hidden is actually gone: never rendered, never focusable, never in the accessibility tree
- **G-2** Focus lands somewhere meaningful whenever a view is swapped, rather than being left on a control that has just gone
- **G-3** The controls a person presses every day are big enough to press on a phone one-handed
- **G-4** The list contains only options, so the today marker cannot be an invalid child of a listbox
- **G-5** The More menu closes the way a menu closes: on Escape, and on a press outside it

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** ~~Is hidden enforced once with a rule that beats every component, or by making each component's own display rule conditional~~ → KD-1
- **OQ-2** ~~Where does focus go when a session ends, and where when one starts~~ → KD-2
- **OQ-3** ~~Does the today marker become a decoration on the row that follows it, or stay its own element outside the list~~ → KD-3
- **OQ-4** ~~How big is big enough for a control, given the audit measured 24 pixels as the standard's floor and asked for 44~~ → KD-4
- **OQ-5** ~~The empty-state criterion of the design spec asserted the hidden property and passed while four buttons were on screen, so does that criterion get corrected too, or does a passed criterion stand once the thing it checked turns out not to have been checked~~ → KD-5
- **OQ-6** ~~Focus moves to a row after a drop and after a completion, but a drop can be reached from inside the More menu, so where does focus go when the menu that was pressed is itself about to close~~ → KD-6
- **OQ-7** ~~Making the marker generated content puts the word Today outside the accessibility tree entirely, where before it was an element a reader could at least have been given: is anything owed to a reader in its place~~ → KD-7

## Key Decisions
- **KD-1** One rule, hidden display none important, placed before the component rules: a component author should never have to remember that laying something out silently un-hides it, and a per-component fix would have to be got right again every time a display rule is added (OQ-1)
- **KD-2** Ending a session puts focus on the row of the step that is now current, which is where the listbox pattern expects it and where the next arrow key should work; starting one puts focus on the running sequence's own start control, so the gesture that begins the work is under the finger (OQ-2)
- **KD-3** It becomes generated content on the first row still ahead, which is never in the accessibility tree at all, so the list holds only options and there is nothing left to hide from a reader; the case where today falls past every row keeps a marker of its own after the list, outside the listbox (OQ-3)
- **KD-4** Forty-four pixels on both axes for anything pressed in the course of using a program, which clears the standard's floor with room and matches what the row already does; the audit's own reasoning is that this is used one-handed, mid-session, sometimes in pain (OQ-4)
- **KD-5** The design spec's criterion is corrected here rather than left standing: its test now asserts what the browser renders, which is what it always meant, and the fix is recorded against this spec so the record shows the criterion was weak rather than the code having regressed (OQ-5)
- **KD-6** The menu closes first and focus goes to the row, not back to the More button: the row is where the next thing happens, and returning focus to a menu button that has just acted would leave the person a press away from doing it again (OQ-6)
- **KD-7** Nothing is owed: each stale row already ends its accessible name in overdue, which is the fact the divider was standing in for, and a reader gets that per row rather than once in passing (OQ-7)

## Prior Art
- **PA-1** An accessibility audit measured that cadence-program, .cdp-view and .cdp-run each set display flex unconditionally, which beats the user agent's rule for the hidden attribute, so an empty page renders four live buttons and a running session shows both views at once
- **PA-2** Reproduced independently: with nothing stored, the program element reports hidden true and computed display flex at 334 by 98 pixels, with jump, start, more and back all hit-testable and a listbox in the accessibility tree
- **PA-3** The criterion that should have caught it asserted the hidden property rather than what the browser rendered, and passed throughout
- **PA-4** Measured at 390 by 844: Start is 230 by 28, More 56 by 30, the jump 33 by 32 and the menu items 192 by 28, all short of the 44 pixel target the audit asked for on a one-handed phone
- **PA-5** The same audit found the listbox mechanics, live regions, contrast, reduced motion and 200 percent zoom already correct and said to leave them alone

## Implementation Details
- [x] **IMPL-1** Add one rule that hidden means display none, ahead of every component rule (KD-1)
- [x] **IMPL-2** Put focus on the current row after a session ends, is abandoned, is dropped or is reached, and on the running sequence's start control when one begins (KD-2)
- [x] **IMPL-3** Make the today marker generated content on the row that follows it, keeping a separate marker only for the case where today is past everything (KD-3)
- [x] **IMPL-4** Give every control a person presses 44 pixels on both axes (KD-4)
- [x] **IMPL-5** Close the More menu on Escape, returning focus to its button, and on a press outside it (G-5)

## Verification Criteria
- [x] **VC-1** With nothing stored, the program element is not rendered at all — no box, no hit-testable control, no listbox in the accessibility tree — and while a session runs the list and its bar are gone by the same measure, asserted on what the browser computes rather than on the hidden property (G-1) `npx playwright test tests/view-exclusive.spec.js` → passed 2026-09-02 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/view-exclusive.spec.js:28:5 › with nothing stored)
- [x] **VC-2** Focus sits on the current row after a completion, an abandon and a drop, and on the running sequence's start control after a launch (G-2) `npx playwright test tests/view-focus.spec.js` → passed 2026-09-02 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/view-focus.spec.js:18:5 › starting a session puts)
- [x] **VC-3** At 390 by 844 every control in the program view measures at least 44 pixels on both axes (G-3) `npx playwright test tests/view-targets.spec.js` → passed 2026-09-02 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/view-targets.spec.js:9:5 › no control in the prog)
- [x] **VC-4** The listbox has none but option children, and the today marker is still shown against the first row that is still ahead (G-4, KD-3) `npx playwright test tests/view-exclusive.spec.js` → passed 2026-09-02 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/view-exclusive.spec.js:28:5 › with nothing stored)
- [x] **VC-5** Escape closes the More menu and returns focus to its button, and a press outside it closes it too (G-5) `npx playwright test tests/view-targets.spec.js` → passed 2026-09-02 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/view-targets.spec.js:9:5 › no control in the prog)

## Changelog
- 2026-08-31: Spec initialized.
- 2026-08-31: G-1 added
- 2026-08-31: G-2 added
- 2026-08-31: G-3 added
- 2026-08-31: G-4 added
- 2026-08-31: G-5 added
- 2026-08-31: PA-1 added
- 2026-08-31: PA-2 added
- 2026-08-31: PA-3 added
- 2026-08-31: PA-4 added
- 2026-08-31: PA-5 added
- 2026-08-31: OQ-1 added
- 2026-08-31: KD-1 resolves OQ-1
- 2026-08-31: OQ-2 added
- 2026-08-31: KD-2 resolves OQ-2
- 2026-08-31: OQ-3 added
- 2026-08-31: KD-3 resolves OQ-3
- 2026-08-31: OQ-4 added
- 2026-08-31: KD-4 resolves OQ-4
- 2026-08-31: IMPL-1 added
- 2026-08-31: IMPL-2 added
- 2026-08-31: IMPL-3 added
- 2026-08-31: IMPL-4 added
- 2026-08-31: IMPL-5 added
- 2026-08-31: VC-1 added
- 2026-08-31: VC-2 added
- 2026-08-31: VC-3 added
- 2026-08-31: VC-4 added
- 2026-08-31: VC-5 added
- 2026-08-31: Status: Draft → Ready
- 2026-08-31: OQ-5 raised by dry run
- 2026-08-31: OQ-6 raised by dry run
- 2026-08-31: OQ-7 raised by dry run
- 2026-08-31: KD-5 resolves OQ-5
- 2026-08-31: KD-6 resolves OQ-6
- 2026-08-31: KD-7 resolves OQ-7
- 2026-08-31: dry run clean — Walked IMPL-1 to IMPL-5 through css/theme.css, js/cadence-program.js and index.html: the hidden rule ahead of the component rules, focus after each of the four ways a view is swapped and on launch, the marker as generated content with the trailing case kept, the target sizes on every control in the bar and the menu, and the menu's two ways of closing; checked the criteria of the design spec and the program view against what they actually assert
- 2026-08-31: Status: Ready → In Progress
- 2026-09-02: IMPL-1, IMPL-2, IMPL-3, IMPL-4, IMPL-5 checked
- 2026-09-02: VC-1 passed
- 2026-09-02: VC-2 passed
- 2026-09-02: VC-3 passed
- 2026-09-02: VC-4 passed
- 2026-09-02: VC-5 passed
- 2026-09-02: Status: In Progress → Done
