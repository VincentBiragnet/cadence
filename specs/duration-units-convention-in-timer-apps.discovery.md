# Discovery: Duration units convention in timer apps

**Discovery for:** clock-and-clock-configuration (OQ-1)
**Question:** What unit is duration expressed in — seconds or milliseconds?

_Edit via `scripts/spec.py`, never by hand._

## Open Questions
_No items yet._

## State of the Art
- **SOTA-1** Consumer interval-timer apps (Tabata/HIIT timers, intervaltimer.com, exercisetimer.net) universally expose duration to the user in seconds, not milliseconds — steps are authored/edited as whole (or occasionally fractional) seconds, matching how a person describes a step ("20s leg raise")
- **SOTA-2** Browser timing primitives (setTimeout/setInterval, requestAnimationFrame, AudioContext.currentTime) are all milliseconds or fractional seconds internally — no runtime reason to store the wire format in ms

## Proposed Decisions
- **PD-1** Duration in the JSON is a number of seconds (fractional allowed, e.g. 20.5) — matches how programs are authored and described elsewhere in Cadence ("20s leg raise"); the clock converts to milliseconds internally for its own timing loop

## Proposed Criteria
- **PC-1** {"durationSeconds": 5} runs for 5000ms ± one animation frame, measured by starting the clock and asserting the completion callback fires at ~5s

## Changelog
- 2026-08-21: Opened for OQ-1 of clock-and-clock-configuration.
- 2026-08-21: SOTA-1 added
- 2026-08-21: SOTA-2 added
- 2026-08-21: PD-1 added
- 2026-08-21: PC-1 added
