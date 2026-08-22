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
switch elapsed/remaining) alongside a bar that fills over the duration —
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

### `<cadence-program>` — a schedule of workouts

A title and a list of entries, each pairing a planned datetime with a
sequence config:

```html
<cadence-program id="demo-program"></cadence-program>
<script src="js/cadence-clock.js"></script>
<script src="js/cadence-sequence.js"></script>
<script src="js/cadence-program.js"></script>
<script>
  document.getElementById('demo-program').configure({
    title: 'Week 1',
    entries: [
      { plannedDatetime: '2026-08-25T07:00:00', sequence: {
        title: 'Monday circuit',
        blocks: [{ repetitions: 1, steps: [{ label: 'Leg raise', durationSeconds: 5, startFrequency: 440 }] }],
      }},
    ],
  });
</script>
```

A dropdown lists every entry (pre-selected to the soonest one not yet
run); picking one and starting it mounts a real running
`<cadence-sequence>` in place of the list, with a Back button to abandon
without recording anything. Finishing records the actual datetime the
entry was really run — closing the planned-vs-actual loop — and fires
`cadence:entryComplete`. No backend: an Export button downloads the
current state as JSON, and Load reads one back in.

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
