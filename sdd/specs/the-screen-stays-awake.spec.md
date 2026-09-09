# Spec: The screen stays awake

**Status:** Draft
**Description:** The screen stays awake

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** The screen does not sleep while a session is running
- **G-2** A step change can be felt as well as heard, for a phone that is not being looked at

## Non-Goals
- **NG-1** A settings surface of any kind (OQ-3): nothing else in this app is configurable and one control would invite the rest

## Open Questions
- **OQ-1** ~~Is the wake lock held for the whole session, or only while a step is running?~~ → KD-1
- **OQ-2** ~~What happens on a browser with no Wake Lock API: say so, or stay quiet?~~ → KD-2
- **OQ-3** ~~Is vibration always on, always off, or a setting, and where would a setting live when nothing else is configurable?~~ → KD-3

## Key Decisions
- **KD-1** For the whole run, taken when the work starts and released when it ends by any path. Between steps there is no gap to cover, and holding it while someone reads the list or fills in the record form would keep a phone awake indefinitely for no reason (OQ-1)
- **KD-2** Say so, once, quietly, in the run view and in the live region that is already there. This is KD-4 of the hostile-file spec again: what is not allowed is the silence. Someone who believes the screen will stay on and finds it dark mid-rest has lost the session, and they can act on being told, by turning off auto-lock (OQ-2)
- **KD-3** Always on, tied to the beeps, with no setting. A buzz mirrors a signal the page already makes rather than adding a new one, which is the same pairing rule the project already applies to beeps and the visual pulse; and there is no settings surface anywhere in this app, so inventing one for this would be a second feature. A phone's own silent controls are the right place to refuse it (OQ-3)

## Prior Art
- **PA-1** Talon requests a screen wake lock at every timed step, releases it on pause and completion, and re-requests it when the tab becomes visible again
- **PA-2** Talon vibrates on each tempo phase and with a triple pulse at the end of a repetition
- **PA-3** An HSR session opens with a 5-minute bike warm-up and contains rests of 3 and 5 minutes; a phone left alone locks well inside those
- **PA-4** Cadence has no wake lock and no vibration: grep of js/ on 2026-09-09 found neither
- **PA-5** Probed 2026-09-09: file:// is a secure context in Chromium and navigator.wakeLock is present there, so the feature is reachable on a double-clicked page and not only when served
- **PA-6** Probed 2026-09-09: headless Chromium has the API but refuses the request with NotAllowedError, over http and over file:// alike. A Playwright context granted the screen-wake-lock permission acquires a real sentinel, as does a headed browser, so a check can hold a real lock rather than a stub
- **PA-7** A real browser asks no permission for screen-wake-lock on a visible page in a secure context; the headless refusal is an automation policy rather than the policy a user meets, so granting it in a test restores fidelity instead of relaxing it

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
- 2026-09-09: PA-5 added
- 2026-09-09: PA-6 added
- 2026-09-09: PA-7 added
- 2026-09-09: KD-1 resolves OQ-1
- 2026-09-09: KD-2 resolves OQ-2
- 2026-09-09: KD-3 resolves OQ-3
- 2026-09-09: NG-1 added
