# Spec: What the running screen puts first

**Status:** Draft
**Description:** What the running screen puts first

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** The number that governs what the body is doing right now is the biggest thing on the running screen
- **G-2** A person can tell which set they are on without counting sets themselves

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** Does the aggregate session chrono shrink, move, or go behind a press, given it was deliberately made the large one when a sequence had no per-step clock beside it?
- **OQ-2** Can a set counter exist at all before nesting does, or does it wait on saying-sets-of-repetitions-once?
- **OQ-3** Is the tempo phase name enough to say which way the body is moving, or does a three-second phase need something bigger than a word?

## Key Decisions
_No items yet._

## Prior Art
- **PA-1** Reproduced in the real app at 390x844 during a tempo repetition: the aggregate session chrono renders at 40px and 6066 square pixels, the per-step clock at 17.6px and 1725, so the session countdown outweighs the three-second phase clock by three and a half times
- **PA-2** Reproduced in the real app: the position line reads step 1 of 4 rep 1 of 6, naming the tempo phase and the repetition, with no set counter anywhere on screen
- **PA-3** A patient reviewer driving a 41-minute HSR session at a phone viewport reported the single glance they can steal under load lands on the session countdown, and that across four sets three minutes apart they would lose count with no help from the app
- **PA-4** Fitness UI practice puts the current exercise first, then the timer, then what is next, and reports under three seconds of interpretation time for a metric on a small screen (https://stormotion.io/blog/fitness-app-ux/)
- **PA-5** The absent set counter is downstream of the flat block model: with no nesting a set has no object of its own, which is the cost recorded in the saying-sets-of-repetitions-once spec
- **PA-6** Observed by a reviewer verifying an unrelated criterion: the page's demonstration section, The parts, sits immediately below the running program with its own independently running Sample circuit, so a session shares the page with a second unrelated ticking clock one short scroll away

## Implementation Details
_No items yet._

## Verification Criteria
_No items yet._

## Changelog
- 2026-09-09: Spec initialized.
- 2026-09-09: G-1 added
- 2026-09-09: G-2 added
- 2026-09-09: PA-1 added
- 2026-09-09: PA-2 added
- 2026-09-09: PA-3 added
- 2026-09-09: PA-4 added
- 2026-09-09: PA-5 added
- 2026-09-09: OQ-1 added
- 2026-09-09: OQ-2 added
- 2026-09-09: OQ-3 added
- 2026-09-09: PA-6 added
