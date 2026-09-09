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
// Guidance (KD-4) is rendered by renderGuidance(), which lives in
// cadence-sequence.js. A classic script cannot import, so that is a global —
// but the dependency is the one this file already has and already needs:
// _launch() creates a <cadence-sequence>, so that file is loaded first
// everywhere this one is. The chain runs clock, then sequence, then program,
// and never backwards. (Contrast formatTime, which is deliberately duplicated
// in the clock and the sequence, because sharing it there would have pointed
// the dependency the wrong way up that same chain.)
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

// KD-7: the one place a program's text becomes markup. A program file is
// shared between people — a coach sends one, a model writes one — so its
// text is untrusted, and a label carrying an <img onerror> would otherwise
// run in the reader's page.
function cdpEscape(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// A real day, not merely four digits and two pairs: 2026-02-30 passes a
// regex and normalises to March, so the date on screen would disagree with
// the schedule it drives.
function cdpIsRealDate(value) {
  if (!CDP_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  return at.getUTCFullYear() === y && at.getUTCMonth() === m - 1 && at.getUTCDate() === d;
}

// Ten years of program. Past this a week produces a date the browser cannot
// represent, which used to be stored and shown as the string NaN-NaN-NaN.
const CDP_MAX_WEEK = 520;

function cdpValidateSequence(sequence, where) {
  if (!sequence || !Array.isArray(sequence.blocks) || sequence.blocks.length === 0) {
    throw new Error(`cadence-program: ${where} needs a sequence with at least one block`);
  }
  sequence.blocks.forEach((block, b) => {
    if (!Number.isInteger(block.repetitions) || block.repetitions < 1) {
      throw new Error(`cadence-program: ${where}, block ${b} needs repetitions of 1 or more`);
    }
    if (!Array.isArray(block.steps) || block.steps.length === 0) {
      throw new Error(`cadence-program: ${where}, block ${b} needs at least one step`);
    }
    block.steps.forEach((step, i) => {
      if (typeof step.durationSeconds !== "number" || !Number.isFinite(step.durationSeconds)
          || step.durationSeconds <= 0) {
        throw new Error(
          `cadence-program: ${where}, block ${b} step ${i} needs a durationSeconds `
          + "that is a positive number of seconds");
      }
    });
  });
}

// KD-1: the program declares what to record, at program scope. KD-2: two
// kinds only — a number, optionally with a unit and a min and max (a nought
// to ten scale is just min 0 max 10), and free text. KD-9: a declaration of
// the wrong shape is ignored rather than refused, the same trade the
// guidance spec settled — a bad field costs a line on screen, a refusal
// costs the session.
function cdpRecordFields(config) {
  const declared = config && Array.isArray(config.record) ? config.record : [];
  const fields = [];
  for (const f of declared) {
    if (!f || typeof f !== 'object') continue;
    const name = typeof f.name === 'string' ? f.name.trim() : '';
    if (!name) continue;
    const kind = f.kind === 'text' ? 'text' : 'number';
    fields.push({
      name,
      label: (typeof f.label === 'string' && f.label.trim()) || name,
      kind,
      unit: typeof f.unit === 'string' ? f.unit.trim() : '',
      min: typeof f.min === 'number' && Number.isFinite(f.min) ? f.min : null,
      max: typeof f.max === 'number' && Number.isFinite(f.max) ? f.max : null,
    });
  }
  return fields;
}

// KD-8: "last time" is the last session actually done, not the row above —
// sessions may be completed out of order. Most recently dated wins, and list
// order breaks a tie between two entries dated the same day.
function cdpLastRecorded(entries, exclude) {
  let best = null;
  let bestIndex = -1;
  entries.forEach((e, i) => {
    if (e === exclude || !e.actualDate || !e.recorded) return;
    if (!Object.keys(e.recorded).length) return;
    if (!best || e.actualDate > best.actualDate
        || (e.actualDate === best.actualDate && i > bestIndex)) {
      best = e;
      bestIndex = i;
    }
  });
  return best;
}

function cdpShowValue(field, value) {
  if (value === undefined || value === null || value === '') return '';
  return field.unit ? `${value} ${field.unit}` : String(value);
}

class CadenceProgram extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this._runningSeq = null;
  }

  connectedCallback() {
    if (!this._titleEl) this._render();
    if (this._onDocumentPress) document.addEventListener('click', this._onDocumentPress);
  }

  disconnectedCallback() {
    if (this._onDocumentPress) document.removeEventListener('click', this._onDocumentPress);
  }

  _render() {
    this.innerHTML = `
      <div class="cdp-title"></div>
      <div class="cdp-guidance cdp-program-guidance" hidden></div>
      <div class="cdp-view">
        <div class="cdp-summary"></div>
        <ul class="cdp-list" role="listbox" tabindex="-1"></ul>
        <div class="cdp-divider cdp-today-after" hidden>Today</div>
        <div class="cdp-bar">
          <div class="cdp-next"></div>
          <div class="cdp-actions">
            <button type="button" class="cdp-jump" aria-label="Back to the current step">&#8634;</button>
            <button type="button" class="cdp-start">Start</button>
            <div class="cdp-menu">
              <button type="button" class="cdp-more" aria-haspopup="true" aria-expanded="false">More</button>
              <div class="cdp-pop" hidden>
                <button type="button" class="cdp-export">Export</button>
                <button type="button" class="cdp-replan">Replanning prompt</button>
                <button type="button" class="cdp-drop">Drop</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <input type="file" class="cdp-load" accept="application/json" hidden>
      <div class="cdp-run" hidden>
        <button type="button" class="cdp-back">Back</button>
        <div class="cdp-guidance cdp-entry-guidance" hidden></div>
        <p class="cdp-lasttime" hidden></p>
        <form class="cdp-record" hidden>
          <h3 class="cdp-record-title">Before you go</h3>
          <div class="cdp-record-fields"></div>
          <button type="submit" class="cdp-record-save">Save</button>
          <button type="button" class="cdp-record-skip">Skip</button>
        </form>
      </div>
      <div class="cdp-problem" hidden></div>
      <div class="cdp-live" aria-live="polite"></div>
    `;
    this._titleEl = this.querySelector('.cdp-title');
    this._viewEl = this.querySelector('.cdp-view');
    this._summaryEl = this.querySelector('.cdp-summary');
    this._listEl = this.querySelector('.cdp-list');
    this._todayEl = this.querySelector('.cdp-today-after');
    this._nextEl = this.querySelector('.cdp-next');
    this._jumpEl = this.querySelector('.cdp-jump');
    this._startEl = this.querySelector('.cdp-start');
    this._moreEl = this.querySelector('.cdp-more');
    this._popEl = this.querySelector('.cdp-pop');
    this._dropEl = this.querySelector('.cdp-drop');
    this._exportEl = this.querySelector('.cdp-export');
    this._replanEl = this.querySelector('.cdp-replan');
    this._loadEl = this.querySelector('.cdp-load');
    this._runEl = this.querySelector('.cdp-run');
    this._programGuidanceEl = this.querySelector('.cdp-program-guidance');
    this._entryGuidanceEl = this.querySelector('.cdp-entry-guidance');
    this._lastTimeEl = this.querySelector('.cdp-lasttime');
    this._recordEl = this.querySelector('.cdp-record');
    this._recordFieldsEl = this.querySelector('.cdp-record-fields');
    this._backEl = this.querySelector('.cdp-back');
    this._problemEl = this.querySelector('.cdp-problem');
    this._liveEl = this.querySelector('.cdp-live');
    this._selected = 0;
    this._everSelected = false;

    this._listEl.addEventListener('keydown', (e) => this._onKey(e));
    this._listEl.addEventListener('click', (e) => {
      const row = e.target.closest('.cdp-row');
      if (row) this._select(this._rows().indexOf(row), true);
    });
    this._jumpEl.addEventListener('click', () => this._select(this._suggestedIndex(), true));
    this._moreEl.addEventListener('click', () => this._toggleMenu());
    this._popEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      this._toggleMenu(false);
      this._moreEl.focus();
    });
    // A menu closes when you press away from it. Listening on the document is
    // the only way to hear a press that never reaches this element.
    this._onDocumentPress = (e) => {
      if (this._popEl.hidden || this._popEl.contains(e.target) || e.target === this._moreEl) return;
      this._toggleMenu(false);
    };
    document.addEventListener('click', this._onDocumentPress);
    this._startEl.addEventListener('click', () => this._launch());
    this._backEl.addEventListener('click', () => this._abandon());
    this._dropEl.addEventListener('click', () => { this._toggleMenu(false); this._drop(); });
    this._exportEl.addEventListener('click', () => { this._toggleMenu(false); this._export(); });
    this._replanEl.addEventListener('click', () => { this._toggleMenu(false); this._exportReplanningPrompt(); });
    this._loadEl.addEventListener('change', () => this._load());
    this._recordEl.addEventListener('submit', (e) => { e.preventDefault(); this._saveRecord(); });
    this.querySelector('.cdp-record-skip').addEventListener('click', () => this._finishRecord());
  }

  // The public JS entry point. Stored run state wins over the config it is
  // handed when they are the same program (KD-8) — that is what makes a
  // page reload resume rather than restart.
  configure(config, options) {
    this._validate(config);
    if (!this._titleEl) this._render();
    this._adopt(config, options || {});
  }

  // KD-1, KD-7: the page opens whatever was left in progress by asking for
  // it. Nothing happens on connecting, so a component mounted by a test is
  // still blank until it is handed something.
  restore() {
    if (!this._titleEl) this._render();
    const stored = this._readStored();
    if (!stored) return false;
    this._config = stored;
    this._titleEl.textContent = stored.title || '';
    renderGuidance(this._programGuidanceEl, stored.guidance);
    this._renderList();
    return true;
  }

  // KD-6: the visible Load control lives in the page header, so the element
  // exposes the file dialogue rather than drawing a button for it.
  chooseFile() {
    if (!this._titleEl) this._render();
    this._loadEl.click();
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
      if (!Number.isInteger(e.week) || e.week < 1 || e.week > CDP_MAX_WEEK) {
        throw new Error(
          `cadence-program: entry ${i} needs an integer week from 1 to ${CDP_MAX_WEEK}`);
      }
      if (!Number.isInteger(e.day) || e.day < 1 || e.day > 7) {
        throw new Error(`cadence-program: entry ${i} needs a day from 1 (Monday) to 7 (Sunday)`);
      }
      // KD-9: a milestone is pinned to a real date — without one there is
      // nothing to pin and it is simply a session. KD-13: it carries its own
      // title, since a marker milestone has no sequence to take one from.
      if (e.milestone) {
        if (!cdpIsRealDate(e.date || '')) {
          throw new Error(
            `cadence-program: entry ${i} is a milestone and needs a real date of the form YYYY-MM-DD`);
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
      // KD-2: whatever it can run, it has to be able to run. Accepting this
      // and dying at the press of Start leaves the list gone and no way back.
      if (e.sequence) cdpValidateSequence(e.sequence, `entry ${i}`);
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
    renderGuidance(this._programGuidanceEl, this._config.guidance);
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
      if (this._unsaved) {
        this._unsaved = false;
        this._problemEl.hidden = true;
      }
    } catch (err) {
      // KD-4: the run still works, so it carries on — but silence here loses
      // the whole program at the next reload, with no warning at either end.
      this._unsaved = true;
      this._problemEl.textContent =
        'This program is not being saved — storage is full or blocked. It will be lost when the page is closed.';
      this._problemEl.hidden = false;
      this._announce('This program is not being saved. It will be lost when the page is closed.');
      this.dispatchEvent(new CustomEvent('cadence:notSaved', { bubbles: true }));
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

  // KD-25: one short label per entry, falling back to a milestone's own
  // title and then to the sequence's, so nothing authored earlier breaks.
  _title(entry) {
    return entry.label || entry.title || (entry.sequence && entry.sequence.title) || 'Untitled';
  }

  // KD-15, KD-18: a session whose date is behind today and which is neither
  // run nor dropped is stale; a milestone in the same position is missed,
  // because a date that cannot be caught up is a different fact.
  // KD-29, KD-30: this is all the trailing icon says — that a row is a
  // milestone is carried by the text it leads with.
  _state(entry) {
    if (entry.actualDate) return { icon: '\u2713', word: 'done', cls: 'done' };
    if (entry.dropped) return { icon: '\u2298', word: 'dropped', cls: 'dropped' };
    const when = entry.milestone ? entry.date : entry.expectedDate;
    if (when && when < cdpToday()) {
      return entry.milestone
        ? { icon: '\u2715', word: 'missed', cls: 'missed' }
        : { icon: '\u25F7', word: 'overdue', cls: 'stale' };
    }
    return { icon: '', word: '', cls: '' };
  }

  // G-3: the row says which session it is and when it is due. A milestone
  // leads with the word, which is how a milestone is told apart now that the
  // trailing icon says only what state the row is in (KD-29, KD-30).
  _lead(entry) {
    if (entry.milestone) return `Milestone \u2014 ${entry.date}`;
    const when = entry.expectedDate ? ` \u2014 ${entry.expectedDate}` : '';
    return `Week ${entry.week} ${CDP_DAY_NAMES[entry.day - 1]}${when}`;
  }

  // KD-31: the divider goes before the first row in list order whose date is
  // not behind today. It anchors the scroll and claims nothing more — a past
  // date further down carries its own mark, which is why KD-16 wants both.
  // KD-27: a program with no dates yet has no today to mark.
  _dividerIndex() {
    const entries = this._config.entries;
    if (!entries.some((e) => e.expectedDate || e.date)) return -1;
    const today = cdpToday();
    const at = entries.findIndex((e) => {
      const when = e.milestone ? e.date : e.expectedDate;
      return !when || when >= today;
    });
    return at === -1 ? entries.length : at;
  }

  _renderList() {
    const divider = this._dividerIndex();
    const rows = this._config.entries.map((e, i) => {
      const state = this._state(e);
      const name = cdpEscape(`${this._lead(e)}, ${this._title(e)}${state.word ? `, ${state.word}` : ''}`);
      const today = i === divider ? ' cdp-today' : '';
      return `<li class="cdp-row ${state.cls}${today}" role="option" id="${this._rowId(i)}"
          tabindex="-1" aria-selected="false" aria-label="${name}">
          <span class="cdp-row-main"><span class="cdp-row-lead">${cdpEscape(this._lead(e))}</span>
          <span class="cdp-row-label">${cdpEscape(this._title(e))}</span></span>
          <span class="cdp-row-icon" aria-hidden="true">${state.icon}</span></li>`;
    }).join('');
    this._listEl.innerHTML = rows;
    // Today past every row: nothing follows it to carry the mark, so it goes
    // after the list rather than inside it, where it would not be an option.
    this._todayEl.hidden = divider !== this._config.entries.length;
    this._listEl.setAttribute('aria-label', this._config.title || 'Program');

    // Opening the view lands on the current step (KD-1); after that the
    // selection is the user's, until what they had chosen is settled.
    const stale = !this._everSelected
      || this._selected >= this._config.entries.length
      || this._settled(this._config.entries[this._selected] || {});
    const wanted = stale ? this._suggestedIndex() : this._selected;
    this._select(wanted === -1 ? 0 : wanted, false);
    this._renderSummary();
  }

  _rowId(i) {
    return `${this.id || 'cdp'}-row-${i}`;
  }

  _rows() {
    return [...this._listEl.querySelectorAll('.cdp-row')];
  }

  // KD-19: selection follows focus, so what is on screen and what Start and
  // Drop act on cannot come apart. KD-11: moving the current step into view
  // is done by focusing its row and letting the browser scroll it, which is
  // the same mechanism assistive technology relies on.
  _select(index, moveFocus) {
    const rows = this._rows();
    if (!rows.length) return;
    this._selected = Math.max(0, Math.min(rows.length - 1, index));
    rows.forEach((row, i) => {
      const on = i === this._selected;
      row.setAttribute('aria-selected', String(on));
      row.tabIndex = on ? 0 : -1;
    });
    if (moveFocus) {
      this._everSelected = true;
      rows[this._selected].focus();
    }
    this._renderNext();
  }

  _entry() {
    return this._config.entries[this._selected];
  }

  _renderNext() {
    const entry = this._entry();
    if (!entry) return;
    const verb = entry.sequence ? 'Start will run' : 'Start will record';
    this._startEl.textContent = entry.sequence ? 'Start' : 'Mark reached';
    this._startEl.disabled = Boolean(entry.dropped);
    this._dropEl.disabled = this._settled(entry);
    this._nextEl.textContent = `${verb}: ${this._title(entry)}`;
  }

  _onKey(event) {
    const last = this._rows().length - 1;
    const moves = {
      ArrowDown: this._selected + 1, ArrowUp: this._selected - 1, Home: 0, End: last,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    this._select(moves[event.key], true);
  }

  // KD-2: after a view is swapped, focus belongs on the step that is now
  // current — where the listbox pattern expects it and where the next arrow
  // key does something useful.
  // KD-1: said where it can be heard and where it can be seen. The program
  // that was already loaded is left exactly as it was.
  _reportLoadFailure(message) {
    this._problemEl.textContent = `That file was not loaded: ${message}`;
    this._problemEl.hidden = false;
    this._announce(`That file was not loaded. ${message}`);
    this.dispatchEvent(new CustomEvent('cadence:programRejected', {
      bubbles: true, detail: { message },
    }));
  }

  _focusCurrent() {
    this._rows()[this._selected]?.focus();
  }

  _toggleMenu(force) {
    const open = force === undefined ? this._popEl.hidden : force;
    this._popEl.hidden = !open;
    this._moreEl.setAttribute('aria-expanded', String(open));
  }

  // KD-7, KD-28: how much is done and where it is projected to land, with
  // the overrun taking its place once there is one — at that point the
  // finish is not the news.
  _renderSummary() {
    const entries = this._config.entries;
    const done = entries.filter((e) => e.actualDate).length;
    const over = this._overrun();
    if (over) {
      this._summaryEl.textContent =
        `${done} of ${entries.length} done \u00b7 ${over.days} day${over.days === 1 ? '' : 's'} past "${over.title}" (${over.date})`;
      this._summaryEl.classList.add('cdp-over');
      return;
    }
    // Nothing left to do and nothing dated yet are different things: an
    // unanchored program has no dates and is not finished (KD-28).
    const remaining = entries.filter((e) => !e.actualDate && !e.dropped);
    const dates = remaining.map((e) => (e.milestone ? e.date : e.expectedDate)).filter(Boolean);
    const finish = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
    this._summaryEl.classList.remove('cdp-over');
    this._summaryEl.textContent = `${done} of ${entries.length} done`
      + (finish ? ` \u00b7 finishes ${finish}` : (remaining.length ? '' : ' \u00b7 finished'));
  }

  // KD-6: any entry may be launched whatever its date and whatever is still
  // unrun before it.
  _launch() {
    const entry = this._entry();
    this._anchor();
    // KD-22: a marker milestone has nothing to play — it is reached, not
    // performed — so Start records it where it stands rather than mounting a
    // clock over a config that does not exist.
    if (!entry.sequence) {
      this._reach(entry);
      return;
    }
    this._viewEl.hidden = true;
    this._runEl.hidden = false;
    this._programGuidanceEl.hidden = true;
    // KD-15: entry guidance is what you read while deciding to begin, so it
    // is here now and gone the moment the work starts — see _beginRun below.
    renderGuidance(this._entryGuidanceEl, entry.guidance);
    // KD-4: last time's values belong here, where they still change what you
    // load onto the bar — not after the work, when it is too late to matter.
    this._showLastTime(entry);

    this._runningSeq = document.createElement('cadence-sequence');
    this._runningSeq.addEventListener('cadence:complete', () => this._onComplete(entry));
    this._runEl.appendChild(this._runningSeq);
    this._runningSeq.configure(entry.sequence);
    // Once the work is running, the deciding is over: the entry card comes
    // down so nothing sits between the reader and the clock (KD-6), and the
    // runner is brought back to the top of the viewport. Focusing Start on a
    // tall page scrolls it into view and carries the label and the cue off the
    // top with it, which is precisely the cue not being visible while its step
    // runs — the criterion this whole spec turns on.
    this._runningSeq.addEventListener('cadence:start', () => {
      this._entryGuidanceEl.hidden = true;
      this._lastTimeEl.hidden = true;
      this._runningSeq.scrollIntoView({ block: 'start' });
    }, { once: true });
    // KD-2: the gesture that begins the work should be under the finger —
    // but reaching it must not move the page out from under the reader.
    this._runEl.scrollIntoView({ block: 'start' });
    this._runningSeq.querySelector('.cds-start')?.focus({ preventScroll: true });
    this._announce(`Started ${entry.sequence.title || 'session'}`);
  }

  // Abandons the whole session — distinct from sequence-clock's own
  // internal non-goals (pause/skip/rewind within a run). Nothing is
  // recorded and nothing is rescheduled (KD-7).
  _abandon() {
    this._teardownRun();
    this._viewEl.hidden = false;
    this._renderList();
    this._focusCurrent();
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

    // KD-7: the session is complete the moment the sequence ends — the date,
    // the shift and the store have all just happened. Recording can only add
    // to that; it must never be able to cost someone their completion.
    this._announce(`Completed ${entry.sequence.title || 'session'}`);
    this.dispatchEvent(new CustomEvent('cadence:entryComplete', { detail: { entry } }));

    // KD-6: the form takes the finished sequence's place, so the reader stays
    // where they already are. Teardown still runs on the one exit path, once
    // the form is done with.
    if (this._openRecord(entry)) return;
    this._finishRecord();
  }

  // Returns false when there is nothing to ask, so completion falls straight
  // through to the list exactly as it did before this existed.
  _openRecord(entry) {
    const fields = cdpRecordFields(this._config);
    if (!fields.length) return false;

    this._recordingEntry = entry;
    if (this._runningSeq) {
      this._runningSeq.remove();
      this._runningSeq = null;
    }
    this._lastTimeEl.hidden = true;

    const last = cdpLastRecorded(this._config.entries, entry);
    this._recordFieldsEl.textContent = '';
    for (const field of fields) {
      const wrap = document.createElement('p');
      wrap.className = 'cdp-record-field';

      const label = document.createElement('label');
      label.className = 'cdp-record-label';
      label.htmlFor = `cdp-rec-${field.name}`;
      label.textContent = field.unit ? `${field.label} (${field.unit})` : field.label;
      wrap.appendChild(label);

      const input = document.createElement('input');
      input.id = `cdp-rec-${field.name}`;
      input.className = 'cdp-record-input';
      input.dataset.name = field.name;
      input.dataset.kind = field.kind;
      if (field.kind === 'number') {
        input.type = 'number';
        input.step = 'any';
        input.inputMode = 'decimal';
        if (field.min !== null) input.min = String(field.min);
        if (field.max !== null) input.max = String(field.max);
      } else {
        input.type = 'text';
      }
      wrap.appendChild(input);

      // KD-4 again: the same value beside its own field, where it is the
      // thing being compared against.
      const previous = last && last.recorded ? last.recorded[field.name] : undefined;
      const shown = cdpShowValue(field, previous);
      if (shown) {
        const hint = document.createElement('span');
        hint.className = 'cdp-record-last';
        hint.textContent = `last time ${shown}`;
        wrap.appendChild(hint);
      }
      this._recordFieldsEl.appendChild(wrap);
    }

    this._recordEl.hidden = false;
    this._recordEl.scrollIntoView({ block: 'start' });
    this._recordFieldsEl.querySelector('input')?.focus({ preventScroll: true });
    this._announce('Record this session, or skip');
    return true;
  }

  _saveRecord() {
    const entry = this._recordingEntry;
    if (!entry) return this._finishRecord();
    const recorded = {};
    for (const input of this._recordFieldsEl.querySelectorAll('input')) {
      const raw = input.value.trim();
      // KD-3: blank is a real answer, stored as absent rather than as zero.
      if (!raw) continue;
      if (input.dataset.kind === 'number') {
        // KD-10: a number field stores a number, never the string the input
        // hands over — the export has to round-trip through a model that is
        // being asked to read the progression. Unparseable stores nothing.
        const n = Number(raw);
        if (Number.isFinite(n)) recorded[input.dataset.name] = n;
      } else {
        recorded[input.dataset.name] = raw;
      }
    }
    if (Object.keys(recorded).length) entry.recorded = recorded;
    this._writeStored();
    this.dispatchEvent(new CustomEvent('cadence:entryRecorded', { detail: { entry, recorded } }));
    this._finishRecord();
  }

  _finishRecord() {
    this._recordingEntry = null;
    this._recordEl.hidden = true;
    this._recordFieldsEl.textContent = '';
    this._teardownRun();
    this._viewEl.hidden = false;
    this._renderList();
    this._focusCurrent();
  }

  _showLastTime(entry) {
    const fields = cdpRecordFields(this._config);
    const last = fields.length ? cdpLastRecorded(this._config.entries, entry) : null;
    if (!last) {
      this._lastTimeEl.textContent = '';
      this._lastTimeEl.hidden = true;
      return;
    }
    const parts = [];
    for (const field of fields) {
      const shown = cdpShowValue(field, last.recorded[field.name]);
      if (shown) parts.push(`${field.label} ${shown}`);
    }
    if (!parts.length) {
      this._lastTimeEl.textContent = '';
      this._lastTimeEl.hidden = true;
      return;
    }
    this._lastTimeEl.textContent = `Last time (${last.actualDate}): ${parts.join(' · ')}`;
    this._lastTimeEl.hidden = false;
  }

  // KD-8, KD-22: reaching a marker records the day it happened and nothing
  // else — a milestone moves nothing, itself included (KD-15).
  _reach(entry) {
    if (this._settled(entry)) return;
    entry.actualDate = cdpToday();
    this._writeStored();
    this._renderList();
    this._focusCurrent();
    this._announce(`Reached ${this._title(entry)}`);
    this.dispatchEvent(new CustomEvent('cadence:entryComplete', { detail: { entry } }));
  }

  // KD-3: dropping moves nothing — every later session keeps its date, and
  // the dropped one stays in the program rather than being removed. KD-4:
  // the confirmation is the gate, which is why there is no undo.
  _drop() {
    const entry = this._entry();
    if (!entry || this._settled(entry)) return;
    // KD-25: a race really can be cancelled, so a milestone can be dropped —
    // but it is a fixed date going away, not a session being skipped, and the
    // one confirmation standing in front of it should say which.
    const ok = window.confirm(entry.milestone
      ? `"${this._title(entry)}" (${entry.date}) \u2014 cancel this milestone? Its date stops being one the sessions can overrun, and this cannot be undone.`
      : `"${this._title(entry)}" \u2014 drop this session? It stays in the program marked as dropped, nothing else moves, and this cannot be undone.`);
    if (!ok) return;
    entry.dropped = true;
    this._writeStored();
    this._renderList();
    this._focusCurrent();
    this._announce(`Dropped ${this._title(entry)}`);
  }

  _teardownRun() {
    if (this._runningSeq) {
      this._runningSeq.remove();
      this._runningSeq = null;
    }
    this._runEl.hidden = true;
    this._entryGuidanceEl.hidden = true;
    this._lastTimeEl.hidden = true;
    this._recordEl.hidden = true;
    this._recordingEntry = null;
    // Back on the list, the standing rules are wanted again (KD-2). Every way
    // out of a run comes through here, so there is one place to say it.
    renderGuidance(this._programGuidanceEl, this._config && this._config.guidance);
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
    const fields = cdpRecordFields(this._config);
    const state = entries.map((e, i) => {
      const what = e.milestone ? 'MILESTONE (fixed)' : 'session';
      const stand = e.actualDate ? `done ${e.actualDate}` : e.dropped ? 'dropped, not to be rescheduled' : 'not yet done';
      // KD-5: what was measured is the whole reason a model can judge the
      // progression rather than just reshuffle the calendar.
      const kept = e.recorded && Object.keys(e.recorded).length
        ? ` — recorded ${fields.map((f) => {
            const shown = cdpShowValue(f, e.recorded[f.name]);
            return shown ? `${f.label} ${shown}` : '';
          }).filter(Boolean).join(', ')}`
        : '';
      return `${i + 1}. week ${e.week} day ${e.day} — ${what} — planned ${e.expectedDate || 'unscheduled'} — ${stand}${kept} — ${this._title(e)}`;
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
- Carry \`actualDate\`, \`dropped\` and \`recorded\` through unchanged on the entries that have them — \`recorded\` is what the person measured and must never be invented, altered or dropped.
- Keep \`record\` unchanged if the programme has one: it declares what each session asks for. Leave \`expectedDate\` out entirely — Cadence computes the dates itself from the milestones.
`;
    this._download(text, `${this._slug()}-replanning-prompt.md`, 'text/markdown');
  }

  _load() {
    const file = this._loadEl.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Two ways this fails: the file is not JSON, or it is JSON that is not
      // a program. Both used to be an uncaught error and a Load button that
      // appeared to do nothing (KD-1).
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (err) {
        this._reportLoadFailure(`${file.name} is not valid JSON — ${err.message}`);
        return;
      }
      try {
        this.configure(parsed, { viaLoad: true });
      } catch (err) {
        this._reportLoadFailure(err.message.replace(/^cadence-program: /, ''));
        return;
      }
      this._problemEl.hidden = true;
      this.dispatchEvent(new CustomEvent('cadence:programLoaded', { bubbles: true }));
    };
    reader.onerror = () => this._reportLoadFailure(`${file.name} could not be read`);
    reader.readAsText(file);
    this._loadEl.value = ''; // so selecting the same file again still fires change
  }
}

customElements.define('cadence-program', CadenceProgram);
