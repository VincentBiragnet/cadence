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

Nothing is built yet. Specs live under `specs/` and are tracked with the
harness described below — start with `next` to see what's first (the clock
and its configuration).

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
