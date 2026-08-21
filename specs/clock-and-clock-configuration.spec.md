# Spec: Clock and clock configuration

**Status:** Done
**Description:** Clock and clock configuration

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** Clock is configured entirely via a JSON input: a duration, an optional starting sound frequency, an optional ending sound frequency
- **G-2** Renders as a single line: a running chrono alongside a bar that fills over the course of the duration
- **G-3** Plays a sound at the start of the duration when a starting frequency is given
- **G-4** Plays a sound at the end of the duration when an ending frequency is given
- **G-5** No sound plays for an omitted frequency — the clock runs silently at that edge
- **G-6** Usable with assistive technology: start/complete are announced to screen readers without spamming a continuous tick, and the audio cue has a visual equivalent so sound isn't the only signal

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
- **OQ-8** ~~Which JS/CSS framework, if any, and how does the app stay deployable as a plain static GitHub Pages page with no build step?~~ → KD-10
- **OQ-9** ~~How is the elapsed/remaining toggle (KD-4) actually triggered — user interaction, or only programmatic, given the clock otherwise has no user-facing controls (KD-5)?~~ → KD-11
- **OQ-10** ~~How are behavior-level verification criteria (bar fill, beep timing, DOM structure) actually run mechanically, given there's no framework or build step in the shipped page?~~ → KD-12
- **OQ-11** ~~How does an orchestrator hand JSON config to a newly spawned <cadence-clock>, given custom-element attributes are string-only and the config has numeric/optional fields?~~ → KD-13
- **OQ-12** ~~Browsers gate Web Audio behind a user gesture; KD-5 has the clock auto-start with no click of its own — where does audio get unlocked?~~ → KD-14
- **OQ-13** ~~How does a Playwright test observe that an oscillator 'started' at a given frequency, without capturing real audio output?~~ → KD-15
- **OQ-14** ~~IMPL-3 cites KD-10, but the decision that actually specifies how config is handed over (a configure() method, not attributes) is KD-13 — a citation slip from before KD-13 existed, not a scope change~~ → KD-16
- **OQ-15** ~~OQ-3 asked about display format too (mm:ss vs raw seconds), but KD-4 only settled elapsed-vs-remaining — what format does the chrono text actually use?~~ → KD-17

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
- **KD-10** No JS framework, no CSS framework: a vanilla Custom Element (<cadence-clock>) and a hand-written CSS file using custom properties, both loaded directly by a static index.html with no build step and no CDN dependency — nothing to bundle, nothing that can 404 on GitHub Pages, nothing to keep in sync with a build output (OQ-8)
- **KD-11** Both: clicking/tapping the time text toggles elapsed/remaining for a person watching, and the same switch is exposed as a JS method/attribute so an orchestrating component can drive it too — a display toggle isn't the same as the start control KD-5 already ruled out (OQ-9)
- **KD-12** Playwright, as a dev-only dependency (via npx, never shipped in the page) driving a real browser against the static HTML file — the only way to mechanically check animation-frame timing, computed layout, and actual Web Audio output rather than trusting the source code read right (OQ-10)
- **KD-13** Config is handed over as a JS property, not an attribute: a public configure(config) method (and a .config setter as sugar for it) — attributes stay out of it entirely since they can't carry numbers or optional fields cleanly (OQ-11)
- **KD-14** This component does not manage audio unlocking — that's the embedding/orchestrating page's responsibility (a session is always started by an explicit human action somewhere upstream, which is what unlocks the browser's AudioContext for everything spawned after it). Documented as a constraint on embedders, not solved here (OQ-12)
- **KD-15** No AudioContext spying: the clock dispatches a 'cadence:beep' CustomEvent with {frequency, edge} in its detail whenever it starts a tone, on the same root element as cadence:start/cadence:complete. Tests assert on that event; it also becomes the hook the visual pulse (VC-10) listens to (OQ-13)
- **KD-16** Confirmed a citation slip, not a scope change: IMPL-3's parenthetical should be read as (KD-13), not (KD-10) — item text is frozen so this stands as the correction rather than an edit. KD-10 still applies to IMPL-3 in spirit (no framework), just isn't the decision that shaped its JSON-handoff detail (OQ-14)
- **KD-17** m:ss (minutes:seconds, seconds zero-padded, no leading zero on minutes) always, regardless of duration magnitude — matches the convention every consumer interval-timer app already uses (SOTA from OQ-1's discovery) and stays readable whether a step is 7s or 7 minutes (OQ-15)

## Prior Art
_No items yet._

## Implementation Details
- [x] **IMPL-1** Project skeleton: index.html, css/theme.css, js/cadence-clock.js, and a package.json with Playwright as the sole devDependency
- [x] **IMPL-2** Shared theme.css: color/spacing custom properties, light/dark via prefers-color-scheme, no per-component one-off styles (KD-7, KD-10)
- [x] **IMPL-3** Register <cadence-clock> custom element; parse its JSON config (duration, startFrequency?, endFrequency?) (KD-10)
- [x] **IMPL-4** Timing loop via requestAnimationFrame driving the bar fill and the chrono text, defaulting to remaining (KD-1, KD-4)
- [x] **IMPL-5** Elapsed/remaining toggle: click on the chrono text, plus a public method/attribute for programmatic control (KD-11)
- [x] **IMPL-6** Web Audio beep helper: short oscillator burst at a given frequency, wired to start and end, silent when a frequency is omitted (KD-3)
- [x] **IMPL-7** Dispatch cadence:start / cadence:complete CustomEvents on the root element and call an optional onComplete callback from config (KD-8, KD-9)
- [x] **IMPL-8** Accessibility wiring: role=progressbar with live aria-valuenow/min/max, an aria-live=polite region announcing only start/complete text, and a visual pulse paired with each beep
- [x] **IMPL-9** Playwright test suite backing the verification criteria: config, layout, audio, a11y, toggle, no-network (KD-12)
- [x] **IMPL-10** Minimal standalone demo page spawning a <cadence-clock> with sample JSON, deployable as-is to GitHub Pages (KD-6)

## Verification Criteria
- [x] **VC-1** {"durationSeconds": 5} runs for 5000ms ± one animation frame, measured by starting the clock and asserting the completion callback fires at ~5s → passed 2026-08-21 (attested: Spawned a fresh <cadence-clock> via document.createElement, called .configure({durationSeconds: 5, onComplete}) and measured elapsed time with performance.now() from configure() to callback firing. onComplete callback fired exactly once, at 5006.2ms after configure() was called (i.e. ~6ms after the 5000ms target, well within one requestAnimationFrame tick).)
- [ ] **VC-2** ~~{"durationSeconds": 5} runs for 5000ms ± one animation frame, measured by starting the clock and asserting the completion callback fires at ~5s~~ → duplicate of VC-1 — same 'apply' retry bug
- [x] **VC-3** Spawning a clock with a 5s duration and an onComplete callback: the callback fires once, and a 'cadence:complete' listener on the root element fires once, both within one frame of each other, ~5s after start → passed 2026-08-21 (attested: Same run as VC-1: attached a 'cadence:complete' event listener on the root <cadence-clock> element before calling .configure({durationSeconds: 5, onComplete}). Both the onComplete callback and the 'cadence:complete' event fired exactly once each (callbackCount=1, eventCount=1), at 5006.2ms and 5006.1ms respectively after configure() -- 0.1ms apart, well within one animation frame, and ~5s after start.)
- [x] **VC-4** Given {"durationSeconds": 5} with no frequencies at all, the clock runs to completion with zero oscillator starts (G-1, G-5) `npx playwright test tests/config.spec.js -g 'no frequency'` → passed 2026-08-21 (ran: exit 0 — Running 1 test using 1 worker ✓ 1 tests/config.spec.js:3:5 › no frequency: completes with )
- [x] **VC-5** The chrono text and the progress bar render as inline siblings on one line at a 400px viewport width and never wrap (G-2) `npx playwright test tests/layout.spec.js` → passed 2026-08-21 (ran: exit 0 — Running 1 test using 1 worker ✓ 1 tests/layout.spec.js:3:5 › chrono and bar sit side by si)
- [x] **VC-6** Given a startFrequency, an oscillator at exactly that frequency starts within one animation frame of t=0 (G-3) `npx playwright test tests/audio.spec.js -g start` → passed 2026-08-21 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/audio.spec.js:3:5 › start: a beep at startFrequen)
- [x] **VC-7** Given an endFrequency different from startFrequency, an oscillator at exactly that frequency starts within one animation frame of the duration elapsing, and the startFrequency tone is not reused (G-4) `npx playwright test tests/audio.spec.js -g end` → passed 2026-08-21 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/audio.spec.js:17:5 › end: a beep at endFrequency )
- [x] **VC-8** Given only an endFrequency (startFrequency omitted), no oscillator starts at t=0, and exactly one starts at completion, at the given frequency (G-1, G-5) `npx playwright test tests/audio.spec.js -g partial` → passed 2026-08-21 (ran: exit 0 — Running 1 test using 1 worker ✓ 1 tests/audio.spec.js:34:5 › partial: only endFrequency gi)
- [x] **VC-9** The bar carries role=progressbar with aria-valuenow/min/max kept current, and an aria-live=polite region announces only the start and complete text, never intermediate ticks (G-6) `npx playwright test tests/a11y.spec.js -g announcements` → passed 2026-08-21 (ran: exit 0 — Running 1 test using 1 worker ✓ 1 tests/a11y.spec.js:3:5 › announcements: aria-live only f)
- [x] **VC-10** Each beep is paired with a visual pulse on the bar/text so start and completion are perceivable without sound (G-6) `npx playwright test tests/a11y.spec.js -g visual-pulse` → passed 2026-08-21 (ran: exit 0 — Running 1 test using 1 worker ✓ 1 tests/a11y.spec.js:25:5 › visual-pulse: a beep is paired)
- [x] **VC-11** Clicking the chrono text toggles between remaining and elapsed display, and calling the exposed toggle method/attribute does the same thing (G-2) `npx playwright test tests/toggle.spec.js` → passed 2026-08-21 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/toggle.spec.js:3:5 › clicking the chrono text tog)
- [x] **VC-12** Loading index.html triggers zero requests to any origin other than the page's own (no CDN script/style/font) (G-1) `npx playwright test tests/no-network.spec.js` → passed 2026-08-21 (ran: exit 0 — Running 1 test using 1 worker ✓ 1 tests/no-network.spec.js:3:5 › loading the page makes ze)
- [x] **VC-13** index.html opens and functions correctly when loaded directly via file:// (double-click, no server) — not only when served over http(s) `node tests/file-protocol.check.mjs` → passed 2026-08-22 (ran: exit 0 — ok: index.html loaded via file:// with no errors, demo clock reads 0:20)

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
- 2026-08-21: G-6 added
- 2026-08-21: OQ-8 added
- 2026-08-21: OQ-9 added
- 2026-08-21: OQ-10 added
- 2026-08-21: KD-10 resolves OQ-8
- 2026-08-21: KD-11 resolves OQ-9
- 2026-08-21: KD-12 resolves OQ-10
- 2026-08-21: VC-4 added
- 2026-08-21: VC-5 added
- 2026-08-21: VC-6 added
- 2026-08-21: VC-7 added
- 2026-08-21: VC-8 added
- 2026-08-21: VC-9 added
- 2026-08-21: VC-10 added
- 2026-08-21: VC-11 added
- 2026-08-21: VC-12 added
- 2026-08-21: IMPL-1 added
- 2026-08-21: IMPL-2 added
- 2026-08-21: IMPL-3 added
- 2026-08-21: IMPL-4 added
- 2026-08-21: IMPL-5 added
- 2026-08-21: IMPL-6 added
- 2026-08-21: IMPL-7 added
- 2026-08-21: IMPL-8 added
- 2026-08-21: IMPL-9 added
- 2026-08-21: IMPL-10 added
- 2026-08-21: OQ-11 raised by dry run
- 2026-08-21: OQ-12 raised by dry run
- 2026-08-21: OQ-13 raised by dry run
- 2026-08-21: KD-13 resolves OQ-11
- 2026-08-21: KD-14 resolves OQ-12
- 2026-08-21: KD-15 resolves OQ-13
- 2026-08-21: dry run clean — Walked IMPL-1 through IMPL-10 end to end: config handoff, audio-unlock boundary, and test observability were the only real gaps, now resolved as KD-13/14/15. No further gaps surfaced.
- 2026-08-21: Status: Draft → Ready
- 2026-08-21: Status: Ready → In Progress
- 2026-08-21: OQ-14 added
- 2026-08-21: KD-16 resolves OQ-14
- 2026-08-21: IMPL-1 checked
- 2026-08-21: OQ-15 added
- 2026-08-21: KD-17 resolves OQ-15
- 2026-08-21: IMPL-2 checked
- 2026-08-21: IMPL-3, IMPL-4, IMPL-5, IMPL-6, IMPL-7, IMPL-8 checked
- 2026-08-21: IMPL-9 checked
- 2026-08-21: IMPL-10 checked
- 2026-08-21: VC-4 passed
- 2026-08-21: VC-5 passed
- 2026-08-21: VC-6 passed
- 2026-08-21: VC-7 passed
- 2026-08-21: VC-8 passed
- 2026-08-21: VC-9 passed
- 2026-08-21: VC-10 passed
- 2026-08-21: VC-11 passed
- 2026-08-21: VC-12 passed
- 2026-08-21: VC-1 passed
- 2026-08-21: VC-3 passed
- 2026-08-22: Status: In Progress → Done
- 2026-08-22: VC-13 added
- 2026-08-22: VC-13 passed
