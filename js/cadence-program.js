// <cadence-program> — a title plus a list of entries, each pairing a
// planned datetime with a sequence-clock config. The user picks one entry
// and runs it (not a forced walk-through of the whole list, G-2); a fresh,
// *visible* <cadence-sequence> is mounted in place of the list while it
// runs (unlike sequence-clock's own headless reuse of the atomic clock —
// here the user genuinely watches it, KD-6).
//
// Spawned and driven the same way as the other two components (KD-13-style):
//   const prog = document.createElement('cadence-program');
//   prog.configure({
//     title: "Week 1",
//     entries: [
//       { plannedDatetime: "2026-08-25T07:00:00", sequence: { title: "Leg day", blocks: [...] } },
//     ],
//   });
//
// A classic script (KD-10) — file:// blocks module scripts via CORS and
// this file needs no import/export. Requires cadence-clock.js and
// cadence-sequence.js to already be loaded.

function formatPlanned(iso) {
  // KD-11: human-readable for the label a person reads; the ISO string
  // underneath (config/export) is untouched.
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
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

  // The public JS entry point. Fully replaces any prior state, same as
  // Load does (KD-5) — there is no merge.
  configure(config) {
    if (!config || !Array.isArray(config.entries) || config.entries.length === 0) {
      throw new Error('cadence-program: config.entries must be a non-empty array');
    }
    this._config = config;
    this._titleEl.textContent = config.title || '';
    this._renderList();
  }

  set config(value) { this.configure(value); }
  get config() { return this._config; }

  // Soonest plannedDatetime among entries not yet run (KD-12) — a done
  // entry is never re-suggested, however its date compares to the rest.
  _suggestedIndex() {
    let best = -1;
    this._config.entries.forEach((e, i) => {
      if (e.actualDatetime) return;
      if (best === -1 || new Date(e.plannedDatetime) < new Date(this._config.entries[best].plannedDatetime)) {
        best = i;
      }
    });
    return best;
  }

  _renderList() {
    const suggested = this._suggestedIndex();
    this._selectEl.innerHTML = this._config.entries.map((e, i) => {
      const done = e.actualDatetime ? ' (done)' : '';
      const title = (e.sequence && e.sequence.title) || 'Untitled';
      return `<option value="${i}">${formatPlanned(e.plannedDatetime)} — ${title}${done}</option>`;
    }).join('');
    if (suggested !== -1) this._selectEl.value = String(suggested);
  }

  _launch() {
    const index = Number(this._selectEl.value);
    const entry = this._config.entries[index];
    this._listEl.hidden = true;
    this._runEl.hidden = false;

    this._runningSeq = document.createElement('cadence-sequence');
    this._runningSeq.addEventListener('cadence:complete', () => this._onComplete(entry));
    this._runEl.appendChild(this._runningSeq);
    this._runningSeq.configure(entry.sequence);
    this._announce(`Started ${entry.sequence.title || 'session'}`);
  }

  // Abandons the whole session — distinct from sequence-clock's own
  // internal non-goals (pause/skip/rewind within a run). No actualDatetime
  // is recorded (KD-7).
  _abandon() {
    this._teardownRun();
    this._listEl.hidden = false;
  }

  _onComplete(entry) {
    entry.actualDatetime = new Date().toISOString();
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
