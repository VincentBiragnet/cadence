# Discovery: Where guidance lives and what shape it takes

**Discovery for:** guidance-a-program-can-carry (OQ-1)
**Question:** Where does step guidance appear: always visible beside the clock, or behind a press?

_Edit via `scripts/spec.py`, never by hand._

## Open Questions
- **OQ-1** ~~Does guidance need a home at exercise scope, between the entry and the step, given that an exercise is a run of blocks with no object of its own?~~ → Answered by PD-2: a block is a guidance scope, which is the object an exercise is
- **OQ-2** ~~Where do program-scoped lists live when the program field is a paragraph: crammed in, repeated per entry, or given a list field of their own?~~ → Answered by PD-3: program guidance is the same headed-block list, so a list needs no separate home
- **OQ-3** ~~Is a cue allowed to repeat something the guidance already says, and is that required for a safety instruction?~~ → Answered by PD-5: a cue may repeat a constraint the guidance states, and should when breaking it makes the repetition wrong

## State of the Art
- **SOTA-1** Observed on the prototype at 390x844 before handing it to reviewers: under treatment C the standing rules plus both exercise cards fill the whole screen, and the running clock is entirely below the fold. A phone user starting a session sees guidance and no timer
- **SOTA-2** Observed: all three treatments render with no page errors and the one-line cue updates in step with the label, so any reviewer complaint is about the design rather than a broken prototype
- **SOTA-3** The prototype is tests/proto-guidance.html driven at a phone viewport; its content is a translation of the real HSR protocol so reviewers judge real wording, not lorem ipsum
- **SOTA-4** Fitness UI practice puts the current exercise first, then the timer, then what is next, and pushes secondary data below the fold or into its own tab; reported user interpretation time for a health metric on a small screen is under three seconds (https://stormotion.io/blog/fitness-app-ux/)
- **SOTA-5** A JAMIA scoping review of consumer health apps found that where clinical information suggests danger the appropriate response must be clear and explicit, and that only 28 of 121 apps handling high-risk data responded appropriately; burying a red flag is a documented failure mode, not a hypothetical one (https://academic.oup.com/jamia/article/27/2/330/5585394)
- **SOTA-6** A model writing against all three candidates reported the same overriding finding, since verified independently: unknown keys survive configure verbatim, so a misspelled guidance field loads clean and shows nothing. It called that the worst possible failure for a contract whose only reader gets no feedback
- **SOTA-7** Observed by the model author: candidate B was easiest to comply with (one field name, three legal locations, no wondering whether content had a home) and produced the worst document, 41 KB of heading-smuggled-into-item strings, because guidance has no exercise-level home and an exercise is a run of blocks with no object of its own
- **SOTA-8** Observed by the model author: candidate C produced the best document and demanded the most guessing, so the split between easiest to obey and best result falls between B and C; its conclusion was that C is the right shape and the worst wording, and that no wording fixes B because B is missing a location rather than a sentence
- **SOTA-9** Observed by the model author: candidate A could not carry the protocol. Its one paragraph turned four red flags into a semicolon run-on, and it silently lost the soleus range-of-motion note whose only job is to stop a user adding range they must not add
- **SOTA-10** Observed by the model author: C leaves program-scoped lists homeless, since notes is a paragraph and guidance is entry-only, so two models legitimately produce either a 1481-character crammed paragraph or the red-flag list repeated on all 36 entries
- **SOTA-11** Observed by the model author: the heel-stop rule is both something to have read first and something needed while moving, so every candidate forced it to be duplicated or dropped, and none of them says which
- **SOTA-12** Checked and rejected: the physio reviewer called the absence of any stop control a refusal on its own. In the real app a visible Back button sits beside the running clock throughout and abandons the session. The reviewer had only my prototype, which mounts cadence-sequence bare with no program around it. What survives is narrower: the control is called Back, it discards rather than pauses, and pause is already the subject of its own spec
- **SOTA-13** Three prototype flaws the physio reviewer found, all mine and none of them findings about the design: the standing rules rendered under treatment B as well, so B on screen was safer than B on paper; the cue rendered after the whole runner rather than under the step label as both contracts promise; and treatment B picked its card by matching the step label, so during any rest it confidently opened the wrong exercise
- **SOTA-14** Observed by the physio: the red flags render as see a doctor if with no instruction to stop, three lines below do not stop for moderate pain, so a frightened patient meets a strong instruction to keep loading and a weak one to seek advice. The ordering is worse than either sentence alone
- **SOTA-15** Observed by the physio: a threshold whose action is missing is not a safety rule but trivia. Pain up to 5/10 survives everywhere while reduce the load ten percent after a flare is nowhere, and a patient with a number and no instruction most likely stops, which is the one error the protocol forbids
- **SOTA-16** The physio and the model author reached the same structural conclusion from opposite ends and without contact: guidance must attach at exercise scope rather than entry only. The physio saw both exercise cards stacked into 1700px above the Start button with the seated card still on screen during the single-leg work; the model author saw an exercise had no object to hang guidance on and produced heading-in-item soup instead
- **SOTA-17** Observed by the physio: authoring in good faith under treatment A, the single-leg cue came out as balance advice and the heel-stop rule that makes this an insertional protocol was absent from the heaviest reps of the session. I wrote that cue myself, which is the evidence: the shape let the load-bearing rule go missing without anyone noticing
- **SOTA-18** Proposed by the physio: a read-back. A model emitting a program should also emit a plain-language restatement, sets and rests and tempo and rules and flags, each traced to the sentence it came from, because no clinician will inspect JSON and there is otherwise no artefact to sign
- **SOTA-19** Proposed by the physio: a small number of statements the app cannot run a session without having shown at least once, before the first working set, because on session forty nobody scrolls and every treatment here relies on scrolling or pressing
- **SOTA-20** Reproduced in the real app at 390x844, not the prototype: mid-rep the session chrono is 40px and 6066 square pixels while the step chrono that governs the three-second phase is 17.6px and 1725, so the largest thing on screen is the number the patient does not need and the tempo clock is a third its size
- **SOTA-21** Reproduced in the real app: the position line reads step 1 of 4 rep 1 of 6, where step is the tempo phase and rep is the repetition, and nothing anywhere says set 2 of 4. The patient reviewer said they would lose count across four sets three minutes apart and the app would not save them
- **SOTA-22** Observed by the patient: treatment B told them nothing at any sample from three seconds to three minutes, the notes button sits above the runner where a person under a bar cannot reach it, and opening it did not stop the clock, so reading the card ate the set
- **SOTA-23** Observed by the patient: choosing C made the page 1914px tall with Start at y=1833, one and a quarter screens of scrolling before a session can begin, and once running the cards sit two screens above the viewport where they cannot be reached
- **SOTA-24** Observed by the patient: C is the only treatment where the pain rule is off screen mid-set, because it sits above two full exercise cards. A and B keep it on screen only by the accident of my prototype rendering the standing block for every treatment
- **SOTA-25** Observed by the patient: a static per-exercise cue answers the question they asked two minutes ago. Mid-set the three live questions are which way am I moving, how many are left, and is this pain the allowed kind, and no treatment answers any of them
- **SOTA-26** The patient's verdict was that all three are bad in the same way and it is not the way the treatments disagree: they argue about how much prose to show and when, while the real defect is that phase, repetition, set and the pain rule rank second, third, missing and fifth on the screen

## Proposed Decisions
- **PD-1** None of A, B or C as written. Guidance takes two forms: a cue of one sentence always visible under the step label for as long as that step runs, which is A's mechanism and the only one that reached a person with their hands full, and guidance as a list of headed blocks, which is B's container and the only one a protocol's own headings survive into
- **PD-2** Guidance attaches at the narrowest scope it is true of, and a block is one of those scopes, because a block is what an exercise actually is. The physio and the model author reached this independently from opposite ends, one seeing both cards stacked above Start, the other having nowhere to hang an exercise
- **PD-3** Guidance attached to a scope is shown when that scope begins, never all of it before Start, since stacking the cards put the Start button 1833 pixels down and left the seated card on screen during the single-leg work
- **PD-4** ~~Program guidance is the same list of headed blocks rather than a paragraph, because short paragraph is what turned four red flags into a semicolon run-on and dropped the rules that had no room~~ → Out of scope by decision: red flags ride along as ordinary guidance blocks for now, and a distinct field with an enforced action verb is deferred to its own spec so it gets decided on its own evidence rather than as a rider
- **PD-5** Red flags are their own field, not the last bullets of the standing block, and their text must carry the action: stop and call, not see a doctor if. A threshold whose action is missing is not a safety rule, and see a doctor if printed above a running metronome is not an instruction
- **PD-6** ~~A cue may and should repeat a constraint the guidance already states. The rule is that a cue names the one thing that makes the repetition wrong if broken, even when the card says it too. Repetition is the feature: it is the clause forbidding it that let the heel-stop rule vanish from the heaviest reps of the session~~ → Split by decision: reporting unrecognised field names is deferred to its own spec. Only the false sentence on the page is kept, as PD-8, because this spec rewrites that very paragraph and leaving it contradicting the parent's KD-3 would ship a known falsehood
- **PD-7** Unrecognised fields stay accepted per the parent's KD-3, but the page stops claiming that anything not described is rejected, and a load names the field names it did not recognise in the message channel the hostile-file spec already built. Silent acceptance is what makes a one-shot paste unverifiable
- **PD-8** Red flags are carried as ordinary guidance blocks at program scope, with no separate field and no check on their wording. The physio's objection is recorded and deferred rather than answered
- **PD-9** The contract paragraph stops claiming that anything not described is rejected, since it is false today and the parent's KD-3 keeps it false on purpose. Saying nothing about unrecognised fields is honest; saying they are rejected is not

## Proposed Criteria
- **PC-1** At 390x844, while a step carrying a cue is running, the cue is visible without scrolling and its top edge is above the step clock's bottom edge, so it reads as belonging to the label rather than trailing the runner
- **PC-2** In a program whose two exercises each carry block guidance, the second exercise's guidance is absent from the document while the first exercise's blocks run, and present once the second begins
- **PC-3** ~~A program carrying red flags renders them reachable during a running session, and a load is refused with a message naming the field when a red flag's text contains no instruction to stop~~ → Covers the struck PD-4
- **PC-4** ~~Loading a program whose guidance field is misspelled reports the unrecognised name in the same place a broken file is reported, and the program still loads and runs~~ → Covers the reporting half of the struck PD-6
- **PC-5** ~~The contract section on the page contains no claim that unrecognised fields are rejected, and the page's own contract example carries a cue, a block guidance and a red flag, all of which render when that example is configured~~ → Named a red flag in the page's example, which the struck PD-4 removed from this spec. Replaced by PC-6
- **PC-6** The contract section on the page contains no claim that unrecognised fields are rejected, and the page's own contract example carries a cue and a block guidance, both of which render when that example is configured

## Changelog
- 2026-09-09: Opened for OQ-1 of guidance-a-program-can-carry.
- 2026-09-09: SOTA-1 added
- 2026-09-09: SOTA-2 added
- 2026-09-09: SOTA-3 added
- 2026-09-09: SOTA-4 added
- 2026-09-09: SOTA-5 added
- 2026-09-09: SOTA-6 added
- 2026-09-09: SOTA-7 added
- 2026-09-09: SOTA-8 added
- 2026-09-09: SOTA-9 added
- 2026-09-09: SOTA-10 added
- 2026-09-09: SOTA-11 added
- 2026-09-09: OQ-1 added
- 2026-09-09: OQ-2 added
- 2026-09-09: OQ-3 added
- 2026-09-09: SOTA-12 added
- 2026-09-09: SOTA-13 added
- 2026-09-09: SOTA-14 added
- 2026-09-09: SOTA-15 added
- 2026-09-09: SOTA-16 added
- 2026-09-09: SOTA-17 added
- 2026-09-09: SOTA-18 added
- 2026-09-09: SOTA-19 added
- 2026-09-09: SOTA-20 added
- 2026-09-09: SOTA-21 added
- 2026-09-09: SOTA-22 added
- 2026-09-09: SOTA-23 added
- 2026-09-09: SOTA-24 added
- 2026-09-09: SOTA-25 added
- 2026-09-09: SOTA-26 added
- 2026-09-09: PD-1 added
- 2026-09-09: PD-2 added
- 2026-09-09: PD-3 added
- 2026-09-09: PD-4 added
- 2026-09-09: PD-5 added
- 2026-09-09: PD-6 added
- 2026-09-09: PD-7 added
- 2026-09-09: PC-1 added
- 2026-09-09: PC-2 added
- 2026-09-09: PC-3 added
- 2026-09-09: PC-4 added
- 2026-09-09: PC-5 added
- 2026-09-09: PD-4 struck
- 2026-09-09: PD-6 struck
- 2026-09-09: PC-3 struck
- 2026-09-09: PC-4 struck
- 2026-09-09: PD-8 added
- 2026-09-09: PD-9 added
- 2026-09-09: PC-6 added
- 2026-09-09: PC-5 struck
- 2026-09-09: OQ-1 struck
- 2026-09-09: OQ-2 struck
- 2026-09-09: OQ-3 struck
