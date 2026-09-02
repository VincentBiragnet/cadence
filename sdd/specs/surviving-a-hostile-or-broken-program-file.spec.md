# Spec: Surviving a hostile or broken program file

**Status:** Draft
**Description:** Surviving a hostile or broken program file

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** A program file cannot run code in the page, whatever text it puts in a label or a title
- **G-2** A program that would break mid-session is refused when it is loaded, with a message naming what is wrong, rather than accepted and dying at the press of Start
- **G-3** A file that cannot be read at all says so, instead of the Load control appearing to do nothing
- **G-4** Nothing the app displays or stores can become a date that does not exist or a number that is not one
- **G-5** When run state cannot be saved the user is told, instead of the app showing a program it has silently failed to keep

## Non-Goals
- **NG-1** Making a ten-thousand entry program fast: it renders correctly and blocks the tab for about thirteen seconds, which is a real cost but a different piece of work from being safe against a broken file

## Open Questions
_No items yet._

## Key Decisions
_No items yet._

## Prior Art
- **PA-1** An adversarial review demonstrated ten findings against the served app, of which two were high: a label containing an img tag with an onerror handler ran arbitrary code, and a storage write that exceeded quota was swallowed so the next reload lost the whole program
- **PA-2** The same review confirmed two things were already right: day arithmetic held across a daylight-saving boundary, and every corrupted localStorage value it tried recovered to a clean first-visit page
- **PA-3** Separately, an agent reading only the page's visible text wrote a valid twenty-five entry program that loaded first time, but found that a step with no durationSeconds was silently accepted although the contract implies it is required

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
- 2026-08-31: NG-1 added
- 2026-08-31: PA-1 added
- 2026-08-31: PA-2 added
- 2026-08-31: PA-3 added
