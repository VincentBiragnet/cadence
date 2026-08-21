---
name: harness-scaffold
description: Set up a new project directory with its own copy of the spec harness — the spec.py CLI, the template, the skills and the specs folder. Use when starting a new project that should track its own specs.
---

# harness-scaffold

Copies this harness into a new project directory so that project tracks its own specs independently. The copy is self-contained — it resolves its own paths and never refers back to where it came from.

## Steps

1. Get the target directory from the user. If they gave a project name but no path, ask where it should live rather than guessing.
2. From the project root, run:
   ```
   python3 scripts/spec.py scaffold <target-dir>
   ```
   It creates `scripts/`, `templates/`, `.claude/skills/`, `specs/` and a `README.md` under the target. It refuses to overwrite any file that already exists, so it is safe to point at a directory that already has content.
3. Report the target path, and that specs there are created with `python3 <target>/scripts/spec.py new "<subject>"`.
4. Don't `git init` or commit in the new directory unless the user asks.
