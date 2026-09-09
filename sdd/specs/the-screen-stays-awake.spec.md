# Spec: The screen stays awake

**Status:** Draft
**Description:** The screen stays awake

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** The screen does not sleep while a session is running
- **G-2** A step change can be felt as well as heard, for a phone that is not being looked at

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** Is the wake lock held for the whole session, or only while a step is running?
- **OQ-2** What happens on a browser with no Wake Lock API: say so, or stay quiet?
- **OQ-3** Is vibration always on, always off, or a setting, and where would a setting live when nothing else is configurable?

## Key Decisions
_No items yet._

## Prior Art
- **PA-1** Talon requests a screen wake lock at every timed step, releases it on pause and completion, and re-requests it when the tab becomes visible again
- **PA-2** Talon vibrates on each tempo phase and with a triple pulse at the end of a repetition
- **PA-3** An HSR session opens with a 5-minute bike warm-up and contains rests of 3 and 5 minutes; a phone left alone locks well inside those
- **PA-4** Cadence has no wake lock and no vibration: grep of js/ on 2026-09-09 found neither

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
- 2026-09-09: OQ-1 added
- 2026-09-09: OQ-2 added
- 2026-09-09: OQ-3 added
