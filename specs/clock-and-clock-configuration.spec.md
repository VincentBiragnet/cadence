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
- **OQ-1** ~~What unit is duration expressed in — seconds or milliseconds?~~ → discovery:duration-units-convention-in-timer-apps, KD-1
- **OQ-2** How is the sound produced — a synthesized tone (Web Audio oscillator at the given frequency), and if so for how long and at what volume?
- **OQ-3** What does the chrono text show — time elapsed, time remaining, or both, and in what format (e.g. mm:ss vs raw seconds)?
- **OQ-4** What starts the clock — does it auto-start on load/on being given JSON, or does something external call a start() method?
- **OQ-5** What happens when the duration ends — does the clock just sit at 100% and done, or does it need to signal completion to whatever embeds it (e.g. an onComplete callback), given this is meant to be a reusable primitive? → discovery:completion-signaling-design-for-the-clock-primitive
- **OQ-6** Is this one HTML page per clock for now (a demo/test harness page), or is there already a host page/embedding contract this needs to fit into?
- **OQ-7** Any visual requirements for the bar and text — colors, size, direction of fill, font — or is a plain functional look fine for this first pass?

## Key Decisions
- **KD-1** Duration in the JSON is a number of seconds (fractional allowed, e.g. 20.5) — matches how programs are authored and described elsewhere in Cadence ("20s leg raise"); the clock converts to milliseconds internally for its own timing loop (OQ-1 via discovery:duration-units-convention-in-timer-apps)

## Prior Art
_No items yet._

## Implementation Details
_No items yet._

## Verification Criteria
- [ ] **VC-1** {"durationSeconds": 5} runs for 5000ms ± one animation frame, measured by starting the clock and asserting the completion callback fires at ~5s

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
