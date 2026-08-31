# Spec: Empty state and a sober visual pass

**Status:** Draft
**Description:** Empty state and a sober visual pass

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** With nothing in memory the page leads with loading a program, instead of a demo that hides the fact that nothing has been chosen
- **G-2** The empty state says what a program is and what is expected of one, so a first-time visitor is not left guessing
- **G-3** The page carries a description of the JSON model written for an agent to read, so a user can point an LLM at this page and get a program back that loads
- **G-4** The whole view is redrawn to be sober and unfussy: quiet by default, legible on a phone, and readable as one thing rather than a row of controls

## Non-Goals
- **NG-1** The scheduling model, the listbox behaviour and the control layout, all settled by the three specs before this one; this is how it looks and how it starts, not how it works

## Open Questions
- **OQ-1** Does the built-in eight-week example stay as a one-click way in from the empty state, or does the page start truly empty with loading a file the only route
- **OQ-2** Where does the agent-readable model description live: visible on the page for anyone, folded behind a disclosure, or in the markup for a reader rather than a viewer
- **OQ-3** Is the description hand-written prose, or generated from the same rules the validator enforces so the two cannot drift apart
- **OQ-4** Sober means what here: does the app keep the colour it uses for progress and overrun, or does it go monochrome and let the one warning colour be the only colour on the page
- **OQ-5** Once a program is loaded, does the empty state's explanation stay reachable, or is it gone until storage is cleared

## Key Decisions
_No items yet._

## Prior Art
_No items yet._

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
- 2026-08-31: NG-1 added
- 2026-08-31: OQ-1 added
- 2026-08-31: OQ-2 added
- 2026-08-31: OQ-3 added
- 2026-08-31: OQ-4 added
- 2026-08-31: OQ-5 added
