# Discovery: Rehearsal yield as a signal

**Discovery for:** harness-feedback (OQ-1)
**Question:** dry runs average 7.2 raised question(s) per clean run across 4 clean run(s) — Open Questions/Key Decisions may need a stronger prompt in the spec template so they surface before the first dry run

_Edit via `scripts/spec.py`, never by hand._

## Open Questions
_No items yet._

## State of the Art
- **SOTA-1** Across four specs the rehearsal raised 7.2 questions per clean run, which the heuristic reads as the spec being thin before it was walked through
- **SOTA-2** The nine questions one spec's rehearsal raised arrived in three rounds of six, then two, then one: the walkthrough converged rather than kept finding as much as before
- **SOTA-3** Every one of those nine was downstream of a decision already taken — several milestones being allowed, a milestone without a sequence, a dropped session meeting the previous spec's shift gate, two ways of anchoring — and none was a definitional gap a template could have prompted for
- **SOTA-4** The proposals here were tried against the recorded history of four real specs rather than three simulated users, because the user of this metric is the harness and the evidence of how it behaves already exists in their changelogs

## Proposed Decisions
- **PD-1** Raw questions per clean run is the wrong measure: a thorough first walkthrough of a rich spec looks identical to a thin spec, and the harness cannot tell them apart from a count
- **PD-2** The signal is the shape of the rounds: a rehearsal that keeps finding as much as it did last time has not converged, while six then two then one has
- **PD-3** Report on rounds that fail to converge — three or more rounds where the last is not smaller than the one before — and say that the walkthrough is not settling rather than that the template needs a stronger prompt

## Proposed Criteria
- **PC-1** A spec whose rehearsal raised many questions in a single round, then came back clean, produces no finding `bash sdd/scripts/test_spec.sh`
- **PC-2** A spec whose rehearsal rounds do not shrink produces a finding that names the rounds rather than an average `bash sdd/scripts/test_spec.sh`

## Changelog
- 2026-08-31: Opened for OQ-1 of harness-feedback.
- 2026-08-31: SOTA-1 added
- 2026-08-31: SOTA-2 added
- 2026-08-31: SOTA-3 added
- 2026-08-31: SOTA-4 added
- 2026-08-31: PD-1 added
- 2026-08-31: PD-2 added
- 2026-08-31: PD-3 added
- 2026-08-31: PC-1 added
- 2026-08-31: PC-2 added
