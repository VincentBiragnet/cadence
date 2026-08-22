# Archive catalog

Closed specs and discoveries. Each was deleted from the working tree at the
commit named below, so git still holds it byte for byte. The summaries here are
all an agent normally needs; read a full one only when asked:
`spec.py show --archived <slug>`.

## duration-units-convention-in-timer-apps
**Archived:** 2026-08-21 · **discovery** for clock-and-clock-configuration (OQ-1) · **Commit:** 4e5562ba72b1fba40f7468ebba1de45270986427 `specs/duration-units-convention-in-timer-apps.discovery.md`

## completion-signaling-design-for-the-clock-primitive
**Archived:** 2026-08-21 · **discovery** for clock-and-clock-configuration (OQ-5) · **Commit:** 0519d4b304fc79a5f68fcb5f9d7c6bfedbdc782d `specs/completion-signaling-design-for-the-clock-primitive.discovery.md`

Superseded by direct application: proposals already folded into clock-and-clock-configuration as KD-8, KD-9, VC-3 before this document could be archived through the normal apply path (blocked by a since-fixed harness bug).

## clock-and-clock-configuration
**Archived:** 2026-08-22 · **Status:** Done · **struck, not passed:** VC-2 · **Commit:** faf123ca491d7fbacbe0a8b1cddbe412fbb92f8d `specs/clock-and-clock-configuration.spec.md`

Built <cadence-clock>: a single reusable JSON-configured clock primitive (duration, optional start/end beep frequencies), auto-starting Custom Element with no framework/build step. Renders inline as a chrono (elapsed/remaining, click or .toggleMode() to switch) plus a progress bar; signals cadence:start/beep/complete CustomEvents on itself; config is set via .configure()/.config, never attributes (KD-13). Verified: config parsing and silent-when-omitted frequencies, single-line layout at narrow viewport, start/end beep timing and independence, a11y (role=progressbar, aria-live announces only start/complete, visual pulse pairs with every beep), click+method toggle, zero external network requests, works both via file:// and served over http(s) (VC-13, fixed a CORS-via-module-script bug), and that the demo's Start-button gesture actually unlocks Web Audio (VC-14, fixed a silent-autoplay-block bug). Binding decisions for future components: shared css/theme.css design system with light DOM (not shadow DOM) so it applies with no duplication; JS-property config handoff, not attributes; auto-start with lifecycle CustomEvents as the interop contract; Playwright as the only devDependency, dev-only. Non-goals carried forward: multi-step program sequencing and planned-vs-actual datetime tracking are the next component's job, not this one's.

## how-the-program-view-hands-off-to-a-running-sequence-and-back
**Archived:** 2026-08-22 · **discovery** for program (OQ-6) · **Commit:** 5aa9c8ecf5c779280b346f35c1ab8e53d4115632 `specs/how-the-program-view-hands-off-to-a-running-sequence-and-back.discovery.md`

## sequence-clock
**Archived:** 2026-08-22 · **Status:** Done · **Commit:** 141af126644584b3b1bcef9531103715541eb382 `specs/sequence-clock.spec.md`

Built <cadence-sequence>: plays a JSON program of { title, blocks: [{ repetitions, steps: [{ durationSeconds, startFrequency?, endFrequency?, label }] }] } sequentially, one step after another, each block repeating. Reuses the atomic <cadence-clock> for each step's own timing/beep, mounted for real (visible chrono+bar for the current step — an earlier headless-only design was corrected after a misread requirement), alongside a title, a position indicator ('step X of Y, rep N of M'), the current label, and one big aggregate chrono for the whole program (self-correcting each step boundary against config durations, not a single drifting timer). Has its own Start gesture (doubling as the audio-unlock gesture for every beep that follows) and signals cadence:start/beep/complete on itself, same event contract as the atomic clock. Accessibility: the step clock's own chrono/bar/pulse work normally now that it's visible; only its redundant internal aria-live text is silenced (aria-hidden), so only the sequence's own label+position announcement fires per step. Verified: total-duration math, step ordering across block/repetition boundaries, per-step beep correctness, aggregate-chrono math and drift-free step transitions, elapsed/remaining toggle, audio unlock via the Start click, and the visible step clock plus its non-duplicated accessibility wiring. Binding decisions for future components: reused sub-components should default to genuinely visible unless there's a real reason to hide them — 'headless reuse' turned out to be the wrong default once actually asked about.
