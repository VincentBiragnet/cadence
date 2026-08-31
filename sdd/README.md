# Spec harness

Specs for any kind of goal — legal, financial, engineering, medical, DIY — kept as append-only markdown that an AI agent can edit safely.

Every listed item carries a permanent ID. **IDs are never reused or renumbered, and items are never deleted.** Anything that stops applying is struck through in place and points at what replaced it, so a spec reads as a history rather than a snapshot:

```markdown
**Status:** In Progress

## Open Questions
- **OQ-1** ~~Which database?~~ → KD-1, KD-2
- **OQ-2** Do we need offline mode?

## Key Decisions
- **KD-1** ~~Use Postgres (OQ-1)~~ → superseded by KD-3
- **KD-2** WAL mode enabled (OQ-1)
- **KD-3** SQLite — local-only, no server to run (supersedes KD-1)

## Implementation Details
- [x] **IMPL-1** Pick the datastore
- [ ] **IMPL-2** Write the migration
- [ ] **IMPL-3** ~~Benchmark Postgres~~ → dropped, see KD-3
```

Status is one line in the header, changed when needed. Its history is the changelog, which already dates every transition — there's no second record to keep in sync.

## Usage

Everything goes through one CLI; run `python3 sdd/scripts/spec.py` for the full list.

```sh
python3 sdd/scripts/spec.py new "Pick a datastore"
python3 sdd/scripts/spec.py add pick-a-datastore questions "Which database?"   # → OQ-1
python3 sdd/scripts/spec.py resolve pick-a-datastore OQ-1 "SQLite — no server" # → KD-1
python3 sdd/scripts/spec.py status pick-a-datastore "In Progress"
```

Sections: `goals`, `non-goals`, `questions`, `decisions`, `prior-art`, `implementation`, `verification`. Statuses: `Draft`, `Ready`, `In Progress`, `Done` — set freely in either direction, since work does come back. Implementation items and verification criteria carry checkboxes; moving to `Done` with some still open warns but doesn't block.

## The loop

`next` is the entry point for an agent working on its own. It prints what could be done now, worst problem first, with the exact commands — so deciding what to do costs one line of output instead of reading the whole spec:

```
$ spec.py next
pick-a-datastore  OQ-2 is unanswered — Which backup format?
    spec.py resolve pick-a-datastore OQ-2 "<decision>"
    spec.py discover pick-a-datastore OQ-2 "<subject>"   (if it needs research)
    spec.py block pick-a-datastore OQ-2 "<why only a human can decide>"
```

Exit `0` means there is work, `2` means everything is Done and closed, `3` means it halted because the only things left need a human. That makes the loop terminate on its own:

```sh
while spec.py next; do :; done   # the agent acts on each listing
```

**Before implementing, rehearse.** `Ready → In Progress` requires a clean dry run: the agent walks through the work without doing it and files every question the attempt surfaces with `dryrun <slug> --raised`. Those are the gaps you only find by trying. A clean run goes stale the moment another question is raised, so the cycle repeats until a walkthrough turns up nothing. A thin spec then costs a rehearsal rather than a wrong implementation.

**When something needs a person**, `block <slug> <ID> "<why>"` marks it and `next` skips it — everything independent keeps moving. Only when nothing else can proceed does the run halt, and the halt says what it means: the spec did not say enough to be executed without a human. That is a gap in the spec, not a failure of the work.

## Verification

`check IMPL-1` records that work was *done*. Verification criteria record that it is *correct* — a different claim, and the one that matters:

```markdown
## The loop

`next` is the entry point for an agent working on its own. It prints what could be done now, worst problem first, with the exact commands — so deciding what to do costs one line of output instead of reading the whole spec:

```
$ spec.py next
pick-a-datastore  OQ-2 is unanswered — Which backup format?
    spec.py resolve pick-a-datastore OQ-2 "<decision>"
    spec.py discover pick-a-datastore OQ-2 "<subject>"   (if it needs research)
    spec.py block pick-a-datastore OQ-2 "<why only a human can decide>"
```

Exit `0` means there is work, `2` means everything is Done and closed, `3` means it halted because the only things left need a human. That makes the loop terminate on its own:

```sh
while spec.py next; do :; done   # the agent acts on each listing
```

**Before implementing, rehearse.** `Ready → In Progress` requires a clean dry run: the agent walks through the work without doing it and files every question the attempt surfaces with `dryrun <slug> --raised`. Those are the gaps you only find by trying. A clean run goes stale the moment another question is raised, so the cycle repeats until a walkthrough turns up nothing. A thin spec then costs a rehearsal rather than a wrong implementation.

**When something needs a person**, `block <slug> <ID> "<why>"` marks it and `next` skips it — everything independent keeps moving. Only when nothing else can proceed does the run halt, and the halt says what it means: the spec did not say enough to be executed without a human. That is a gap in the spec, not a failure of the work.

## Verification Criteria
- [x] **VC-1** Kill power mid-write, restart, no committed data lost (G-1)
      → failed 2026-08-19 (lost 2 writes), passed 2026-08-20 (fsync; 200 cycles clean)
- [ ] **VC-2** Restores from a backup in under an hour
```

A criterion can carry the command that checks it, and then `verify --run` executes it and records the exit code and output as evidence — a fact the agent did not author, rather than its own account of one. Attesting such a criterion by hand is refused: if it can be checked mechanically, it must be.

```
- [x] **VC-1** A dump restores on a clean machine in under an hour (G-2) `bash tests/restore.sh`
      → passed 2026-08-20 (ran: exit 0 — 41m12s, 0 rows lost)
```

Free-text attestation stays available for what no command can settle, and the record says which it was. Either way `check` refuses to tick a criterion — only `verify` can — and evidence is mandatory. Verdicts append, so a failure is never overwritten by a later pass; the whole history of the attempt stays readable on one line.

**`Done` is gated on every criterion passing** — the one hard gate, because Done is a claim about correctness rather than effort. A later `fail` on a `Done` spec demotes it back to `In Progress`, so the false claim cannot stand.

There is no `--force`, but there is a legitimate override: a criterion that no longer applies can be struck with a reason, and striking clears the gate. That is deliberate — requirements do become moot — so the waiver is made loud rather than prevented. `status Done` names every struck criterion, `list` shows the count, and the archive catalog records it permanently, so a spec closed on judgement rather than evidence always says so.

`list` also flags goals no criterion covers — a goal you can't write a criterion for is usually one you haven't pinned down.

The skill requires that criteria be verified by a **separate subagent** that did not do the implementation, given only the criterion and the artifact. That is a workflow rule, not something the script can enforce — it cannot know who invoked it. What it does enforce is that a verdict must carry evidence, which makes a rubber stamp something you have to write down.

## Discoveries

`resolve` is for a question you can already answer. For one that needs research first, open a discovery — a separate, short-lived document type (`sdd/specs/<slug>.discovery.md`) attached to a single open question:

```sh
python3 sdd/scripts/spec.py discover pick-a-datastore OQ-3 "Backup formats"
python3 sdd/scripts/spec.py add backup-formats state-of-the-art "pg_dump emits plain SQL — https://…"
python3 sdd/scripts/spec.py add backup-formats decisions "Plain SQL dumps — restorable without our code"
python3 sdd/scripts/spec.py add backup-formats criteria "Restore a dump on a clean machine in under an hour"
python3 sdd/scripts/spec.py apply backup-formats
```

Its sections are `questions` (sub-questions raised), `state-of-the-art` (findings with sources), `decisions` and `criteria` (proposals for the parent). `apply` folds those back mechanically — proposals become real `KD`s and `VC`s on the parent and the original question is resolved, leaving the whole trail on one line:

```markdown
- **OQ-3** ~~Which backup format?~~ → discovery:backup-formats, KD-4
- **KD-4** Plain SQL dumps — restorable without our code (OQ-3 via discovery:backup-formats)
```

Before applying, the proposals get tried on three subagents playing genuinely different kinds of user of the thing being built, each driving something concrete rather than reading a description. What they observe is recorded alongside the published sources, so the discovery says what was tried and not only what was concluded — and a claim that would change the decision is reproduced before it is believed.

No retyping, so nothing is dropped in transcription. **A discovery cannot open another discovery** — if answering it needs a nested investigation, the question is too broad. Once applied it is archived and reduced to a bare catalog line: its conclusions live in the parent now, and git still holds the research in case anyone reopens it.

## Subspecs, deferring, archiving

An implementation item can become a spec of its own:

```sh
python3 sdd/scripts/spec.py split pick-a-datastore IMPL-5 "Auth layer"
# - [ ] **IMPL-5** Build the auth layer → spec:auth-layer
```

**A subspec cannot be split again.** That limit is the point: needing two levels means the project is too big to start where you are. Scope it down, or move the part that doesn't fit into Non-Goals with `defer`, which strikes it and records it with a reason. Non-Goals is therefore not just a fence — it accumulates what would be needed to finish the whole project, so cutting scope never loses the thread.

When a spec is `Done`, `archive <slug> "<summary>"` deletes it from the working tree and appends your summary to `sdd/archive/catalog.md` along with the commit that holds it. Nothing is condensed away and the spec is never edited — git already stores it immutably, so archiving is a move, and the summary is metadata that lives outside the record. It refuses to run unless the file is committed and unmodified, since deleting it is otherwise a data loss.

`list --archived` reads the catalog: one summary per closed spec, cheap enough to consult freely and the only part normally in context. `show --archived <slug>` recovers the full text with `git show`. Archiving a spec that still has live subspecs or discoveries is refused rather than warned about — it would strand them.

In practice you don't type these — Claude does, via the `spec` skill. `harness-scaffold` copies the harness into a new project, under a single `sdd/` directory kept apart from the project's own files. `update <source-checkout>` pulls tooling fixes into an already-scaffolded copy — scaffolding is a one-way copy, so a fix made upstream after a project was scaffolded needs a way back; `update` never touches `sdd/specs/` or `sdd/archive/`.

## Guarantees

Before any write, the script refuses to proceed if it would delete an item, change an existing item's text, alter a section heading, or rewrite existing changelog entries. Writes go through a temp file and a lock, so a crash or a parallel agent cannot leave a torn or half-lost spec. Item text is rejected if it contains a newline, an arrow, or strikethrough markers — the three ways a single `add` could otherwise forge or hide an item.

**The changelog is the ledger.** Every entry that issues IDs leads with them, so an ID is recorded as spent even if its item is later lost. That is what lets `broken_ids` catch the deletion of the *highest* ID — a check against the surviving items alone cannot, because no gap remains — and what stops a number ever being handed out twice.

**No state is a dead end.** `repair <slug>` recovers a document that hand-editing has damaged: lines nothing ever issued are quarantined under `## Damaged` rather than deleted, IDs that are gone for good are retired in the changelog, and work resumes. It refuses to run on an intact document, so it cannot be used to slip past anything. This matters most for an agent working alone, which has no one to ask.

Known limit: deleting an item *and* its ledger entry together is undetectable. `assert_append_only` prevents the tool from doing it; only a deliberate hand-edit can.

`bash scripts/test_spec.sh` exercises all of this end to end against a throwaway git repo — 96 assertions, including that a forged line is caught, a damaged spec is recoverable, and eight concurrent writes lose nothing.
