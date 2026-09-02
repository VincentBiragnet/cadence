# Spec: Surviving a hostile or broken program file

**Status:** Done
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
- **OQ-1** ~~How does a file that cannot be read say so, given the app has no place it puts messages and the load control sits in the page rather than the component~~ → KD-1
- **OQ-2** ~~A step with no duration, a duration that is not a positive finite number, no steps at all, or no repetitions: refused when the file is loaded, or defaulted to something sensible~~ → KD-2
- **OQ-3** ~~How far out may a week be, given a week of a billion produces a date the browser cannot represent and stores the string NaN-NaN-NaN~~ → KD-3
- **OQ-4** ~~When storage refuses a write, does the load fail or does the program run unsaved~~ → KD-4
- **OQ-5** ~~Validating sequences at load would refuse programs the four files in examples and fourteen test files already rely on, so does everything already written still pass, and what happens to a program someone has stored from before the rule existed~~ → KD-5
- **OQ-6** ~~The replanning prompt tells a model that startFrequency and endFrequency are optional but says nothing about what a duration may be, so does the contract on the page have to state the rule the validator is about to enforce~~ → KD-6
- **OQ-7** ~~Escaping happens where a row is built, but the same text also goes into an aria-label whose quotes are escaped by hand today: is there one place text becomes markup, or two that have to agree~~ → KD-7

## Key Decisions
- **KD-1** The component announces it in the live region it already has and the page shows it beside the load control, so it is heard as well as seen and nothing new has to be invented to hold it (OQ-1)
- **KD-2** Refused at load with a message naming the entry and what is wrong: a default would invent training the author did not write, and the failure it replaces is a session that dies at the press of Start with the list already gone (OQ-2)
- **KD-3** A week may not exceed five hundred and twenty, which is ten years of program and far past anything anyone will write, and the check names the limit rather than reporting a date that cannot exist (OQ-3)
- **KD-4** The program keeps running and the user is told plainly that it will not be remembered, because refusing the load would take away the session they are about to do; what is not allowed is the silence, which loses the whole program at the next reload with no warning at either end (OQ-4)
- **KD-5** Everything already written passes, because the rule only demands what a runnable program always had; a stored program from before is read back through the same validation that a file is, so an unrunnable one is dropped and the page opens empty rather than restoring something that will die at Start (OQ-5)
- **KD-6** The contract on the page states it, since a model writing from that page is exactly who would otherwise send a step with no duration, and the test that configures the page's own example keeps the two honest (OQ-6)
- **KD-7** One place: a single escape used for both the row's text and its accessible name, so there is no second rule to keep in step (OQ-7)

## Prior Art
- **PA-1** An adversarial review demonstrated ten findings against the served app, of which two were high: a label containing an img tag with an onerror handler ran arbitrary code, and a storage write that exceeded quota was swallowed so the next reload lost the whole program
- **PA-2** The same review confirmed two things were already right: day arithmetic held across a daylight-saving boundary, and every corrupted localStorage value it tried recovered to a clean first-visit page
- **PA-3** Separately, an agent reading only the page's visible text wrote a valid twenty-five entry program that loaded first time, but found that a step with no durationSeconds was silently accepted although the contract implies it is required

## Implementation Details
- [x] **IMPL-1** Escape every piece of a program's text before it reaches the page, so a label cannot be markup (G-1)
- [x] **IMPL-2** Validate a sequence when the program is loaded: blocks and steps present and not empty, repetitions a positive whole number, every duration a positive finite number (G-2, KD-2)
- [x] **IMPL-3** Catch a file that will not parse or will not validate, and say so in the live region and beside the load control (G-3, KD-1)
- [x] **IMPL-4** Reject a milestone date that names a day that does not exist, and a week beyond the limit (G-4, KD-3)
- [x] **IMPL-5** Report a storage write that failed, rather than swallowing it (G-5, KD-4)

## Verification Criteria
- [x] **VC-1** A program whose label, milestone title and sequence title each contain an img tag with an onerror handler renders them as text, runs no code, and leaves no element from them in the page (G-1) `npx playwright test tests/file-hostile.spec.js` → passed 2026-09-02 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/file-hostile.spec.js:17:5 › markup in a label, a )
- [x] **VC-2** A step with no duration, a duration that is a string, negative, zero, infinite or not a number, a block with no steps, and a block with no repetitions are each refused at load with a message naming the entry, and none of them can reach the press of Start (G-2, KD-2) `npx playwright test tests/file-broken.spec.js` → passed 2026-09-02 (ran: exit 0 — Running 4 tests using 1 worker ✓ 1 tests/file-broken.spec.js:26:5 › every shape that would)
- [x] **VC-3** Loading a truncated file leaves the program that was already there untouched and says what happened, in the live region and on screen (G-3, KD-1) `npx playwright test tests/file-broken.spec.js` → passed 2026-09-02 (ran: exit 0 — Running 4 tests using 1 worker ✓ 1 tests/file-broken.spec.js:26:5 › every shape that would)
- [x] **VC-4** A milestone dated the thirtieth of February is refused, and no date the app displays or stores is ever NaN (G-4, KD-3) `npx playwright test tests/file-broken.spec.js` → passed 2026-09-02 (ran: exit 0 — Running 4 tests using 1 worker ✓ 1 tests/file-broken.spec.js:26:5 › every shape that would)
- [x] **VC-5** When a storage write fails the program still runs and the failure is stated, rather than the app showing a program it did not keep (G-5, KD-4) `npx playwright test tests/file-storage.spec.js` → passed 2026-09-02 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/file-storage.spec.js:15:5 › when storage refuses )

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
- 2026-09-02: OQ-1 added
- 2026-09-02: KD-1 resolves OQ-1
- 2026-09-02: OQ-2 added
- 2026-09-02: KD-2 resolves OQ-2
- 2026-09-02: OQ-3 added
- 2026-09-02: KD-3 resolves OQ-3
- 2026-09-02: OQ-4 added
- 2026-09-02: KD-4 resolves OQ-4
- 2026-09-02: IMPL-1 added
- 2026-09-02: IMPL-2 added
- 2026-09-02: IMPL-3 added
- 2026-09-02: IMPL-4 added
- 2026-09-02: IMPL-5 added
- 2026-09-02: VC-1 added
- 2026-09-02: VC-2 added
- 2026-09-02: VC-3 added
- 2026-09-02: VC-4 added
- 2026-09-02: VC-5 added
- 2026-09-02: Status: Draft → Ready
- 2026-09-02: OQ-5 raised by dry run
- 2026-09-02: OQ-6 raised by dry run
- 2026-09-02: OQ-7 raised by dry run
- 2026-09-02: KD-5 resolves OQ-5
- 2026-09-02: KD-6 resolves OQ-6
- 2026-09-02: KD-7 resolves OQ-7
- 2026-09-02: dry run clean — Walked IMPL-1 to IMPL-5 through js/cadence-program.js, index.html and the four programs in examples: escaping at the one place text becomes markup, sequence validation at load and on restore, the two failures a load can have and where they are said, the date and week limits, and a storage write that reports rather than swallows
- 2026-09-02: Status: Ready → In Progress
- 2026-09-02: IMPL-1, IMPL-2, IMPL-3, IMPL-4, IMPL-5 checked
- 2026-09-02: VC-1 passed
- 2026-09-02: VC-2 passed
- 2026-09-02: VC-3 passed
- 2026-09-02: VC-4 passed
- 2026-09-02: VC-5 passed
- 2026-09-02: Status: In Progress → Done
