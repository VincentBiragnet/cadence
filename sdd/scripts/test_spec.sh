#!/usr/bin/env bash
# End-to-end test for the spec harness. Runs against a throwaway copy of the
# harness in a temp dir, so it never touches real specs.
set -uo pipefail

HARNESS="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
python3 "$HARNESS/scripts/spec.py" scaffold "$WORK/proj" >/dev/null || exit 1
git -C "$WORK/proj" init -q && git -C "$WORK/proj" add -A \
  && git -C "$WORK/proj" -c user.email=t@t -c user.name=t commit -qm init
commit_all() { git -C "$WORK/proj" add -A; git -C "$WORK/proj" -c user.email=t@t -c user.name=t commit -qm x; }
SPEC="python3 $WORK/proj/sdd/scripts/spec.py"
FILE="$WORK/proj/sdd/specs/pick-a-datastore.spec.md"
FAILED=0

ok() { printf '  ok    %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; FAILED=1; }
check() { if [ "$2" = "$3" ]; then ok "$1"; else fail "$1: expected [$3], got [$2]"; fi; }
grep_ok() { if grep -qF -e "$2" "$FILE"; then ok "$1"; else fail "$1: no line matching [$2]"; fi; }

echo "1. a new spec starts in Draft"
$SPEC new "Pick a datastore" >/dev/null
check "status reads back" "$($SPEC status pick-a-datastore)" "Draft"

echo "2. ids are allocated in order"
check "first question"  "$($SPEC add pick-a-datastore questions 'Which database?')"           "OQ-1"
check "second question" "$($SPEC add pick-a-datastore questions 'Offline mode?')"             "OQ-2"
check "first item"      "$($SPEC add pick-a-datastore implementation 'Pick the datastore')"   "IMPL-1"
check "second item"     "$($SPEC add pick-a-datastore implementation 'Write the migration')"  "IMPL-2"
check "third item"      "$($SPEC add pick-a-datastore implementation 'Benchmark Postgres')"   "IMPL-3"
check "a goal"          "$($SPEC add pick-a-datastore goals 'Survive a laptop reboot')"       "G-1"

echo "3. one question resolves into several decisions"
$SPEC resolve pick-a-datastore OQ-1 'Use Postgres' >/dev/null
$SPEC resolve pick-a-datastore OQ-1 'WAL mode enabled' >/dev/null
grep_ok "question struck once, pointing at both decisions" '- **OQ-1** ~~Which database?~~ → KD-1, KD-2'
grep_ok "first decision back-references the question"      '- **KD-1** Use Postgres (OQ-1)'
grep_ok "second decision back-references the question"     '- **KD-2** WAL mode enabled (OQ-1)'
grep_ok "unrelated question untouched"                     '- **OQ-2** Offline mode?'

echo "4. decisions can be superseded"
$SPEC supersede pick-a-datastore KD-1 'SQLite — local-only, no server to run' >/dev/null
grep_ok "old decision struck, text intact" '- **KD-1** ~~Use Postgres (OQ-1)~~ → superseded by KD-3'
grep_ok "new decision recorded"            '- **KD-3** SQLite — local-only, no server to run (supersedes KD-1)'

echo "5. status is a header line, changed freely and logged"
$SPEC check pick-a-datastore IMPL-1 >/dev/null
$SPEC strike pick-a-datastore IMPL-3 'dropped, see KD-3' >/dev/null
$SPEC status pick-a-datastore Ready >/dev/null
grep_ok "status line updated in the header" '**Status:** Ready'
grep_ok "no Status section remains"         '## Implementation Details'
if grep -q '^## Status' "$FILE"; then fail "the Status section should be gone"; else ok "no Status section"; fi
grep_ok "both transitions logged" '- 2'
$SPEC status pick-a-datastore Draft >/dev/null \
  && ok "status can move backwards" || fail "status should allow going back"
check "reads back" "$($SPEC status pick-a-datastore)" "Draft"
OUT="$($SPEC status pick-a-datastore "In Progress" 2>&1)"
case "$OUT" in *"not cleared to implement"*) ok "In Progress needs a clean dry run";; *) fail "expected the dry-run gate, got: $OUT";; esac
$SPEC resolve pick-a-datastore OQ-2 'No offline mode' >/dev/null
$SPEC dryrun pick-a-datastore --clean 'walked the migration through' >/dev/null
$SPEC status pick-a-datastore "In Progress" >/dev/null \
  && ok "and passes once rehearsed" || fail "In Progress should be allowed after a clean dry run"
OUT="$($SPEC status pick-a-datastore Done 2>&1 >/dev/null)"
case "$OUT" in *IMPL-2*) ok "moving to Done warns about open items";; *) fail "expected a warning naming IMPL-2";; esac
check "warning did not block" "$($SPEC status pick-a-datastore)" "Done"
grep_ok "done item survived"           '- [x] **IMPL-1** Pick the datastore'
grep_ok "dropped item survived struck" '- [ ] **IMPL-3** ~~Benchmark Postgres~~ → dropped, see KD-3'

echo "6. ids are never reused"
check "next item continues the sequence" "$($SPEC add pick-a-datastore implementation 'Ship it')" "IMPL-4"

echo "7. subspecs, one level deep"
$SPEC add pick-a-datastore implementation 'Build the auth layer' >/dev/null   # IMPL-5
$SPEC split pick-a-datastore IMPL-5 'Auth layer' >/dev/null
grep_ok "parent item links to the subspec" '- [ ] **IMPL-5** Build the auth layer → spec:auth-layer'
CHILD="$WORK/proj/sdd/specs/auth-layer.spec.md"
grep -qF -e '**Parent:** pick-a-datastore (IMPL-5)' "$CHILD" \
  && ok "child records its parent" || fail "child should record its parent"
$SPEC add auth-layer implementation 'Hash passwords' >/dev/null
OUT="$($SPEC split auth-layer IMPL-1 'Password hashing' 2>&1)"
case "$OUT" in *"too big"*) ok "a subspec cannot have subspecs, and the error says why";;
  *) fail "splitting a subspec should be refused, got: $OUT";; esac
OUT="$($SPEC check pick-a-datastore IMPL-5 2>&1 >/dev/null)"
case "$OUT" in *"not Done yet"*) ok "checking an item whose subspec is unfinished warns";;
  *) fail "expected a subspec warning, got: $OUT";; esac
$SPEC list | grep -q '└ auth-layer' && ok "list nests the subspec" || fail "list should nest subspecs"

echo "8. deferring scope into Non-Goals"
$SPEC add pick-a-datastore implementation 'Replace the taps too' >/dev/null   # IMPL-6
$SPEC defer pick-a-datastore IMPL-6 'after v1' >/dev/null
grep_ok "deferred item struck, pointing at the non-goal" '- [ ] **IMPL-6** ~~Replace the taps too~~ → deferred to NG-1'
grep_ok "non-goal records it, with the reason"           '- **NG-1** Replace the taps too — after v1 (was IMPL-6)'

echo "9. verification criteria gate Done"
check "a criterion"  "$($SPEC add pick-a-datastore verification 'Kill power mid-write, no committed data lost (G-1)')" "VC-1"
check "another"      "$($SPEC add pick-a-datastore verification 'No server process required')"                        "VC-2"
$SPEC status pick-a-datastore "In Progress" >/dev/null 2>&1
OUT="$($SPEC status pick-a-datastore Done 2>&1)"
case "$OUT" in *"not passed"*) ok "Done is blocked while criteria are unpassed";; *) fail "expected a block, got: $OUT";; esac
check "status unchanged by the block" "$($SPEC status pick-a-datastore)" "In Progress"
OUT="$($SPEC check pick-a-datastore VC-1 2>&1)"
case "$OUT" in *"needs evidence"*) ok "check refuses a VC and points at verify";; *) fail "check should refuse VCs, got: $OUT";; esac
$SPEC verify pick-a-datastore VC-1 fail 'lost the last 2 writes' >/dev/null
grep_ok "a failed verdict is recorded" '- [ ] **VC-1** Kill power mid-write, no committed data lost (G-1) → failed 2'
$SPEC verify pick-a-datastore VC-1 pass 'fsync added; 200 kill cycles, no loss' >/dev/null
TODAY="$(date +%F)"
grep_ok "the failure survives the later pass" "failed $TODAY (attested: lost the last 2 writes), passed $TODAY" 
grep_ok "and the box is now ticked"          '- [x] **VC-1** Kill power'
OUT="$($SPEC status pick-a-datastore Done 2>&1)"
case "$OUT" in *"not passed"*) ok "still blocked by the second criterion";; *) fail "VC-2 should still block, got: $OUT";; esac
$SPEC verify pick-a-datastore VC-2 pass 'ps shows no daemon; single .db file' >/dev/null
$SPEC status pick-a-datastore Done >/dev/null 2>&1
check "Done once every criterion passed" "$($SPEC status pick-a-datastore)" "Done"
$SPEC list | grep -q 'no criterion for G-1' && fail "G-1 is covered by VC-1" || ok "a covered goal is not flagged"
$SPEC add pick-a-datastore goals 'Restore from backup in under an hour' >/dev/null
$SPEC list | grep -q 'no criterion for G-2' && ok "a goal with no criterion is flagged" || fail "expected a coverage nudge"

echo "10. discoveries: investigate a hard question, then fold it back"
$SPEC add pick-a-datastore questions 'Which backup format?' >/dev/null   # OQ-3
$SPEC discover pick-a-datastore OQ-3 'Backup formats' >/dev/null
grep_ok "the question points at its discovery" '- **OQ-3** Which backup format? → discovery:backup-formats'
DISC="$WORK/proj/sdd/specs/backup-formats.discovery.md"
[ -f "$DISC" ] && ok "written as .discovery.md" || fail "expected a .discovery.md file"
grep -qF -e '**Discovery for:** pick-a-datastore (OQ-3)' "$DISC" \
  && ok "records the question it serves" || fail "expected a Discovery for header"
check "state of the art"  "$($SPEC add backup-formats state-of-the-art 'pg_dump uses plain SQL — https://example.org/pgdump')" "SOTA-1"
check "a sub-question"    "$($SPEC add backup-formats questions 'Do we need point-in-time recovery?')"                        "OQ-1"
check "a proposed decision" "$($SPEC add backup-formats decisions 'Plain SQL dumps — restorable without our code')"           "PD-1"
check "a proposed criterion" "$($SPEC add backup-formats criteria 'Restore a dump on a clean machine in under an hour')"      "PC-1"
OUT="$($SPEC add backup-formats goals 'x' 2>&1)"
case "$OUT" in *"unknown discovery section"*) ok "spec sections are rejected on a discovery";; *) fail "expected a section error, got: $OUT";; esac
OUT="$($SPEC discover backup-formats OQ-1 'Deeper' 2>&1)"
case "$OUT" in *"too broad"*) ok "a discovery cannot open a discovery";; *) fail "expected a depth refusal, got: $OUT";; esac
$SPEC list | grep -q 'discovery' && ok "list marks it as a discovery" || fail "list should mark discoveries"
commit_all
$SPEC apply backup-formats >/dev/null 2>/dev/null \
  && ok "apply exits clean" || fail "apply should succeed and exit 0" 
grep_ok "the proposal landed as a decision"  '**KD-5** Plain SQL dumps — restorable without our code (OQ-3 via discovery:backup-formats)'
grep_ok "the criterion landed too"           '**VC-3** Restore a dump on a clean machine in under an hour'
grep_ok "the question is resolved, trail intact" '- **OQ-3** ~~Which backup format?~~ → discovery:backup-formats, KD-5'
[ ! -f "$DISC" ] && ok "the discovery is gone from specs/" || fail "apply should archive the discovery"
CAT="$WORK/proj/sdd/archive/catalog.md"
grep -qF -e '## backup-formats' "$CAT" && ok "catalogued by name" || fail "expected a catalog line"
grep -qF -e 'Plain SQL dumps' "$CAT" \
  && fail "a discovery should get a bare catalog line, not a summary" || ok "no summary body for a discovery"
$SPEC show --archived backup-formats | grep -q 'SOTA-1' \
  && ok "recoverable from git on request" || fail "the discovery should be readable via git"

echo "10b. apply refuses before touching the parent, not after"
$SPEC add pick-a-datastore questions 'Which cache?' >/dev/null   # OQ-4
$SPEC discover pick-a-datastore OQ-4 'Cache choice' >/dev/null
$SPEC add cache-choice decisions 'Redis' >/dev/null
# deliberately NOT committed: apply must fail on the discovery's own git
# state before it ever writes to pick-a-datastore.spec.md
OUT="$($SPEC apply cache-choice 2>&1)"
case "$OUT" in *"uncommitted changes"*) ok "apply refuses an uncommitted discovery";; *) fail "expected the uncommitted-changes refusal, got: $OUT";; esac
KD_COUNT_BEFORE=$(grep -c '^- \*\*KD-' "$FILE")
commit_all
$SPEC apply cache-choice >/dev/null
KD_COUNT_AFTER=$(grep -c '^- \*\*KD-' "$FILE")
check "the failed attempt left no partial decision behind" "$KD_COUNT_AFTER" "$((KD_COUNT_BEFORE + 1))"

echo "11. archiving is a move, and git holds the text"
$SPEC status auth-layer Done >/dev/null 2>&1
commit_all
BEFORE_ARCHIVE="$(cat "$CHILD")"
$SPEC archive auth-layer 'Auth layer built; nothing outstanding.' >/dev/null \
  && ok "archive exits clean" || fail "archive should succeed and exit 0" 
[ ! -f "$CHILD" ] && ok "removed from specs/" || fail "should have left specs/"
check "git returns it byte for byte" "$($SPEC show --archived auth-layer)" "$BEFORE_ARCHIVE"
grep -qF -e '## auth-layer' "$CAT" && ok "catalogued" || fail "expected a catalog entry"
grep -qF -e 'Auth layer built; nothing outstanding.' "$CAT" \
  && ok "summary lives in the catalog" || fail "expected the summary in the catalog"
grep -qF -e '**Parent:** pick-a-datastore (IMPL-5)' "$CAT" \
  && ok "catalog records status and parent" || fail "expected parent in the catalog entry"
grep -q '\*\*Commit:\*\*' "$CAT" && ok "records the commit that holds it" || fail "expected a commit reference"
$SPEC list | grep -q 'auth-layer' && fail "archived spec should not appear in list" || ok "hidden from list"
$SPEC list --archived | grep -q 'auth-layer' && ok "list --archived reads the catalog" || fail "expected catalog listing"
OUT="$($SPEC show auth-layer 2>&1)"
case "$OUT" in *archived*) ok "points you at --archived";; *) fail "expected an archived hint, got: $OUT";; esac
OUT="$($SPEC add auth-layer questions 'reopen?' 2>&1)"
case "$OUT" in *archived*) ok "archived specs are closed to edits";; *) fail "editing an archived spec should be refused";; esac
OUT="$($SPEC new "Auth layer" 2>&1)"
case "$OUT" in *"names an archived document"*) ok "an archived name cannot be recycled";; *) fail "expected a name collision refusal, got: $OUT";; esac
$SPEC new "Uncommitted" >/dev/null; $SPEC status uncommitted Done >/dev/null 2>&1
OUT="$($SPEC archive uncommitted 'never committed' 2>&1)"
case "$OUT" in *"uncommitted changes"*) ok "refuses to archive what git does not hold";; *) fail "expected an uncommitted refusal, got: $OUT";; esac

echo "12. a spec that lost an item is rejected, and left alone"
CORRUPT="$WORK/proj/sdd/specs/corrupt.spec.md"
$SPEC new "Corrupt" >/dev/null
$SPEC add corrupt questions 'Keep me' >/dev/null
$SPEC add corrupt questions 'Delete me' >/dev/null
sed -i '/^- \*\*OQ-1\*\*/d' "$CORRUPT"
BEFORE="$(cat "$CORRUPT")"
if $SPEC add corrupt questions 'Another' >/dev/null 2>&1; then
  fail "a write over a spec missing OQ-1 should be refused"
else
  ok "write refused"
fi
check "file left untouched" "$(cat "$CORRUPT")" "$BEFORE"

echo "13. input that would forge or hide items is refused"
$SPEC new "Hardening" >/dev/null
OUT="$($SPEC add hardening questions "$(printf 'Real\n- **OQ-9** forged')" 2>&1)"
case "$OUT" in *"single line"*) ok "a newline in item text is refused";; *) fail "newline should be refused, got: $OUT";; esac
OUT="$($SPEC add hardening verification '~~Kill power, no data lost~~' 2>&1)"
case "$OUT" in *"struck-through"*) ok "an item born struck is refused";; *) fail "struck-at-creation should be refused, got: $OUT";; esac
OUT="$($SPEC add hardening questions 'A → B' 2>&1)"
case "$OUT" in *"separates an item"*) ok "an arrow in item text is refused";; *) fail "arrow should be refused, got: $OUT";; esac
OUT="$($SPEC add ../../../evil goals 'escape' 2>&1)"
case "$OUT" in *"is not a slug"*) ok "a path-traversal slug is refused";; *) fail "slug should be validated, got: $OUT";; esac
check "the spec is unharmed" "$($SPEC add hardening questions 'A real one')" "OQ-1"

echo "14. a deleted top ID is detected, and never reissued"
$SPEC new "Ledger" >/dev/null
for q in A B C; do $SPEC add ledger questions "$q" >/dev/null; done
sed -i '/^- \*\*OQ-3\*\*/d' "$WORK/proj/sdd/specs/ledger.spec.md"
$SPEC list | grep -q 'broken IDs: OQ-3' && ok "deleting the highest ID is detected" || fail "expected OQ-3 flagged"
OUT="$($SPEC repair ledger 2>&1)"
case "$OUT" in *"OQ-3 was issued but is gone"*) ok "repair reports the loss";; *) fail "expected a loss report, got: $OUT";; esac
check "the number stays retired" "$($SPEC add ledger questions 'new one')" "OQ-4"

echo "15. repair rescues a spec no command could otherwise touch"
$SPEC new "Wrecked" >/dev/null
W="$WORK/proj/sdd/specs/wrecked.spec.md"
$SPEC add wrecked questions 'Genuine' >/dev/null
sed -i 's/^- \*\*OQ-1\*\* Genuine$/- **OQ-1** Genuine\n- **OQ-9** forged/' "$W"
OUT="$($SPEC add wrecked questions 'blocked' 2>&1)"
case "$OUT" in *"already damaged"*) ok "a damaged spec is frozen";; *) fail "expected the damage guard, got: $OUT";; esac
OUT="$($SPEC repair wrecked 2>&1)"
case "$OUT" in *"usable again"*) ok "repair unfreezes it";; *) fail "repair should recover it, got: $OUT";; esac
grep -qF -e '## Damaged' "$W" && ok "the forged line is quarantined, not deleted" || fail "expected a Damaged section"
grep -qF -e '- **OQ-9** forged' "$W" && ok "and is still readable" || fail "quarantined text should survive"
check "work resumes" "$($SPEC add wrecked questions 'after repair')" "OQ-2"

echo "16. concurrent writes do not lose items"
$SPEC new "Parallel" >/dev/null
for i in 1 2 3 4 5 6 7 8; do $SPEC add parallel questions "q$i" >/dev/null 2>&1 & done
wait
check "all eight survive" "$(grep -c '^- \*\*OQ-' "$WORK/proj/sdd/specs/parallel.spec.md")" "8"
$SPEC list | grep parallel | grep -q 'broken' && fail "concurrent writes corrupted the ledger" || ok "ledger intact"

echo "17. a failed criterion revokes Done, and waivers stay visible"
$SPEC new "Revoke" >/dev/null
$SPEC add revoke verification 'Survives a restart' >/dev/null
$SPEC verify revoke VC-1 pass 'restarted 50 times' >/dev/null
$SPEC status revoke Done >/dev/null 2>&1
check "Done after passing" "$($SPEC status revoke)" "Done"
OUT="$($SPEC verify revoke VC-1 fail 'regression: crashes on restart' 2>&1)"
case "$OUT" in *"it is not"*) ok "a later failure warns that Done is false";; *) fail "expected a revocation warning, got: $OUT";; esac
check "and demotes the status" "$($SPEC status revoke)" "In Progress"
$SPEC strike revoke VC-1 'hardware retired, criterion moot' >/dev/null
OUT="$($SPEC status revoke Done 2>&1)"
case "$OUT" in *"struck rather than passed"*) ok "striking a criterion is reported as a waiver";; *) fail "expected a waiver warning, got: $OUT";; esac
$SPEC list | grep revoke | grep -q '1 struck' && ok "and list keeps showing it" || fail "expected the waiver in list"

echo "18. show omits the changelog by default"
$SPEC show revoke | grep -q 'entries — `show' && ok "changelog summarised" || fail "expected a changelog summary"
$SPEC show revoke --log | grep -q 'VC-1 passed' && ok "--log prints it in full" || fail "expected full changelog"

echo "19. next drives the loop, in the right order"
$SPEC new "Loop" >/dev/null
$SPEC next loop | grep -q 'has no goals' && ok "an empty spec is told to state goals" || fail "expected the goals rung"
$SPEC add loop goals 'Restores cleanly' >/dev/null
$SPEC add loop questions 'Which format?' >/dev/null
$SPEC next loop | head -1 | grep -q 'OQ-1 is unanswered' \
  && ok "an open question outranks everything else" || fail "expected the question first"
OUT="$($SPEC status loop "In Progress" 2>&1)"
case "$OUT" in *"not cleared"*) ok "implementation is gated on the rehearsal";; *) fail "expected the dry-run gate, got: $OUT";; esac
$SPEC resolve loop OQ-1 'Plain SQL' >/dev/null
$SPEC next loop | head -1 | grep -q 'not cleared to implement' \
  && ok "with questions answered, the rehearsal is next" || fail "expected the dry-run rung"
check "a rehearsal question is filed" "$($SPEC dryrun loop --raised 'Where do dumps live?' | head -1)" "OQ-2"
OUT="$($SPEC dryrun loop --clean 'walked it' 2>&1)"
case "$OUT" in *"still open"*) ok "a rehearsal cannot be clean with questions open";; *) fail "expected a refusal, got: $OUT";; esac
$SPEC resolve loop OQ-2 'In ./backups' >/dev/null
$SPEC dryrun loop --clean 'dump, transfer, restore' >/dev/null
$SPEC status loop "In Progress" >/dev/null && ok "a clean rehearsal opens the gate" || fail "In Progress should be allowed now"
$SPEC add loop verification 'A dump restores (G-1)' --check 'true' >/dev/null
grep -qF -e '**VC-1** A dump restores (G-1) `true`' "$WORK/proj/sdd/specs/loop.spec.md" \
  && ok "the check command rides on the item" || fail "expected the command in the item text"
OUT="$($SPEC verify loop VC-1 pass 'looks right to me' 2>&1)"
case "$OUT" in *"not from your judgement"*) ok "a checkable criterion cannot be attested";; *) fail "expected a refusal, got: $OUT";; esac
$SPEC verify loop VC-1 --run >/dev/null
grep -qF -e '→ passed' "$WORK/proj/sdd/specs/loop.spec.md" && ok "running it records the verdict" || fail "expected a passed verdict"
grep -qF -e 'ran: exit 0' "$WORK/proj/sdd/specs/loop.spec.md" \
  && ok "with evidence the agent did not write" || fail "expected the exit code as evidence"
$SPEC next loop | grep -q 'complete and verified' && ok "then it offers Done" || fail "expected the Done rung"

echo "20. a question only a human can answer halts the task, loudly"
$SPEC add loop implementation 'Countersign the contract' >/dev/null
$SPEC block loop IMPL-1 'needs a director signature' >/dev/null
$SPEC next loop >/dev/null; [ "$?" = "3" ] && ok "next halts with its own exit code" || fail "expected exit 3"
OUT="$($SPEC next loop 2>&1)"
case "$OUT" in *"gap in the spec"*) ok "and names it as a spec gap, not an agent failure";; *) fail "expected the halt framing, got: $OUT";; esac
case "$OUT" in *"needs a director signature"*) ok "quoting why it is stuck";; *) fail "expected the reason";; esac
OUT="$($SPEC status loop Done 2>&1)"
case "$OUT" in *"waiting on a human"*) ok "and Done is refused while it waits";; *) fail "expected Done to be blocked, got: $OUT";; esac
$SPEC unblock loop IMPL-1 'director signed on the 19th' >/dev/null
$SPEC check loop IMPL-1 >/dev/null
$SPEC next loop | grep -q 'complete and verified' && ok "unblocking resumes the loop" || fail "expected work to resume"

echo "21. the scaffolded copy is self-contained"
if grep -rqF "$HARNESS" "$WORK/proj" 2>/dev/null; then
  fail "scaffolded harness references its origin path"
else
  ok "no reference back to the source harness"
fi

echo "22. feedback mines changelogs for friction, below threshold does nothing"
OUT="$($SPEC feedback pick-a-datastore 2>&1)"
case "$OUT" in *"nothing to raise"*) ok "quiet spec produces no finding";; *) fail "expected no finding, got: $OUT";; esac
[ -f "$WORK/proj/sdd/specs/harness-feedback.spec.md" ] && fail "should not create harness-feedback below threshold" \
  || ok "no meta-spec created below threshold"

echo "23. repeated dry-run cycles raise a finding on the harness's own meta-spec"
$SPEC new "Flaky widget" >/dev/null
$SPEC dryrun flaky-widget --raised 'q1' >/dev/null
$SPEC resolve flaky-widget OQ-1 'a1' >/dev/null
$SPEC dryrun flaky-widget --raised 'q2' >/dev/null
$SPEC resolve flaky-widget OQ-2 'a2' >/dev/null
$SPEC dryrun flaky-widget --clean 'ok' >/dev/null
OUT="$($SPEC feedback flaky-widget 2>&1)"
case "$OUT" in *"raised OQ-1 on 'harness-feedback'"*) ok "friction crosses threshold and is raised";; *) fail "expected a finding, got: $OUT";; esac
[ -f "$WORK/proj/sdd/specs/harness-feedback.spec.md" ] && ok "meta-spec created" || fail "meta-spec not created"

echo "24. feedback is idempotent — the same finding is not raised twice"
OUT="$($SPEC feedback flaky-widget 2>&1)"
case "$OUT" in *"already tracked as open questions"*) ok "rerun recognizes the finding is already open";; *) fail "expected idempotent skip, got: $OUT";; esac
LOG_COUNT=$(grep -c 'raised by feedback' "$WORK/proj/sdd/specs/harness-feedback.spec.md")
check "only one changelog entry from feedback" "$LOG_COUNT" "1"

echo "25. the raised question follows the normal discover lifecycle"
OUT="$($SPEC discover harness-feedback OQ-1 'look into dry-run friction' 2>&1)"
case "$OUT" in *"look-into-dry-run-friction"*) ok "discover opens on the meta-spec like any other question";; *) fail "expected discover to work, got: $OUT";; esac

echo
[ "$FAILED" = 0 ] && echo "all tests passed" || echo "TESTS FAILED"
exit "$FAILED"
