// <cadence-program> — a title plus a list of entries, each pairing a
// position in the program with a sequence-clock config. The user picks one
// entry and runs it (not a forced walk-through of the whole list, G-2); a
// fresh, *visible* <cadence-sequence> is mounted in place of the list while
// it runs (unlike sequence-clock's own headless reuse of the atomic clock —
// here the user genuinely watches it, KD-6).
//
// A position is a week and a day, never a date (KD-2): day 1 is Monday,
// day 7 is Sunday, so "week 3, day 1" is a Monday whatever the calendar
// says. Dates are computed, not authored:
//
//   const prog = document.createElement('cadence-program');
//   prog.configure({
//     title: "Eight weeks",
//     entries: [
//       { week: 1, day: 1, sequence: { title: "Leg day", blocks: [...] } },
//     ],
//   });
//
// The first time any entry is launched, that day becomes the anchor and
// every entry gets an expectedDate (KD-12). Completing an entry records the
// day it really ran and slides the rest of the program by however late (or
// early) that was, so the intervals the author planned are preserved
// (KD-4, KD-9). Nothing is ever "missed" (KD-5).
//
// A classic script (KD-10) — file:// blocks module scripts via CORS and
// this file needs no import/export. Requires cadence-clock.js and
// cadence-sequence.js to already be loaded.

const CDP_STORAGE_KEY = 'cadence-program';
const CDP_MS_PER_DAY = 86400000;
const CDP_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CDP_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Days from the Monday of week 1 to this entry's authored position.
function cdpOffset(entry) {
  return (entry.week - 1) * 7 + (entry.day - 1);
}

// KD-16: a date is a YYYY-MM-DD string and arithmetic happens on a whole
// number of days, never on a local Date — a local Date crossing a
// daylight-saving boundary is 23 or 25 hours long and would drift.
function cdpToDayNumber(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / CDP_MS_PER_DAY);
}

function cdpFromDayNumber(n) {
  const d = new Date(n * CDP_MS_PER_DAY);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// 1 = Monday … 7 = Sunday, matching the authored day numbering (KD-2).
function cdpIsoDay(dayNumber) {
  const dow = new Date(dayNumber * CDP_MS_PER_DAY).getUTCDay();
  return dow === 0 ? 7 : dow;
}

// "Today" is the user's own calendar day, so it is read from a local Date —
// but only its parts are used, which is what keeps it DST-safe (KD-16).
function cdpToday() {
  const now = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

class CadenceProgram extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this._runningSeq = null;
  }

  connectedCallback() {
    if (!this._titleEl) this._render();
  }

  _render() {
    this.innerHTML = `
      <div class="cdp-title"></div>
      <div class="cdp-list">
        <select class="cdp-select"></select>
        <button type="button" class="cdp-start">Start</button>
        <button type="button" class="cdp-export">Export</button>
        <button type="button" class="cdp-replan">Replanning prompt</button>
        <label class="cdp-load-label">Load
          <input type="file" class="cdp-load" accept="application/json">
        </label>
        <!-- KD-23: last, so the one irreversible control is never the
             neighbour of the one pressed every day, in the tab order or
             under a thumb. The confirmation is still the gate. -->
        <button type="button" class="cdp-drop">Drop</button>
      </div>
      <div class="cdp-run" hidden>
        <button type="button" class="cdp-back">Back</button>
      </div>
      <div class="cdp-overrun" hidden></div>
      <div class="cdp-live" aria-live="polite"></div>
    `;
    this._titleEl = this.querySelector('.cdp-title');
    this._listEl = this.querySelector('.cdp-list');
    this._selectEl = this.querySelector('.cdp-select');
    this._startEl = this.querySelector('.cdp-start');
    this._dropEl = this.querySelector('.cdp-drop');
    this._exportEl = this.querySelector('.cdp-export');
    this._replanEl = this.querySelector('.cdp-replan');
    this._overrunEl = this.querySelector('.cdp-overrun');
    this._loadEl = this.querySelector('.cdp-load');
    this._runEl = this.querySelector('.cdp-run');
    this._backEl = this.querySelector('.cdp-back');
    this._liveEl = this.querySelector('.cdp-live');

    this._startEl.addEventListener('click', () => this._launch());
    this._backEl.addEventListener('click', () => this._abandon());
    this._dropEl.addEventListener('click', () => this._drop());
    this._exportEl.addEventListener('click', () => this._export());
    this._replanEl.addEventListener('click', () => this._exportReplanningPrompt());
    this._loadEl.addEventListener('change', () => this._load());
  }

  // The public JS entry point. Stored run state wins over the config it is
  // handed when they are the same program (KD-8) — that is what makes a
  // page reload resume rather than restart.
  configure(config, options) {
    this._validate(config);
    if (!this._titleEl) this._render();
    this._adopt(config, options || {});
  }

  set config(value) { this.configure(value); }
  get config() { return this._config; }

  // IMPL-1: a position is a week and a day. plannedDatetime is what this
  // shape replaced, so it is rejected by name rather than ignored — an old
  // program silently listing nothing would be worse than an error. The
  // computed expectedDate/actualDate are *not* rejected: an export carries
  // them and must load back as a program (KD-18).
  _validate(config) {
    if (!config || !Array.isArray(config.entries) || config.entries.length === 0) {
      throw new Error('cadence-program: config.entries must be a non-empty array');
    }
    config.entries.forEach((e, i) => {
      if (e.plannedDatetime !== undefined) {
        throw new Error(`cadence-program: entry ${i} carries plannedDatetime; use week and day instead`);
      }
      if (!Number.isInteger(e.week) || e.week < 1) {
        throw new Error(`cadence-program: entry ${i} needs an integer week of 1 or more`);
      }
      if (!Number.isInteger(e.day) || e.day < 1 || e.day > 7) {
        throw new Error(`cadence-program: entry ${i} needs a day from 1 (Monday) to 7 (Sunday)`);
      }
      // KD-9: a milestone is pinned to a real date — without one there is
      // nothing to pin and it is simply a session. KD-13: it carries its own
      // title, since a marker milestone has no sequence to take one from.
      if (e.milestone) {
        if (!CDP_DATE.test(e.date || '')) {
          throw new Error(`cadence-program: entry ${i} is a milestone and needs a date of the form YYYY-MM-DD`);
        }
        if (!e.title && !(e.sequence && e.sequence.title)) {
          throw new Error(`cadence-program: entry ${i} is a milestone and needs a title`);
        }
      } else if (e.date !== undefined) {
        throw new Error(`cadence-program: entry ${i} carries a date but is not a milestone`);
      } else if (!e.sequence) {
        // Only a milestone may have nothing to play (KD-8, KD-22); a session
        // with no sequence would hide a broken program until it was started.
        throw new Error(`cadence-program: entry ${i} needs a sequence to run`);
      }
    });
  }

  _earliestMilestone() {
    return this._config.entries
      .filter((e) => e.milestone)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))[0] || null;
  }

  _title(entry) {
    return entry.title || (entry.sequence && entry.sequence.title) || 'Untitled';
  }

  // A session is settled once it has been run or dropped: KD-12 puts a drop
  // alongside a completion for the backward-shift gate, because a dropped
  // session is resolved — just not by doing it — and counting it as
  // outstanding would disable every later pull-forward for good.
  _settled(entry) {
    return Boolean(entry.actualDate || entry.dropped);
  }

  // KD-11: only one program is part-run at a time, so taking on a different
  // one replaces what is stored — and says so first, since that discards
  // real work. Declining keeps the stored program, which is the whole point
  // of asking.
  _adopt(config, options) {
    const stored = this._readStored();
    // KD-5: a Load is an explicit act, so it replaces the whole stored state,
    // history included, once the warning is accepted — that is what lets a
    // replanned program come back in over one already in progress. A
    // page-load configure is not an act of intent, so it still restores what
    // was stored; otherwise reopening the app would wipe your progress.
    if (options.viaLoad) {
      if (stored && this._isPartRun(stored)
          && !window.confirm(this._replaceWarning(config, stored, 'Loading'))) {
        this._config = stored;
      } else {
        this._config = config;
        this._writeStored();
      }
    } else if (stored && stored.title === config.title) {
      this._config = stored;
    } else if (stored && this._isPartRun(stored)) {
      const ok = window.confirm(this._replaceWarning(config, stored, 'Starting'));
      this._config = ok ? config : stored;
      if (ok) this._writeStored();
    } else {
      this._config = config;
      this._writeStored();
    }
    this._titleEl.textContent = this._config.title || '';
    // KD-14: a milestone anchors the program the moment it is configured,
    // not when something is first launched, so the dates exist up front.
    if (this._earliestMilestone()) this._anchor();
    this._renderList();
  }

  // KD-24: what is at risk, not merely what has been set. A completed or
  // dropped session is work. So is the schedule of a program with no
  // milestone, which was anchored to a day that cannot be worked out again.
  // A milestone program that has only been anchored risks nothing: its dates
  // come straight back from the milestone.
  _recordedWork(config) {
    return config.entries.some((e) => e.actualDate || e.dropped);
  }

  _isPartRun(config) {
    const recomputable = config.entries.some((e) => e.milestone);
    return this._recordedWork(config) || (Boolean(config.anchorDate) && !recomputable);
  }

  // Says what is actually there, rather than always claiming recorded work.
  _replaceWarning(config, stored, verb) {
    const what = this._recordedWork(stored)
      ? 'entirely, including everything already recorded as done'
      : 'and the schedule it was anchored to';
    return `${verb} "${config.title || 'this program'}" replaces "${stored.title || 'the stored program'}" ${what}. Continue?`;
  }

  _readStored() {
    try {
      const raw = window.localStorage.getItem(CDP_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      this._validate(parsed);
      return parsed;
    } catch (err) {
      return null; // unreadable or no longer valid: treat as nothing stored
    }
  }

  // IMPL-6: written on every change, so there is no save gesture to forget
  // across the weeks a program spans.
  _writeStored() {
    try {
      window.localStorage.setItem(CDP_STORAGE_KEY, JSON.stringify(this._config));
    } catch (err) {
      /* storage full or blocked — the run itself still works */
    }
  }

  // Two ways in. With no milestone, the day of the first launch anchors the
  // program and week 1 is that day's *own* week, so an entry whose weekday
  // has already passed is simply due now rather than a week away (KD-1,
  // KD-10, KD-12 of the scheduling spec).
  //
  // With a milestone, the earliest one anchors the program *backwards* from
  // its own date (KD-14, KD-20): the plan is laid so that milestone lands
  // where it really is, which means every session carries a date the moment
  // the program is configured, before anything has been run. Later
  // milestones keep their own dates rather than the layout's — dates win
  // over authored positions, and nothing is rescaled to fit (KD-18).
  //
  // KD-21: this runs only for a program nothing has dated yet. Once
  // anchored, the stored dates carry the drift that late completions have
  // accumulated, and recomputing would erase it — along with the overrun
  // that drift is there to show.
  _anchor() {
    if (this._config.entries.some((e) => e.expectedDate)) return;
    const milestone = this._earliestMilestone();
    let monday;
    if (milestone) {
      monday = cdpToDayNumber(milestone.date) - cdpOffset(milestone);
      this._config.anchorDate = cdpFromDayNumber(monday);
    } else {
      const today = cdpToday();
      const anchor = cdpToDayNumber(today);
      monday = anchor - (cdpIsoDay(anchor) - 1);
      this._config.anchorDate = today;
    }
    this._config.entries.forEach((e) => {
      e.expectedDate = e.milestone ? e.date : cdpFromDayNumber(monday + cdpOffset(e));
    });
    this._writeStored();
  }

  // KD-1: sessions are allowed to slide past a milestone and the overrun is
  // shown rather than compressed away — it is the signal that the plan needs
  // replanning, and hiding it would restore the dishonesty the milestone
  // exists to remove. KD-19: a dropped session is left out, since it will
  // never take a day. Reports the first milestone that is overrun.
  _overrun() {
    const entries = this._config.entries;
    for (let i = 0; i < entries.length; i += 1) {
      const m = entries[i];
      // KD-25: a cancelled date is not a deadline, so nothing can overrun it.
      if (!m.milestone || m.dropped) continue;
      let last = null;
      entries.slice(0, i).forEach((e) => {
        if (e.milestone || this._settled(e) || !e.expectedDate) return;
        if (!last || e.expectedDate > last) last = e.expectedDate;
      });
      if (last && last > m.date) {
        return { title: this._title(m), date: m.date, days: cdpToDayNumber(last) - cdpToDayNumber(m.date) };
      }
    }
    return null;
  }

  // KD-13 of the scheduling spec: unanchored, there are no dates to compare,
  // so the order is the authored one. Anchored, the soonest expected date
  // among the unrun. KD-4: a dropped session is never suggested.
  _suggestedIndex() {
    const entries = this._config.entries;
    let best = -1;
    entries.forEach((e, i) => {
      if (this._settled(e)) return;
      if (best === -1) { best = i; return; }
      if (e.expectedDate && entries[best].expectedDate && e.expectedDate < entries[best].expectedDate) {
        best = i;
      }
    });
    return best;
  }

  // KD-4: a dropped session reads as dropped wherever it appears, distinct
  // from one merely never run.
  _label(entry) {
    const where = entry.milestone
      ? `Milestone — ${entry.date}`
      : `Week ${entry.week} ${CDP_DAY_NAMES[entry.day - 1]}${entry.expectedDate ? ` — ${entry.expectedDate}` : ''}`;
    const status = entry.actualDate ? ` (done ${entry.actualDate})` : entry.dropped ? ' (dropped)' : '';
    return `${where} — ${this._title(entry)}${status}`;
  }

  _renderList() {
    const suggested = this._suggestedIndex();
    this._selectEl.innerHTML = this._config.entries
      .map((e, i) => `<option value="${i}">${this._label(e)}</option>`)
      .join('');
    if (suggested !== -1) this._selectEl.value = String(suggested);
    this._renderOverrun();
  }

  _renderOverrun() {
    const over = this._overrun();
    this._overrunEl.textContent = over
      ? `${over.days} day${over.days === 1 ? '' : 's'} past "${over.title}" (${over.date})`
      : '';
    this._overrunEl.hidden = !over;
  }

  // KD-6: any entry may be launched whatever its date and whatever is still
  // unrun before it.
  _launch() {
    const index = Number(this._selectEl.value);
    const entry = this._config.entries[index];
    this._anchor();
    // KD-22: a marker milestone has nothing to play — it is reached, not
    // performed — so Start records it where it stands rather than mounting a
    // clock over a config that does not exist.
    if (!entry.sequence) {
      this._reach(entry);
      return;
    }
    this._listEl.hidden = true;
    this._runEl.hidden = false;

    this._runningSeq = document.createElement('cadence-sequence');
    this._runningSeq.addEventListener('cadence:complete', () => this._onComplete(entry));
    this._runEl.appendChild(this._runningSeq);
    this._runningSeq.configure(entry.sequence);
    this._announce(`Started ${entry.sequence.title || 'session'}`);
  }

  // Abandons the whole session — distinct from sequence-clock's own
  // internal non-goals (pause/skip/rewind within a run). Nothing is
  // recorded and nothing is rescheduled (KD-7).
  _abandon() {
    this._teardownRun();
    this._listEl.hidden = false;
    this._renderList();
  }

  // KD-4, KD-9: the entry ran today, and the rest of the program slides by
  // however far today is from where this entry was expected — the plan is
  // kept, just moved. KD-14: only what comes after it moves; an unrun entry
  // earlier in the order keeps its date and stays overdue.
  //
  // KD-20: sliding *backwards* is gated on being up to date. Finishing early
  // while earlier sessions are still unrun would pull later ones on top of
  // them — running ahead of a session you haven't done is not being ahead.
  _onComplete(entry) {
    const today = cdpToday();
    const entries = this._config.entries;
    const index = entries.indexOf(entry);
    let delta = entry.expectedDate ? cdpToDayNumber(today) - cdpToDayNumber(entry.expectedDate) : 0;

    if (delta < 0 && !entries.slice(0, index).every((e) => this._settled(e))) delta = 0;
    // KD-15: a milestone neither moves nor moves anything else. Running the
    // race a day late does not slide the plan behind it — being pinned is
    // the whole of what a milestone is.
    if (entry.milestone) delta = 0;

    entry.actualDate = today;
    if (delta !== 0) {
      entries.forEach((e, i) => {
        // KD-2, KD-15: a milestone is never shifted, in either direction.
        // A settled session is not shifted either: it is already resolved.
        if (i > index && !e.milestone && !this._settled(e) && e.expectedDate) {
          e.expectedDate = cdpFromDayNumber(cdpToDayNumber(e.expectedDate) + delta);
        }
      });
    }
    this._writeStored();

    this._teardownRun();
    this._listEl.hidden = false;
    this._renderList();
    this._announce(`Completed ${entry.sequence.title || 'session'}`);
    this.dispatchEvent(new CustomEvent('cadence:entryComplete', { detail: { entry } }));
  }

  // KD-8, KD-22: reaching a marker records the day it happened and nothing
  // else — a milestone moves nothing, itself included (KD-15).
  _reach(entry) {
    if (this._settled(entry)) return;
    entry.actualDate = cdpToday();
    this._writeStored();
    this._renderList();
    this._announce(`Reached ${this._title(entry)}`);
    this.dispatchEvent(new CustomEvent('cadence:entryComplete', { detail: { entry } }));
  }

  // KD-3: dropping moves nothing — every later session keeps its date, and
  // the dropped one stays in the program rather than being removed. KD-4:
  // the confirmation is the gate, which is why there is no undo.
  _drop() {
    const entry = this._config.entries[Number(this._selectEl.value)];
    if (!entry || this._settled(entry)) return;
    // KD-25: a race really can be cancelled, so a milestone can be dropped —
    // but it is a fixed date going away, not a session being skipped, and the
    // one confirmation standing in front of it should say which.
    const ok = window.confirm(entry.milestone
      ? `Cancel the milestone "${this._title(entry)}" on ${entry.date}? Its date stops being one the sessions can overrun, and this cannot be undone.`
      : `Drop "${this._title(entry)}"? It stays in the program marked as dropped, nothing else moves, and this cannot be undone.`);
    if (!ok) return;
    entry.dropped = true;
    this._writeStored();
    this._renderList();
    this._announce(`Dropped ${this._title(entry)}`);
  }

  _teardownRun() {
    if (this._runningSeq) {
      this._runningSeq.remove();
      this._runningSeq = null;
    }
    this._runEl.hidden = true;
  }

  // Announces start/completion only — not a continuous state, so there's
  // no spam risk here regardless (G-3, KD-10).
  _announce(text) {
    this._liveEl.textContent = text;
  }

  _slug() {
    return (this._config.title || 'program')
      .trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'program';
  }

  _download(text, filename, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // KD-7 of the scheduling spec: the authored shape plus what running it
  // produced, so an export is itself a program and loads straight back in.
  // KD-16: this stays, beside the replanning prompt — it is the backup, and
  // the only one of the two that Load can read.
  _export() {
    this._download(JSON.stringify(this._config, null, 2), `${this._slug()}.json`, 'application/json');
  }

  // KD-5, KD-6, KD-7: one file to paste into an LLM, carrying the schema it
  // must answer in, the whole record including what was already done, and
  // the overrun that says why a replan is needed. The app never calls a
  // model itself (NG-1) — the loop is export, paste, load the answer back.
  _exportReplanningPrompt() {
    const over = this._overrun();
    const entries = this._config.entries;
    const state = entries.map((e, i) => {
      const what = e.milestone ? 'MILESTONE (fixed)' : 'session';
      const stand = e.actualDate ? `done ${e.actualDate}` : e.dropped ? 'dropped, not to be rescheduled' : 'not yet done';
      return `${i + 1}. week ${e.week} day ${e.day} — ${what} — planned ${e.expectedDate || 'unscheduled'} — ${stand} — ${this._title(e)}`;
    }).join('\n');

    const text = `# Replanning request — ${this._config.title || 'program'}

Today is ${cdpToday()}.

## The problem

${over
  ? `The sessions still to be done run ${over.days} day${over.days === 1 ? '' : 's'} past "${over.title}", which is fixed to ${over.date} and cannot move. The plan no longer fits.`
  : 'The plan currently fits, and is being replanned for another reason.'}

## Where the program stands

${state}

## The program in full

The complete current state, including every session's exercises and timings:

\`\`\`json
${JSON.stringify(this._config, null, 2)}
\`\`\`

## What to send back

Rewrite the sessions that are **not yet done** so they fit before every milestone, keeping the intent of the original plan: the same kind of work, a sensible progression into the milestone, and enough recovery between sessions. Leave the sessions already done exactly as they are, and do not reschedule anything marked dropped.

Answer with a single JSON object and nothing else — no commentary, no code fence. It must follow this shape:

- \`title\`: string.
- \`entries\`: array, in the order they should be done.
- A session entry: \`{ "week": 1, "day": 1, "sequence": { ... } }\` — \`week\` counts from 1, \`day\` is 1 for Monday through 7 for Sunday. A session entry must **not** carry a date of any kind.
- A milestone entry: \`{ "week": 16, "day": 7, "milestone": true, "date": "YYYY-MM-DD", "title": "...", "sequence": { ... } }\` — \`date\` is allowed **only** here, \`title\` is required, and \`sequence\` is optional (leave it out for something that is only reached, not performed). Keep every existing milestone on its existing date.
- \`sequence\`: \`{ "title": "...", "blocks": [ { "repetitions": 2, "steps": [ { "label": "...", "durationSeconds": 20, "startFrequency": 440, "endFrequency": 880 } ] } ] }\`. \`durationSeconds\` may be fractional; the two frequencies are optional beeps.
- Carry \`actualDate\` and \`dropped\` through unchanged on the entries that have them. Leave \`expectedDate\` out entirely — Cadence computes the dates itself from the milestones.
`;
    this._download(text, `${this._slug()}-replanning-prompt.md`, 'text/markdown');
  }

  _load() {
    const file = this._loadEl.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.configure(JSON.parse(reader.result), { viaLoad: true });
    reader.readAsText(file);
    this._loadEl.value = ''; // so selecting the same file again still fires change
  }
}

customElements.define('cadence-program', CadenceProgram);
