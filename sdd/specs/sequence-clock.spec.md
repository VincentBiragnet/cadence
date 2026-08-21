# Spec: Sequence clock

**Status:** In Progress
**Description:** Sequence clock

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** Configured via a list of blocks; each block has a répétitions count and one or more steps, each step shaped exactly like the atomic clock's config (durationSeconds, optional startFrequency, optional endFrequency) plus a label describing what to do during it
- **G-2** Steps execute sequentially: within a block its steps play in order, the whole block repeats répétitions times, then the next block begins — the entire list runs end to end with no user interaction between steps
- **G-3** Each step's timing/beep behavior is the atomic clock we already built (G-1 of clock-and-clock-configuration) — this component sequences it, it doesn't reimplement it
- **G-4** Displays one big overall chrono: time remaining across the whole program, computed as the sum over every block of (that block's steps' durations, summed) × its répétitions
- **G-5** Accessibility parity with the atomic clock: a visual pulse on every step beep, and aria-live announcing label/position changes only — never a continuous tick

## Non-Goals
- **NG-1** Pause, skip, rewind, or any other transport control — this spec is only the sequential run-through and the aggregate chrono
- **NG-2** Planned-vs-actual datetime / wall-clock scheduling — carried forward from clock-and-clock-configuration's NG-2, still out of scope here

## Open Questions
- **OQ-1** ~~Does this component visually render each step's own small chrono+bar (the atomic <cadence-clock> itself, mounted per step) alongside the big aggregate chrono, or is the atomic clock used only for its internal timing/beep logic — headless — with nothing per-step shown except the label and the one big number?~~ → KD-1
- **OQ-2** ~~Alongside the big chrono, is there any per-step/per-block indicator — current label, 'step 2 of 5', 'rep 1 of 3' — or does the label stand alone with no positional counter?~~ → KD-2
- **OQ-3** ~~Does the big chrono count down (remaining) or up (elapsed), or both with a toggle like the atomic clock has (KD-4/KD-11 on clock-and-clock-configuration)?~~ → KD-3
- **OQ-4** ~~What is the actual JSON shape — a bare top-level array of blocks, or an object wrapping it (e.g. { blocks: [...] }) alongside room for a program-level label/title?~~ → KD-4
- **OQ-5** ~~Does this component auto-start on configure(), matching the atomic clock's KD-5, or does a multi-minute program need an explicit start gesture of its own (which would also double as the audio-unlock gesture KD-14 pushed onto embedders)?~~ → KD-5
- **OQ-6** ~~What happens at the very end of the whole sequence — does the aggregate chrono just sit at 0, does the component dispatch a completion event/callback mirroring the atomic clock's cadence:complete, or something else?~~ → KD-6
- **OQ-7** ~~Since the per-step atomic clock is headless (KD-1), its own accessibility wiring (visual pulse per beep, aria-live for its start/complete) never surfaces anywhere. Does this component need its own equivalent — a visual pulse when a step beeps, aria-live announcing label/position changes — to keep the accessibility bar the atomic clock set (G-6 on clock-and-clock-configuration)?~~ → KD-7
- **OQ-8** ~~The hidden per-step clock instance still renders its own role=progressbar and aria-live region (just not shown visually) — if it's merely display:none rather than excluded from the accessibility tree, its own start/complete announcements would leak through per step and duplicate/spam alongside the sequence's own aria-live (G-5), exactly what we're trying to avoid~~ → KD-8
- **OQ-9** ~~Deriving the aggregate remaining time from one continuous timer since the sequence's own start (IMPL-4) will drift from reality: each step-to-step transition has a small real-world gap (the JS callback chain from one step's cadence:complete to the next step's configure()), so a single uninterrupted clock slowly diverges from the sum of actual step durations over a long program with many steps~~ → KD-9

## Key Decisions
- **KD-1** Headless: the atomic clock's timing/beep logic is reused internally (its class, not a mounted <cadence-clock> element), but nothing per-step is rendered — only the current label and the one big aggregate chrono are shown (OQ-1)
- **KD-2** Yes: a position indicator alongside the label — which step and which repetition within the current block (e.g. 'step 2 of 3, rep 1 of 4') (OQ-2)
- **KD-3** Toggle, same as the atomic clock (KD-4/KD-11): the big chrono switches between remaining and elapsed for the whole program (OQ-3)
- **KD-4** An object, not a bare array: { title, blocks: [...] } — room for a program-level title alongside the block list (OQ-4)
- **KD-5** An explicit start gesture, not auto-start — a real button/interaction on this component itself, which conveniently doubles as the audio-unlock gesture KD-14 pushed onto embedders (a multi-minute program is exactly the kind of thing a person deliberately starts) (OQ-5)
- **KD-6** Mirrors the atomic clock: dispatches a completion event on its own root element plus calls an optional onComplete callback from config, same pattern as KD-8/KD-9 (OQ-6)
- **KD-7** Yes, equivalent wiring at the sequence level: a visual pulse on the big chrono paired with every step beep (the headless clock's cadence:beep still fires and this component listens for it), and an aria-live region announcing the label/position text each time it changes — not on every tick, same non-spam rule as G-6 (OQ-7)
- **KD-8** The hidden instance is excluded from the accessibility tree entirely (aria-hidden="true" on its container, in addition to display:none) — the sequence's own aria-live is the only one that should ever announce anything (OQ-8)
- **KD-9** Anchor to actual progress, not a single continuous timer: remaining = total − (durations of already-completed steps, by config) − current step's own elapsed (read from the hidden clock's internal state each frame). This self-corrects at every step boundary instead of accumulating scheduling overhead across a long program (OQ-9)

## Prior Art
_No items yet._

## Implementation Details
- [ ] **IMPL-1** New js/cadence-sequence.js registering <cadence-sequence>, reusing the CadenceClock class from js/cadence-clock.js for each step's timing/beep — one hidden instance (appended off-screen so its Custom Element lifecycle runs, never shown) reconfigured per step, not one per step (KD-1)
- [ ] **IMPL-2** Parse config { title, blocks: [{ repetitions, steps: [{ durationSeconds, startFrequency?, endFrequency?, label }] }] }; compute total duration = Σ over blocks of (Σ step durations in that block) × repetitions (G-1, G-4)
- [ ] **IMPL-3** Render: title, a position indicator ('step 2 of 3, rep 1 of 4'), the current label, one big chrono (m:ss, KD-17's convention), and a Start button — no per-step bar or clock UI (KD-1, KD-2, KD-5)
- [ ] **IMPL-4** Aggregate chrono timing loop: track elapsed since the sequence's own start (not per-step) via requestAnimationFrame, derive remaining from the precomputed total; toggle remaining/elapsed by click or .toggleMode(), same as the atomic clock (KD-3)
- [ ] **IMPL-5** Start button wiring: click both begins the sequence and serves as the audio-unlock gesture for every step's beep that follows (KD-5, KD-14)
- [ ] **IMPL-6** Accessibility: a visual pulse on the big chrono for every step's cadence:beep (listened on the hidden instance); an aria-live region announcing the label/position text only when it changes, never on a tick (G-5, KD-7)
- [ ] **IMPL-7** Dispatch cadence:start (on the Start click) and cadence:complete (end of the whole sequence) on the <cadence-sequence> root, plus an optional onComplete callback from config; pass through cadence:beep from the hidden instance for external testability, mirroring KD-15's rationale (G-4, KD-6)
- [ ] **IMPL-8** Playwright test suite backing the verification criteria: config/total-duration math, sequencing order, beep timing across step transitions, aggregate chrono behavior, accessibility, completion
- [ ] **IMPL-9** Demo page (or a section of the existing one) spawning a <cadence-sequence> with a small multi-block sample program
- [ ] **IMPL-10** Sequencing engine: walk blocks, repetitions, then steps in order; configure the hidden clock instance for each step and advance on its cadence:complete; update the label/position indicator at the start of each step (G-2, G-3)

## Verification Criteria
- [ ] **VC-1** Given a 2-block program (block A: 2 steps × 2 reps, block B: 1 step × 3 reps, known durations), the computed total duration equals the hand-calculated sum (G-1, G-4) `npx playwright test tests/sequence-config.spec.js -g 'total duration'`
- [ ] **VC-2** Steps fire in the exact expected order across block/repetition boundaries for a small deterministic program, observed via label-change events (G-2) `npx playwright test tests/sequence-order.spec.js`
- [ ] **VC-3** Each step's beep (frequency and start/end edge) matches its own config as the sequence runs through several steps with different frequencies (G-3) `npx playwright test tests/sequence-audio.spec.js`
- [ ] **VC-4** The aggregate chrono reads the full computed total at t=0, and decreases continuously across a step-to-step transition with no jump or reset (G-4) `npx playwright test tests/sequence-chrono.spec.js`
- [ ] **VC-5** Clicking the chrono (or calling .toggleMode()) switches the aggregate display between remaining and elapsed (G-4) `npx playwright test tests/sequence-chrono.spec.js -g toggle`
- [ ] **VC-6** A visual pulse fires alongside every step beep, and aria-live announces the label/position text only when it changes, never once per tick (G-5) `npx playwright test tests/sequence-a11y.spec.js`
- [ ] **VC-7** At the end of the whole program, cadence:complete fires once on the <cadence-sequence> root and the onComplete callback fires once (G-2, G-4) `npx playwright test tests/sequence-complete.spec.js`
- [ ] **VC-8** The Start button click is what unlocks Web Audio for the run — the hidden per-step clock's AudioContext is 'running' (not stuck suspended) by the time the first beep fires `npx playwright test tests/sequence-audio-unlock.spec.js`

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
- 2026-08-22: KD-1 resolves OQ-1
- 2026-08-22: KD-2 resolves OQ-2
- 2026-08-22: KD-3 resolves OQ-3
- 2026-08-22: KD-4 resolves OQ-4
- 2026-08-22: KD-5 resolves OQ-5
- 2026-08-22: KD-6 resolves OQ-6
- 2026-08-22: OQ-7 added
- 2026-08-22: KD-7 resolves OQ-7
- 2026-08-22: G-5 added
- 2026-08-22: IMPL-1 added
- 2026-08-22: IMPL-2 added
- 2026-08-22: IMPL-3 added
- 2026-08-22: IMPL-4 added
- 2026-08-22: IMPL-5 added
- 2026-08-22: IMPL-6 added
- 2026-08-22: IMPL-7 added
- 2026-08-22: IMPL-8 added
- 2026-08-22: IMPL-9 added
- 2026-08-22: IMPL-10 added
- 2026-08-22: VC-1 added
- 2026-08-22: VC-2 added
- 2026-08-22: VC-3 added
- 2026-08-22: VC-4 added
- 2026-08-22: VC-5 added
- 2026-08-22: VC-6 added
- 2026-08-22: VC-7 added
- 2026-08-22: VC-8 added
- 2026-08-22: OQ-8 raised by dry run
- 2026-08-22: OQ-9 raised by dry run
- 2026-08-22: KD-8 resolves OQ-8
- 2026-08-22: KD-9 resolves OQ-9
- 2026-08-22: dry run clean — Walked IMPL-1 through IMPL-10: the two real gaps were accessibility leakage from the hidden instance and timer drift in the aggregate chrono, both resolved (KD-8, KD-9). Nothing else surfaced — the rest reduces to already-decided patterns from clock-and-clock-configuration (config handoff, events, toggle, m:ss format).
- 2026-08-22: Status: Draft → Ready
- 2026-08-22: Status: Ready → In Progress
