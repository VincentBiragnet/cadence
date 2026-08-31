#!/usr/bin/env python3
"""Spec harness: append-only specs whose items carry permanent IDs.

Items are never deleted or renumbered. Items that no longer apply are struck
through in place and point at whatever replaced them. Every write is checked
against that invariant before it touches disk.

Run `spec.py` with no arguments for usage.
"""
import fcntl
import os
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# The harness's own machinery lives under sdd/, apart from the project's own
# files (product code, its own scripts/templates, etc.) — REPO_ROOT is the
# project itself, one level up. .claude/skills/ and .gitignore live there,
# not under sdd/, since Claude Code only discovers skills at that fixed path.
# --check commands also run from here: they're the project's own tests.
REPO_ROOT = ROOT.parent
TEMPLATE = ROOT / "templates" / "spec_template.md"
DISCOVERY_TEMPLATE = ROOT / "templates" / "discovery_template.md"
SPECS = ROOT / "specs"
SPEC_SUFFIX = ".spec.md"
DISCOVERY_SUFFIX = ".discovery.md"
ARCHIVE = ROOT / "archive"
CATALOG = ARCHIVE / "catalog.md"
LOCK = SPECS / ".lock"
CATALOG_HEADER = """# Archive catalog

Closed specs and discoveries. Each was deleted from the working tree at the
commit named below, so git still holds it byte for byte. The summaries here are
all an agent normally needs; read a full one only when asked:
`spec.py show --archived <slug>`.
"""

PLACEHOLDER = "_No items yet._"
STATUSES = ["Draft", "Ready", "In Progress", "Done"]

# section arg -> (heading, id prefix), per document type. The only place
# sections are defined.
SECTIONS = {
    "goals": ("Goals", "G"),
    "non-goals": ("Non-Goals", "NG"),
    "questions": ("Open Questions", "OQ"),
    "decisions": ("Key Decisions", "KD"),
    "prior-art": ("Prior Art", "PA"),
    "implementation": ("Implementation Details", "IMPL"),
    "verification": ("Verification Criteria", "VC"),
}
DISCOVERY_SECTIONS = {
    "questions": ("Open Questions", "OQ"),
    "state-of-the-art": ("State of the Art", "SOTA"),
    "decisions": ("Proposed Decisions", "PD"),
    "criteria": ("Proposed Criteria", "PC"),
}
# Things with an open/done state: work to do, and criteria to test it against.
CHECKABLE = ("IMPL", "VC")
GOAL_REF_RE = re.compile(r"\bG-\d+\b")

ITEM_RE = re.compile(r"^- (?:\[(?P<box>[ xX])\] )?\*\*(?P<id>[A-Z]+-\d+)\*\* (?P<body>.*)$")
STRUCK_RE = re.compile(r"^~~(?P<text>.*)~~$")
ARROW = " → "  # separates an item's text from its pointer; barred from item text
STATUS_RE = re.compile(r"^\*\*Status:\*\* (.+)$")
PARENT_RE = re.compile(r"^\*\*Parent:\*\* (\S+) \((\S+)\)$")
DISCOVERY_FOR_RE = re.compile(r"^\*\*Discovery for:\*\* (\S+) \((\S+)\)$")
SLUG_RE = re.compile(r"[a-z0-9][a-z0-9-]*\Z")
# Every changelog entry that allocates IDs leads with them, so the log doubles
# as the allocation ledger: an ID once issued is recorded even if its item is
# later lost. Free text always follows a verb, so it can never be misread here.
ALLOCATION_RE = re.compile(r"^- \d{4}-\d\d-\d\d: ((?:[A-Z]+-\d+)(?:, [A-Z]+-\d+)*)\b")
DAMAGED = "Damaged"
# repair retires an ID whose item is gone for good: the number stays spent, but
# the document stops reporting it as missing, so work can resume.
RETIRED_RE = re.compile(r"^- \d{4}-\d\d-\d\d: ((?:[A-Z]+-\d+)(?:, [A-Z]+-\d+)*) retired\b")
# A criterion may carry the command that checks it, in backticks at the end of
# its text. Running it yields evidence the agent did not author.
CHECK_RE = re.compile(r"`([^`]+)`\s*\Z")
BLOCKED, UNBLOCKED = "blocked: ", "unblocked: "
DRYRUN_CLEAN = "dry run clean"
EXIT_IDLE, EXIT_HALTED = 2, 3
SPEC_LINK = "spec:"
DISCOVERY_LINK = "discovery:"


def die(msg: str) -> "None":
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def today() -> str:
    return date.today().isoformat()


# --- parsing ---------------------------------------------------------------


class Item:
    def __init__(self, index: int, ident: str, body: str, box: "str | None"):
        self.index = index          # line number within the file
        self.id = ident
        self.prefix, num = ident.rsplit("-", 1)
        self.num = int(num)
        self.checked = None if box is None else box.lower() == "x"
        # A pointer can sit on a live item too (a subspec link), so it is split
        # off before the strikethrough is read — not only alongside it.
        head, sep, pointer = body.partition(ARROW)
        self.pointer = pointer if sep else None
        match = STRUCK_RE.match(head)
        self.struck = match is not None
        self.text = match.group("text") if match else head

    def render(self) -> str:
        box = "" if self.checked is None else f"[{'x' if self.checked else ' '}] "
        body = f"~~{self.text}~~" if self.struck else self.text
        if self.pointer:
            body += ARROW + self.pointer
        return f"- {box}**{self.id}** {body}"


def parse_items(lines: "list[str]") -> "list[Item]":
    """Every live item. Anything under ## Damaged is quarantined and inert."""
    items, quarantined = [], False
    for i, line in enumerate(lines):
        if line.startswith("## "):
            quarantined = line.strip() == f"## {DAMAGED}"
        match = None if quarantined else ITEM_RE.match(line)
        if match:
            items.append(Item(i, match.group("id"), match.group("body"), match.group("box")))
    return items


def find_item(lines: "list[str]", ident: str) -> Item:
    for item in parse_items(lines):
        if item.id == ident:
            return item
    die(f"no item '{ident}' in this spec (run `show` to list them)")


def section_span(lines: "list[str]", heading: str) -> "tuple[int, int]":
    """Line range of a section's body, excluding its heading."""
    start = None
    for i, line in enumerate(lines):
        if start is None:
            if line.strip() == f"## {heading}":
                start = i + 1
        elif line.startswith("## "):
            return start, i
    if start is None:
        die(f"could not find section '## {heading}'")
    return start, len(lines)


def allocated_ids(lines: "list[str]") -> "set[str]":
    """Every ID this document has ever issued, read from the changelog.

    Checking the surviving items against each other cannot catch the deletion
    of the highest ID — there is no gap left to see, so the number would be
    handed out twice. The changelog is the ledger precisely because it is the
    one part of the file nothing is allowed to rewrite.
    """
    issued = set()
    for entry in changelog_entries(lines):
        match = ALLOCATION_RE.match(entry)
        if match:
            issued.update(match.group(1).split(", "))
    return issued


def retired_ids(lines: "list[str]") -> "set[str]":
    """IDs repair has written off. Spent forever, but no longer reported missing."""
    retired = set()
    for entry in changelog_entries(lines):
        match = RETIRED_RE.match(entry)
        if match:
            retired.update(match.group(1).split(", "))
    return retired


def broken_ids(lines: "list[str]") -> "list[str]":
    """IDs the ledger says were issued that the document no longer holds once."""
    present: "dict[str, int]" = {}
    for item in parse_items(lines):
        present[item.id] = present.get(item.id, 0) + 1
    issued = allocated_ids(lines) - retired_ids(lines)
    broken = {i for i in issued if present.get(i, 0) != 1}
    broken |= {i for i, n in present.items() if n != 1}
    # An item nothing ever issued is damage too — a forged or hand-added line.
    broken |= {i for i in present if i not in allocated_ids(lines)}
    return sorted(broken, key=lambda i: (i.rsplit("-", 1)[0], int(i.rsplit("-", 1)[1])))


def sanitize(value: str, limit: int = 90) -> str:
    """Fold captured output down to something a one-line pointer can hold."""
    value = " ".join(value.split())
    value = value.replace(ARROW.strip(), "->").replace("~~", "").replace("`", "'")
    return value[:limit] or "no output"


def check_command(item: Item) -> "str | None":
    match = CHECK_RE.search(item.text)
    return match.group(1) if match else None


def is_blocked(item: Item) -> "str | None":
    """The reason an item is waiting on a human, if it is."""
    if item.struck or item.checked or not item.pointer:
        return None
    last_block = item.pointer.rfind(BLOCKED)
    if last_block < 0 or item.pointer.rfind(UNBLOCKED) > last_block:
        return None
    return item.pointer[last_block + len(BLOCKED):].split(", " + UNBLOCKED)[0]


def blocked_items(lines: "list[str]") -> "list[Item]":
    return [i for i in parse_items(lines) if is_blocked(i)]


def dry_run_ready(lines: "list[str]") -> "str | None":
    """Why the spec is not cleared for implementation, or None if it is.

    A clean dry run goes stale the moment a new question is raised, so the
    cycle is: walk it through, resolve what surfaces, walk it through again.
    """
    entries = changelog_entries(lines)
    last_clean = max((i for i, e in enumerate(entries) if DRYRUN_CLEAN in e), default=None)
    if last_clean is None:
        return "no dry run has been recorded"
    later = [e for e in entries[last_clean + 1:] if ALLOCATION_RE.match(e)
             and any(a.startswith("OQ-") for a in ALLOCATION_RE.match(e).group(1).split(", "))]
    if later:
        return f"{len(later)} question(s) were raised after the last clean dry run"
    open_questions = [i for i in parse_items(lines) if i.prefix == "OQ" and not i.struck]
    if open_questions:
        return f"{', '.join(i.id for i in open_questions)} still open"
    return None


def unpassed_criteria(lines: "list[str]") -> "list[Item]":
    """Verification criteria that still stand between the spec and Done."""
    return [i for i in parse_items(lines) if i.prefix == "VC" and not i.struck and not i.checked]


def demote_if_now_stale(slug: str, lines: "list[str]") -> "list[str]":
    """Done is a claim that every criterion passed; keep it from lying.

    A newly unpassed criterion can arrive two ways — a fresh `fail`, or a
    brand new VC appended (directly, or folded in from a discovery) while
    the spec already reads Done. Both leave the header asserting something
    that's no longer true until the next verify happens to notice, so this
    demotes on the spot instead of waiting for someone to ask.
    """
    if read_status(lines) == STATUSES[-1] and unpassed_criteria(lines):
        for i, line in enumerate(lines):
            if STATUS_RE.match(line):
                lines[i] = f"**Status:** {STATUSES[2]}"
                break
        print(f"warning: '{slug}' was {STATUSES[-1]}; an unpassed criterion means it is not — "
              f"demoted to {STATUSES[2]}", file=sys.stderr)
    return lines


def uncovered_goals(lines: "list[str]") -> "list[str]":
    """Live goals that no live criterion refers to."""
    items = parse_items(lines)
    covered = {ref for i in items if i.prefix == "VC" and not i.struck
               for ref in GOAL_REF_RE.findall(i.text)}
    return [i.id for i in items if i.prefix == "G" and not i.struck and i.id not in covered]


def changelog_entries(lines: "list[str]") -> "list[str]":
    start, end = section_span(lines, "Changelog")
    return [ln for ln in lines[start:end] if ln.startswith("- ")]


# --- the append-only guarantee ---------------------------------------------


def assert_append_only(old: "list[str]", new: "list[str]") -> None:
    """Refuse any write that loses an item, alters item text, or rewrites history."""
    old_items = {i.id: i for i in parse_items(old)}
    new_items = {i.id: i for i in parse_items(new)}

    for ident, item in old_items.items():
        if ident not in new_items:
            die(f"refusing to write: {ident} would be deleted")
        if new_items[ident].text != item.text:
            die(f"refusing to write: the text of {ident} would change")

    old_headings = [ln for ln in old if ln.startswith("## ")]
    if old_headings != [ln for ln in new if ln.startswith("## ")]:
        die("refusing to write: section headings would change")

    old_log = changelog_entries(old)
    if changelog_entries(new)[: len(old_log)] != old_log:
        die("refusing to write: existing changelog entries would change")


def clean(value: str, what: str) -> str:
    """Reject anything that would break the one-line-per-item grammar."""
    value = value.strip()
    if not value:
        die(f"{what} must not be empty")
    if "\n" in value or "\r" in value:
        die(f"{what} must be a single line — newlines would forge new items")
    if ARROW in value:
        die(f"{what} cannot contain '{ARROW.strip()}' — that separates an item from its pointer")
    if STRUCK_RE.match(value):
        die(f"{what} cannot be written as struck-through text")
    return value


def atomic_write(path: Path, text: str) -> None:
    """Write via a temp file in the same directory, so no reader sees a torn file."""
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(text)
    os.replace(tmp, path)


def save(path: Path, old: "list[str]", new: "list[str]", entry: str) -> None:
    start, end = section_span(new, "Changelog")
    insert = end
    while insert > start and not new[insert - 1].strip():
        insert -= 1
    new = new[:insert] + [f"- {today()}: {entry}"] + new[insert:]
    assert_append_only(old, new)
    atomic_write(path, "\n".join(new).rstrip("\n") + "\n")


# --- spec lookup -----------------------------------------------------------


def slugify(subject: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", subject.lower()).strip("-")


def is_discovery(path: Path) -> bool:
    return path.name.endswith(DISCOVERY_SUFFIX)


def slug_of(path: Path) -> str:
    return path.name[: -len(DISCOVERY_SUFFIX if is_discovery(path) else SPEC_SUFFIX)]


def all_docs() -> "list[Path]":
    return sorted(SPECS.glob(f"*{SPEC_SUFFIX}")) + sorted(SPECS.glob(f"*{DISCOVERY_SUFFIX}"))


def valid_slug(slug: str) -> str:
    if not SLUG_RE.match(slug):
        die(f"'{slug}' is not a slug (lowercase letters, digits and dashes only)")
    return slug


def claim(slug: str, subject: str) -> None:
    """Refuse a name that any live or archived document already answers to."""
    valid_slug(slug)
    for suffix in (SPEC_SUFFIX, DISCOVERY_SUFFIX):
        if (SPECS / f"{slug}{suffix}").exists():
            die(f"'{slug}' already exists as {slug}{suffix}, refusing to overwrite")
    if slug in archived_slugs():
        die(f"'{slug}' names an archived document, and reusing the name would make\n"
            f"       both unreachable. Choose a subject that reads differently from\n"
            f"       '{subject}', or reopen the archived one deliberately.")


def spec_path(slug: str) -> Path:
    valid_slug(slug)
    for suffix in (SPEC_SUFFIX, DISCOVERY_SUFFIX):
        path = SPECS / f"{slug}{suffix}"
        if path.exists():
            return path
    if slug in archived_slugs():
        die(f"'{slug}' is archived and closed to edits. Read it with: show --archived {slug}")
    available = ", ".join(slug_of(p) for p in all_docs()) or "(none)"
    die(f"nothing named '{slug}'. Available: {available}")


def sections_for(path: Path) -> dict:
    return DISCOVERY_SECTIONS if is_discovery(path) else SECTIONS


def git(*args: str) -> "subprocess.CompletedProcess":
    return subprocess.run(("git", "-C", str(ROOT)) + args, capture_output=True, text=True)


CATALOG_ENTRY_RE = re.compile(r"^## (\S+)$")
COMMIT_RE = re.compile(r"\*\*Commit:\*\* ([0-9a-f]{7,40}) `([^`]+)`")


def catalog_entries() -> "dict[str, str]":
    """slug -> the metadata line recorded when it was archived."""
    if not CATALOG.exists():
        return {}
    entries, current = {}, None
    for line in CATALOG.read_text().split("\n"):
        match = CATALOG_ENTRY_RE.match(line)
        if match:
            current = match.group(1)
        elif current and line.startswith("**"):
            entries[current] = line
            current = None
    return entries


def archived_slugs() -> "list[str]":
    return sorted(catalog_entries())


def read_archived(slug: str) -> str:
    """Recover an archived document from the commit the catalog names."""
    entry = catalog_entries().get(slug)
    if not entry:
        available = ", ".join(archived_slugs()) or "(none)"
        die(f"nothing archived under '{slug}'. Archived: {available}")
    match = COMMIT_RE.search(entry)
    if not match:
        die(f"the catalog entry for '{slug}' records no commit")
    commit, rel = match.groups()
    # rel is relative to ROOT (sdd/), matching how assert_committed's `git
    # status -- rel` resolves it under `-C ROOT`. But `git show rev:path`
    # always resolves path from the repo root regardless of -C, so it needs
    # ROOT's own offset from REPO_ROOT added back — except a catalog entry
    # written before ROOT moved (e.g. the sdd/ reorg) named a commit where
    # the file actually sat at the bare rel, with no such offset. Try today's
    # layout first, then fall back to the historical one rather than losing
    # anything archived under a since-changed layout.
    repo_rel = (ROOT.relative_to(REPO_ROOT) / rel).as_posix()
    result = git("show", f"{commit}:{repo_rel}")
    if result.returncode:
        fallback = git("show", f"{commit}:{rel}")
        if not fallback.returncode:
            return fallback.stdout
        die(f"git could not read {rel} at {commit}:\n       {result.stderr.strip()}")
    return result.stdout


def parent_of(lines: "list[str]") -> "tuple[str, str] | None":
    """(parent slug, the item it hangs off) for a subspec or a discovery."""
    for pattern in (PARENT_RE, DISCOVERY_FOR_RE):
        match = next((m for m in map(pattern.match, lines) if m), None)
        if match:
            return match.groups()
    return None


def load(slug: str, strict: bool = True) -> "tuple[Path, list[str]]":
    path = spec_path(slug)
    lines = path.read_text().split("\n")
    broken = broken_ids(lines)
    if broken:
        note = f"{path.name} has a broken ID sequence at {', '.join(broken)} — edited by hand?"
        if strict:
            die(f"{note}\n       refusing to touch a spec whose history is already damaged")
        print(f"warning: {note}", file=sys.stderr)
    return path, lines


def section_of(arg: str, path: Path) -> "tuple[str, str]":
    table = sections_for(path)
    if arg not in table:
        kind = "discovery" if is_discovery(path) else "spec"
        die(f"unknown {kind} section '{arg}'. Choose from: {', '.join(table)}")
    return table[arg]


# --- mutations -------------------------------------------------------------


def append_item(lines: "list[str]", heading: str, prefix: str, text: str, step: bool) -> "tuple[list[str], str]":
    if ARROW in text:
        die(f"item text cannot contain '{ARROW.strip()}' — that separates an item from its pointer")
    # The high-water mark comes from the ledger as well as the surviving items,
    # so a number is never reissued even if its item was lost.
    spent = [i.num for i in parse_items(lines) if i.prefix == prefix]
    spent += [int(i.rsplit("-", 1)[1]) for i in allocated_ids(lines)
              if i.rsplit("-", 1)[0] == prefix]
    num = max(spent, default=0) + 1
    ident = f"{prefix}-{num}"
    box = "[ ] " if step else ""
    line = f"- {box}**{ident}** {text}"

    start, end = section_span(lines, heading)
    body = [ln for ln in lines[start:end] if ln.strip() != PLACEHOLDER]
    insert = len(body)
    while insert > 0 and not body[insert - 1].strip():
        insert -= 1
    body = body[:insert] + [line] + body[insert:]
    if not body or body[-1].strip():
        body.append("")
    return lines[:start] + body + lines[end:], ident


def strike(lines: "list[str]", item: Item, pointer: str) -> "list[str]":
    if item.struck:
        die(f"{item.id} is already struck through ({item.pointer or 'no pointer'})")
    item.struck = True
    return extend_pointer(lines, item, pointer)


def extend_pointer(lines: "list[str]", item: Item, addition: str) -> "list[str]":
    item.pointer = f"{item.pointer}, {addition}" if item.pointer else addition

    lines = list(lines)
    lines[item.index] = item.render()
    return lines


# --- commands --------------------------------------------------------------


def take_option(args: "list[str]", flag: str, valued: bool = True) -> "tuple[str | None, list[str]]":
    if flag not in args:
        return None, args
    i = args.index(flag)
    if not valued:
        return "", args[:i] + args[i + 1:]
    if i + 1 >= len(args):
        die(f"{flag} needs a value")
    return args[i + 1], args[:i] + args[i + 2:]


def cmd_new(args: "list[str]") -> None:
    subject = " ".join(args).strip()
    if not subject:
        die("usage: spec.py new \"<subject>\"")
    slug = slugify(subject)
    if not slug:
        die(f"subject '{subject}' produces an empty slug")
    SPECS.mkdir(parents=True, exist_ok=True)
    claim(slug, subject)
    path = SPECS / f"{slug}{SPEC_SUFFIX}"
    path.write_text(TEMPLATE.read_text().replace("{{SUBJECT}}", subject).replace("{{DATE}}", today()))
    print(f"{path}\nslug: {slug}")


def cmd_list(args: "list[str]") -> None:
    if "--archived" in args:
        print(CATALOG.read_text().rstrip("\n") if CATALOG.exists() else "nothing archived yet")
        return
    paths = all_docs()
    if not paths:
        print("no specs yet")
        return

    specs = {slug_of(p): p.read_text().split("\n") for p in paths}
    kinds = {slug_of(p): is_discovery(p) for p in paths}
    children: "dict[str, list[str]]" = {}
    for slug, lines in specs.items():
        parent = parent_of(lines)
        if parent and parent[0] in specs:
            children.setdefault(parent[0], []).append(slug)

    def show(slug: str, depth: int) -> None:
        lines = specs[slug]
        items = parse_items(lines)
        if kinds[slug]:
            proposals = sum(1 for i in items if i.prefix in ("PD", "PC") and not i.struck)
            questions = sum(1 for i in items if i.prefix == "OQ" and not i.struck)
            label = ("  " * depth + ("└ " if depth else "") + slug)[:40]
            print(f"{label:<40} {'discovery':<12} {questions} open question(s), "
                  f"{proposals} proposal(s)")
            return
        status = next((m.group(1).strip() for m in map(STATUS_RE.match, lines) if m), "?")
        questions = sum(1 for i in items if i.prefix == "OQ" and not i.struck)
        todo = sum(1 for i in items if i.prefix == "IMPL" and not i.struck and not i.checked)
        vcs = len(unpassed_criteria(lines))
        waived = sum(1 for i in items if i.prefix == "VC" and i.struck)
        notes = []
        if broken_ids(lines):
            notes.append(f"broken IDs: {', '.join(broken_ids(lines))}")
        if uncovered_goals(lines):
            notes.append(f"no criterion for {', '.join(uncovered_goals(lines))}")
        note = f"  [!] {'; '.join(notes)}" if notes else ""
        label = ("  " * depth + ("└ " if depth else "") + slug)[:40]
        waived_note = f", {waived} struck" if waived else ""
        print(f"{label:<40} {status:<12} {questions} open question(s), "
              f"{todo} open item(s), {vcs} unpassed VC(s){waived_note}{note}")
        for child in sorted(children.get(slug, [])):
            show(child, depth + 1)

    nested = {c for kids in children.values() for c in kids}
    for slug in sorted(specs):
        if slug not in nested:
            show(slug, 0)


def cmd_show(args: "list[str]") -> None:
    if "--archived" in args:
        rest = [a for a in args if a != "--archived"]
        if not rest:
            die("usage: spec.py show --archived <slug>")
        print(read_archived(rest[0]).rstrip("\n"))
        return
    if not args:
        die("usage: spec.py show <slug> [section]")
    path, lines = load(args[0], strict=False)
    rest = [a for a in args[1:] if a != "--log"]
    if not rest:
        if "--log" in args:
            print("\n".join(lines).rstrip("\n"))
            return
        start, _ = section_span(lines, "Changelog")
        body = "\n".join(lines[: start - 1]).rstrip("\n")
        entries = len(changelog_entries(lines))
        print(f"{body}\n\n## Changelog\n_{entries} entries — `show {args[0]} --log` to read them._")
        return
    args = [args[0]] + rest
    heading, _ = section_of(args[1], path)
    start, end = section_span(lines, heading)
    print(f"## {heading}")
    print("\n".join(lines[start:end]).strip("\n"))


def cmd_add(args: "list[str]") -> None:
    if len(args) < 3:
        die("usage: spec.py add <slug> <section> \"<text>\"")
    command, args = take_option(args, "--check")
    if len(args) < 3:
        die("usage: spec.py add <slug> <section> \"<text>\" [--check \"<command>\"]")
    slug, section = args[0], args[1]
    path, old = load(slug)
    heading, prefix = section_of(section, path)
    text = clean(" ".join(args[2:]), "item text")
    if command is not None:
        if prefix != "VC":
            die("--check belongs on a verification criterion, nothing else")
        if "`" in command:
            die("the check command cannot contain a backtick")
        text = clean(f"{text} `{command.strip()}`", "item text")
    new, ident = append_item(old, heading, prefix, text, step=(prefix in CHECKABLE))
    if prefix == "VC":
        new = demote_if_now_stale(slug, new)
    save(path, old, new, f"{ident} added")
    print(ident)


def cmd_strike(args: "list[str]") -> None:
    if len(args) < 3:
        die("usage: spec.py strike <slug> <ID> \"<reason>\"")
    slug, ident = args[0], args[1].upper()
    path, old = load(slug)
    reason = clean(" ".join(args[2:]), "the reason")
    item = find_item(old, ident)
    new = strike(old, item, reason)
    save(path, old, new, f"{ident} struck")
    print(f"struck {ident} → {reason}")


def cmd_resolve(args: "list[str]") -> None:
    if len(args) < 3:
        die("usage: spec.py resolve <slug> <OQ-N> \"<decision>\"")
    slug, ident = args[0], args[1].upper()
    path, old = load(slug)
    decision = clean(" ".join(args[2:]), "the decision")
    item = find_item(old, ident)
    if item.prefix != "OQ":
        die(f"{ident} is not an open question")

    heading, prefix = SECTIONS["decisions"]
    new, kd = append_item(old, heading, prefix, f"{decision} ({ident})", step=False)
    item = find_item(new, ident)
    if item.struck:
        new = extend_pointer(new, item, kd)
    else:
        new = strike(new, item, kd)
    save(path, old, new, f"{kd} resolves {ident}")
    print(f"{kd}\nresolved {ident} → {find_item(new, ident).pointer}")


def cmd_supersede(args: "list[str]") -> None:
    if len(args) < 3:
        die("usage: spec.py supersede <slug> <KD-N> \"<decision>\"")
    slug, ident = args[0], args[1].upper()
    path, old = load(slug)
    decision = clean(" ".join(args[2:]), "the decision")
    item = find_item(old, ident)
    if item.prefix != "KD":
        die(f"{ident} is not a key decision")

    heading, prefix = SECTIONS["decisions"]
    new, kd = append_item(old, heading, prefix, f"{decision} (supersedes {ident})", step=False)
    new = strike(new, find_item(new, ident), f"superseded by {kd}")
    save(path, old, new, f"{kd} supersedes {ident}")
    print(f"{kd}\nsuperseded {ident}")


def cmd_check(args: "list[str]") -> None:
    if len(args) < 2:
        die("usage: spec.py check <slug> <IMPL-N> [<IMPL-N> ...]")
    path, old = load(args[0])
    new = list(old)
    done = []
    for raw in args[1:]:
        ident = raw.upper()
        item = find_item(new, ident)
        if item.prefix == "VC":
            die(f"{ident} is a verification criterion. Checking one off is a claim that it was\n"
                f"       tested, so it needs evidence: spec.py verify <slug> {ident} pass|fail \"<evidence>\"")
        if item.checked is None:
            die(f"{ident} is not an implementation item — only those can be checked off")
        if item.struck:
            die(f"{ident} is struck through; it cannot be checked off")
        if item.checked:
            continue
        if item.pointer and SPEC_LINK in item.pointer:
            child = item.pointer.split(SPEC_LINK, 1)[1].split(",")[0].strip()
            source = SPECS / f"{child}{SPEC_SUFFIX}"
            if source.exists() and read_status(source.read_text().split("\n")) != STATUSES[-1]:
                print(f"warning: subspec '{child}' is not {STATUSES[-1]} yet", file=sys.stderr)
        item.checked = True
        new[item.index] = item.render()
        done.append(ident)
    if not done:
        print("nothing to do — already checked")
        return
    save(path, old, new, f"{', '.join(done)} checked")
    print(f"checked {', '.join(done)}")


def assert_committed(path: Path) -> str:
    """Refuse to touch a document git cannot yet restore if the file is lost.

    Called before any mutation that ends in deleting the file, so a failure
    here happens before that mutation rather than after — a caller that
    writes elsewhere first and archives second would otherwise leave that
    other write in place while the archive itself fails, with no way to
    retry cleanly (append-only means the retry cannot undo it either).
    """
    slug = slug_of(path)
    rel = path.relative_to(ROOT).as_posix()
    if git("rev-parse", "--is-inside-work-tree").returncode:
        die("archiving needs a git repository — git is what holds the archived text.\n"
            "       Run `git init` and commit this document first.")
    status = git("status", "--porcelain", "--", rel)
    if status.returncode or status.stdout.strip():
        die(f"'{slug}' has uncommitted changes, and archiving deletes the file.\n"
            f"       Commit it first, then archive.")
    commit = git("rev-parse", "HEAD").stdout.strip()
    if not commit:
        die("this repository has no commits yet — commit the document first")
    return commit


def archive_doc(path: Path, lines: "list[str]", summary: "str | None") -> None:
    """Close a document by deleting it from the working tree.

    Git already stores it immutably and searchably, so archiving is a move, not
    an edit — the record itself is never touched. The catalog keeps the summary
    and the commit needed to read it back. Because the content survives only in
    git, this refuses to run unless the file is committed and unmodified.
    """
    slug = slug_of(path)
    rel = path.relative_to(ROOT).as_posix()
    commit = assert_committed(path)

    ARCHIVE.mkdir(parents=True, exist_ok=True)
    if not CATALOG.exists():
        CATALOG.write_text(CATALOG_HEADER)
    link = parent_of(lines)
    if is_discovery(path):
        head = "**Archived:** " + today() + " · **discovery**" + (
            f" for {link[0]} ({link[1]})" if link else "")
    else:
        head = f"**Archived:** {today()} · **Status:** {read_status(lines)}" + (
            f" · **Parent:** {link[0]} ({link[1]})" if link else "")
        struck = [i.id for i in parse_items(lines) if i.prefix == "VC" and i.struck]
        if struck:
            head += f" · **struck, not passed:** {', '.join(struck)}"
    head += f" · **Commit:** {commit} `{rel}`"
    entry = [f"## {slug}", head] + (["", summary] if summary else [])
    # Appended, never rewritten: the catalog is the only index of closed work.
    with CATALOG.open("a") as catalog:
        catalog.write("\n" + "\n".join(entry) + "\n")
    path.unlink()


def cmd_discover(args: "list[str]") -> None:
    if len(args) < 3:
        die("usage: spec.py discover <slug> <OQ-N> \"<subject>\"")
    slug, ident = args[0], args[1].upper()
    subject = " ".join(args[2:]).strip()
    if not subject:
        die("the discovery needs a subject")
    path, old = load(slug)
    if is_discovery(path):
        die(f"'{slug}' is already a discovery, and a discovery cannot open another.\n"
            f"       If {ident} needs its own investigation, the question is too broad —\n"
            f"       split it into questions you can answer here.")

    item = find_item(old, ident)
    if item.prefix != "OQ":
        die(f"{ident} is not an open question")
    if item.struck:
        die(f"{ident} is already resolved")
    if item.pointer and DISCOVERY_LINK in item.pointer:
        die(f"{ident} already has a discovery open: {item.pointer}")

    child_slug = slugify(subject)
    if not child_slug:
        die(f"subject '{subject}' produces an empty slug")
    claim(child_slug, subject)
    child_path = SPECS / f"{child_slug}{DISCOVERY_SUFFIX}"

    child_path.write_text(DISCOVERY_TEMPLATE.read_text()
                          .replace("{{SUBJECT}}", subject).replace("{{PARENT}}", slug)
                          .replace("{{QID}}", ident).replace("{{QUESTION}}", item.text)
                          .replace("{{DATE}}", today()))

    new = extend_pointer(old, item, f"{DISCOVERY_LINK}{child_slug}")
    save(path, old, new, f"{ident} opened {DISCOVERY_LINK}{child_slug}")
    print(f"{child_path}\nslug: {child_slug}\n{ident} → {DISCOVERY_LINK}{child_slug}")


def cmd_apply(args: "list[str]") -> None:
    if not args:
        die("usage: spec.py apply <discovery-slug>")
    slug = args[0]
    path, lines = load(slug)
    if not is_discovery(path):
        die(f"'{slug}' is a spec, not a discovery")
    link = parent_of(lines)
    if not link:
        die(f"'{slug}' does not say which question it is for")
    parent_slug, qid = link

    items = parse_items(lines)
    decisions = [i for i in items if i.prefix == "PD" and not i.struck]
    criteria = [i for i in items if i.prefix == "PC" and not i.struck]
    if not decisions:
        die("nothing to apply: no live proposed decisions.\n"
            "       Even \"no change needed\" is a decision — record it as one first.")
    open_questions = [i for i in items if i.prefix == "OQ" and not i.struck]
    if open_questions:
        print(f"warning: {len(open_questions)} question(s) still open in this discovery",
              file=sys.stderr)

    # Check archivability before writing anything to the parent: that write is
    # permanent (append-only), but this one is not, so it must fail first.
    assert_committed(path)

    parent_path, parent_old = load(parent_slug)
    parent_new = list(parent_old)
    applied = []
    for proposal in decisions:
        heading, prefix = SECTIONS["decisions"]
        parent_new, kd = append_item(parent_new, heading, prefix,
                                     f"{proposal.text} ({qid} via {DISCOVERY_LINK}{slug})",
                                     step=False)
        question = find_item(parent_new, qid)
        parent_new = (extend_pointer(parent_new, question, kd) if question.struck
                      else strike(parent_new, question, kd))
        applied.append(kd)
    for proposal in criteria:
        heading, prefix = SECTIONS["verification"]
        parent_new, vc = append_item(parent_new, heading, prefix, proposal.text, step=True)
        applied.append(vc)
    if criteria:
        parent_new = demote_if_now_stale(parent_slug, parent_new)

    save(parent_path, parent_old, parent_new,
         f"{', '.join(applied)} applied from {DISCOVERY_LINK}{slug}")
    archive_doc(path, lines, summary=None)
    print(f"{', '.join(applied)} → {parent_slug}\narchived {slug}")


def cmd_block(args: "list[str]") -> None:
    if len(args) < 3:
        die("usage: spec.py block <slug> <ID> \"<what only a human can decide>\"")
    slug, ident = args[0], args[1].upper()
    path, old = load(slug)
    reason = clean(" ".join(args[2:]), "the reason")
    item = find_item(old, ident)
    if item.struck or item.checked:
        die(f"{ident} is already settled — nothing is waiting on it")
    if is_blocked(item):
        die(f"{ident} is already blocked: {is_blocked(item)}")
    new = extend_pointer(old, item, f"{BLOCKED}{reason}")
    save(path, old, new, f"{ident} blocked")
    print(f"{ident} blocked — `next` will skip it and halt if nothing else can proceed")


def cmd_unblock(args: "list[str]") -> None:
    if len(args) < 3:
        die("usage: spec.py unblock <slug> <ID> \"<what the human said>\"")
    slug, ident = args[0], args[1].upper()
    path, old = load(slug)
    note = clean(" ".join(args[2:]), "the resolution")
    item = find_item(old, ident)
    if not is_blocked(item):
        die(f"{ident} is not blocked")
    new = extend_pointer(old, item, f"{UNBLOCKED}{note}")
    save(path, old, new, f"{ident} unblocked")
    print(f"{ident} unblocked")


def cmd_dryrun(args: "list[str]") -> None:
    """Record a rehearsal of the implementation, without doing it.

    The point is to surface the questions that only appear when you actually
    try. A clean run goes stale as soon as another question is raised, so the
    cycle repeats until walking it through turns up nothing.
    """
    raised, args = take_option(args, "--raised")
    summary, args = take_option(args, "--clean")
    if not args or (raised is None) == (summary is None):
        die("usage: spec.py dryrun <slug> --raised \"<question>\"\n"
            "       spec.py dryrun <slug> --clean \"<what you walked through>\"")
    slug = args[0]
    path, old = load(slug)
    if is_discovery(path):
        die("a discovery is not implemented — dry runs belong on specs")

    if raised is not None:
        heading, prefix = SECTIONS["questions"]
        text = clean(raised, "the question")
        new, ident = append_item(old, heading, prefix, text, step=False)
        save(path, old, new, f"{ident} raised by dry run")
        print(f"{ident}\nresolve it, then dry run again")
        return

    open_questions = [i for i in parse_items(old) if i.prefix == "OQ" and not i.struck]
    if open_questions:
        die(f"{', '.join(i.id for i in open_questions)} still open — a dry run cannot be\n"
            f"       clean while the spec has unanswered questions")
    save(path, old, list(old), f"{DRYRUN_CLEAN} — {clean(summary, 'the summary')}")
    print(f"{DRYRUN_CLEAN} — '{slug}' is cleared to implement")


def cmd_verify(args: "list[str]") -> None:
    run, args = take_option(args, "--run", valued=False)
    usage = ("usage: spec.py verify <slug> <VC-N> pass|fail \"<evidence>\"\n"
             "       spec.py verify <slug> <VC-N> --run     (criteria that carry a command)")
    if run is not None:
        if len(args) != 2:
            die(usage)
    elif len(args) < 4 or args[2] not in ("pass", "fail"):
        die(usage)
    slug, ident = args[0], args[1].upper()
    path, old = load(slug)
    item = find_item(old, ident)
    if item.prefix != "VC":
        die(f"{ident} is not a verification criterion")
    if item.struck:
        die(f"{ident} is struck through and no longer applies")

    command = check_command(item)
    if run is not None:
        if not command:
            die(f"{ident} carries no check command. Either attest it with evidence, or\n"
                f"       state one when you add the criterion: add ... --check \"<command>\"")
        result = subprocess.run(command, shell=True, cwd=str(REPO_ROOT),
                                capture_output=True, text=True)
        verdict = "pass" if result.returncode == 0 else "fail"
        detail = sanitize(result.stdout + result.stderr)
        evidence = f"ran: exit {result.returncode} — {detail}"
    else:
        # A criterion that can be checked mechanically must be, or the evidence
        # is just the implementer's word for it again.
        if command:
            die(f"{ident} carries a check command, so its verdict should come from running\n"
                f"       it, not from your judgement: spec.py verify {slug} {ident} --run")
        verdict = args[2]
        evidence = f"attested: {clean(' '.join(args[3:]), 'the evidence')}"

    item.checked = verdict == "pass"
    new = extend_pointer(old, item, f"{verdict}ed {today()} ({evidence})")
    new = demote_if_now_stale(slug, new)
    save(path, old, new, f"{ident} {verdict}ed")
    print(f"{ident}: {verdict} ({evidence})")
    if read_status(new) != read_status(old):
        print(f"status: {read_status(old)} → {read_status(new)}")
    if verdict == "pass":
        remaining = unpassed_criteria(new)
        print(f"{len(remaining)} criteri{'on' if len(remaining) == 1 else 'a'} still unpassed"
              if remaining else "all verification criteria passed")


def cmd_split(args: "list[str]") -> None:
    if len(args) < 3:
        die("usage: spec.py split <slug> <IMPL-N> \"<subject>\"")
    slug, ident = args[0], args[1].upper()
    subject = " ".join(args[2:]).strip()
    if not subject:
        die("the subspec needs a subject")
    path, old = load(slug)

    parent = parent_of(old)
    if parent:
        die(f"'{slug}' is already a subspec of '{parent[0]}', and a subspec cannot have subspecs.\n"
            f"       If {ident} needs a spec of its own, this project is too big to start here.\n"
            f"       Scope it down, or set it aside with: spec.py defer {slug} {ident} \"<why>\"")

    item = find_item(old, ident)
    if item.prefix != "IMPL":
        die(f"{ident} is not an implementation item — only those can become subspecs")
    if item.struck:
        die(f"{ident} is struck through")
    if item.pointer and SPEC_LINK in item.pointer:
        die(f"{ident} already links to {item.pointer}")

    child_slug = slugify(subject)
    if not child_slug:
        die(f"subject '{subject}' produces an empty slug")
    claim(child_slug, subject)
    child_path = SPECS / f"{child_slug}{SPEC_SUFFIX}"

    child = TEMPLATE.read_text().replace("{{SUBJECT}}", subject).replace("{{DATE}}", today()).split("\n")
    for i, line in enumerate(child):
        if STATUS_RE.match(line):
            child.insert(i + 1, f"**Parent:** {slug} ({ident})")
            break
    child_path.write_text("\n".join(child).rstrip("\n") + "\n")

    new = extend_pointer(old, item, f"{SPEC_LINK}{child_slug}")
    save(path, old, new, f"{ident} split out into subspec '{child_slug}'")
    print(f"{child_path}\nslug: {child_slug}\n{ident} → {SPEC_LINK}{child_slug}")


def cmd_defer(args: "list[str]") -> None:
    if len(args) < 3:
        die("usage: spec.py defer <slug> <ID> \"<why / what it would take>\"")
    slug, ident = args[0], args[1].upper()
    path, old = load(slug)
    why = clean(" ".join(args[2:]), "the reason")
    item = find_item(old, ident)
    if item.prefix == "NG":
        die(f"{ident} is already a non-goal")
    if item.struck:
        die(f"{ident} is already struck through")

    heading, prefix = SECTIONS["non-goals"]
    new, ng = append_item(old, heading, prefix, f"{item.text} — {why} (was {ident})", step=False)
    new = strike(new, find_item(new, ident), f"deferred to {ng}")
    save(path, old, new, f"{ng} defers {ident}")
    print(f"{ng}\ndeferred {ident} → {ng}")


def cmd_archive(args: "list[str]") -> None:
    if len(args) < 2:
        die("usage: spec.py archive <slug> \"<summary>\"   (summary of \"-\" reads stdin)")
    slug = args[0]
    summary = sys.stdin.read() if args[1] == "-" else " ".join(args[1:])
    summary = summary.strip()
    if not summary:
        die("a summary is required — it is what the agent reads instead of the full spec")
    path, lines = load(slug)

    if not is_discovery(path) and read_status(lines) != STATUSES[-1]:
        print(f"warning: '{slug}' is {read_status(lines)}, not {STATUSES[-1]}", file=sys.stderr)
    live = [slug_of(o) for o in all_docs()
            if (parent_of(o.read_text().split("\n")) or ("", ""))[0] == slug]
    if live:
        die(f"'{slug}' still has live children: {', '.join(live)}.\n"
            f"       Archiving it would strand them — close them first.")

    archive_doc(path, lines, summary)
    print(f"archived {slug} — {CATALOG.name} updated; the text stays in git")


def read_status(lines: "list[str]") -> str:
    status = next((m.group(1).strip() for m in map(STATUS_RE.match, lines) if m), None)
    if status is None:
        die("could not find the '**Status:** ...' line")
    return status


def cmd_status(args: "list[str]") -> None:
    if not args:
        die(f"usage: spec.py status <slug> [{' | '.join(STATUSES)}]")
    slug = args[0]
    path, old = load(slug, strict=len(args) > 1)
    current = read_status(old)
    if len(args) == 1:
        print(current)
        return

    wanted = " ".join(args[1:]).strip().lower()
    target = next((s for s in STATUSES if s.lower() == wanted), None)
    if target is None:
        die(f"unknown status '{' '.join(args[1:])}'. Choose from: {', '.join(STATUSES)}")
    if target == current:
        print(f"already {current}")
        return

    if target == STATUSES[2] and not is_discovery(path):
        reason = dry_run_ready(old)
        if reason:
            print(f"error: '{slug}' is not cleared to implement — {reason}.", file=sys.stderr)
            print(f"       Rehearse it: walk through the work without doing it, filing each\n"
                  f"       question it surfaces with `dryrun {slug} --raised \"<q>\"`, and when\n"
                  f"       it turns up nothing, `dryrun {slug} --clean \"<what you covered>\"`.",
                  file=sys.stderr)
            sys.exit(1)

    if target == STATUSES[-1]:
        waiting = blocked_items(old)
        if waiting:
            print(f"error: {len(waiting)} item(s) are still waiting on a human:", file=sys.stderr)
            for item in waiting:
                print(f"  {item.id} {item.text} — {is_blocked(item)}", file=sys.stderr)
            sys.exit(1)
        # Done is a claim about correctness, not effort — so this one is a gate.
        unpassed = unpassed_criteria(old)
        if unpassed:
            print(f"error: {len(unpassed)} verification criteri{'on is' if len(unpassed) == 1 else 'a are'}"
                  " not passed:", file=sys.stderr)
            for item in unpassed:
                print(f"  - [ ] {item.id} {item.text}", file=sys.stderr)
                if item.pointer:
                    print(f"        {ARROW.strip()} {item.pointer}", file=sys.stderr)
            print(f"       Verify them, or strike one with a reason if it no longer applies.",
                  file=sys.stderr)
            sys.exit(1)
        criteria = [i for i in parse_items(old) if i.prefix == "VC"]
        if not criteria:
            print("warning: no verification criteria — nothing establishes that this is correct",
                  file=sys.stderr)
        struck = [i.id for i in criteria if i.struck]
        if struck:
            print(f"warning: {', '.join(struck)} struck rather than passed — "
                  "Done rests on that judgement, not on evidence", file=sys.stderr)
        open_items = [i for i in parse_items(old)
                      if i.prefix == "IMPL" and not i.struck and not i.checked]
        if open_items:
            print(f"warning: {len(open_items)} implementation item(s) still open:", file=sys.stderr)
            for item in open_items:
                print(f"  - [ ] {item.id} {item.text}", file=sys.stderr)

    new = list(old)
    for i, line in enumerate(new):
        if STATUS_RE.match(line):
            new[i] = f"**Status:** {target}"
            break
    save(path, old, new, f"Status: {current} → {target}")
    print(f"status: {current} → {target}")


def actions_for(path: Path, lines: "list[str]") -> "list[tuple[int, str, str, list[str]]]":
    """Everything that could legitimately be done next, worst problem first.

    The rungs encode what has to be true before the next thing is worth doing:
    a question left open makes the work guesswork, and a criterion written after
    the fact tests whatever got built rather than what was wanted.
    """
    slug, out = slug_of(path), []
    live = [i for i in parse_items(lines) if not i.struck and not is_blocked(i)]

    if broken_ids(lines):
        return [(1, slug, "its ID ledger is damaged and nothing else can touch it",
                 [f"spec.py repair {slug}"])]

    questions = [i for i in live if i.prefix == "OQ"]
    # A blocked question is still unanswered, so it stalls the rehearsal even
    # though the agent cannot act on it — never offer a move that would be refused.
    unanswered = [i for i in parse_items(lines) if i.prefix == "OQ" and not i.struck]
    for item in questions[:2]:
        out.append((3, slug, f"{item.id} is unanswered — {item.text}",
                    [f'spec.py resolve {slug} {item.id} "<decision>"',
                     f'spec.py discover {slug} {item.id} "<subject>"   (if it needs research)',
                     f'spec.py block {slug} {item.id} "<why only a human can decide>"']))

    if is_discovery(path):
        if not [i for i in live if i.prefix == "PD"]:
            out.append((6, slug, "no proposed decision yet — a discovery exists to produce one",
                        [f'spec.py add {slug} decisions "<what the parent spec should decide>"']))
        elif not questions:
            out.append((8, slug, "its proposals are ready to fold back",
                        [f"spec.py apply {slug}"]))
        return out

    status = read_status(lines)
    if not [i for i in live if i.prefix == "G"]:
        out.append((2, slug, "has no goals — nothing says what it is for",
                    [f'spec.py add {slug} goals "<what success looks like>"']))
    if status in STATUSES[:2] and not unanswered:
        reason = dry_run_ready(lines)
        if reason:
            out.append((4, slug, f"is not cleared to implement — {reason}",
                        [f'spec.py dryrun {slug} --raised "<question the rehearsal surfaced>"',
                         f'spec.py dryrun {slug} --clean "<what you walked through>"']))
    for goal in uncovered_goals(lines)[:2]:
        out.append((5, slug, f"{goal} has no verification criterion",
                    [f'spec.py add {slug} verification "<how you would know {goal} was met>"'
                     ' --check "<command>"']))
    for item in [i for i in live if i.prefix == "IMPL" and not i.checked][:3]:
        if item.pointer and SPEC_LINK in item.pointer:
            continue        # the subspec carries its own actions
        out.append((6, slug, f"{item.id} is not done — {item.text}",
                    [f"do the work, then: spec.py check {slug} {item.id}"]))
    for item in [i for i in live if i.prefix == "VC" and not i.checked][:3]:
        command = check_command(item)
        out.append((7, slug, f"{item.id} is unverified — {item.text}",
                    [f"spec.py verify {slug} {item.id} --run"] if command else
                    [f"have a fresh subagent check it, then:",
                     f'spec.py verify {slug} {item.id} pass|fail "<evidence>"']))
    if not out and status != STATUSES[-1] and not blocked_items(lines):
        out.append((8, slug, "is complete and verified", [f'spec.py status {slug} Done']))
    if status == STATUSES[-1]:
        out.append((9, slug, "is Done and can be closed",
                    [f'spec.py archive {slug} "<summary>"']))
    return out


def cmd_next(args: "list[str]") -> None:
    docs = [spec_path(args[0])] if args else all_docs()
    if not docs:
        print("everything is Done and closed" if archived_slugs()
              else "no specs yet — spec.py new \"<subject>\"")
        sys.exit(EXIT_IDLE)

    actions, waiting = [], []
    for path in docs:
        lines = path.read_text().split("\n")
        waiting += [(slug_of(path), i) for i in blocked_items(lines)]
        actions += actions_for(path, lines)
    actions.sort(key=lambda a: a[0])

    for _, slug, headline, commands in actions[:5]:
        print(f"{slug}  {headline}")
        for command in commands:
            print(f"    {command}")
    if len(actions) > 5:
        print(f"({len(actions) - 5} more)")

    if waiting:
        print("\nWAITING ON A HUMAN — no agent can settle these:")
        for slug, item in waiting:
            print(f"  {slug}  {item.id} {item.text}")
            print(f"        {is_blocked(item)}")
            print(f"        answer it, then: spec.py unblock {slug} {item.id} \"<the answer>\"")

    if actions:
        return
    if waiting:
        print("\nHALTED — nothing else can proceed.")
        print("This is a gap in the spec rather than a failure of the work: the questions")
        print("above could not be settled from what the spec says. That is the one thing")
        print("an agent cannot supply for itself.")
        sys.exit(EXIT_HALTED)
    print("nothing to do — everything is Done and closed")
    sys.exit(EXIT_IDLE)


def cmd_repair(args: "list[str]") -> None:
    if not args:
        die("usage: spec.py repair <slug>")
    slug = args[0]
    path, lines = load(slug, strict=False)
    broken = broken_ids(lines)
    if not broken:
        print(f"'{slug}' is intact — nothing to repair")
        return

    # Quarantine rather than delete: a line nothing issued is still evidence of
    # what happened, and this is the one command that runs on an invalid file.
    issued = allocated_ids(lines)
    seen: "set[str]" = set()
    kept, damaged = [], []
    for line in lines:
        item = next(iter(parse_items([line])), None)
        if item and (item.id not in issued or item.id in seen):
            damaged.append(line)
            continue
        if item:
            seen.add(item.id)
        kept.append(line)

    lost = sorted(i for i in issued if i not in seen)
    if damaged:
        start, end = section_span(kept, "Changelog")
        kept = kept[: start - 1] + [f"## {DAMAGED}", ""] + damaged + [""] + kept[start - 1:]
    notes = []
    if damaged:
        notes.append(f"repaired: quarantined {len(damaged)} line(s) under ## {DAMAGED}")
    if lost:
        notes.append(f"{', '.join(lost)} retired — issued but lost to damage")
    start, end = section_span(kept, "Changelog")
    insert = end
    while insert > start and not kept[insert - 1].strip():
        insert -= 1
    kept = kept[:insert] + [f"- {today()}: {n}" for n in notes] + kept[insert:]

    atomic_write(path, "\n".join(kept).rstrip("\n") + "\n")
    for line in damaged:
        print(f"  quarantined: {line.strip()}")
    for ident in lost:
        print(f"  lost: {ident} was issued but is gone — its number stays retired")
    print(f"  {len(damaged)} quarantined, {len(lost)} retired")
    print(f"'{slug}' is usable again" if not broken_ids(kept)
          else f"'{slug}' still reports {', '.join(broken_ids(kept))}")


FEEDBACK_SLUG = "harness-feedback"
DRYRUN_RAISED_RE = re.compile(r"^- \d{4}-\d\d-\d\d: [A-Z]+-\d+ raised by dry run$")
DRYRUN_CLEAN_RE = re.compile(rf"^- \d{{4}}-\d\d-\d\d: {re.escape(DRYRUN_CLEAN)} — ")
BLOCKED_LOG_RE = re.compile(r"^- \d{4}-\d\d-\d\d: \S+ blocked$")
VERIFY_LOG_RE = re.compile(r"^- \d{4}-\d\d-\d\d: \S+ (passed|failed)$")


def cmd_feedback(args: "list[str]") -> None:
    """Mine specs' own changelogs for friction, and raise what crosses a
    threshold as an open question on this project's own meta-spec.

    Nothing here is new bookkeeping: every signal below is already permanent,
    git-tracked text that `save()` wrote as a side effect of normal commands.
    This just reads it back across specs instead of one at a time.
    """
    scope = args[0] if args else None
    docs = [spec_path(scope)] if scope else \
        [p for p in all_docs() if not is_discovery(p) and slug_of(p) != FEEDBACK_SLUG]
    if not docs:
        print("no specs yet")
        return

    raised = clean_runs = blocks = verify_fail = verify_pass = 0
    rows = []
    for path in docs:
        lines = path.read_text().split("\n")
        entries = changelog_entries(lines)
        r = sum(1 for e in entries if DRYRUN_RAISED_RE.match(e))
        c = sum(1 for e in entries if DRYRUN_CLEAN_RE.match(e))
        b = sum(1 for e in entries if BLOCKED_LOG_RE.match(e))
        vp = sum(1 for e in entries if VERIFY_LOG_RE.match(e) and e.endswith("passed"))
        vf = sum(1 for e in entries if VERIFY_LOG_RE.match(e) and e.endswith("failed"))
        raised += r; clean_runs += c; blocks += b; verify_pass += vp; verify_fail += vf
        rows.append((slug_of(path), r, c, b, len(blocked_items(lines)), vf))

    print(f"friction report across {len(docs)} spec(s)")
    for slug, r, c, b, still, vf in rows:
        print(f"  {slug}: dry-run questions={r} clean={c} blocked={b} (open={still}) verify-fail={vf}")

    findings = []
    if clean_runs and raised / clean_runs >= 1.5:
        findings.append(
            f"dry runs average {raised / clean_runs:.1f} raised question(s) per clean run "
            f"across {clean_runs} clean run(s) — Open Questions/Key Decisions may need a "
            f"stronger prompt in the spec template so they surface before the first dry run")
    total_verified = verify_pass + verify_fail
    if total_verified >= 5 and verify_fail / total_verified >= 0.3:
        findings.append(
            f"{verify_fail}/{total_verified} verification attempts failed — criteria may be "
            f"getting written before the implementation they check is ready")
    if blocks >= 3:
        findings.append(
            f"{blocks} item(s) across these specs have needed a human — recurring dependency "
            f"worth encoding as guidance or a template prompt instead of hitting it each time")

    if not findings:
        print("\nno friction pattern crossed the threshold — nothing to raise")
        return

    fpath = SPECS / f"{FEEDBACK_SLUG}{SPEC_SUFFIX}"
    if fpath.exists():
        old = fpath.read_text().split("\n")
    else:
        claim(FEEDBACK_SLUG, "Harness feedback")
        old = (TEMPLATE.read_text().replace("{{SUBJECT}}", "Harness feedback")
               .replace("{{DATE}}", today())).split("\n")
        print(f"\n{fpath}\nslug: {FEEDBACK_SLUG} (created — tracks friction found in this "
              f"project's own use of the harness)")

    already_open = {i.text for i in parse_items(old) if i.prefix == "OQ" and not i.struck}
    new_findings = [f for f in findings if f not in already_open]
    if not new_findings:
        print(f"\nfriction detected but already tracked as open questions on "
              f"'{FEEDBACK_SLUG}' — nothing new to raise")
        return

    new = old
    idents = []
    for f in new_findings:
        new, ident = append_item(new, "Open Questions", "OQ", f, step=False)
        idents.append(ident)
    save(fpath, old, new, f"{', '.join(idents)} raised by feedback")
    print(f"\nraised {', '.join(idents)} on '{FEEDBACK_SLUG}':")
    for ident, f in zip(idents, new_findings):
        print(f"  {ident} {f}")
    print(f"\ninvestigate with: spec.py discover {FEEDBACK_SLUG} {idents[0]} \"<what to look into>\"")


# Harness machinery, relative to sdd/, kept apart from the project's own
# files (SDD_FILES) — and the two things Claude Code / git require at a
# fixed, non-configurable location, relative to the project root (ROOT_FILES).
SDD_FILES = ["scripts/spec.py", "scripts/test_spec.sh", "templates/spec_template.md",
             "templates/discovery_template.md", "README.md"]
ROOT_FILES = [".claude/skills/spec/SKILL.md", ".claude/skills/harness-scaffold/SKILL.md",
              ".gitignore"]


def cmd_scaffold(args: "list[str]") -> None:
    if not args:
        die("usage: spec.py scaffold <target-dir>")
    target = Path(args[0]).expanduser().resolve()
    if target == REPO_ROOT:
        die("target is this harness itself")
    for rel in SDD_FILES:
        src, dst = ROOT / rel, target / "sdd" / rel
        if not src.exists():
            continue
        if dst.exists():
            die(f"{dst} already exists, refusing to overwrite")
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
    for rel in ROOT_FILES:
        src, dst = REPO_ROOT / rel, target / rel
        if not src.exists():
            continue
        if dst.exists():
            die(f"{dst} already exists, refusing to overwrite")
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
    (target / "sdd" / "specs").mkdir(parents=True, exist_ok=True)
    (target / "sdd" / "specs" / ".gitkeep").touch()
    (target / "sdd" / "archive").mkdir(parents=True, exist_ok=True)
    if not (target / "sdd" / "archive" / CATALOG.name).exists():
        (target / "sdd" / "archive" / CATALOG.name).write_text(CATALOG_HEADER)
    print(f"harness ready at {target}/sdd\nnext: python3 {target}/sdd/scripts/spec.py new \"<subject>\"")


def cmd_update(args: "list[str]") -> None:
    """Pull tooling fixes from a source harness checkout into this scaffolded
    copy. Scaffolding is a one-way copy, so a fix made upstream (like this
    command itself) never reaches a project scaffolded before it existed —
    this is the way back. Only tooling files move; specs/ and archive/ (this
    project's own content) are never touched.
    """
    if not args:
        die("usage: spec.py update <path-to-a-harness-checkout>")
    source = Path(args[0]).expanduser().resolve()
    src_root = source / "sdd"
    if not (src_root / "scripts" / "spec.py").exists():
        die(f"'{source}' doesn't look like a harness checkout (no sdd/scripts/spec.py under it)")

    changed = []
    for rel in SDD_FILES:
        src, dst = src_root / rel, ROOT / rel
        if src.exists() and (not dst.exists() or src.read_bytes() != dst.read_bytes()):
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            changed.append(f"sdd/{rel}")
    for rel in ROOT_FILES:
        if rel == ".gitignore":
            continue  # a project's own .gitignore accumulates its own entries
        src, dst = source / rel, REPO_ROOT / rel
        if src.exists() and (not dst.exists() or src.read_bytes() != dst.read_bytes()):
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            changed.append(rel)

    if not changed:
        print("already up to date")
    else:
        print("updated:\n  " + "\n  ".join(changed))
        print("\nreview the diff before committing — nothing under sdd/specs/ or "
              "sdd/archive/ was touched")


COMMANDS = {
    "new": cmd_new, "list": cmd_list, "show": cmd_show, "add": cmd_add,
    "strike": cmd_strike, "resolve": cmd_resolve, "supersede": cmd_supersede,
    "check": cmd_check, "verify": cmd_verify, "status": cmd_status, "split": cmd_split,
    "discover": cmd_discover, "apply": cmd_apply,
    "defer": cmd_defer, "archive": cmd_archive, "repair": cmd_repair,
    "block": cmd_block, "unblock": cmd_unblock, "dryrun": cmd_dryrun, "next": cmd_next,
    "feedback": cmd_feedback, "scaffold": cmd_scaffold, "update": cmd_update,
}

USAGE = """spec.py — append-only specs with permanent item IDs

  new "<subject>"                    create a spec
  next [<slug>]                      what to do now; exit 2 nothing to do, 3 halted
  list                               every spec as a tree: status, open counts
  list --archived                    the archive catalog: one summary per closed spec
  show <slug> [section] [--log]      print a spec, one section, or all of it
  show --archived <slug>             print a closed spec, read out of the zip
  add <slug> <section> "<text>"      append an item, print its new ID
      [--check "<command>"]          on a criterion: the command that checks it
  strike <slug> <ID> "<reason>"      strike an item in place (never deletes)
  resolve <slug> <OQ-N> "<decision>" append a decision, strike the question, link both
  supersede <slug> <KD-N> "<what>"   append a decision that replaces an older one
  check <slug> <IMPL-N> [...]        tick implementation items done
  verify <slug> <VC-N> pass|fail "<evidence>"
                                     record a verification verdict, with evidence
  status <slug> [<status>]           read or set the status; Done needs every VC passed
  split <slug> <IMPL-N> "<subject>"  give an item its own subspec (one level only)
  discover <slug> <OQ-N> "<subject>" open a discovery on a hard question
  apply <discovery-slug>             fold its proposals into the parent, then archive it
  dryrun <slug> --raised "<q>"       a question the rehearsal surfaced
  dryrun <slug> --clean "<summary>"  the rehearsal turned up nothing; cleared to implement
  block <slug> <ID> "<why>"          mark an item as needing a human, and skip it
  unblock <slug> <ID> "<answer>"     the human answered; carry on
  defer <slug> <ID> "<why>"          set scope aside into Non-Goals, linked both ways
  archive <slug> "<summary>"         close it: delete from the tree, summary to the catalog
  feedback [<slug>]                  mine changelogs for friction; raise it on 'harness-feedback'
  repair <slug>                      recover a damaged document; quarantines, never deletes
  scaffold <target-dir>              copy this harness into a new project
  update <harness-checkout>          pull tooling fixes from a source harness; never touches specs/

spec sections:      """ + ", ".join(SECTIONS) + """
statuses:           """ + ", ".join(STATUSES) + """
discovery sections: """ + ", ".join(DISCOVERY_SECTIONS)


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(USAGE)
        return 0
    command = sys.argv[1]
    if command not in COMMANDS:
        print(f"error: unknown command '{command}'\n\n{USAGE}", file=sys.stderr)
        return 1
    # One writer at a time: save() is read-verify-write, so parallel agents on
    # one project would otherwise lose each other's items while reporting success.
    SPECS.mkdir(parents=True, exist_ok=True)
    with LOCK.open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        COMMANDS[command](sys.argv[2:])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
