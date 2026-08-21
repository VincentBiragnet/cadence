---
name: harness-scaffold
description: Set up a new project directory with its own copy of the spec harness — the spec.py CLI, the template, the skills and the specs folder. Use when starting a new project that should track its own specs.
---

# harness-scaffold

Copies this harness into a new project directory so that project tracks its own specs independently. The copy is self-contained — it resolves its own paths and never refers back to where it came from.

All harness machinery — the CLI, templates, specs, and archive — lives under a single `sdd/` directory in the target, kept apart from the project's own files (its code, its own `scripts/`, `templates/`, whatever it needs). The only things placed outside `sdd/` are `.claude/skills/` (Claude Code only discovers skills at that fixed path) and `.gitignore`.

Note: `scaffold` does **not** create or touch the target's top-level `README.md`. Writing that is a normal part of starting the project — describe what the project actually is, not the harness. (`sdd/README.md` carries the harness's own documentation, portable across every project it's scaffolded into.)

## Steps

1. Get the target directory from the user. If they gave a project name but no path, ask where it should live rather than guessing.
2. From the project root, run:
   ```
   python3 sdd/scripts/spec.py scaffold <target-dir>
   ```
   It creates `sdd/scripts/`, `sdd/templates/`, `sdd/specs/`, `sdd/archive/`, plus `.claude/skills/` and `.gitignore` at the target's root. It refuses to overwrite any file that already exists, so it is safe to point at a directory that already has content.
3. Report the target path, and that specs there are created with `python3 <target>/sdd/scripts/spec.py new "<subject>"`.
4. Don't `git init` or commit in the new directory unless the user asks.

## Keeping a scaffolded copy current

Scaffolding is a one-way copy: a fix made later to the source harness (a bug, a skill-guidance improvement) never reaches a project scaffolded before it existed. When you know or suspect a scaffolded project's harness copy is behind the source it came from, run from inside that project:

```
python3 sdd/scripts/spec.py update <path-to-the-source-harness-checkout>
```

This overwrites only tooling files that actually differ (`sdd/scripts/spec.py`, `sdd/scripts/test_spec.sh`, `sdd/templates/*`, the two `.claude/skills/*/SKILL.md` files) — it never touches `sdd/specs/` or `sdd/archive/`, which are the project's own content. Review the diff before committing, the same as any other change.
