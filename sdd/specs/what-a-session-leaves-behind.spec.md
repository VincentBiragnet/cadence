# Spec: What a session leaves behind

**Status:** Done
**Description:** What a session leaves behind

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** A session can ask for a few values when it ends, and keep them
- **G-2** The next session shows what was recorded last time, so a progression can actually be followed
- **G-3** Recorded values leave with the export, so a model asked to replan can see how it has been going

## Non-Goals
- **NG-1** Per-entry field declarations (OQ-1): a programme that asks different things on different days can wait until one exists
- **NG-2** Asking for values when a milestone is reached rather than performed, which would be the natural home for a race result
- **NG-3** Editing a recorded value after the session is finished (OQ-11): it needs a way back into a settled session that the program view does not have
- **NG-4** Native constraint validation blocking Save when a number falls outside its min and max, with the browser's own bubble as the only message. Left as it is: the completion is already stored before the form opens, so nothing is at risk, and a second message would duplicate the browser's

## Open Questions
- **OQ-1** ~~Who declares the fields: the program JSON, or a fixed set Cadence knows about?~~ → KD-1
- **OQ-2** ~~What field kinds are needed: a number with a unit, a 0-10 scale, free text?~~ → KD-2
- **OQ-3** ~~Can a session complete with the fields left blank?~~ → KD-3
- **OQ-4** ~~Where does the last recorded value show: on the list row, or when the session opens?~~ → KD-4
- **OQ-5** ~~Does the replanning prompt include this history, and does that make it too long to paste?~~ → KD-5
- **OQ-6** ~~Where does the form live, given the run view is torn down by _onComplete before anything could be shown, and _teardownRun is the single exit every path uses?~~ → KD-6
- **OQ-7** ~~Does recording block the schedule shift, since _onComplete both records actualDate and slides every later session, and the form appears after that has happened?~~ → KD-7
- **OQ-8** ~~What does last time mean when sessions can be done out of order: the previous entry in list order, or the most recently dated one?~~ → KD-8
- **OQ-9** ~~Is a recorded value validated against its field's kind, min and max on load, or accepted like any other program-supplied value?~~ → KD-9
- **OQ-10** ~~Does a value typed into a number field get stored as a number or as the string the input gives, given the export has to round-trip?~~ → KD-10
- **OQ-11** ~~Can a session be recorded again after the fact, or is the form a one-off at completion?~~ → KD-11

## Key Decisions
- **KD-1** The program declares them, at program scope. A fixed set cannot serve both charge A, charge B and charge C and a guitar programme's tempo and error count, and the whole shape of this project is that the file is the protocol and Cadence is the player. Per-entry declarations are deferred: HSR asks the same four things every session (OQ-1)
- **KD-2** Two kinds only: number, with an optional unit and optional min and max, and text. A nought-to-ten scale is a number with min 0 and max 10, so it needs no kind of its own. The guidance discovery's lesson was that every extra shape is another thing a one-shot model gets wrong (OQ-2)
- **KD-3** Yes, always. A session that cannot be finished because the notebook is upstairs is worse than a blank field, and completion is already recorded by reaching the end. Blank is a real answer and is stored as absent, not as zero (OQ-3)
- **KD-4** Both, because they answer at different moments. A summary of last time's values shows when the session opens, which is when it changes what you load onto the bar; the same value shows again beside its own field when recording, which is when it is the thing you are comparing against. Not on the list row: thirty-seven rows times four fields is noise, and the row already carries date, label and state (OQ-4)
- **KD-5** Yes. The values ride in the embedded JSON already, so the work is to name them in the human-readable standing list and to add them to the carry-through instruction, which is what stops a model dropping them on the way back. Four short values on a done session is a modest addition to a prompt that already embeds the whole programme (OQ-5)
- **KD-6** In the run view, in place of the sequence: _onComplete stops tearing down immediately and instead swaps the finished sequence for the form, so the reader stays where they already are. Teardown still happens on the one path, once the form is done with, so there is still a single exit (OQ-6)
- **KD-7** No. The session is complete the moment the sequence ends: actualDate, the shift and the store all happen exactly as they do now, and the form only adds to the entry afterwards. Recording must never be able to cost someone their completion, and OQ-3 already said the fields may be left blank (OQ-7)
- **KD-8** The most recently dated one, falling back to list order among entries sharing a date. Out-of-order is allowed by an existing decision, and what a person means by last time is the last session they actually did, not the row above (OQ-8)
- **KD-9** Accepted like any other program-supplied value, and shown as it is. This is the same trade as KD-16 of the guidance spec: a bad recorded value costs a wrong line on screen, refusing the file costs the session. What is validated is what the person types now, by the input itself (OQ-9)
- **KD-10** As a number when the field is a number and the text parses as one, and the raw string never. An export that round-trips through a model has to carry 42.5 and not the string 42.5, since the whole point is that a model can read the progression. A number field whose text does not parse stores nothing, which OQ-3 already allows (OQ-10)
- **KD-11** A one-off at completion for now. Editing after the fact needs a way back into a finished session, which the program view does not have, and inventing one here would be a second feature riding on this one (OQ-11)

## Prior Art
- **PA-1** HSR is progressive overload: raise the load 2.5 to 5 percent at the next session if you finished your sets without difficulty. Without last session's load written down the instruction cannot be followed
- **PA-2** Talon records load per exercise, pain during the session, pain the next morning and free notes, and surfaces the last load when a session starts
- **PA-3** The protocol ships a 36-row weekly tracking sheet whose columns are exactly those fields
- **PA-4** Cadence today keeps only whether a session was reached or dropped; the replanning export carries nothing a person measured
- **PA-5** Found by driving the real HSR program: a form that appears only at completion cannot ask the protocol's own douleur au lever le lendemain, because the lendemain has not happened. The example asks about this morning instead, which at the end of today's session is the morning after the previous one, the same signal at a moment a person can answer. This is the concrete cost of NG-3
- **PA-6** Reviewed by an agent that did not build it, driving the real page: all three criteria held, including a recorded zero displaying rather than being swallowed, out-of-order dates picking the most recently dated session, and a note containing an img onerror rendering as text in both the summary and the per-field hint
- **PA-7** Found by that review and fixed: re-running an already recorded session replaced the whole recorded object, so filling in one field destroyed the others while leaving the form blank preserved them. The form now prefills from the entry's own values, so what is on screen is what is stored in both directions, and clearing every field clears the record
- **PA-8** Found by that review and fixed: two declarations sharing a name rendered two inputs with one DOM id, pointing both labels at the first and letting the second silently overwrite it. The first declaration of a name now wins
- **PA-9** Found by that review and fixed: an unbroken sixty-character run in a recorded note pushed a 390px page to 515px of sideways scroll, because the last-time line and the per-field hint lacked the overflow-wrap the guidance blocks already had
- **PA-10** Reported by that review and not a defect: a non-milestone entry with no sequence is refused at load, which is the hostile-file spec's KD-2 working as decided. A milestone without a sequence loads and is reached rather than performed

## Implementation Details
- [x] **IMPL-1** Read a program-level record declaration into fields, ignoring malformed entries
- [x] **IMPL-2** Show the form in the run view when a session completes, after the completion is already stored
- [x] **IMPL-3** Store typed values on the entry, numbers as numbers and blanks not at all
- [x] **IMPL-4** Show last time's values when a session opens, and beside each field while recording
- [x] **IMPL-5** Carry recorded values into the replanning prompt's standing list and its carry-through instruction
- [x] **IMPL-6** Document record and recorded in the page contract, and give the contract example a declaration
- [x] **IMPL-7** Give the HSR example the tracking sheet the protocol already prints
- [x] **IMPL-8** Prefill the form from the entry's own values so re-recording cannot drop a field
- [x] **IMPL-9** Keep the first declaration when a name is repeated
- [x] **IMPL-10** Wrap long recorded values so a note cannot widen the page

## Verification Criteria
- [x] **VC-1** A program declaring a number field with a unit, a nought-to-ten field and a text field shows all three when a session completes, stores what is typed on that entry, and stores nothing for a field left blank (G-1) `npx playwright test tests/record-fields.spec.js` → passed 2026-09-09 (ran: exit 0 — Running 6 tests using 1 worker ✓ 1 tests/record-fields.spec.js:42:5 › all three declared f), passed 2026-09-09 (ran: exit 0 — Running 10 tests using 1 worker ✓ 1 tests/record-fields.spec.js:42:5 › all three declared )
- [x] **VC-2** After one session is recorded, opening the next shows last time's values, and each field carries its own last value beside it while recording; a program with nothing recorded yet shows neither (G-2) `npx playwright test tests/record-carryover.spec.js` → passed 2026-09-09 (ran: exit 0 — Running 5 tests using 1 worker ✓ 1 tests/record-carryover.spec.js:65:5 › with nothing reco), passed 2026-09-09 (ran: exit 0 — Running 5 tests using 1 worker ✓ 1 tests/record-carryover.spec.js:65:5 › with nothing reco)
- [x] **VC-3** Recorded values survive an export and a reload, and the replanning prompt names them on every done session as well as carrying them in its embedded JSON (G-3) `npx playwright test tests/record-export.spec.js` → passed 2026-09-09 (ran: exit 0 — Running 4 tests using 1 worker ✓ 1 tests/record-export.spec.js:45:5 › recorded values surv), passed 2026-09-09 (ran: exit 0 — Running 4 tests using 1 worker ✓ 1 tests/record-export.spec.js:45:5 › recorded values surv)

## Changelog
- 2026-09-09: Spec initialized.
- 2026-09-09: G-1 added
- 2026-09-09: G-2 added
- 2026-09-09: G-3 added
- 2026-09-09: PA-1 added
- 2026-09-09: PA-2 added
- 2026-09-09: PA-3 added
- 2026-09-09: PA-4 added
- 2026-09-09: OQ-1 added
- 2026-09-09: OQ-2 added
- 2026-09-09: OQ-3 added
- 2026-09-09: OQ-4 added
- 2026-09-09: OQ-5 added
- 2026-09-09: KD-1 resolves OQ-1
- 2026-09-09: KD-2 resolves OQ-2
- 2026-09-09: KD-3 resolves OQ-3
- 2026-09-09: KD-4 resolves OQ-4
- 2026-09-09: KD-5 resolves OQ-5
- 2026-09-09: NG-1 added
- 2026-09-09: NG-2 added
- 2026-09-09: VC-1 added
- 2026-09-09: VC-2 added
- 2026-09-09: VC-3 added
- 2026-09-09: OQ-6 raised by dry run
- 2026-09-09: OQ-7 raised by dry run
- 2026-09-09: OQ-8 raised by dry run
- 2026-09-09: OQ-9 raised by dry run
- 2026-09-09: OQ-10 raised by dry run
- 2026-09-09: OQ-11 raised by dry run
- 2026-09-09: KD-6 resolves OQ-6
- 2026-09-09: KD-7 resolves OQ-7
- 2026-09-09: KD-8 resolves OQ-8
- 2026-09-09: KD-9 resolves OQ-9
- 2026-09-09: KD-10 resolves OQ-10
- 2026-09-09: KD-11 resolves OQ-11
- 2026-09-09: NG-3 added
- 2026-09-09: dry run clean — Walked it end to end: the program declares record fields, an entry keeps a recorded object; _onComplete does everything it does today and then swaps the finished sequence for a form instead of tearing down at once, with teardown still on the single exit path; the form carries each field's last value from the most recently dated recorded entry; the session open view gains a last-time summary beside the entry guidance; number fields parse to numbers and blanks store nothing; the contract gains record and recorded, and the replanning prompt names recorded values on done sessions and tells the model to carry them through
- 2026-09-09: Status: Draft → In Progress
- 2026-09-09: PA-5 added
- 2026-09-09: VC-1 passed
- 2026-09-09: VC-2 passed
- 2026-09-09: VC-3 passed
- 2026-09-09: IMPL-1 added
- 2026-09-09: IMPL-2 added
- 2026-09-09: IMPL-3 added
- 2026-09-09: IMPL-4 added
- 2026-09-09: IMPL-5 added
- 2026-09-09: IMPL-6 added
- 2026-09-09: IMPL-7 added
- 2026-09-09: IMPL-1, IMPL-2, IMPL-3, IMPL-4, IMPL-5, IMPL-6, IMPL-7 checked
- 2026-09-09: PA-6 added
- 2026-09-09: PA-7 added
- 2026-09-09: PA-8 added
- 2026-09-09: PA-9 added
- 2026-09-09: PA-10 added
- 2026-09-09: NG-4 added
- 2026-09-09: IMPL-8 added
- 2026-09-09: IMPL-9 added
- 2026-09-09: IMPL-10 added
- 2026-09-09: IMPL-8, IMPL-9, IMPL-10 checked
- 2026-09-09: VC-1 passed
- 2026-09-09: VC-2 passed
- 2026-09-09: VC-3 passed
- 2026-09-09: Status: In Progress → Done
