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
        <label class="cdp-load-label">Load
          <input type="file" class="cdp-load" accept="application/json">
        </label>
      </div>
      <div class="cdp-run" hidden>
        <button type="button" class="cdp-back">Back</button>
      </div>
      <div class="cdp-live" aria-live="polite"></div>
    `;
    this._titleEl = this.querySelector('.cdp-title');
    this._listEl = this.querySelector('.cdp-list');
    this._selectEl = this.querySelector('.cdp-select');
    this._startEl = this.querySelector('.cdp-start');
    this._exportEl = this.querySelector('.cdp-export');
    this._loadEl = this.querySelector('.cdp-load');
    this._runEl = this.querySelector('.cdp-run');
    this._backEl = this.querySelector('.cdp-back');
    this._liveEl = this.querySelector('.cdp-live');

    this._startEl.addEventListener('click', () => this._launch());
    this._backEl.addEventListener('click', () => this._abandon());
    this._exportEl.addEventListener('click', () => this._export());
    this._loadEl.addEventListener('change', () => this._load());
  }

  // The public JS entry point. Stored run state wins over the config it is
  // handed when they are the same program (KD-8) — that is what makes a
  // page reload resume rather than restart.
  configure(config) {
    this._validate(config);
    if (!this._titleEl) this._render();
    this._adopt(config);
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
    });
  }

  // KD-11: only one program is part-run at a time, so taking on a different
  // one replaces what is stored — and says so first, since that discards
  // real work. Declining keeps the stored program, which is the whole point
  // of asking.
  _adopt(config) {
    const stored = this._readStored();
    if (stored && stored.title === config.title) {
      this._config = stored;
    } else if (stored && this._isPartRun(stored)) {
      const ok = window.confirm(
        `Starting "${config.title || 'this program'}" replaces "${stored.title || 'the stored program'}", which is part-run. Continue?`
      );
      this._config = ok ? config : stored;
      if (ok) this._writeStored();
    } else {
      this._config = config;
      this._writeStored();
    }
    this._titleEl.textContent = this._config.title || '';
    this._renderList();
  }

  _isPartRun(config) {
    return Boolean(config.anchorDate) || config.entries.some((e) => e.actualDate);
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

  // KD-1, KD-10, KD-12: the day of the first launch anchors the program,
  // and week 1 is that day's *own* week — so an entry whose weekday has
  // already passed is simply due now (KD-5) rather than a week away.
  // KD-19: a program that already carries dates arrived anchored.
  _anchor() {
    if (this._config.entries.some((e) => e.expectedDate)) return;
    const today = cdpToday();
    const anchor = cdpToDayNumber(today);
    const monday = anchor - (cdpIsoDay(anchor) - 1);
    this._config.anchorDate = today;
    this._config.entries.forEach((e) => {
      e.expectedDate = cdpFromDayNumber(monday + (e.week - 1) * 7 + (e.day - 1));
    });
    this._writeStored();
  }

  // KD-13: unanchored, there are no dates to compare, so the order is the
  // authored one. Anchored, the soonest expected date among the unrun.
  _suggestedIndex() {
    const entries = this._config.entries;
    let best = -1;
    entries.forEach((e, i) => {
      if (e.actualDate) return;
      if (best === -1) { best = i; return; }
      if (e.expectedDate && entries[best].expectedDate && e.expectedDate < entries[best].expectedDate) {
        best = i;
      }
    });
    return best;
  }

  _label(entry) {
    const title = (entry.sequence && entry.sequence.title) || 'Untitled';
    const where = `Week ${entry.week} ${CDP_DAY_NAMES[entry.day - 1]}`;
    const when = entry.expectedDate ? ` — ${entry.expectedDate}` : '';
    const done = entry.actualDate ? ` (done ${entry.actualDate})` : '';
    return `${where}${when} — ${title}${done}`;
  }

  _renderList() {
    const suggested = this._suggestedIndex();
    this._selectEl.innerHTML = this._config.entries
      .map((e, i) => `<option value="${i}">${this._label(e)}</option>`)
      .join('');
    if (suggested !== -1) this._selectEl.value = String(suggested);
  }

  // KD-6: any entry may be launched whatever its date and whatever is still
  // unrun before it.
  _launch() {
    const index = Number(this._selectEl.value);
    const entry = this._config.entries[index];
    this._anchor();
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

    if (delta < 0 && !entries.slice(0, index).every((e) => e.actualDate)) delta = 0;

    entry.actualDate = today;
    if (delta !== 0) {
      entries.forEach((e, i) => {
        if (i > index && !e.actualDate && e.expectedDate) {
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

  // KD-7: the authored shape plus what running it produced, so an export is
  // itself a program and loads straight back in.
  _export() {
    const blob = new Blob([JSON.stringify(this._config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(this._config.title || 'program').trim().replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  _load() {
    const file = this._loadEl.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.configure(JSON.parse(reader.result));
    reader.readAsText(file);
    this._loadEl.value = ''; // so selecting the same file again still fires change
  }
}

customElements.define('cadence-program', CadenceProgram);
