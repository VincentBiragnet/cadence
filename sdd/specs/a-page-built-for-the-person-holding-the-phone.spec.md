# Spec: A page built for the person holding the phone

**Status:** In Progress
**Description:** A page built for the person holding the phone

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** Nothing written for a language model or a developer is visible to a person, while staying fully readable to anything reading the page
- **G-2** With nothing loaded, the page offers exactly two things: load a file, or take the prompt to give a model
- **G-3** With a program loaded and running, the screen is the session: its title and total time, the step's own clock, what the step is, and how to do it
- **G-4** A step can carry a drawing, because some movements cannot be written down in a sentence

## Non-Goals
_No items yet._

## Open Questions
- **OQ-1** ~~Where do the demonstration controls go, given file-protocol and audio-unlock drive them by id and the page must stop showing them?~~ → KD-3
- **OQ-2** ~~What does the running screen put first, given a separate spec already found the session chrono at 40px against the step clock's 17.6px and no set counter anywhere?~~ → KD-4
- **OQ-3** ~~Is the drawing carried on the step, on the block beside the guidance, or inside a guidance block?~~ → KD-5
- **OQ-4** ~~How large is a drawing allowed to be, given one protocol is already 519 KB and an inline SVG is far heavier than a sentence?~~ → KD-6
- **OQ-5** ~~Does visually hidden mean the existing clip rule, or does the contract need to stay reachable for a person who does want it?~~ → KD-7
- **OQ-6** ~~With the demonstrations gone, does the page still need the audio-unlock gesture it relied on them for, and is Start on a session enough?~~ → KD-8
- **OQ-7** ~~Does the empty state keep the Try the eight-week example button, which is neither an upload nor a prompt?~~ → KD-9

## Key Decisions
- **KD-1** A drawing is allowed but never rendered as supplied: it is parsed and rebuilt from a permitted subset, keeping drawing elements and geometry attributes and dropping script, event handlers, links, foreignObject and style outright. Rebuilding rather than filtering is the same rule as textContent, in the one place where textContent cannot be used (supersedes the archived guidance spec KD-1 and NG-1, by the user's decision on 2026-09-09)
- **KD-2** The contract stays where it is in the document and is hidden visually, the way the live regions already are, so a person never sees it and a model reading the page or its source still gets every word (by the user's decision on 2026-09-09)
- **KD-3** The demonstrations move to a developer page, parts.html, and the two standalone checks stop driving them. Both get more faithful in the process: the file protocol check loads a real program and runs a step on the real page, and the audio unlock check uses a session's own Start, which is the gesture a real user makes. They were only ever driving the demos because the demos were what the page had (OQ-1)
- **KD-4** The step's own clock is the large one and the session total is the small one beside the title, which is the reverse of today; a set counter waits on nesting and is not invented here. This absorbs what-the-running-screen-puts-first, whose measurements are the evidence: 40px of session chrono against 17.6px of the clock that governs a three-second phase (OQ-2)
- **KD-5** Inside a guidance block, as an svg alongside heading and text, so it sits with the words it illustrates and needs no new location or scope of its own. A drawing of an exercise then lives on that exercise's block, which is where its card already is (OQ-3)
- **KD-6** Sixty-four kilobytes per drawing, and a larger one is ignored like any other unusable value rather than refused. A drawing that big is a photograph someone has traced, not a diagram, and the programs this reads are already hundreds of kilobytes of text (OQ-4)
- **KD-7** The clip rule the live regions already use, and nothing more. A person who wants the contract gets it from the empty state's copy control, which is one of the two things G-2 allows there, so there is no need for a second way in (OQ-5)
- **KD-8** Start on a session is enough and always was. It is a real gesture on the real path, and the archived clock spec's KD-14 already puts unlocking on the embedding page rather than the component. The demonstrations were never load-bearing for it (OQ-6)
- **KD-9** It goes, to parts.html with the rest. The instruction was exactly two things, and Try is a third: it is neither a file a person brought nor a prompt they can hand to a model. Keeping it would be me deciding the rule has an exception (OQ-7)

## Prior Art
- **PA-1** Said by the user on 2026-09-09: the interface is not at all human friendly, what is designed for an agent should be invisible to a human, and on start with nothing cached there should only be the upload button or the prompt for an LLM
- **PA-2** The page still carries its own scaffolding: a full contract section in plain sight, a demonstration section called The parts, and a sample circuit that keeps running below a live session, which a reviewer found one short scroll from the real clock
- **PA-3** The archived guidance spec refused program-supplied images and diagrams in KD-1 and NG-1, on the grounds that an SVG in an untrusted file is a script vector. That is why every scrap of program text is built as DOM nodes with textContent. This spec reverses the refusal deliberately and must replace it with something that makes the same guarantee
- **PA-4** The empty state and the contract's placement were settled in the archived empty-state-and-a-sober-visual-pass spec, whose decision to keep the contract uncollapsed came from a closed details element hiding its text from innerText. Visually hidden in place keeps that readability while removing it from sight
- **PA-5** Two standalone checks, file-protocol and audio-unlock, drive the page's demonstration controls by their ids, so removing The parts from the page has to give them somewhere else to live
- **PA-6** Caught by the checks: checkVisibility returns true for clipped text, which is the point of the technique and why invisibility has to be measured as a rendered width rather than asserted as a boolean
- **PA-7** Caught by the checks: an empty page showed Load twice, once in the header and once in the empty state, which is not exactly two things. The header's Load is now hidden until there is a programme
- **PA-8** Caught by the checks: the wake-lock notice added a fourth announcement to two accessibility tests that count announcements to prove there is no per-tick spam. Both now set it aside by name rather than widening a count that exists to catch spam

## Implementation Details
- [x] **IMPL-1** Move the demonstrations and the eight-week Try to parts.html
- [x] **IMPL-2** Give the page an empty state of exactly two controls, and hide the header Load until there is a programme
- [x] **IMPL-3** Clip the contract out of sight in place, and add a Copy prompt control that carries it
- [x] **IMPL-4** Rebuild a guidance svg from a permitted subset, with a 64 KB cap
- [x] **IMPL-5** Make the step clock the large one and the session total the small one
- [x] **IMPL-6** Stand the programme name aside while a session runs
- [x] **IMPL-7** Point the two standalone checks at the real path instead of the demonstrations

## Verification Criteria
- [x] **VC-1** With nothing stored the page shows exactly two controls, Load and Copy prompt, no jargon anywhere a person can see, and the contract present in the document but clipped to a pixel (G-1, G-2) `npx playwright test tests/page-empty-state.spec.js` → passed 2026-09-09 (ran: exit 0 — Running 5 tests using 1 worker ✓ 1 tests/page-empty-state.spec.js:14:5 › an empty store gi)
- [x] **VC-2** A drawing is rebuilt from a permitted subset: a real diagram survives, and ten hostile shapes including inline script, event handlers, foreignObject, style, xlink and a nested svg all render without executing anything (G-4) `npx playwright test tests/figure-safety.spec.js` → passed 2026-09-09 (ran: exit 0 — Running 13 tests using 1 worker ✓ 1 tests/figure-safety.spec.js:28:5 › a real diagram surv)
- [x] **VC-3** During a run the step's own clock is the largest thing on screen, larger than the session total, and the programme name stands aside (G-3) `npx playwright test tests/page-layout.spec.js` → passed 2026-09-09 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/page-layout.spec.js:21:5 › the empty page never s)

## Changelog
- 2026-09-09: Spec initialized.
- 2026-09-09: G-1 added
- 2026-09-09: G-2 added
- 2026-09-09: G-3 added
- 2026-09-09: G-4 added
- 2026-09-09: PA-1 added
- 2026-09-09: PA-2 added
- 2026-09-09: PA-3 added
- 2026-09-09: PA-4 added
- 2026-09-09: PA-5 added
- 2026-09-09: KD-1 added
- 2026-09-09: KD-2 added
- 2026-09-09: Status: Draft → Ready
- 2026-09-09: OQ-1 raised by dry run
- 2026-09-09: OQ-2 raised by dry run
- 2026-09-09: OQ-3 raised by dry run
- 2026-09-09: OQ-4 raised by dry run
- 2026-09-09: OQ-5 raised by dry run
- 2026-09-09: OQ-6 raised by dry run
- 2026-09-09: OQ-7 raised by dry run
- 2026-09-09: KD-3 resolves OQ-1
- 2026-09-09: KD-4 resolves OQ-2
- 2026-09-09: KD-5 resolves OQ-3
- 2026-09-09: KD-6 resolves OQ-4
- 2026-09-09: KD-7 resolves OQ-5
- 2026-09-09: KD-8 resolves OQ-6
- 2026-09-09: KD-9 resolves OQ-7
- 2026-09-09: dry run clean — Walked it end to end: index.html loses The parts and the visible contract, keeps the contract in place under the existing clip rule, and shows on an empty page only Load and Copy prompt; a loaded program puts a small wordmark above the list; a running session shows title and small total, the large step clock, the step label and cue, and the block's guidance with an optional rebuilt drawing; parts.html takes the demonstrations and the eight-week Try; the two standalone checks move to the real path; guidance gains an svg field parsed and rebuilt from a permitted subset with a 64 KB cap
- 2026-09-09: Status: Ready → In Progress
- 2026-09-09: VC-1 added
- 2026-09-09: VC-2 added
- 2026-09-09: VC-3 added
- 2026-09-09: PA-6 added
- 2026-09-09: PA-7 added
- 2026-09-09: PA-8 added
- 2026-09-09: IMPL-1 added
- 2026-09-09: IMPL-2 added
- 2026-09-09: IMPL-3 added
- 2026-09-09: IMPL-4 added
- 2026-09-09: IMPL-5 added
- 2026-09-09: IMPL-6 added
- 2026-09-09: IMPL-7 added
- 2026-09-09: IMPL-1, IMPL-2, IMPL-3, IMPL-4, IMPL-5, IMPL-6, IMPL-7 checked
- 2026-09-09: VC-1 passed
- 2026-09-09: VC-2 passed
- 2026-09-09: VC-3 passed
