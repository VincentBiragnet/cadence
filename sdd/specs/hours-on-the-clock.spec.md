# Spec: Hours on the clock

**Status:** Done
**Description:** Hours on the clock

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** A session of an hour or more reads as hours and minutes, rather than as a count of minutes the reader has to divide
- **G-2** Anything under an hour reads exactly as it does now, since that is almost every session
- **G-3** The step clock and the total a sequence shows use the same rule, since both are on screen together while a session runs

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** ~~What does an hour or more look like, and do the minutes take a leading zero once there are hours in front of them~~ → KD-1
- **OQ-2** ~~A sequence shows the total beside the step it is running, so a twenty second step can sit next to a two hour total: does the shorter one grow to match, or do the two formats sit side by side~~ → KD-2
- **OQ-3** ~~The two files carry the same formatter and the same comment citing the same decision: is it made one thing, given the project has no build step and no module system~~ → KD-3
- **OQ-4** ~~The sequence reads its own total but the step clock's text is what several tests assert on, and the aggregate chrono test compares elapsed milliseconds rather than text: which existing tests read a time as text, and do any of them cross the hour~~ → KD-4
- **OQ-5** ~~A clock can be toggled between elapsed and remaining, so a two hour session shows a remaining time that starts at two hours and a step that does not: does the toggle change which format is used for either~~ → KD-5

## Key Decisions
- **KD-1** Hours as h:mm:ss with the minutes padded to two, so 3:38:00 and 1:05:09: once there is a field in front of it, an unpadded minute reads as the wrong number entirely, which is the opposite of the reason minutes are unpadded when they lead (OQ-1)
- **KD-2** Each reads itself: a twenty second step stays 0:20 beside a total of 2:14:30, because padding the step to match would make the number a person watches every twenty seconds harder to read, and the two are plainly different things on screen (OQ-2)
- **KD-3** They stay two, because making them one would mean cadence-sequence depending on a function reaching out of cadence-clock, and a classic script has no way to say that beyond a global; a test asserts the two agree, which is the property that actually matters (OQ-3)
- **KD-4** The existing tests read short times only — a 20 second step and a 90 second total — so none crosses the hour and none changes; the new test covers the boundary in both files rather than widening an old one (OQ-4)
- **KD-5** The toggle changes which number is shown, never how a number is written: both elapsed and remaining go through the same formatter, so a two hour session reads 2:00:00 remaining and 0:00 elapsed at the start, each by the same rule (OQ-5)

## Prior Art
- **PA-1** A runner configured a 3 hour 38 minute effort and the clock rendered 218:00 — every long run in a sixteen-week plan, and the race itself
- **PA-2** The archived clock-and-clock-configuration spec decided m:ss always with no leading zero on minutes, and both formatters cite it by name; an archived spec cannot be edited, so this one supersedes that decision
- **PA-3** The rehab protocol's sessions run in minutes and the guitar plan's stay under an hour, so the short form is what nearly every row will keep using

## Implementation Details
- [x] **IMPL-1** Format an hour or more as h:mm:ss with padded minutes, and leave anything shorter as it is, in cadence-clock (KD-1)
- [x] **IMPL-2** Make the same change in cadence-sequence, where the total is shown (KD-1, KD-3)

## Verification Criteria
- [x] **VC-1** Below an hour the clock reads as it always did, from 0:00 through 59:59, and at an hour and beyond it reads h:mm:ss with the minutes padded — 3:38:00 for the effort that used to render 218:00 (G-1, G-2, KD-1) `npx playwright test tests/clock-hours.spec.js` → passed 2026-09-02 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/clock-hours.spec.js:29:5 › the step clock reads m)
- [x] **VC-2** The step clock and a sequence's total format the same seconds identically at every boundary, so the two on screen together cannot disagree (G-3, KD-3) `npx playwright test tests/clock-hours.spec.js` → passed 2026-09-02 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/clock-hours.spec.js:29:5 › the step clock reads m)

## Changelog
- 2026-09-02: Spec initialized.
- 2026-09-02: G-1 added
- 2026-09-02: G-2 added
- 2026-09-02: G-3 added
- 2026-09-02: PA-1 added
- 2026-09-02: PA-2 added
- 2026-09-02: PA-3 added
- 2026-09-02: OQ-1 added
- 2026-09-02: KD-1 resolves OQ-1
- 2026-09-02: OQ-2 added
- 2026-09-02: KD-2 resolves OQ-2
- 2026-09-02: OQ-3 added
- 2026-09-02: KD-3 resolves OQ-3
- 2026-09-02: IMPL-1 added
- 2026-09-02: IMPL-2 added
- 2026-09-02: VC-1 added
- 2026-09-02: VC-2 added
- 2026-09-02: Status: Draft → Ready
- 2026-09-02: OQ-4 raised by dry run
- 2026-09-02: OQ-5 raised by dry run
- 2026-09-02: KD-4 resolves OQ-4
- 2026-09-02: KD-5 resolves OQ-5
- 2026-09-02: dry run clean — Walked IMPL-1 and IMPL-2 through js/cadence-clock.js and js/cadence-sequence.js: the two formatters and the comment each carries citing the archived decision this spec supersedes, the boundary at one hour, the padding of minutes once hours lead, the toggle passing both numbers through the same function, and the existing tests that read a time as text
- 2026-09-02: Status: Ready → In Progress
- 2026-09-02: IMPL-1, IMPL-2 checked
- 2026-09-02: VC-1 passed
- 2026-09-02: VC-2 passed
- 2026-09-02: Status: In Progress → Done
