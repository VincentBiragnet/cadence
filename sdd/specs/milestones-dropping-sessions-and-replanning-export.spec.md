# Spec: Milestones, dropping sessions, and replanning export

**Status:** Done
**Description:** Milestones, dropping sessions, and replanning export

_Edit via `scripts/spec.py`, never by hand._

## Goals
- **G-1** A milestone entry is pinned to a real date and never moves, whatever the sessions around it do
- **G-2** A dated milestone anchors the program backwards from itself, so every session carries a real date before anything has been run
- **G-3** Drift is surfaced as the distance between the last training session and the milestone ahead of it, instead of being absorbed by moving the milestone
- **G-4** A session can be dropped, behind a confirmation, so a stale one stops being offered and stops distorting the schedule
- **G-5** The app exports a replanning prompt in one file: the schema contract, the current state, the computed overrun, and the ask, for the user to paste into an LLM
- **G-6** A revised program is applied rather than silently discarded, so the JSON the LLM produces can be loaded back over the one in progress

## Non-Goals
- **NG-1** The app calling an LLM itself: the loop is export, paste elsewhere, load back, and stays offline and keyless
- **NG-2** Cross-device sync, unchanged from the previous spec: state stays in one browser's localStorage

## Open Questions
- **OQ-1** ~~Is a milestone itself runnable, carrying a sequence you play like any session, or is it a marker with no sequence that can only be reached and recorded~~ → KD-8
- **OQ-2** ~~What happens when the sessions overrun the milestone: is the shift refused at that boundary, allowed with the overrun shown, or do the remaining sessions compress to fit~~ → KD-1
- **OQ-3** ~~May a program carry more than one milestone, as a phased rehab protocol would want, and does each one pin only the segment before it~~ → KD-2
- **OQ-4** ~~Is an undated milestone legal, pinned to whatever date the anchor computes for it, or does calling something a milestone require a date~~ → KD-9
- **OQ-5** ~~When a milestone's date anchors the program backwards and the resulting start lands in the past, is the program started mid-way with the earlier sessions already overdue, or refused~~ → KD-10
- **OQ-6** ~~What does dropping a session do to the schedule: does the gap close so later sessions move earlier, or does everything after it stay exactly where it was~~ → KD-3
- **OQ-7** ~~Is a dropped session distinguishable from a never-run one in the record and the export, and can a drop be undone~~ → KD-4
- **OQ-8** ~~What identifies the same program across a revision, now that matching on title has proved too coarse, and what becomes of the completion history when the revised program's entries differ~~ → KD-5
- **OQ-9** ~~Does the replanning export carry the full sequence content of every remaining session, which is large, or only their positions and titles, which is cheaper but gives the LLM less to preserve~~ → KD-6
- **OQ-10** ~~In what form does the replanning prompt leave the app, given a phone browser's constraints on downloads: a file download like the existing export, or the clipboard~~ → KD-7
- **OQ-11** ~~Multiple dated milestones each also carry a week and day, so the days between two milestone dates can disagree with the days between their authored positions: which wins, and is a program whose milestone dates contradict its week and day layout rejected or silently stretched~~ → KD-11
- **OQ-12** ~~The previous spec gates a backward shift on every preceding entry having been run, and a dropped session has no actual date, so one drop would block every later pull-forward for good: does a dropped session count as settled for that gate~~ → KD-12
- **OQ-13** ~~A milestone that carries no sequence has no title for the list to show, since the label is built from the sequence title: where does a marker milestone's name come from~~ → KD-13
- **OQ-14** ~~The previous spec anchors on first launch and treats a program already carrying dates as anchored, but a dated milestone anchors at configure time instead: does a program with a milestone ever anchor on launch, and what happens to a program that has both a milestone and stored dates from an earlier anchor~~ → KD-14
- **OQ-15** ~~A milestone can be run like a session, so does completing one late shift the sessions after it the way any late completion does, or does a milestone neither move nor move anything else~~ → KD-15
- **OQ-16** ~~The replanning export is a prompt file rather than loadable JSON, so does it replace the existing JSON export, sit beside it as a second control, and does the plain export survive at all~~ → KD-16
- **OQ-17** ~~KD-11 has the sessions between two milestones stretch or compress to the span their dates fix, but the previous spec makes a session's day a fixed weekday and KD-1 forbids compressing anything: what does stretching actually do to those weekdays, and can compressing put two sessions on one day or push one before the milestone behind it~~ → KD-17
- **OQ-18** ~~A dropped session keeps a date but will never be run, so does it count when working out how far the sessions have overrun the milestone ahead of them~~ → KD-19
- **OQ-19** ~~With several milestones only one of them can set the anchor, so which does: the earliest, which fixes where the program starts and lets later milestones be overrun, or the last, which guarantees the race lands right but can put the start in the past~~ → KD-20
- **OQ-20** ~~KD-14 has a milestone program anchor every time it is configured, but recomputing the layout on each page load would wipe the drift that late completions have accumulated and leave the overrun of G-3 permanently reading zero: does anchoring at configure time apply only to a program not yet anchored~~ → KD-21
- **OQ-21** ~~KD-8 allows a milestone with no sequence, but Start mounts a clock for whatever is selected and throws on one that has nothing to play, so how is a marker milestone recorded as reached~~ → KD-22
- **OQ-22** ~~Drop is irreversible and sits immediately after Start in the control row and so in the tab order, next to the one control pressed every day: where should an irreversible control sit~~ → KD-23
- **OQ-23** ~~KD-14 anchors a milestone program when it is configured, so anchorDate exists before anything is run, and the part-run warning treats an anchor as work and claims things are recorded as done when nothing is: what actually counts as work worth warning about~~ → KD-24
- **OQ-24** ~~A milestone can be dropped, since a race really can be cancelled, but it drops with the same wording and the same single confirmation as a routine session: what should dropping a milestone say and do differently~~ → KD-25

## Key Decisions
- **KD-1** The shift is allowed to carry sessions past a milestone and the overrun is shown, never compressed away: the overrun is the signal that replanning is needed, and hiding it would restore the dishonesty the milestone exists to remove (OQ-2)
- **KD-2** A program may carry any number of milestones, each pinned to its own date, with the sessions between two of them drifting freely inside that span (OQ-3)
- **KD-3** Dropping moves nothing: every later session keeps its date, and the dropped session stays in the program marked as dropped rather than being removed (OQ-6)
- **KD-4** A dropped session is recorded as dropped and reads as such wherever it appears, distinct from one merely never run; there is no undo, because the confirmation before the drop is the gate (OQ-7)
- **KD-5** There is no identity matching across a revision: the export carries the whole record including what was already done, and loading one replaces the entire stored state, history included, behind a warning that says so (OQ-8)
- **KD-6** The replanning export carries the full sequence content of every session, done and remaining, since an LLM cannot preserve training intent it was never shown (OQ-9)
- **KD-7** The replanning prompt leaves as a file download, the same path the existing export already uses, rather than the clipboard (OQ-10)
- **KD-8** A milestone may carry a sequence and is then run like any session, or carry none and be a marker that is only reached and recorded, since a race is genuinely performed while a clinical review is not (OQ-1)
- **KD-9** A milestone requires a date: without one there is nothing to pin and it is simply a session (OQ-4)
- **KD-10** A backwards anchor that lands in the past starts the program mid-way with the earlier sessions already overdue, which is how the previous spec already treats an entry whose day has passed rather than a reason to refuse (OQ-5)
- **KD-11** ~~Milestone dates win: the days between two milestones are fixed by their dates and the sessions authored between them stretch or compress across that span, since a date is an external fact and a week and day is only a position (OQ-11)~~ → superseded by KD-18
- **KD-12** A dropped session counts as settled for the backward-shift gate of the previous spec, alongside a completed one: it has been resolved, just not by doing it, and treating it otherwise would disable every later pull-forward for good (OQ-12)
- **KD-13** A milestone carries its own title on the entry, which the list shows, and falls back to the sequence title when it has a sequence to run (OQ-13)
- **KD-14** A program holding a dated milestone always anchors from that milestone when it is configured, and stored dates never override it, so launching only ever anchors a program that has no milestone at all (OQ-14)
- **KD-15** A milestone neither moves nor moves anything else: completing one records the date it happened and shifts nothing, which is what being pinned means (OQ-15)
- **KD-16** Both exports survive as separate controls: the plain JSON export stays the backup and the only thing Load can read, and the replanning prompt is a second, differently shaped file (OQ-16)
- **KD-17** Nothing is rescaled: the sessions after a milestone keep the authored spacing and weekdays they would have had anyway, spare days before the next milestone are simply slack, and a span too short to hold them is reported as overrun rather than squeezed (KD-1) (OQ-17)
- **KD-18** Milestone dates win over authored positions, and the sessions between two milestones keep their authored spacing rather than being stretched or compressed to fit the span (OQ-17) (supersedes KD-11)
- **KD-19** A dropped session is left out of the overrun, which is measured from the last session still to be run before the milestone, since a dropped one will never take a day (OQ-18)
- **KD-20** The earliest dated milestone sets the anchor, and every later one is checked against the layout with any shortfall reported as overrun, which is the signal KD-1 exists to give rather than something to design away (OQ-19)
- **KD-21** Anchoring at configure time applies only to a program no entry of which carries a date yet, exactly as launching does: once anchored, the stored dates carry the accumulated drift and are never recomputed, which is what KD-14 meant by never being overridden (OQ-20)
- **KD-22** Start records a marker milestone as reached there and then, dating it today and announcing it without mounting a clock, since a marker is reached rather than performed (KD-8, KD-15) (OQ-21)
- **KD-23** Drop sits last in the control row, furthest from Start, so the irreversible control is never the neighbour of the daily one; the confirmation stays the gate but is no longer the only thing between a slipped press and lost work (KD-4) (OQ-22)
- **KD-24** Work worth warning about is a session completed or dropped, or a schedule that cannot be recomputed, which means an anchor on a program with no milestone; a milestone program that has only been anchored risks nothing, since its dates come back from the milestone, and the warning names what is really at stake rather than always claiming recorded work (OQ-23)
- **KD-25** Dropping a milestone stays possible and stays one confirmation, but the confirmation names it as a fixed date being cancelled rather than a session being skipped, and a dropped milestone stops being something the sessions can overrun, since a cancelled date is no longer a deadline (KD-19) (OQ-24)

## Prior Art
- **PA-1** Field-tested by three simulated users on real programs: a 16-week marathon plan with a fixed race date, a 12-week twice-daily ACL rehab protocol, and a 10-week guitar plan used on a phone across timezones
- **PA-2** Completing one stale session 18 days late moved a fixed race date from 2026-09-27 to 2026-10-15, which is the observation that motivates the milestone
- **PA-3** A revised program under the same title was silently discarded in favour of the stored copy, which blocks the replanning loop entirely

## Implementation Details
- [x] **IMPL-1** Add the milestone entry shape: a milestone flag with a required date, and reject a date on an entry that is not a milestone (KD-9)
- [x] **IMPL-2** Anchor the program backwards from the earliest dated milestone so every session carries a date before anything is run (KD-9, KD-10)
- [x] **IMPL-3** Exclude milestones from every shift in both directions, so a completion never moves one (KD-1, KD-2)
- [x] **IMPL-4** Compute the overrun against the next milestone ahead and show it, without compressing anything to fit (KD-1)
- [x] **IMPL-5** Add a Drop control behind a confirmation that marks the session dropped and moves no dates (KD-3, KD-4)
- [x] **IMPL-6** Render a dropped session as dropped and never suggest it as the next one (KD-4)
- [x] **IMPL-7** Build the replanning export: the schema contract, the current state with full sequences, the computed overrun and the ask, downloaded as one file (KD-6, KD-7)
- [x] **IMPL-8** Make an explicit Load replace the whole stored state after a warning, while a page-load configure still restores what was stored (KD-5)
- [x] **IMPL-9** Record a marker milestone on Start instead of mounting a sequence, and refuse a session that has no sequence to play (KD-22)
- [x] **IMPL-10** Move Drop to the end of the control row so it neither neighbours Start nor follows it in the tab order (KD-23)
- [x] **IMPL-11** Count only completed or dropped sessions, or an anchor on a milestone-free program, as work at risk, and word the replacement warning after what is actually there (KD-24)
- [x] **IMPL-12** Word the drop confirmation for a milestone as cancelling a fixed date, and leave a dropped milestone out of the overrun (KD-25)

## Verification Criteria
- [x] **VC-1** A session before a dated milestone completed eighteen days late moves every unrun session after it while the milestone keeps its date exactly (G-1, KD-1) `npx playwright test tests/milestone-pinned.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/milestone-pinned.spec.js:20:5 › a session finishe)
- [x] **VC-2** A program whose only milestone is dated 2026-09-27 at week 16 day 7 gives every session a date before anything is run, with week 1 day 1 on the Monday fifteen weeks and six days earlier (G-2, KD-9) `npx playwright test tests/milestone-anchor.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/milestone-anchor.spec.js:23:5 › the race date lay)
- [x] **VC-3** When late completions carry sessions past the milestone the overrun is reported in days and no session's interval is compressed to fit (G-3, KD-1) `npx playwright test tests/milestone-overrun.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/milestone-overrun.spec.js:18:5 › sliding past the)
- [x] **VC-4** A program with three dated milestones keeps all three dates through completions late and early, while the sessions between them move (G-1, KD-2) `npx playwright test tests/milestone-multiple.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 1 test using 1 worker ✓ 1 tests/milestone-multiple.spec.js:25:5 › three milestones)
- [x] **VC-5** Dropping a session and confirming marks it dropped, leaves every other date untouched, and stops it being suggested; declining the confirmation leaves the program exactly as it was (G-4, KD-3, KD-4) `npx playwright test tests/drop-session.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/drop-session.spec.js:29:5 › confirming a drop mar)
- [x] **VC-6** The replanning export is one downloaded file carrying the schema contract, today's date, every session with its planned and actual dates and its full sequence, the milestones with their dates, the computed overrun, and the instruction to answer with JSON only (G-5, KD-6, KD-7) `npx playwright test tests/replanning-export.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/replanning-export.spec.js:19:5 › the replanning p)
- [x] **VC-7** Loading a revised program over one part-run replaces the whole stored state including completion history once the warning is accepted, while reloading the page with no load still restores what was stored (G-6, KD-5) `npx playwright test tests/revision-load.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/revision-load.spec.js:49:5 › loading a revision o)
- [x] **VC-8** Starting a milestone that carries no sequence records it as reached today, announces it, raises no page error and mounts no clock, while an ordinary session with no sequence is refused at configure time (KD-22, KD-8) `npx playwright test tests/milestone-marker.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 3 tests using 1 worker ✓ 1 tests/milestone-marker.spec.js:17:5 › starting a marker)
- [x] **VC-9** Drop is the last control in the list row and Start is not adjacent to it in DOM order (KD-23) `npx playwright test tests/drop-session.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 4 tests using 1 worker ✓ 1 tests/drop-session.spec.js:29:5 › confirming a drop mar)
- [x] **VC-10** A freshly configured milestone program that has never been run is replaced without a warning, while one holding a completed or dropped session warns and names what is recorded (KD-24) `npx playwright test tests/schedule-replace-warning.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 5 tests using 1 worker ✓ 1 tests/schedule-replace-warning.spec.js:23:5 › declining)
- [x] **VC-11** Dropping a milestone is confirmed in wording that names it as a fixed date being cancelled, and once dropped the sessions after it are no longer reported as overrunning it (KD-25) `npx playwright test tests/milestone-drop.spec.js` → passed 2026-08-31 (ran: exit 0 — Running 2 tests using 1 worker ✓ 1 tests/milestone-drop.spec.js:18:5 › the confirmation na)

## Changelog
- 2026-08-27: Spec initialized.
- 2026-08-27: G-1 added
- 2026-08-27: G-2 added
- 2026-08-27: G-3 added
- 2026-08-27: G-4 added
- 2026-08-27: G-5 added
- 2026-08-27: G-6 added
- 2026-08-27: NG-1 added
- 2026-08-27: NG-2 added
- 2026-08-27: PA-1 added
- 2026-08-27: PA-2 added
- 2026-08-27: PA-3 added
- 2026-08-27: OQ-1 added
- 2026-08-27: OQ-2 added
- 2026-08-27: OQ-3 added
- 2026-08-27: OQ-4 added
- 2026-08-27: OQ-5 added
- 2026-08-27: OQ-6 added
- 2026-08-27: OQ-7 added
- 2026-08-27: OQ-8 added
- 2026-08-27: OQ-9 added
- 2026-08-27: OQ-10 added
- 2026-08-27: KD-1 resolves OQ-2
- 2026-08-27: KD-2 resolves OQ-3
- 2026-08-27: KD-3 resolves OQ-6
- 2026-08-27: KD-4 resolves OQ-7
- 2026-08-27: KD-5 resolves OQ-8
- 2026-08-27: KD-6 resolves OQ-9
- 2026-08-27: KD-7 resolves OQ-10
- 2026-08-27: KD-8 resolves OQ-1
- 2026-08-27: KD-9 resolves OQ-4
- 2026-08-27: KD-10 resolves OQ-5
- 2026-08-27: VC-1 added
- 2026-08-27: VC-2 added
- 2026-08-27: VC-3 added
- 2026-08-27: VC-4 added
- 2026-08-27: VC-5 added
- 2026-08-27: VC-6 added
- 2026-08-27: VC-7 added
- 2026-08-27: IMPL-1 added
- 2026-08-27: IMPL-2 added
- 2026-08-27: IMPL-3 added
- 2026-08-27: IMPL-4 added
- 2026-08-27: IMPL-5 added
- 2026-08-27: IMPL-6 added
- 2026-08-27: IMPL-7 added
- 2026-08-27: IMPL-8 added
- 2026-08-27: Status: Draft → Ready
- 2026-08-27: OQ-11 raised by dry run
- 2026-08-27: OQ-12 raised by dry run
- 2026-08-27: OQ-13 raised by dry run
- 2026-08-27: OQ-14 raised by dry run
- 2026-08-27: OQ-15 raised by dry run
- 2026-08-27: OQ-16 raised by dry run
- 2026-08-31: KD-11 resolves OQ-11
- 2026-08-31: KD-12 resolves OQ-12
- 2026-08-31: KD-13 resolves OQ-13
- 2026-08-31: KD-14 resolves OQ-14
- 2026-08-31: KD-15 resolves OQ-15
- 2026-08-31: KD-16 resolves OQ-16
- 2026-08-31: OQ-17 raised by dry run
- 2026-08-31: OQ-18 raised by dry run
- 2026-08-31: KD-17 resolves OQ-17
- 2026-08-31: KD-18 supersedes KD-11
- 2026-08-31: KD-19 resolves OQ-18
- 2026-08-31: OQ-19 raised by dry run
- 2026-08-31: KD-20 resolves OQ-19
- 2026-08-31: dry run clean — Walked IMPL-1 to IMPL-8 through js/cadence-program.js: the milestone shape and its required date, anchoring backwards from the earliest milestone at configure time, excluding milestones from both directions of the shift, the overrun against the next milestone, the Drop control and its confirmation, dropped sessions in the list and in the suggestion, the replanning prompt beside the existing export, and Load replacing stored state while a page-load configure restores it; checked every implementation item's citations against KD-1 to KD-20 including the superseded KD-11 and found none stale
- 2026-08-31: Status: Ready → In Progress
- 2026-08-31: OQ-20 added
- 2026-08-31: KD-21 resolves OQ-20
- 2026-08-31: IMPL-1, IMPL-2, IMPL-3, IMPL-4, IMPL-5, IMPL-6, IMPL-7, IMPL-8 checked
- 2026-08-31: VC-1 passed
- 2026-08-31: VC-2 passed
- 2026-08-31: VC-3 passed
- 2026-08-31: VC-4 passed
- 2026-08-31: VC-5 passed
- 2026-08-31: VC-6 passed
- 2026-08-31: VC-7 passed
- 2026-08-31: Status: In Progress → Done
- 2026-08-31: OQ-21 added
- 2026-08-31: KD-22 resolves OQ-21
- 2026-08-31: IMPL-9 added
- 2026-08-31: VC-8 added
- 2026-08-31: OQ-22 added
- 2026-08-31: KD-23 resolves OQ-22
- 2026-08-31: IMPL-10 added
- 2026-08-31: VC-9 added
- 2026-08-31: IMPL-9, IMPL-10 checked
- 2026-08-31: VC-8 passed
- 2026-08-31: VC-9 passed
- 2026-08-31: Status: In Progress → Done
- 2026-08-31: OQ-23 added
- 2026-08-31: KD-24 resolves OQ-23
- 2026-08-31: IMPL-11 added
- 2026-08-31: VC-10 added
- 2026-08-31: IMPL-11 checked
- 2026-08-31: VC-10 passed
- 2026-08-31: Status: In Progress → Done
- 2026-08-31: OQ-24 added
- 2026-08-31: KD-25 resolves OQ-24
- 2026-08-31: IMPL-12 added
- 2026-08-31: VC-11 added
- 2026-08-31: IMPL-12 checked
- 2026-08-31: VC-11 passed
- 2026-08-31: Status: In Progress → Done
