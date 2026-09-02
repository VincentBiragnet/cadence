# Spec: Exclusive views, restored focus, reachable controls

**Status:** Done
**Description:** Exclusive views, restored focus, reachable controls

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** ~~A view marked hidden is actually gone: not laid out, not in the accessibility tree, and not offering buttons to press~~ → duplicate of exclusive-views-restored-focus-and-reachable-controls, created twice when a turn was interrupted; the work happened on that one
- **G-2** ~~Focus lands somewhere meaningful when a session starts, ends or is abandoned, rather than staying on a control that has just gone~~ → duplicate of exclusive-views-restored-focus-and-reachable-controls, created twice when a turn was interrupted; the work happened on that one
- **G-3** ~~The controls a person presses one-handed mid-session are at least 44 by 44~~ → duplicate of exclusive-views-restored-focus-and-reachable-controls, created twice when a turn was interrupted; the work happened on that one
- **G-4** ~~The list contains only options, so the divider stops being a child the listbox role does not allow~~ → duplicate of exclusive-views-restored-focus-and-reachable-controls, created twice when a turn was interrupted; the work happened on that one
- **G-5** ~~The More menu closes on Escape and on a press outside it, returning focus to the control that opened it~~ → duplicate of exclusive-views-restored-focus-and-reachable-controls, created twice when a turn was interrupted; the work happened on that one

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** ~~Is the fix a blanket hidden rule in the stylesheet, or does each component stop setting display unconditionally~~ → KD-1
- **OQ-2** ~~Where does focus go when a session starts, and where does it come back to when one ends~~ → KD-2
- **OQ-3** ~~Does the today divider stay a list item, or become a mark on the row that follows it~~ → KD-3

## Key Decisions
- **KD-1** A single [hidden] display none important rule near the top of the stylesheet, because the collision is between an author display rule and a user agent one and will recur every time any component gains a display of its own; the components keep their layout rules (OQ-1)
- **KD-2** Starting hands focus to the running sequence's own Start control, and ending or abandoning gives it back to the row the list has settled on, which is where the listbox pattern expects it (OQ-2)
- **KD-3** It becomes a mark on the row that follows it, drawn with generated content, which keeps the listbox to options alone and needs nothing hidden from assistive technology; the case where today falls after everything keeps one trailing item (OQ-3)

## Prior Art
- **PA-1** An accessibility audit found that cadence-program, .cdp-view and .cdp-run each set display flex unconditionally, which beats the user agent's [hidden] rule, so a first visit rendered four buttons from a program that was not there and a running session showed both views at once
- **PA-2** The audit measured .cdp-start at 230 by 28, .cdp-more at 56 by 30 and .cdp-jump at 33 by 32, against a stated audience using the app one-handed and sometimes in pain
- **PA-3** It also confirmed what is already right: the listbox roles and roving tabindex, one aria-selected at a time, the live regions announcing only on change, contrast passing AA in both schemes, reduced motion honoured, and no state carried by colour alone
- **PA-4** The criterion that should have caught the hidden bug asserted the hidden property rather than what the page renders, and passed while four ghost buttons were on screen

## Implementation Details
_No items yet._

## Verification Criteria
_No items yet._

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
- 2026-08-31: OQ-1 added
- 2026-08-31: KD-1 resolves OQ-1
- 2026-08-31: OQ-2 added
- 2026-08-31: KD-2 resolves OQ-2
- 2026-08-31: OQ-3 added
- 2026-08-31: KD-3 resolves OQ-3
- 2026-09-02: G-1 struck
- 2026-09-02: G-2 struck
- 2026-09-02: G-3 struck
- 2026-09-02: G-4 struck
- 2026-09-02: G-5 struck
- 2026-09-02: Status: Draft → Done
