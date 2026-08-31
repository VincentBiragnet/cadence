# Discovery: Accessible listbox patterns

**Discovery for:** program-view-a-scrolling-list-instead-of-a-dropdown (OQ-7)
**Question:** A native select brings keyboard control and screen reader semantics for nothing, so what replaces them once it is a list of elements

_Edit via `scripts/spec.py`, never by hand._

## Open Questions
_No items yet._

## State of the Art
- **SOTA-1** The ARIA listbox pattern wants role=listbox on the container, role=option on each row, aria-selected on the options, a label on the listbox, arrow keys to move, Home and End for lists over five options, and typeahead: https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
- **SOTA-2** The APG names two focus strategies and says a benefit of roving tabindex over aria-activedescendant is that the user agent scrolls the newly focused element into view by itself: https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- **SOTA-3** Sarah Higley reports that mobile screen readers essentially ignore aria-activedescendant, since they move their cursor through the accessibility tree in response to touch, and that focusable items instead gain focus when the VoiceOver or TalkBack cursor lands on them, natively triggering scroll: https://sarahmhigley.com/writing/activedescendant/

## Proposed Decisions
- **PD-1** Rows are real focusable elements carrying a roving tabindex rather than aria-activedescendant, because this app is used on a phone first and mobile screen readers ignore aria-activedescendant entirely
- **PD-2** The list is role=listbox labelled by the program title, each row is role=option, and exactly one row carries aria-selected at a time
- **PD-3** Arrow keys move between rows and Home and End jump to the first and last, which the pattern asks for on any list past five options
- **PD-4** Positioning on the current step is done by focusing its row and letting the user agent scroll it into view, rather than by computing a scroll offset, which is the same mechanism assistive technology relies on
- **PD-5** Typeahead is not provided: the list positions itself on the step you want and the short labels repeat across weeks, so typing a letter would jump between look-alike rows rather than help

## Proposed Criteria
- **PC-1** The list exposes role=listbox with every row role=option and exactly one row carrying aria-selected true at any time
- **PC-2** In a sixty-session program the arrow keys move the focused row one at a time, Home and End reach the first and last, and each newly focused row is inside the scrolled viewport without any scroll code of our own
- **PC-3** Opening the view, and completing or dropping a session, each leave the current step focused and within the visible area of the list

## Changelog
- 2026-08-31: Opened for OQ-7 of program-view-a-scrolling-list-instead-of-a-dropdown.
- 2026-08-31: SOTA-1 added
- 2026-08-31: SOTA-2 added
- 2026-08-31: SOTA-3 added
- 2026-08-31: PD-1 added
- 2026-08-31: PD-2 added
- 2026-08-31: PD-3 added
- 2026-08-31: PD-4 added
- 2026-08-31: PD-5 added
- 2026-08-31: PC-1 added
- 2026-08-31: PC-2 added
- 2026-08-31: PC-3 added
