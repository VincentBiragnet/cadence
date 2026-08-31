# Discovery: Selection following focus

**Discovery for:** program-view-a-scrolling-list-instead-of-a-dropdown (OQ-18)
**Question:** Tapping a row selects it and Start is separate, but with a roving tabindex the arrow keys move focus: does arrowing to a row also select it, or can the focused row and the row Start would run be different ones

_Edit via `scripts/spec.py`, never by hand._

## Open Questions
- **OQ-1** ~~Selecting a row has no side effect of its own here, but it does re-arm what Drop would act on, so does a destructive action reachable from the selection count as the side effect the APG means~~ → answered by PD-2: the letter of the guidance is not tripped, and decoupling proved the worse failure here

## State of the Art
- **SOTA-1** The APG says selection may follow focus when the effect is instantaneous and has no side effect, and should not when it causes latency or a side effect, since browsing options would then trigger costly operations: https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_selection_follows_focus
- **SOTA-2** Where selection does not follow focus, the APG has the user select the focused option with Enter or Space, which means the focused row and the selected row are two visibly different things the design has to show at once: https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_selection_follows_focus
- **SOTA-3** Tried on the real thing by three users: after arrowing ten rows without committing, follows-focus offered to drop the row being looked at, while independent offered one from five weeks earlier that had scrolled off screen, which is correct by its own rules and still a confirmation naming something other than what the user sees
- **SOTA-4** The same trial found the two-highlight display of independent unreadable where it matters most: the armed row scrolls out of sight while browsing, and adjacent rows differing only by AM and PM read as two lit rows rather than one armed and one looked at

## Proposed Decisions
- **PD-1** Selection follows focus: arrowing to a row makes it the row Start and Drop act on, so what is on screen and what is armed cannot come apart
- **PD-2** Decoupling them was rejected because its safety is theoretical here: the armed row can scroll out of sight, leaving an irreversible confirmation that legitimately names something the user is not looking at, which is a worse failure than an armed target that follows the eye
- **PD-3** The jump to the current step targets the soonest session neither run nor dropped, computed from the program and never read from the selection, which is required whichever way selection behaves
- **PD-4** The drop confirmation leads with the name of what is being dropped, since it is the last thing standing between a slipped press and lost work and it is read in a hurry

## Proposed Criteria
- **PC-1** Arrowing onto a row makes it the row Start and Drop act on, and the bar names that row
- **PC-2** After browsing away from it, the jump control returns to the soonest session neither run nor dropped, whatever is selected at the time
- **PC-3** The drop confirmation opens with the name of the session or milestone being dropped

## Changelog
- 2026-08-31: Opened for OQ-18 of program-view-a-scrolling-list-instead-of-a-dropdown.
- 2026-08-31: SOTA-1 added
- 2026-08-31: SOTA-2 added
- 2026-08-31: OQ-1 added
- 2026-08-31: SOTA-3 added
- 2026-08-31: SOTA-4 added
- 2026-08-31: PD-1 added
- 2026-08-31: PD-2 added
- 2026-08-31: PD-3 added
- 2026-08-31: PD-4 added
- 2026-08-31: PC-1 added
- 2026-08-31: PC-2 added
- 2026-08-31: PC-3 added
- 2026-08-31: OQ-1 struck
