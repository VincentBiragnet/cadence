# Spec: Guidance a program can carry

**Status:** Draft
**Description:** Guidance a program can carry

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** A step can carry more than a 25-character label: how to do it and what to watch for
- **G-2** A program can carry rules that apply across the whole thing rather than to one session
- **G-3** The format section tells an LLM about these fields, so guidance survives the round trip through a model

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** Where does step guidance appear: always visible beside the clock, or behind a press?
- **OQ-2** Is guidance plain text only, or a short list of titled blocks as Talon has?
- **OQ-3** Are unknown fields still silently accepted, now that some field names carry meaning?
- **OQ-4** Do red-flag warnings need to be visible without starting a session?
- **OQ-5** Does an image or diagram belong here at all, given a file:// page, no build step and untrusted input?

## Key Decisions
_No items yet._

## Prior Art
- **PA-1** Talon carries per-exercise title, subtitle, one-line cue, an inline SVG diagram and four titled blocks: equipment, starting position, execution, cautions
- **PA-2** The HSR protocol's cross-cutting rules have nowhere to go in Cadence: running suspended until week 3, no jumping HIIT until week 8, pain up to 5/10 acceptable during a set, and four red flags that mean see a doctor
- **PA-3** On 2026-09-09 a step carrying a notes field was accepted by configure and never rendered; a program-level notes field was dropped from config entirely

## Implementation Details
_No items yet._

## Verification Criteria
_No items yet._

## Changelog
- 2026-09-09: Spec initialized.
- 2026-09-09: G-1 added
- 2026-09-09: G-2 added
- 2026-09-09: G-3 added
- 2026-09-09: PA-1 added
- 2026-09-09: PA-2 added
- 2026-09-09: PA-3 added
- 2026-09-09: OQ-1 added
- 2026-09-09: OQ-2 added
- 2026-09-09: OQ-3 added
- 2026-09-09: OQ-4 added
- 2026-09-09: OQ-5 added
