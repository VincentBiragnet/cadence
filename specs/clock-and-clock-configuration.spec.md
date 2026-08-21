# Spec: Clock and clock configuration

**Status:** Draft
**Description:** Clock and clock configuration

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** Clock is configured entirely via a JSON input: a duration, an optional starting sound frequency, an optional ending sound frequency
- **G-2** Renders as a single line: a running chrono alongside a bar that fills over the course of the duration
- **G-3** Plays a sound at the start of the duration when a starting frequency is given
- **G-4** Plays a sound at the end of the duration when an ending frequency is given
- **G-5** No sound plays for an omitted frequency — the clock runs silently at that edge

## Non-Goals
- **NG-1** Multi-step programs, sub-step sequencing, and JSON schedules of several steps — this spec is the single reusable clock primitive only
- **NG-2** Planned-vs-actual datetime tracking — this clock only knows a duration, not wall-clock scheduling

## Open Questions
- **OQ-1** ~~What unit is duration expressed in — seconds or milliseconds?~~ → discovery:duration-units-convention-in-timer-apps, KD-1, KD-2
- **OQ-2** ~~How is the sound produced — a synthesized tone (Web Audio oscillator at the given frequency), and if so for how long and at what volume?~~ → KD-3
- **OQ-3** ~~What does the chrono text show — time elapsed, time remaining, or both, and in what format (e.g. mm:ss vs raw seconds)?~~ → KD-4
- **OQ-4** ~~What starts the clock — does it auto-start on load/on being given JSON, or does something external call a start() method?~~ → KD-5
- **OQ-5** ~~What happens when the duration ends — does the clock just sit at 100% and done, or does it need to signal completion to whatever embeds it (e.g. an onComplete callback), given this is meant to be a reusable primitive?~~ → discovery:completion-signaling-design-for-the-clock-primitive, KD-8, KD-9
- **OQ-6** ~~Is this one HTML page per clock for now (a demo/test harness page), or is there already a host page/embedding contract this needs to fit into?~~ → KD-6
- **OQ-7** ~~Any visual requirements for the bar and text — colors, size, direction of fill, font — or is a plain functional look fine for this first pass?~~ → KD-7

## Key Decisions
- **KD-1** Duration in the JSON is a number of seconds (fractional allowed, e.g. 20.5) — matches how programs are authored and described elsewhere in Cadence ("20s leg raise"); the clock converts to milliseconds internally for its own timing loop (OQ-1 via discovery:duration-units-convention-in-timer-apps)
- **KD-2** ~~Duration in the JSON is a number of seconds (fractional allowed, e.g. 20.5) — matches how programs are authored and described elsewhere in Cadence ("20s leg raise"); the clock converts to milliseconds internally for its own timing loop (OQ-1 via discovery:duration-units-convention-in-timer-apps)~~ → duplicate of KD-1 — a harness bug in 'apply' (fixed) wrote it twice on a retry after an uncommitted-git failure
- **KD-3** A short synthesized beep (Web Audio oscillator) at the given frequency — start and end frequencies are independent, so making them different (e.g. end higher than start) is how a session is told apart by ear (OQ-2)
- **KD-4** The chrono can switch between showing elapsed and remaining time; remaining is the default (OQ-3)
- **KD-5** Auto-starts as soon as it is spawned/given its JSON — a higher-level component (its own clock/orchestrator) will own spawning it, not a user-facing start button (OQ-4)
- **KD-6** Standalone for now — one HTML page per clock, no host-page embedding contract yet (OQ-6)
- **KD-7** A shared CSS design system (custom properties for colors/spacing, respecting prefers-color-scheme for light/dark) used by every Cadence component, not styling one-off per component (OQ-7)
- **KD-8** The clock exposes completion via both: it dispatches a 'cadence:complete' CustomEvent on its own root element (for any/multiple listeners, matches standalone-component style already chosen), and it also accepts an optional onComplete callback in its JS config for the common single-owner case — the event is the source of truth, the callback is a convenience wrapper around listening for it (OQ-5 via discovery:completion-signaling-design-for-the-clock-primitive)
- **KD-9** The same pattern covers the start: a 'cadence:start' CustomEvent fires when the clock begins (and the starting beep, if any, plays), so an orchestrator can align its own bookkeeping to actual start rather than to when it called spawn (OQ-5 via discovery:completion-signaling-design-for-the-clock-primitive)

## Prior Art
_No items yet._

## Implementation Details
_No items yet._

## Verification Criteria
- [ ] **VC-1** {"durationSeconds": 5} runs for 5000ms ± one animation frame, measured by starting the clock and asserting the completion callback fires at ~5s
- [ ] **VC-2** ~~{"durationSeconds": 5} runs for 5000ms ± one animation frame, measured by starting the clock and asserting the completion callback fires at ~5s~~ → duplicate of VC-1 — same 'apply' retry bug
- [ ] **VC-3** Spawning a clock with a 5s duration and an onComplete callback: the callback fires once, and a 'cadence:complete' listener on the root element fires once, both within one frame of each other, ~5s after start

## Changelog
- 2026-08-21: Spec initialized.
- 2026-08-21: G-1 added
- 2026-08-21: G-2 added
- 2026-08-21: G-3 added
- 2026-08-21: G-4 added
- 2026-08-21: G-5 added
- 2026-08-21: NG-1 added
- 2026-08-21: NG-2 added
- 2026-08-21: OQ-1 added
- 2026-08-21: OQ-2 added
- 2026-08-21: OQ-3 added
- 2026-08-21: OQ-4 added
- 2026-08-21: OQ-5 added
- 2026-08-21: OQ-6 added
- 2026-08-21: OQ-7 added
- 2026-08-21: OQ-1 opened discovery:duration-units-convention-in-timer-apps
- 2026-08-21: OQ-5 opened discovery:completion-signaling-design-for-the-clock-primitive
- 2026-08-21: KD-1, VC-1 applied from discovery:duration-units-convention-in-timer-apps
- 2026-08-21: KD-2, VC-2 applied from discovery:duration-units-convention-in-timer-apps
- 2026-08-21: KD-2 struck
- 2026-08-21: VC-2 struck
- 2026-08-21: KD-3 resolves OQ-2
- 2026-08-21: KD-4 resolves OQ-3
- 2026-08-21: KD-5 resolves OQ-4
- 2026-08-21: KD-6 resolves OQ-6
- 2026-08-21: KD-7 resolves OQ-7
- 2026-08-21: KD-8, KD-9, VC-3 applied from discovery:completion-signaling-design-for-the-clock-primitive
