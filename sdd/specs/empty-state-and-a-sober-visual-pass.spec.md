# Spec: Empty state and a sober visual pass

**Status:** Done
**Description:** Empty state and a sober visual pass

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** With nothing in memory the page leads with loading a program, instead of a demo that hides the fact that nothing has been chosen
- **G-2** The empty state says what a program is and what is expected of one, so a first-time visitor is not left guessing
- **G-3** The page carries a description of the JSON model written for an agent to read, so a user can point an LLM at this page and get a program back that loads
- **G-4** The whole view is redrawn to be sober and unfussy: quiet by default, legible on a phone, and readable as one thing rather than a row of controls
- **G-5** The design lands in index.html itself, which stops being a demo page and becomes the app: no separate mockup survives this spec

## Non-Goals
- **NG-1** The scheduling model, the listbox behaviour and the control layout, all settled by the three specs before this one; this is how it looks and how it starts, not how it works

## Open Questions
- **OQ-1** ~~Does the built-in eight-week example stay as a one-click way in from the empty state, or does the page start truly empty with loading a file the only route~~ → KD-1
- **OQ-2** ~~Where does the agent-readable model description live: visible on the page for anyone, folded behind a disclosure, or in the markup for a reader rather than a viewer~~ → KD-2
- **OQ-3** ~~Is the description hand-written prose, or generated from the same rules the validator enforces so the two cannot drift apart~~ → KD-3
- **OQ-4** ~~Sober means what here: does the app keep the colour it uses for progress and overrun, or does it go monochrome and let the one warning colour be the only colour on the page~~ → KD-4
- **OQ-5** ~~Once a program is loaded, does the empty state's explanation stay reachable, or is it gone until storage is cleared~~ → KD-5
- **OQ-6** ~~KD-14 of the program view puts Load in the More menu, but a page that opens empty needs loading to be its primary act and the same control in two places would be worse: where does Load live once the page has an empty state~~ → KD-6
- **OQ-7** ~~index.html has stopped configuring anything on load, but tests/fixture.html and fourteen test files reach into the page and drive the component directly: does the restore method run on its own when the element connects, or only when the page asks it to~~ → KD-7
- **OQ-8** ~~The file-protocol check opens index.html and clicks the demo clock's start button, and the audio-unlock check does something similar, so what happens to those two checks once the page no longer spawns a demo~~ → KD-8

## Key Decisions
- **KD-1** index.html no longer configures a program on load, so with nothing in memory the page is genuinely empty and leads with loading a file; the eight-week example stays as one button for someone who wants to see it work, which costs a line and answers what does this even do (OQ-1)
- **KD-2** The contract sits in normal flow at the foot of the page, visible and never folded: it is demoted by position, not by visibility, so a human never passes through it while any reader that works on visible text still finds it whole (OQ-2)
- **KD-3** The contract is written by hand rather than generated, and a test loads the very example it prints through the real validator, so the two cannot drift apart without the suite saying so (OQ-3)
- **KD-4** The page stays monochrome and the one accent is spent only on state that matters — today, overdue, an overrun milestone — which is what keeps it sober rather than merely plain (OQ-4)
- **KD-5** A quiet link back to the contract stays in the loaded view, so a program running does not put the format out of reach (OQ-5)
- **KD-6** Load moves out of the More menu and into the page header, where it stays put in both states; that narrows KD-14 of the program view, which keeps Drop, Export and the replanning prompt (OQ-6)
- **KD-7** The page asks: restore is a method index.html calls, never something the element does on connecting, so a test that mounts a bare component keeps getting a blank one and nothing reaches into storage behind its back (OQ-7)
- **KD-8** The atomic clock and the sequence keep their demonstrations on the page, since they are what those two checks exercise and what a visitor sees the app actually do; only the program stops being configured for them (OQ-8)

## Prior Art
- **PA-1** A design director rejected all three candidates and proposed a fourth: the load control as persistent chrome, one short human paragraph, and the contract demoted by position rather than by visibility
- **PA-2** Measured in Chromium: the content of a closed details element is absent from innerText and present only in textContent, so folding the contract would hide it from any reader that works on visible text

## Implementation Details
- [x] **IMPL-1** Give the component a restore method that adopts stored run state on its own, so the page can open a program without being handed one (G-1)
- [x] **IMPL-2** Rebuild index.html: a persistent header carrying the title, one line of lede and Load; the empty state with its paragraph and the example button; the program view; and the contract as the last thing on the page (G-1, G-2, G-5, KD-1, KD-2, KD-6)
- [x] **IMPL-3** Write the contract itself: who it is for, the field notes, and a worked example short enough to read on a phone (G-3, KD-2)
- [x] **IMPL-4** Move Load from the More menu to the header and leave Drop, Export and the replanning prompt behind (KD-6)
- [x] **IMPL-5** Redraw the stylesheet: quiet type, the accent spent only on state, and the contract set in a different register from the human copy (G-4, KD-4)
- [x] **IMPL-6** Wrap the example instead of scrolling it sideways, so no line is cut mid-token on a phone (G-4)

## Verification Criteria
- [x] **VC-1** With storage empty the page shows the load control and the contract and mounts no program, and with a program stored it opens on that program instead (G-1, KD-1) `npx playwright test tests/page-empty-state.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/page-empty-state.spec.js:9:5 › an empty store giv)
- [x] **VC-2** The JSON example printed in the contract is parsed and configured through the real component without error, so the page cannot document a shape the validator rejects (G-3, KD-3) `npx playwright test tests/page-contract.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/page-contract.spec.js:9:5 › the example the page )
- [x] **VC-3** The whole contract is present in the page's visible text rather than only in its markup, and no part of it sits inside a closed disclosure (G-3, KD-2) `npx playwright test tests/page-contract.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/page-contract.spec.js:9:5 › the example the page )
- [x] **VC-4** At 390 by 844 the page never scrolls sideways in either state, the load control is reachable without scrolling, and no line of the example is cut off (G-4, KD-2) `npx playwright test tests/page-layout.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/page-layout.spec.js:17:5 › the empty page never s)

## Changelog
- 2026-08-31: Spec initialized.
- 2026-08-31: G-1 added
- 2026-08-31: G-2 added
- 2026-08-31: G-3 added
- 2026-08-31: G-4 added
- 2026-08-31: NG-1 added
- 2026-08-31: OQ-1 added
- 2026-08-31: OQ-2 added
- 2026-08-31: OQ-3 added
- 2026-08-31: OQ-4 added
- 2026-08-31: OQ-5 added
- 2026-08-31: G-5 added
- 2026-08-31: KD-1 resolves OQ-1
- 2026-08-31: PA-1 added
- 2026-08-31: PA-2 added
- 2026-08-31: KD-2 resolves OQ-2
- 2026-08-31: KD-3 resolves OQ-3
- 2026-08-31: KD-4 resolves OQ-4
- 2026-08-31: KD-5 resolves OQ-5
- 2026-08-31: OQ-6 added
- 2026-08-31: KD-6 resolves OQ-6
- 2026-08-31: IMPL-1 added
- 2026-08-31: IMPL-2 added
- 2026-08-31: IMPL-3 added
- 2026-08-31: IMPL-4 added
- 2026-08-31: IMPL-5 added
- 2026-08-31: IMPL-6 added
- 2026-08-31: VC-1 added
- 2026-08-31: VC-2 added
- 2026-08-31: VC-3 added
- 2026-08-31: VC-4 added
- 2026-08-31: Status: Draft → Ready
- 2026-08-31: OQ-7 raised by dry run
- 2026-08-31: OQ-8 raised by dry run
- 2026-08-31: KD-7 resolves OQ-7
- 2026-08-31: KD-8 resolves OQ-8
- 2026-08-31: dry run clean — Walked IMPL-1 to IMPL-6 through index.html, js/cadence-program.js and css/theme.css: the restore method and who calls it, the header with Load in it, the empty state, the contract at the foot of the page in normal flow, the stylesheet's registers, and the example wrapping rather than scrolling; checked the two standalone checks that open index.html and the fourteen test files that mount their own component, and found no citation stale
- 2026-08-31: Status: Ready → In Progress
- 2026-08-31: IMPL-1, IMPL-2, IMPL-3, IMPL-4, IMPL-5, IMPL-6 checked
- 2026-08-31: VC-1 passed
- 2026-08-31: VC-2 passed
- 2026-08-31: VC-3 passed
- 2026-08-31: VC-4 passed
- 2026-08-31: Status: In Progress → Done
