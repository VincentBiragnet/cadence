# Spec: Guidance a program can carry

**Status:** In Progress
**Description:** Guidance a program can carry

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** A step can carry more than a 25-character label: how to do it and what to watch for
- **G-2** A program can carry rules that apply across the whole thing rather than to one session
- **G-3** The format section tells an LLM about these fields, so guidance survives the round trip through a model

## Non-Goals
- **NG-1** Images and diagrams in a program file (OQ-5): untrusted markup, no asset pipeline on a file:// page, and a size cost out of all proportion to the words they replace
- **NG-2** A plain-language read-back emitted alongside the JSON, tracing each rule to the sentence it came from, as the physio reviewer asked for so there would be an artefact they could sign. Dropped by decision: handing a file to a third party is outside what Cadence does

## Open Questions
- **OQ-1** ~~Where does step guidance appear: always visible beside the clock, or behind a press?~~ → discovery:where-guidance-lives-and-what-shape-it-takes, KD-4, KD-5, KD-6, KD-7, KD-8, KD-9, KD-10
- **OQ-2** ~~Is guidance plain text only, or a short list of titled blocks as Talon has?~~ → KD-13
- **OQ-3** ~~Are unknown fields still silently accepted, now that some field names carry meaning?~~ → KD-3
- **OQ-4** ~~Do red-flag warnings need to be visible without starting a session?~~ → KD-2
- **OQ-5** ~~Does an image or diagram belong here at all, given a file:// page, no build step and untrusted input?~~ → KD-1
- **OQ-6** ~~Does block guidance show for every repetition of its block, or only at the first step of the first repetition, given a tempo block repeats eight times and KD-6 says shown when that scope begins?~~ → KD-14
- **OQ-7** ~~Does entry guidance appear on the list row, on the launched session before Start, or both?~~ → KD-15
- **OQ-8** ~~Is a guidance value of the wrong shape, a string where a list of blocks belongs, refused at load or ignored the way an unrecognised field is under KD-3?~~ → KD-16
- **OQ-9** ~~Is the cue's one-sentence length enforced at load, or only stated in the contract, given refusing a long cue would refuse a program that merely runs on?~~ → KD-17
- **OQ-10** ~~Does guidance render by building DOM nodes with textContent or by escaped innerHTML, given the hostile-file KD-7 wants one escape rule and a heading plus items is the first nested untrusted structure the page has had?~~ → KD-18
- **OQ-11** ~~Does the shipped eight-week example gain a cue and guidance too, or only the contract snippet that VC-6 names?~~ → KD-19
- **OQ-12** ~~Does block guidance belong between the cue and the clock, where enough of it puts the running clock three viewport-heights below the fold?~~ → KD-20

## Key Decisions
- **KD-1** No images and no diagrams. An SVG from a program file is a script vector, which is exactly what KD-7 of the hostile-file spec escapes text to avoid; a data URI diagram would dwarf a program that is already 126 KB for one protocol; and Talon's diagrams are authored in the app, not carried by the plan (OQ-5)
- **KD-2** Yes. Program guidance shows on the program view, before and between sessions, because a rule like no jumping until week 8 or a red flag that means see a doctor is useless once you are mid-set and the list is gone (OQ-4)
- **KD-3** Unknown fields stay accepted and ignored. Refusing them would turn one stray key from a model into a refused program, which is the failure KD-2 reserves for a session that would otherwise die at Start; the contract on the page is what tells a model the right names (OQ-3)
- **KD-4** None of A, B or C as written. Guidance takes two forms: a cue of one sentence always visible under the step label for as long as that step runs, which is A's mechanism and the only one that reached a person with their hands full, and guidance as a list of headed blocks, which is B's container and the only one a protocol's own headings survive into (OQ-1 via discovery:where-guidance-lives-and-what-shape-it-takes)
- **KD-5** Guidance attaches at the narrowest scope it is true of, and a block is one of those scopes, because a block is what an exercise actually is. The physio and the model author reached this independently from opposite ends, one seeing both cards stacked above Start, the other having nowhere to hang an exercise (OQ-1 via discovery:where-guidance-lives-and-what-shape-it-takes)
- **KD-6** Guidance attached to a scope is shown when that scope begins, never all of it before Start, since stacking the cards put the Start button 1833 pixels down and left the seated card on screen during the single-leg work (OQ-1 via discovery:where-guidance-lives-and-what-shape-it-takes)
- **KD-7** ~~Red flags are their own field, not the last bullets of the standing block, and their text must carry the action: stop and call, not see a doctor if. A threshold whose action is missing is not a safety rule, and see a doctor if printed above a running metronome is not an instruction (OQ-1 via discovery:where-guidance-lives-and-what-shape-it-takes)~~ → Folded in by my mistake, not by decision. I struck the discovery's proposals by remembered position instead of reading them back, so this one survived when it was the one deferred to red-flags-as-a-field-of-their-own. KD-9 is the decision that stands
- **KD-8** ~~Unrecognised fields stay accepted per the parent's KD-3, but the page stops claiming that anything not described is rejected, and a load names the field names it did not recognise in the message channel the hostile-file spec already built. Silent acceptance is what makes a one-shot paste unverifiable (OQ-1 via discovery:where-guidance-lives-and-what-shape-it-takes)~~ → Folded in by the same mistake and deferred to telling-an-author-which-fields-were-not-recognised. KD-10 is the half of it that stands
- **KD-9** Red flags are carried as ordinary guidance blocks at program scope, with no separate field and no check on their wording. The physio's objection is recorded and deferred rather than answered (OQ-1 via discovery:where-guidance-lives-and-what-shape-it-takes)
- **KD-10** The contract paragraph stops claiming that anything not described is rejected, since it is false today and the parent's KD-3 keeps it false on purpose. Saying nothing about unrecognised fields is honest; saying they are rejected is not (OQ-1 via discovery:where-guidance-lives-and-what-shape-it-takes)
- **KD-11** Program guidance is the same list of headed blocks as everywhere else, not a paragraph, because short paragraph is what turned four red flags into a semicolon run-on and dropped the rules that had no room. Lost from the fold by my miscount and restored here
- **KD-12** A cue may and should repeat a constraint the guidance already states: it names the one thing that makes the repetition wrong if broken, even when the card says it too. Repetition is the feature, since the clause forbidding it is what let the heel-stop rule vanish from the heaviest reps of the session. Lost from the fold by my miscount and restored here
- **KD-13** A short list of titled blocks, as Talon has, at every scope. Plain text alone was candidate A, which lost the soleus range note and turned four red flags into a run-on; headings are what a protocol's own structure survives into (see KD-4) (OQ-2)
- **KD-14** For the whole block, every repetition. A block is an exercise and the guidance is true of the exercise, not of its first three seconds; showing it once and taking it away would put the setup on screen during the warm-up rep and remove it for the seven that follow (OQ-6)
- **KD-15** On the launched session before Start, not the list row. The row is one line among thirty-seven and the patient reviewer already had to scroll past a screenful to reach Start; entry guidance is what you read while deciding to begin, which is exactly the moment the session opens (OQ-7)
- **KD-16** Ignored, not refused, the same as any unrecognised field under KD-3. A guidance of the wrong shape costs the reader some prose; refusing it costs them the session, which is the trade KD-2 of the hostile-file spec already settled (OQ-8)
- **KD-17** Stated in the contract, never enforced. A cue that runs long is still readable, and the failure a length check would cause is a refused program, which KD-2 reserves for a session that cannot run (OQ-9)
- **KD-18** DOM nodes with textContent, no innerHTML for anything a program file supplies. The hostile-file KD-7 wanted one escape rule because two get out of step; building nodes needs none at all, which is the version of that rule that cannot be forgotten (OQ-10)
- **KD-19** Both. The contract snippet is what a model copies and VC-6 checks it, but the shipped example is what a person presses Try first, and an example with no guidance teaches that guidance is optional decoration (OQ-11)
- **KD-20** No. Guidance moves below the clock and the aggregate time, leaving label, cue, clock and time together at the top. KD-6 wanted nothing stacking above the clock and this was the case that still did: at fifty bullets the step clock sat at y=2629, three viewport-heights down, and VC-1 passed anyway because guidance between the cue and the clock only pushes the clock further from the cue. It also matches the practice recorded in the discovery, current exercise first, then the timer, then everything else (OQ-12)

## Prior Art
- **PA-1** Talon carries per-exercise title, subtitle, one-line cue, an inline SVG diagram and four titled blocks: equipment, starting position, execution, cautions
- **PA-2** The HSR protocol's cross-cutting rules have nowhere to go in Cadence: running suspended until week 3, no jumping HIIT until week 8, pain up to 5/10 acceptable during a set, and four red flags that mean see a doctor
- **PA-3** ~~On 2026-09-09 a step carrying a notes field was accepted by configure and never rendered; a program-level notes field was dropped from config entirely~~ → Half wrong, and the wrong half was mine: re-tested on a fresh element with an unused title, a program-level notes survives into config intact. The original probe reconfigured the same title twice, so the stored copy won in _adopt and only looked like a drop. Corrected by PA-4 and PA-5
- **PA-4** Verified 2026-09-09 on a fresh element: unknown fields survive configure verbatim at every level, program (notes), entry (notes) and step (cue), because _adopt assigns the handed object as-is. Nothing is dropped and nothing is refused
- **PA-5** The page's contract opens with anything not described here is rejected, which is false today and stays false under KD-3; a model that writes note for notes or cues for cue gets a clean load with its guidance invisible, and in a one-shot paste there is no second chance
- **PA-6** Checked and rejected from the VC-1 review: configure with viaLoad over a stored part-run program is not a silent no-op. It is the KD-11 replace warning being declined, because a Playwright page with no dialog handler auto-dismisses confirm. With a handler that accepts, the new program takes: FIRST, FIRST, SECOND across the three cases
- **PA-7** The first VC-1 regression test passed against the unfixed code because it called configure directly, which leaves the page's program element hidden, and every rect on a hidden element is zero by zero at the origin, which satisfies an is-it-in-the-viewport check for free. Loading through the file input and asserting checkVisibility and area is what made it fail

## Implementation Details
- [x] **IMPL-1** Carry a cue on a step and guidance blocks on a program, an entry and a block, all optional
- [x] **IMPL-2** Render a cue under the step label, kept in step with the label as steps change
- [x] **IMPL-3** Render guidance as DOM nodes with textContent, never innerHTML, at all three scopes
- [x] **IMPL-4** Show program guidance on the list view and take it down for the duration of a run
- [x] **IMPL-5** Show entry guidance when a session opens and take it down when the work starts
- [x] **IMPL-6** Rewrite the contract paragraph: drop the false rejection claim, add cue and guidance with their scopes
- [x] **IMPL-7** Give the contract snippet and the shipped eight-week example a cue and guidance at every scope
- [x] **IMPL-8** Order the runner label, cue, clock, time, then guidance, so nothing unbounded sits above the thing being watched

## Verification Criteria
- [x] **VC-1** At 390x844, while a step carrying a cue is running, the cue is visible without scrolling and its top edge is above the step clock's bottom edge, so it reads as belonging to the label rather than trailing the runner → failed 2026-09-09 (attested: Geometry always held (cue is a sibling above cadence-clock; cue.top < clock.bottom in every program tried), but visible-without-scrolling fails on the main page. _launch focuses .cds-start, which scrolls the ~4000px page to bring Start into view and carries the label and cue off the top; nothing scrolls back when the run begins. At 390x844 with one program and one entry guidance block, it breaks at five bullets of block guidance: scrollY 410, cue rect top -82.6 bottom -38.5. At six bullets, scrollY 459, cue top -131.6, label top -161.6, clock top 313.3, and the screenshot opens mid-bullet-list with neither label nor cue on screen. Passes at four bullets, on the contract example (scrollY 0) and on the bare fixture where the page cannot scroll at all), passed 2026-09-09 (attested: Re-verified after the fix by a second reviewer that did not see the first. scrollY settled at 243 and the cue at top 84.4 in every one of nineteen configurations, with checkVisibility true and a non-zero rendered area throughout: block guidance at 0, 4, 5, 6, 10, 20 and 50 bullets, long multi-sentence text blocks, all three scopes at 50 blocks each on a 6147px page, a 420-character cue, a 100-character label, 60 entries, back-and-restart, a cue first appearing on step 2 and on block 2, samples from 0 to 3000ms after start, a real click from the page bottom, the shipped example past its warm-up, and all of it again under prefers-reduced-motion. The old boundary at five bullets is gone: 4 and 5 are byte-identical in cue geometry)
- [x] **VC-2** In a program whose two exercises each carry block guidance, the second exercise's guidance is absent from the document while the first exercise's blocks run, and present once the second begins → passed 2026-09-09 (attested: The stronger reading holds: absent from the document, not merely hidden. renderGuidance clears with textContent and rebuilds from the current block, so the other block's marker strings are not in outerHTML. Across a two-exercise program: at open and through both reps of block 1, SQUAT_MARKER_ALPHA present and PRESS_MARKER_BETA absent; once block 2 ran, the reverse. Held under three attempts to break it: a middle block carrying no guidance, leaving via Back and launching a second entry, and a block with repetitions 2)
- [x] **VC-3** The contract section on the page contains no claim that unrecognised fields are rejected, and the page's own contract example carries a cue and a block guidance, both of which render when that example is configured → passed 2026-09-09 (attested: Scanned the contract text for reject, refus, ignor, unrecognis, unknown, discard, strip, error, invalid and fail: the only two matches are the sentence saying a field it does not recognise is kept and shown nowhere, and the pre-existing sentence about invalid values of recognised fields. Verified the claim is true and not merely absent by configuring a program carrying colour, nickname, tempo, notes and intensity, which was accepted with config.colour preserved and no problem shown. The page example parses to a step cue and a block guidance of two headings, and configuring it renders both above the fold at scrollY 0: cue rect top 327.4, guidance top 387.5 with headings Form and Watch for and both bullets)
- [x] **VC-4** A step carrying a cue shows it under the step label while that step runs, at 390x844 with no scrolling, and a step carrying none shows no cue element at all (G-1) `npx playwright test tests/guidance-cue.spec.js` → passed 2026-09-09 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/guidance-cue.spec.js:38:5 › the cue is on screen )
- [x] **VC-5** Program guidance renders on the program view before any session is started, and block guidance appears only once its own block begins, so the second exercise's card is absent while the first runs (G-2) `npx playwright test tests/guidance-scope.spec.js` → passed 2026-09-09 (ran: exit 0 — Running 4 tests using 1 worker ✓ 1 tests/guidance-scope.spec.js:30:5 › each scope shows wh)
- [x] **VC-6** The contract section names cue and guidance with their scopes, makes no claim that unrecognised fields are rejected, and the page's own contract example carries both and renders both when configured (G-3) `npx playwright test tests/guidance-contract.spec.js` → passed 2026-09-09 (ran: exit 0 — Running 4 tests using 1 worker ✓ 1 tests/guidance-contract.spec.js:9:5 › the contract name)
- [x] **VC-7** However much block guidance a program carries, the step clock and the aggregate time stay in the viewport at 390x844 while the step runs: fifty bullets across all three scopes must not push the clock below the fold (G-1) `npx playwright test tests/guidance-order.spec.js` → passed 2026-09-09 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/guidance-order.spec.js:65:7 › the clock stays on )

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
- 2026-09-09: NG-2 added
- 2026-09-09: KD-4, KD-5, KD-6, KD-7, KD-8, KD-9, KD-10, VC-1, VC-2, VC-3 applied from discovery:where-guidance-lives-and-what-shape-it-takes
- 2026-09-09: KD-7 struck
- 2026-09-09: KD-8 struck
- 2026-09-09: KD-11 added
- 2026-09-09: KD-12 added
- 2026-09-09: KD-13 resolves OQ-2
- 2026-09-09: VC-4 added
- 2026-09-09: VC-5 added
- 2026-09-09: VC-6 added
- 2026-09-09: Status: Draft → Ready
- 2026-09-09: OQ-6 raised by dry run
- 2026-09-09: OQ-7 raised by dry run
- 2026-09-09: OQ-8 raised by dry run
- 2026-09-09: OQ-9 raised by dry run
- 2026-09-09: OQ-10 raised by dry run
- 2026-09-09: OQ-11 raised by dry run
- 2026-09-09: KD-14 resolves OQ-6
- 2026-09-09: KD-15 resolves OQ-7
- 2026-09-09: KD-16 resolves OQ-8
- 2026-09-09: KD-17 resolves OQ-9
- 2026-09-09: KD-18 resolves OQ-10
- 2026-09-09: KD-19 resolves OQ-11
- 2026-09-09: dry run clean — Walked the change end to end: flattenSteps carries its block so guidance is reachable per step; cadence-sequence gains a cue element under the label and a guidance region fed from the current block; cadence-program renders program guidance on the list view and entry guidance on the launched session above Start; all program-supplied text is built as DOM nodes; the contract paragraph loses the false rejection claim and gains cue and guidance with their scopes; the shipped example and the contract snippet both gain both fields
- 2026-09-09: Status: Ready → In Progress
- 2026-09-09: VC-4 passed
- 2026-09-09: VC-5 passed
- 2026-09-09: VC-6 passed
- 2026-09-09: IMPL-1 added
- 2026-09-09: IMPL-2 added
- 2026-09-09: IMPL-3 added
- 2026-09-09: IMPL-4 added
- 2026-09-09: IMPL-5 added
- 2026-09-09: IMPL-6 added
- 2026-09-09: IMPL-7 added
- 2026-09-09: IMPL-1, IMPL-2, IMPL-3, IMPL-4, IMPL-5, IMPL-6, IMPL-7 checked
- 2026-09-09: VC-1 failed
- 2026-09-09: VC-2 passed
- 2026-09-09: VC-3 passed
- 2026-09-09: PA-6 added
- 2026-09-09: PA-7 added
- 2026-09-09: VC-1 passed
- 2026-09-09: OQ-12 added
- 2026-09-09: KD-20 resolves OQ-12
- 2026-09-09: VC-7 added
- 2026-09-09: VC-7 passed
- 2026-09-09: IMPL-8 added
- 2026-09-09: IMPL-8 checked
