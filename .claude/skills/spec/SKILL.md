---
name: spec
description: Create and evolve specifications for any goal — legal, financial, engineering, medical, DIY — where every item has a permanent ID and nothing is ever deleted. Use for creating a spec, adding goals/questions/decisions/implementation items, resolving an open question into decisions, superseding a decision, or changing a spec's status.
---

# spec

Specs live in `sdd/specs/<slug>.spec.md` (and discoveries in `sdd/specs/<slug>.discovery.md`) and are driven by `sdd/scripts/spec.py` from the project root. Every listed item carries a permanent ID (`OQ-3`, `KD-7`, `IMPL-2`, …). IDs are never reused or renumbered, and items are never deleted — anything that stops applying is struck through in place and points at what replaced it. Status is a single line in the header; its history lives in the changelog.

## Rules

1. **Never hand-edit a spec's list sections.** Always go through `spec.py`. It refuses any write that would lose an item, change an item's text, or rewrite the changelog, and it refuses to touch a spec that has already lost items. Editing by hand loses that protection. Free prose outside the lists (the description) is fine to edit directly.
2. **Never invent an ID.** Read one from `add`/`resolve` output, or from `show`.
3. **Never write a changelog line.** Every command appends its own.
4. **Strike, don't remove.** If the user says an item is wrong, obsolete or dropped, strike it with a reason.

## Commands

Run from the project root:

```
python3 sdd/scripts/spec.py next [<slug>]                       # what to do now — start every turn here
python3 sdd/scripts/spec.py new "<subject>"                     # create a spec, prints the slug
python3 sdd/scripts/spec.py list                                # every spec: status, open counts
python3 sdd/scripts/spec.py show <slug> [section]               # read it back
python3 sdd/scripts/spec.py add <slug> <section> "<text>"       # append an item, prints its ID
python3 sdd/scripts/spec.py strike <slug> <ID> "<reason>"       # strike in place
python3 sdd/scripts/spec.py resolve <slug> <OQ-N> "<decision>"  # decision + strike the question
python3 sdd/scripts/spec.py supersede <slug> <KD-N> "<what>"    # decision that replaces an older one
python3 sdd/scripts/spec.py check <slug> <IMPL-N> [...]         # tick implementation items done
python3 sdd/scripts/spec.py verify <slug> <VC-N> pass|fail "<evidence>"   # record a verdict
python3 sdd/scripts/spec.py status <slug> [<status>]            # read or set the status
python3 sdd/scripts/spec.py split <slug> <IMPL-N> "<subject>"   # give an item its own subspec
python3 sdd/scripts/spec.py discover <slug> <OQ-N> "<subject>"  # open a discovery on a hard question
python3 sdd/scripts/spec.py apply <discovery-slug>              # fold it back, then archive it
python3 sdd/scripts/spec.py defer <slug> <ID> "<why>"           # set scope aside into Non-Goals
python3 sdd/scripts/spec.py archive <slug> "<summary>"          # close it when Done
python3 sdd/scripts/spec.py repair <slug>                       # recover a damaged document
python3 sdd/scripts/spec.py dryrun <slug> --raised|--clean "…"   # rehearse before implementing
python3 sdd/scripts/spec.py block <slug> <ID> "<why>"           # this one needs a human
python3 sdd/scripts/spec.py unblock <slug> <ID> "<answer>"      # they answered; carry on
python3 sdd/scripts/spec.py feedback [<slug>]                   # mine changelogs for friction on the harness itself
```

Sections: `goals`, `non-goals`, `questions`, `decisions`, `prior-art`, `implementation`, `verification`.
Statuses: `Draft`, `Ready`, `In Progress`, `Done`.

## Notes per command

- **new** — the subject becomes the description and the slug. Everything else starts empty; add items as the conversation produces them. Don't bulk-invent content the user hasn't given you.
- **add** — one item per call, one idea per item. Keep items to a line.
- **resolve** — fold a brief rationale into the decision string (`"SQLite — local-only, no server to run"`). Re-run it on the same question to record a second decision; the question then points at both. Use this rather than `add decisions` whenever a decision answers a question.
- **supersede** — for a decision that is being reversed or replaced. Use it instead of striking a `KD` by hand, so both directions get linked.
- **implementation** items are the concrete steps to execute — for law, medicine or DIY that means what a person actually does; for software, the actual build. They are the only items with a checkbox. Never check one off unless the user says it's done.
- **verification** items are the tests that establish the implementation is *correct*, as opposed to merely done. Write each so that **an agent** can carry it out and get an unambiguous pass or fail — you are usually both the implementer and the one arranging the check, so a criterion only a human could judge will stall the loop. Name the input, the action and the expected result. "Auth works" is not a criterion; "POST /login with a revoked token returns 401 and logs nothing" is. Reference the goal it covers as `(G-2)`; `list` flags any goal no criterion mentions.

  **Give it a command whenever one exists**: `add <slug> verification "<criterion>" --check "<command>"`. Then `verify <slug> <VC-N> --run` executes it and records the exit code and output as the evidence — a fact rather than your opinion of one, and the only part of this system whose verdict you do not author. A criterion carrying a command *must* be run; attesting it by hand is refused. Reserve free-text attestation for things no command can settle, like whether wording matches a statute.
- **status** — prints the status with no second argument, sets it with one. It moves freely, including backwards, since work really does return to Draft. Moving to `Done` warns about open implementation items but does not block; unpassed criteria *do* block. Only change status when the user asks.
- **repair** — the way out of a document no other command will touch, when hand-editing has broken its ID ledger. It quarantines lines nothing issued under `## Damaged` (never deletes them), retires IDs that are gone, and lets work resume. It refuses to run on an intact document. Reach for this instead of hand-editing when you are stuck and nobody is available to ask.
- **split** — when one implementation item is big enough to need its own spec. The item gets a `→ spec:<slug>` link and the child records its parent. **A subspec cannot be split again.** If you hit that error, do not work around it: it means the project is too big to start where you are. Say so, and either scope the work down or `defer` the part that doesn't fit.
- **defer** — the counterpart to scoping down. It strikes the item and records it in Non-Goals with your reason, linked both ways. Use it whenever scope is dropped, so Non-Goals accumulates the documentation of what would complete the whole project rather than the scope being silently forgotten.
- **archive** — for a spec that is `Done`, and only once it is committed to git (archiving deletes the file; git is what keeps it). Its summary goes to `sdd/archive/catalog.md` with the commit that holds it. Write the summary yourself, in the user's language: what was built, which decisions still bind, what was deferred. It is the only part later agents normally read, so it must stand alone. Pass `-` as the summary to write a multi-line one on stdin.

## Working the loop

**Start every turn with `next`.** It reads the documents and prints the handful of things that could legitimately be done now, worst problem first, each with the exact command. Pick whichever you are best placed to do — it is a menu, not an order — do it, and call `next` again. That is the whole loop, and it means you never have to read a full spec just to decide what to work on.

Its exit code is the loop's control flow:

- **0** — there is work; do some of it.
- **2** — nothing left; everything is Done and closed. Stop.
- **3** — halted: the only things left need a human. Stop and say so.

The rungs are ordered because each one makes the next honest: a question left open turns the work into guesswork, and a criterion written after the fact tests whatever got built rather than what was wanted. `next` never offers a move that another command would refuse.

### Rehearse before you build

`Ready → In Progress` is refused without a clean dry run. A dry run is you walking through the implementation *without doing it* — reading what you would change, thinking it through to the end — and filing every question the attempt surfaces:

```
python3 sdd/scripts/spec.py dryrun <slug> --raised "<question the rehearsal surfaced>"
```

These are the questions you only find by trying: the ones the spec never thought to answer. Resolve each, then rehearse again.

**Part of the walkthrough is checking citations, not just gaps.** A `(KD-N)`/`(G-N)` reference inside an item's text is free prose — the tool never validates it, and item text is frozen the moment it's written. Decisions made after an item existed can leave its citation stale or pointing at the wrong one (e.g. an implementation item written against "no framework" later needing the decision that actually shaped its data format, added only once the dry run surfaced it). Re-read each implementation item's citations against the *current* Key Decisions while you walk through it. A wrong one can't be edited in place — raise it as a question and resolve it with a correction, the same as any other gap the rehearsal finds.

When a walkthrough turns up nothing, record it and start work:

```
python3 sdd/scripts/spec.py dryrun <slug> --clean "<what you walked through>"
```

A clean dry run goes stale the moment another question is raised, so the cycle repeats until it comes back empty. The point is that a thin spec costs you a rehearsal, not a wrong implementation.

### When you need a human

If a question cannot be settled from the spec, the repo, or research — a commercial fact, a legal choice, a preference only the user holds — do not guess and do not invent a plausible answer. Block it:

```
python3 sdd/scripts/spec.py block <slug> OQ-4 "<why no agent can decide this>"
```

Then **carry on with everything that does not depend on it.** `next` skips blocked items and keeps offering the rest. Only when nothing else can proceed does it halt with exit 3.

A halt is not a failure of the work — it is a measurement of the spec. It means the spec did not say enough to be executed without a person, which is the one thing an agent cannot supply for itself. Report it plainly, quote the question, and stop. When the user answers, `unblock` and resume.

## Discoveries

Some open questions can't be answered in one step — they need research, comparison, or weighing options. `resolve` is for questions you can already answer. For the rest, propose a discovery, and open one when the user agrees:

```
python3 sdd/scripts/spec.py discover pick-a-datastore OQ-3 "Backup formats"
```

That writes `sdd/specs/backup-formats.discovery.md` — a separate document type with its own sections, and its own `add` vocabulary:

- `questions` — sub-questions the parent question raised (`OQ-N`)
- `state-of-the-art` — what already exists, one item per finding, **with its source URL in the text** (`SOTA-N`)
- `decisions` — proposed decisions for the parent spec (`PD-N`)
- `criteria` — proposed verification criteria for the parent spec (`PC-N`)

A discovery is a scratch workspace. Keep it short and keep it moving — it is not a second spec, and it exists to be closed.

**A discovery cannot open another discovery.** If answering it needs its own nested investigation, the question is too broad: split it into questions you can actually answer.

When the user validates the conclusions, `apply <discovery-slug>` does the reintegration mechanically — every live `PD` becomes a `KD` on the parent (resolving the original question, which supports several decisions), every live `PC` becomes a `VC`, and the discovery is archived. Never copy proposals across by hand; that is where findings get dropped. Applying needs at least one proposed decision: if the conclusion is "no change needed", record *that* as a decision first, with its reason.

An applied discovery is gone from the working set and left as a bare line in the catalog — its conclusions live in the parent now, and git still holds the research if the reasoning is ever reopened.

## Verifying

`Done` is a claim that the work is correct, so it is the one hard gate: `status <slug> Done` is refused while any criterion is unpassed, and a later `fail` demotes a `Done` spec back to `In Progress`.

Striking a criterion clears the gate, because requirements genuinely do become moot. Treat that as a last resort and never as a way to get unstuck: it is reported by `status`, counted by `list`, and written permanently into the archive catalog, so a spec closed that way is visibly closed on your judgement rather than on evidence. If a criterion keeps failing, the thing to reconsider is the decision that produced it — not the criterion.

**Never verify your own implementation.** You have the blind spots that produced it and every reason to conclude it worked. Delegate each criterion to a subagent that has not done the work, and give it only:

- the criterion text, verbatim;
- how to reach the artifact — the repo, the document, the file under test;
- the instruction to report `pass` or `fail` plus the concrete evidence it observed.

Do not send it your implementation notes, your reasoning, or your expectation of the result.

**A `--check` command's exit code is only as trustworthy as its environment's fidelity to production.** A criterion can run mechanically, exit 0, and still not prove the real-world claim, if the tool running it quietly relaxes a restriction real users are actually subject to — a browser test runner that disables autoplay-gesture or permission-prompt policies for automation convenience is a real example, not a hypothetical one. Before trusting a green check that crosses a browser security/permission boundary (autoplay, geolocation, clipboard, notifications, camera/mic...), confirm the check's environment actually enforces that boundary rather than bypassing it — otherwise the criterion is proving something narrower than its text claims.

Then record what came back, unedited:

```
python3 sdd/scripts/spec.py verify <slug> VC-1 fail "lost the last 2 writes after kill -9"
```

Evidence is mandatory and is the point of the command: a verdict nobody can re-check is not a verification. Record what was observed, not that it looked fine. **Report failures as they came back.** A failed criterion is the single most valuable thing this system captures — it stays in the record permanently, and a later pass appends to it rather than replacing it, so the whole history of the attempt survives. If you fix the problem, re-verify with a fresh subagent and record the new verdict.

## When the harness itself is the problem

If a spec is fighting you — the same kind of question keeps needing a fresh dry-run cycle, criteria keep failing, items keep needing a human — that is signal about the harness, not just this spec. Run `feedback [<slug>]` (no slug scans every spec in the project). It reads what `save()` already wrote to each spec's own changelog — dry-run cycles, blocks, verify verdicts — no separate logging exists or is needed. When a pattern crosses a threshold, it raises an `OQ` on this project's own `harness-feedback` spec (created on first use) describing the friction concretely, and tells you the `discover` command to open on it. From there it's an ordinary spec: `discover` it, propose a fix (usually to `sdd/templates/spec_template.md` or to guidance in this skill), and `apply` it back. Re-running `feedback` is safe — it never raises the same finding twice.

## Archived specs

`list --archived` prints the catalog — summaries only, cheap to read, and enough for most questions about closed work. That is the intended way in.

Read a full archived spec only when the user asks, or when you have said which spec you need and why and the user has agreed — then `show --archived <slug>`. Archived specs cannot be edited; if the work reopens, say so and let the user decide whether to start a new spec.
