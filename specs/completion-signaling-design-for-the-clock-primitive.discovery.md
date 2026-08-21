# Discovery: Completion signaling design for the clock primitive

**Discovery for:** clock-and-clock-configuration (OQ-5)
**Question:** What happens when the duration ends — does the clock just sit at 100% and done, or does it need to signal completion to whatever embeds it (e.g. an onComplete callback), given this is meant to be a reusable primitive?

_Edit via `scripts/spec.py`, never by hand._

## Open Questions
_No items yet._

## State of the Art
- **SOTA-1** Vanilla-JS/web-component libraries (custom elements, e.g. <audio> and native form elements) signal lifecycle moments as DOM CustomEvents dispatched on the element itself, so any embedder can addEventListener without the component needing to know who's listening
- **SOTA-2** A plain onComplete callback passed into the component's constructor/config is simpler for direct, single-owner embedding (exactly the 'higher-level clock spawns this one' case already decided in OQ-4), at the cost of only one listener

## Proposed Decisions
- **PD-1** ~~The clock exposes completion via both: it dispatches a 'cadence:complete' CustomEvent on its own root element (for any/multiple listeners, matches standalone-component style already chosen), and it also accepts an optional onComplete callback in its JS config for the common single-owner case — the event is the source of truth, the callback is a convenience wrapper around listening for it~~ → already applied to clock-and-clock-configuration as KD-8 (the archive step failed on an uncommitted-git check the harness has since fixed to run before, not after, the parent write)
- **PD-2** ~~The same pattern covers the start: a 'cadence:start' CustomEvent fires when the clock begins (and the starting beep, if any, plays), so an orchestrator can align its own bookkeeping to actual start rather than to when it called spawn~~ → already applied to clock-and-clock-configuration as KD-9, same reason

## Proposed Criteria
- **PC-1** ~~Spawning a clock with a 5s duration and an onComplete callback: the callback fires once, and a 'cadence:complete' listener on the root element fires once, both within one frame of each other, ~5s after start~~ → already applied to clock-and-clock-configuration as VC-3, same reason

## Changelog
- 2026-08-21: Opened for OQ-5 of clock-and-clock-configuration.
- 2026-08-21: SOTA-1 added
- 2026-08-21: SOTA-2 added
- 2026-08-21: PD-1 added
- 2026-08-21: PD-2 added
- 2026-08-21: PC-1 added
- 2026-08-21: PD-1 struck
- 2026-08-21: PD-2 struck
- 2026-08-21: PC-1 struck
