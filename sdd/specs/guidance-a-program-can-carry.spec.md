# Spec: Guidance a program can carry

**Status:** Draft
**Description:** Guidance a program can carry

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** A step can carry more than a 25-character label: how to do it and what to watch for
- **G-2** A program can carry rules that apply across the whole thing rather than to one session
- **G-3** The format section tells an LLM about these fields, so guidance survives the round trip through a model

## Non-Goals
- **NG-1** Images and diagrams in a program file (OQ-5): untrusted markup, no asset pipeline on a file:// page, and a size cost out of all proportion to the words they replace

## Open Questions
- **OQ-1** Where does step guidance appear: always visible beside the clock, or behind a press? → discovery:where-guidance-lives-and-what-shape-it-takes
- **OQ-2** Is guidance plain text only, or a short list of titled blocks as Talon has?
- **OQ-3** ~~Are unknown fields still silently accepted, now that some field names carry meaning?~~ → KD-3
- **OQ-4** ~~Do red-flag warnings need to be visible without starting a session?~~ → KD-2
- **OQ-5** ~~Does an image or diagram belong here at all, given a file:// page, no build step and untrusted input?~~ → KD-1

## Key Decisions
- **KD-1** No images and no diagrams. An SVG from a program file is a script vector, which is exactly what KD-7 of the hostile-file spec escapes text to avoid; a data URI diagram would dwarf a program that is already 126 KB for one protocol; and Talon's diagrams are authored in the app, not carried by the plan (OQ-5)
- **KD-2** Yes. Program guidance shows on the program view, before and between sessions, because a rule like no jumping until week 8 or a red flag that means see a doctor is useless once you are mid-set and the list is gone (OQ-4)
- **KD-3** Unknown fields stay accepted and ignored. Refusing them would turn one stray key from a model into a refused program, which is the failure KD-2 reserves for a session that would otherwise die at Start; the contract on the page is what tells a model the right names (OQ-3)

## Prior Art
- **PA-1** Talon carries per-exercise title, subtitle, one-line cue, an inline SVG diagram and four titled blocks: equipment, starting position, execution, cautions
- **PA-2** The HSR protocol's cross-cutting rules have nowhere to go in Cadence: running suspended until week 3, no jumping HIIT until week 8, pain up to 5/10 acceptable during a set, and four red flags that mean see a doctor
- **PA-3** ~~On 2026-09-09 a step carrying a notes field was accepted by configure and never rendered; a program-level notes field was dropped from config entirely~~ → Half wrong, and the wrong half was mine: re-tested on a fresh element with an unused title, a program-level notes survives into config intact. The original probe reconfigured the same title twice, so the stored copy won in _adopt and only looked like a drop. Corrected by PA-4 and PA-5
- **PA-4** Verified 2026-09-09 on a fresh element: unknown fields survive configure verbatim at every level, program (notes), entry (notes) and step (cue), because _adopt assigns the handed object as-is. Nothing is dropped and nothing is refused
- **PA-5** The page's contract opens with anything not described here is rejected, which is false today and stays false under KD-3; a model that writes note for notes or cues for cue gets a clean load with its guidance invisible, and in a one-shot paste there is no second chance

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
- 2026-09-09: KD-1 resolves OQ-5
- 2026-09-09: NG-1 added
- 2026-09-09: KD-2 resolves OQ-4
- 2026-09-09: KD-3 resolves OQ-3
- 2026-09-09: OQ-1 opened discovery:where-guidance-lives-and-what-shape-it-takes
- 2026-09-09: PA-3 struck
- 2026-09-09: PA-4 added
- 2026-09-09: PA-5 added
