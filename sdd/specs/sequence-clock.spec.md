# Spec: Sequence clock

**Status:** Draft
**Description:** Sequence clock

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** Configured via a list of blocks; each block has a répétitions count and one or more steps, each step shaped exactly like the atomic clock's config (durationSeconds, optional startFrequency, optional endFrequency) plus a label describing what to do during it
- **G-2** Steps execute sequentially: within a block its steps play in order, the whole block repeats répétitions times, then the next block begins — the entire list runs end to end with no user interaction between steps
- **G-3** Each step's timing/beep behavior is the atomic clock we already built (G-1 of clock-and-clock-configuration) — this component sequences it, it doesn't reimplement it
- **G-4** Displays one big overall chrono: time remaining across the whole program, computed as the sum over every block of (that block's steps' durations, summed) × its répétitions

## Non-Goals
- **NG-1** Pause, skip, rewind, or any other transport control — this spec is only the sequential run-through and the aggregate chrono
- **NG-2** Planned-vs-actual datetime / wall-clock scheduling — carried forward from clock-and-clock-configuration's NG-2, still out of scope here

## Open Questions
- **OQ-1** Does this component visually render each step's own small chrono+bar (the atomic <cadence-clock> itself, mounted per step) alongside the big aggregate chrono, or is the atomic clock used only for its internal timing/beep logic — headless — with nothing per-step shown except the label and the one big number?
- **OQ-2** Alongside the big chrono, is there any per-step/per-block indicator — current label, 'step 2 of 5', 'rep 1 of 3' — or does the label stand alone with no positional counter?
- **OQ-3** Does the big chrono count down (remaining) or up (elapsed), or both with a toggle like the atomic clock has (KD-4/KD-11 on clock-and-clock-configuration)?
- **OQ-4** What is the actual JSON shape — a bare top-level array of blocks, or an object wrapping it (e.g. { blocks: [...] }) alongside room for a program-level label/title?
- **OQ-5** Does this component auto-start on configure(), matching the atomic clock's KD-5, or does a multi-minute program need an explicit start gesture of its own (which would also double as the audio-unlock gesture KD-14 pushed onto embedders)?
- **OQ-6** What happens at the very end of the whole sequence — does the aggregate chrono just sit at 0, does the component dispatch a completion event/callback mirroring the atomic clock's cadence:complete, or something else?

## Key Decisions
_No items yet._

## Prior Art
_No items yet._

## Implementation Details
_No items yet._

## Verification Criteria
_No items yet._

## Changelog
- 2026-08-22: Spec initialized.
- 2026-08-22: G-1 added
- 2026-08-22: G-2 added
- 2026-08-22: G-3 added
- 2026-08-22: G-4 added
- 2026-08-22: NG-1 added
- 2026-08-22: NG-2 added
- 2026-08-22: OQ-1 added
- 2026-08-22: OQ-2 added
- 2026-08-22: OQ-3 added
- 2026-08-22: OQ-4 added
- 2026-08-22: OQ-5 added
- 2026-08-22: OQ-6 added
