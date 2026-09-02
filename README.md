# Cadence

A single-page HTML+JS app that plays back any timed training program — a
workout, a physiotherapy routine, a meditation session, a daily or weekly
plan — from a JSON file. The program doesn't know or care what domain it's
in: it's just a schedule of steps, each with a planned time and a
description, and Cadence is the clock that walks through it.

## The idea

A program is a JSON file describing its steps. Each step has:

- a **planned datetime** — when it's meant to happen — and, once it runs, the
  **actual datetime** it really happened, so plan and reality can diverge and
  both stay on record;
- a **description** — free text for what the step is;
- optionally, **sub-steps** — a finer breakdown of the step itself, e.g. a
  single "workout" step might expand into `20s leg raise, 10s pause, 20s
  crunch, ...`, each timed in turn.

Cadence reads that file and renders/drives a clock through it: what's next,
how long until it starts, how far into the current (sub-)step you are, and a
record of what actually happened versus what was planned. The app is
configurable rather than hardcoded to one kind of program, so the same
clock works for a gym circuit, a rehab routine, or a sitting meditation —
the JSON is the only thing that changes.

## Status

Three components are built, each a vanilla Custom Element with no
framework and no build step (see `CLAUDE.md` for the conventions that
govern all of them). Each is demoed live in `index.html`. Their specs are
archived — `sdd/archive/catalog.md` has the full summary of each, and
`spec.py show --archived <slug>` recovers the complete spec.

### `<cadence-clock>` — one step

The base primitive: a single countdown with an optional beep at each end.

```html
<cadence-clock id="demo"></cadence-clock>
<script src="js/cadence-clock.js"></script>
<script>
  document.getElementById('demo').configure({
    durationSeconds: 20,      // required
    startFrequency: 440,      // optional — beep at start, omit for silence
    endFrequency: 880,        // optional — beep at end, independent pitch
    onComplete: () => {},     // optional convenience callback
  });
</script>
```

Renders inline — a chrono (click the time or call `.toggleMode()` to
switch elapsed/remaining, shown as `m:ss` and as `h:mm:ss` from an hour)
alongside a bar that fills over the duration —
auto-starts the instant `configure()` is called, and signals its
lifecycle as `cadence:start` / `cadence:beep` / `cadence:complete`
CustomEvents on itself.

### `<cadence-sequence>` — a whole workout

A JSON program of blocks, each repeated some number of times, each
holding one or more steps shaped exactly like the clock's own config
plus a label:

```html
<cadence-sequence id="demo-sequence"></cadence-sequence>
<script src="js/cadence-clock.js"></script>
<script src="js/cadence-sequence.js"></script>
<script>
  document.getElementById('demo-sequence').configure({
    title: 'Sample circuit',
    blocks: [
      { repetitions: 2, steps: [
        { label: 'Leg raise', durationSeconds: 20, startFrequency: 440 },
        { label: 'Rest', durationSeconds: 10 },
      ]},
    ],
  });
</script>
```

Runs every step in order, looping each block for its repetition count.
Shows the current step's own atomic clock (its real chrono + bar) *and*
one big aggregate chrono for the whole workout, together — plus a
position indicator ("step 2 of 3, rep 1 of 4") and the current label. Has
its own Start button (unlike the atomic clock, it doesn't auto-start —
a multi-minute program gets a deliberate start gesture, which also
unlocks audio for every beep that follows).

### `<cadence-program>` — a program of scheduled workouts

A title and a list of entries. An entry says *where* it sits in the program —
a week and a weekday — never when it happens:

```html
<cadence-program id="demo-program"></cadence-program>
<script src="js/cadence-clock.js"></script>
<script src="js/cadence-sequence.js"></script>
<script src="js/cadence-program.js"></script>
<script>
  document.getElementById('demo-program').configure({
    title: 'Eight-week bodyweight strength',
    entries: [
      { week: 1, day: 1, sequence: {          // day 1 is Monday, day 7 Sunday
        title: 'Week 1 — Push',
        blocks: [{ repetitions: 2, steps: [{ label: 'Push-up', durationSeconds: 20, startFrequency: 440 }] }],
      }},
      { week: 1, day: 3, sequence: { /* … */ } },
    ],
  });
</script>
```

**Dates are computed, never authored.** The first time you start any session,
that day anchors the program: week 1 is laid across that same week, on the
weekdays the author chose, and every entry gets an expected date. So the same
JSON can be started in March or in October without editing a thing.

**The schedule follows you.** Finishing a session records the day it really
happened, and slides everything after it by however late you were — a Monday
session done on Wednesday moves the rest of the program on by two days,
keeping the intervals the author planned. Nothing is ever "missed": the next
session is simply the next one you haven't run. You can also run sessions out
of order; the ones you skipped stay where they are.

The slide is asymmetric on purpose: it moves the program later whenever you
finish late, but pulls it earlier only when every earlier session has already
been done. Finishing ahead while something is still outstanding isn't really
being ahead, and moving on would drag later sessions on top of the unrun ones.

**Milestones are pinned.** An entry can be a milestone — a race, a clinical
review, a recital — carrying a real date it never moves off:

```js
{ week: 16, day: 7, milestone: true, date: '2026-09-27',
  title: 'Berlin Marathon', sequence: { /* optional — omit for a marker */ } }
```

`date` is legal only on a milestone; ordinary sessions stay purely positional.
A dated milestone **anchors the program backwards from itself**, so the plan is
laid out to land on the real date and every session has a date the moment the
program is loaded, before anything is run. A program can carry any number of
them; the earliest sets the anchor.

Sessions slide around milestones, never through them. When they slide past
one, the app says by how much — `5 days past "Race" (2026-09-27)` — rather than
compressing the plan or quietly moving the date. That overrun is the signal
that the plan needs re-planning.

**Dropping.** A session you're never going to do can be dropped, behind a
confirmation. It stays in the program marked dropped, nothing else moves, and
it is never suggested again. There is no undo — the confirmation is the gate.

**Re-planning through an LLM.** When the plan no longer fits, the *Replanning
prompt* button downloads a single markdown file holding the schema to answer
in, the whole record including what was already done and dropped, and the
overrun in days. Paste it into any LLM, and load the JSON it gives back. The
app never calls a model itself — it has no key and no backend.

A dropdown lists every entry (pre-selected to the soonest one not yet run);
picking one and starting it mounts a real running `<cadence-sequence>` in
place of the list, with a Back button to abandon without recording anything.
Finishing fires `cadence:entryComplete`.

**No backend, but state does survive.** Run state is saved to `localStorage`
on every change, so closing the tab between Monday and Wednesday loses
nothing. Reopening the app restores what you'd done; *loading* a file is an
explicit act and replaces the stored program outright, history included, after
a warning that says so — which is what lets a re-planned program come back in
over one already under way. Export downloads the current
state as JSON: the authored week/day shape *plus* the computed and actual
dates, which means an export is itself a program and loads straight back in.

`examples/` holds whole programs you can load from the app: an eight-week
strength block, a sixteen-week marathon build pinned to a race date, a
ten-week guitar plan, and a twelve-week rehab protocol of 172 twice-daily
sessions with its phase reviews as milestones.

`js/example-program.js` is the worked example — eight weeks, three sessions a
week, work and rest intervals progressing from week 1 to week 8 — and it is
what `index.html` runs.

## A program file is untrusted

Programs get shared — a coach sends one, a model writes one, someone downloads
one. So a file is validated the moment it is loaded rather than at the press of
Start, and its text is escaped before it reaches the page. An adversarial review
demonstrated both mattered: a label carrying `<img src=x onerror=…>` ran, and a
step with a string duration was accepted and then threw mid-session, leaving the
list gone and no way back.

A file that will not parse, or that parses into something unrunnable, says so
and leaves the program you already had exactly as it was. A write that storage
refuses is reported rather than swallowed — the run carries on, but the app no
longer shows you a program it has quietly failed to keep.

## The page

`index.html` is the app. It opens on whatever program is stored, and on
nothing at all the first time: a load control, one paragraph saying what a
program is, and — at the foot of the page, in normal flow and never folded
away — the whole JSON contract, written to be read by a language model.

That last part is the point of the layout. The intended workflow is to point
a model at this page, ask it for a program, and load the JSON it gives back.
A closed `<details>` would have been tidier and would have broken it: the
contents of a collapsed disclosure are absent from a page's visible text, so
a reader working on rendered text would never see the contract. It is demoted
by position instead — last on the page, so a person never scrolls through it
to reach anything, and a reader still finds it whole.

A test parses the example the page prints and configures a real component
with it, so the page cannot document a shape the validator rejects.

Specs live under `sdd/specs/` and are tracked with the harness described
below — start with `next` to see what's next.

## Working on this project

This repo tracks its own design decisions as append-only specs, one per
topic, each item carrying a permanent ID that's never deleted or
renumbered — so the *why* behind the code stays readable as the project
grows. Everything goes through one CLI:

```sh
python3 sdd/scripts/spec.py next               # what to do now — start every turn here
python3 sdd/scripts/spec.py new "<subject>"    # create a spec
python3 sdd/scripts/spec.py list               # every spec: status, open counts
python3 sdd/scripts/spec.py show <slug>        # read one back
```

Run `python3 sdd/scripts/spec.py` with no arguments for the full command list,
or see `.claude/skills/spec/SKILL.md` for the complete workflow (dry runs
before implementing, discoveries for open-ended research, verification with
evidence, and `feedback` for when the harness itself is causing friction).
