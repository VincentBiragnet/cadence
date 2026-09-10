# Spec: One session on screen, the rest a step away

**Status:** Ready
**Description:** One session on screen, the rest a step away

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** Opening the app shows the one session you are meant to do, not every session in the program
- **G-2** Reaching any other session takes one deliberate move, and getting back takes another
- **G-3** A program of 172 sessions opens the same way a program of 24 does

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** How do you reach a session that is not the one offered, and how do you get back? → discovery:how-you-reach-a-session-that-is-not-the-next-one
- **OQ-2** What does the one card actually show, beyond a title and a Start?
- **OQ-3** What is offered when nothing is due: the next one ahead, the one you missed, or something that says you are done?

## Key Decisions
_No items yet._

## Prior Art
- **PA-1** Said by the user on 2026-09-10: the screen is bloated with all the sessions; I should see only the one I am supposed to do and have a way to switch to all sessions and choose one, like Talon
- **PA-2** Talon puts one card on its home screen, the current week's session with its sets, reps, RM and the flags that apply to that week, and a small week select in the header as the only way to move; the list of every session does not exist as a screen at all
- **PA-3** Cadence today opens on a listbox of every entry, which for the HSR protocol is 37 rows and for the AM/PM rehab example is 172, with the current one selected somewhere inside it
- **PA-4** The archived program-view spec chose that scrolling list deliberately, over a dropdown, and its decisions about keyboard handling, the roving focus, the today marker and the stale divider all belong to the list. This spec changes what opens, not whether a list can exist

## Implementation Details
_No items yet._

## Verification Criteria
_No items yet._

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
