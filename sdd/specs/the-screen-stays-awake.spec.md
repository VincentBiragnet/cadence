# Spec: The screen stays awake

**Status:** Done
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
- **OQ-4** ~~Which component holds the lock, given the sequence is what knows work is running but the program owns the run lifecycle and the page also mounts a standalone demo sequence?~~ → KD-4
- **OQ-5** ~~A wake lock is released by the browser whenever the document becomes hidden; does it get re-taken when the tab comes back, and what if the run finished while away?~~ → KD-5
- **OQ-6** ~~The request is asynchronous and the run starts synchronously on a click; what happens if the sentinel arrives after the run has already ended?~~ → KD-6
- **OQ-7** ~~Does the fallback message use the cdp-problem channel the hostile-file spec built, which is a program-level element the sequence cannot reach, or something of its own?~~ → KD-7
- **OQ-8** ~~Does vibration belong in the clock beside the beep, or in the sequence, given the clock's existing rule that it never manages audio unlocking itself?~~ → KD-8
- **OQ-9** ~~How is the check honest about headless refusing the permission, without a granted permission making the criterion prove less than it claims?~~ → KD-9

## Key Decisions
- **KD-1** For the whole run, taken when the work starts and released when it ends by any path. Between steps there is no gap to cover, and holding it while someone reads the list or fills in the record form would keep a phone awake indefinitely for no reason (OQ-1)
- **KD-2** Say so, once, quietly, in the run view and in the live region that is already there. This is KD-4 of the hostile-file spec again: what is not allowed is the silence. Someone who believes the screen will stay on and finds it dark mid-rest has lost the session, and they can act on being told, by turning off auto-lock (OQ-2)
- **KD-3** Always on, tied to the beeps, with no setting. A buzz mirrors a signal the page already makes rather than adding a new one, which is the same pairing rule the project already applies to beeps and the visual pulse; and there is no settings surface anywhere in this app, so inventing one for this would be a second feature. A phone's own silent controls are the right place to refuse it (OQ-3)
- **KD-4** The sequence, because it is the thing that knows work is running and it already has the two lifecycle moments. The program then gets it without being told, and a standalone sequence gets it too, which is right: a demonstration is still a timed run someone is watching. Release goes in disconnectedCallback, which teardown, Back and drop all already go through (OQ-4)
- **KD-5** Re-taken on visibilitychange while a run is still going, and not otherwise. The browser releasing on hide is the correct behaviour, not a fault to fight; what matters is coming back to a screen that stays awake. A run that ended while away leaves nothing to re-take, so the handler checks before asking (OQ-5)
- **KD-6** Released immediately if the run has ended by the time it arrives. An await that resolves into a finished session would otherwise leave a phone awake with nothing running, which is the opposite of the goal and the one failure a user could not explain (OQ-6)
- **KD-7** Its own quiet line in the sequence, not the program's problem channel. cdp-problem belongs to loading a file and is a program-level element a standalone sequence cannot reach; a run-level notice belongs to the thing that is running (OQ-7)
- **KD-8** In the clock, beside the beep. The clock is where every beep already pairs with a visual pulse, and a buzz is the third face of the same signal; putting it in the sequence would fire on a forwarded event and miss a clock used on its own. This is not the audio-unlocking case, which needs a gesture the component cannot supply, because the Start gesture that unlocks audio is the same one that permits vibration (OQ-8)
- **KD-9** The check grants screen-wake-lock explicitly and asserts a real sentinel, and says in the test why: a real browser asks nobody's permission for a visible page in a secure context, so the headless refusal is an automation policy rather than the one a user meets. Granting it restores fidelity. What the criterion must never do is stub navigator.wakeLock, which would prove only that the code calls a function it defined itself (OQ-9)

## Prior Art
- **PA-1** Talon requests a screen wake lock at every timed step, releases it on pause and completion, and re-requests it when the tab becomes visible again
- **PA-2** Talon vibrates on each tempo phase and with a triple pulse at the end of a repetition
- **PA-3** An HSR session opens with a 5-minute bike warm-up and contains rests of 3 and 5 minutes; a phone left alone locks well inside those
- **PA-4** Cadence has no wake lock and no vibration: grep of js/ on 2026-09-09 found neither
- **PA-5** Probed 2026-09-09: file:// is a secure context in Chromium and navigator.wakeLock is present there, so the feature is reachable on a double-clicked page and not only when served
- **PA-6** Probed 2026-09-09: headless Chromium has the API but refuses the request with NotAllowedError, over http and over file:// alike. A Playwright context granted the screen-wake-lock permission acquires a real sentinel, as does a headed browser, so a check can hold a real lock rather than a stub
- **PA-7** A real browser asks no permission for screen-wake-lock on a visible page in a secure context; the headless refusal is an automation policy rather than the policy a user meets, so granting it in a test restores fidelity instead of relaxing it
- **PA-8** Caught while writing the checks: delete navigator.wakeLock and delete navigator.vibrate are silent no-ops because both live on Navigator.prototype, so the missing-API test was quietly re-running the refused-request path and passing for the wrong reason. Both now delete from the prototype and assert the API is actually gone

## Implementation Details
- [x] **IMPL-1** Vibrate in cadence-clock beside the beep, guarded for a browser without navigator.vibrate
- [x] **IMPL-2** Request a screen wake lock when a run starts and release it on completion
- [x] **IMPL-3** Release in disconnectedCallback, which every early exit already passes through
- [x] **IMPL-4** Re-take the lock on visibilitychange while a run is still live, and only then
- [x] **IMPL-5** Release a sentinel that arrives after the run has ended
- [x] **IMPL-6** Say once, in the run view and the live region, when the screen cannot be kept on

## Verification Criteria
- [x] **VC-1** A running sequence holds a real screen wake lock from the moment the work starts until it ends, released on completion and on leaving early, and never held while only the list is on screen (G-1) `npx playwright test tests/wake-lock.spec.js` → passed 2026-09-09 (ran: exit 0 — Running 4 tests using 1 worker ✓ 1 tests/wake-lock.spec.js:36:5 › the permission really is)
- [x] **VC-2** A browser that refuses or lacks the Wake Lock API still runs the session, says so once in the run view and in the live region, and does not repeat it per step (G-1) `npx playwright test tests/wake-fallback.spec.js` → passed 2026-09-09 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/wake-fallback.spec.js:32:5 › a refused request is)
- [x] **VC-3** Every beep is accompanied by a vibration request of the same count and ordering, and a browser without navigator.vibrate runs unchanged (G-2) `npx playwright test tests/wake-vibrate.spec.js` → passed 2026-09-09 (ran: exit 0 — Running 4 tests using 1 worker ✓ 1 tests/wake-vibrate.spec.js:7:5 › every beep is accompan)

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
- 2026-09-09: VC-1 added
- 2026-09-09: VC-2 added
- 2026-09-09: VC-3 added
- 2026-09-09: OQ-4 raised by dry run
- 2026-09-09: OQ-5 raised by dry run
- 2026-09-09: OQ-6 raised by dry run
- 2026-09-09: OQ-7 raised by dry run
- 2026-09-09: OQ-8 raised by dry run
- 2026-09-09: OQ-9 raised by dry run
- 2026-09-09: KD-4 resolves OQ-4
- 2026-09-09: KD-5 resolves OQ-5
- 2026-09-09: KD-6 resolves OQ-6
- 2026-09-09: KD-7 resolves OQ-7
- 2026-09-09: KD-8 resolves OQ-8
- 2026-09-09: KD-9 resolves OQ-9
- 2026-09-09: dry run clean — Walked it end to end: cadence-clock vibrates where it beeps and where it pulses, guarded for a browser without navigator.vibrate; cadence-sequence requests a screen wake lock on cadence:start, releases it on complete and in disconnectedCallback, re-takes it on visibilitychange only while a run is live, releases immediately if the sentinel arrives late, and shows one quiet line of its own when the request fails or the API is absent; the three checks grant the permission and assert a real sentinel rather than a stub
- 2026-09-09: Status: Draft → In Progress
- 2026-09-09: VC-1 passed
- 2026-09-09: VC-2 passed
- 2026-09-09: VC-3 passed
- 2026-09-09: PA-8 added
- 2026-09-09: IMPL-1 added
- 2026-09-09: IMPL-2 added
- 2026-09-09: IMPL-3 added
- 2026-09-09: IMPL-4 added
- 2026-09-09: IMPL-5 added
- 2026-09-09: IMPL-6 added
- 2026-09-09: IMPL-1, IMPL-2, IMPL-3, IMPL-4, IMPL-5, IMPL-6 checked
- 2026-09-09: Status: In Progress → Done
