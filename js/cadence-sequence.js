// <cadence-sequence> — plays a JSON program of blocks/steps sequentially,
// reusing the atomic <cadence-clock> (KD-10) for each step's own timing/beep
// — mounted for real, not headless, so its chrono+bar show the current
// step's own remaining time. A title, a position indicator, the current
// label, the step clock, and one big aggregate chrono for the whole
// program are all shown together.
//
// Spawned and driven the same way as cadence-clock (KD-13):
//   const seq = document.createElement('cadence-sequence');
//   seq.configure({
//     title: "Leg day",
//     blocks: [{ repetitions: 2, steps: [{ label: "Leg raise", durationSeconds: 20, startFrequency: 440 }] }],
//     onComplete,
//   });
// It renders a Start button itself (KD-5) — configure() does not begin the
// run; clicking Start does, and that click doubles as the audio-unlock
// gesture (KD-14) for every step's beep that follows.
//
// A classic script, same as cadence-clock.js (KD-10) — file:// blocks
// module scripts via CORS and neither file needs import/export. Requires
// cadence-clock.js to already be loaded (it registers <cadence-clock>).

function formatTime(seconds) {
  // Under an hour, m:ss with no leading zero on the minutes — which is almost
  // every session, and the shorter form is the better one for them. From an
  // hour, h:mm:ss with the minutes padded: once a field leads, an unpadded
  // minute reads as the wrong number (KD-1, the same rule as cadence-clock). This supersedes the archived
  // clock-and-clock-configuration spec's KD-17, which said m:ss always and
  // rendered a 3h38m effort as 218:00.
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// Every (block, repetition, step) in play order, each carrying its own
// absolute offset from the very start. offsetMs is what makes the aggregate
// chrono self-correcting at every step boundary (KD-9) instead of drifting:
// remaining is derived from completed-steps-by-config + the current step's
// own live elapsed, never from one continuous timer since sequence start.
function flattenSteps(blocks) {
  const flat = [];
  let offsetMs = 0;
  for (const block of blocks) {
    const countInBlock = block.steps.length;
    for (let rep = 0; rep < block.repetitions; rep++) {
      block.steps.forEach((step, i) => {
        flat.push({
          step,
          block,
          offsetMs,
          indexInBlock: i + 1,
          countInBlock,
          repIndex: rep + 1,
          repCount: block.repetitions,
        });
        offsetMs += step.durationSeconds * 1000;
      });
    }
  }
  return { flat, totalMs: offsetMs };
}

// KD-4/KD-13: a short list of titled blocks, which is the shape a protocol's
// own headings survive into. KD-16: a value of the wrong shape is ignored,
// never refused — bad guidance costs some prose, a refusal costs the session.
// KD-18: built as DOM nodes with textContent, so there is no escape rule to
// forget rather than one to keep in step.
function renderGuidance(host, guidance) {
  if (!host) return;
  host.textContent = '';
  const blocks = Array.isArray(guidance) ? guidance : [];
  let shown = 0;
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const heading = typeof block.heading === 'string' ? block.heading.trim() : '';
    const text = typeof block.text === 'string' ? block.text.trim() : '';
    const items = Array.isArray(block.items)
      ? block.items.filter((i) => typeof i === 'string' && i.trim()) : [];
    if (!heading && !text && !items.length) continue;
    if (heading) {
      const h = document.createElement('h4');
      h.textContent = heading;
      host.appendChild(h);
    }
    if (text) {
      const p = document.createElement('p');
      p.textContent = text;
      host.appendChild(p);
    }
    if (items.length) {
      const ul = document.createElement('ul');
      for (const item of items) {
        const li = document.createElement('li');
        li.textContent = item.trim();
        ul.appendChild(li);
      }
      host.appendChild(ul);
    }
    shown += 1;
  }
  host.hidden = shown === 0;
}

class CadenceSequence extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this._flat = [];
    this._totalMs = 0;
    this._cursor = 0;
    this._mode = 'remaining';
    this._raf = null;
    this._stepClock = null;
  }

  connectedCallback() {
    if (!this._timeEl) this._render();
  }

  disconnectedCallback() {
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _render() {
    this.innerHTML = `
      <div class="cds-title"></div>
      <div class="cds-position"></div>
      <div class="cds-label"></div>
      <p class="cds-cue" hidden></p>
      <div class="cds-guidance" hidden></div>
      <button type="button" class="cds-time" part="time" aria-label="Toggle elapsed/remaining time"></button>
      <button type="button" class="cds-start">Start</button>
      <div class="cds-live" aria-live="polite"></div>
    `;
    this._titleEl = this.querySelector('.cds-title');
    this._positionEl = this.querySelector('.cds-position');
    this._labelEl = this.querySelector('.cds-label');
    this._cueEl = this.querySelector('.cds-cue');
    this._guidanceEl = this.querySelector('.cds-guidance');
    this._timeEl = this.querySelector('.cds-time');
    this._startEl = this.querySelector('.cds-start');
    this._liveEl = this.querySelector('.cds-live');

    // The reused per-step engine: mounted for real (KD-10, not headless) —
    // its own chrono+bar shows the current step's own remaining time,
    // alongside the big aggregate chrono below it. Its own aria-live text
    // carries no label context and would duplicate this component's own
    // announcement, so only that one inner element is silenced (KD-11);
    // its bar, time display, and visual pulse all work exactly as they do
    // standalone.
    this._stepClock = document.createElement('cadence-clock');
    this.insertBefore(this._stepClock, this._timeEl);
    this._stepClock.querySelector('.cdc-live').setAttribute('aria-hidden', 'true');
    this._stepClock.addEventListener('cadence:beep', (e) => {
      this._pulse();
      this.dispatchEvent(new CustomEvent('cadence:beep', { detail: e.detail }));
    });

    this._timeEl.addEventListener('click', () => this.toggleMode());
    this._startEl.addEventListener('click', () => this._begin());
    this._updateTimeText(0);
  }

  // The public JS entry point (KD-13-style). Does NOT auto-start — a
  // multi-minute program gets its own explicit Start gesture (KD-5).
  configure(config) {
    if (!config || !Array.isArray(config.blocks) || config.blocks.length === 0) {
      throw new Error('cadence-sequence: config.blocks must be a non-empty array');
    }
    if (this._raf) cancelAnimationFrame(this._raf);
    this._config = config;
    const { flat, totalMs } = flattenSteps(config.blocks);
    this._flat = flat;
    this._totalMs = totalMs;
    this._cursor = 0;
    this._titleEl.textContent = config.title || '';
    this._updatePosition();
    this._updateTimeText(0);
    this._startEl.hidden = false;
    this.removeAttribute('data-done');
  }

  set config(value) { this.configure(value); }
  get config() { return this._config; }

  get mode() { return this._mode; }
  set mode(value) {
    if (value !== 'remaining' && value !== 'elapsed') return;
    this._mode = value;
    this._updateTimeText(this._completedMs() + this._currentStepElapsedMs());
  }

  toggleMode() {
    this.mode = this._mode === 'remaining' ? 'elapsed' : 'remaining';
  }

  // Public: the aggregate elapsed time in ms, anchored to actual progress
  // (completed steps by config + the current step's own live elapsed, KD-9)
  // rather than one continuous timer — exposed so it can be asserted on
  // directly instead of through the rounded m:ss display text.
  get elapsedMs() {
    return this._completedMs() + this._currentStepElapsedMs();
  }

  get totalMs() { return this._totalMs; }

  _completedMs() {
    return this._cursor < this._flat.length ? this._flat[this._cursor].offsetMs : this._totalMs;
  }

  _currentStepElapsedMs() {
    return this._cursor < this._flat.length ? this._stepClock.elapsedMs : 0;
  }

  _begin() {
    this._startEl.hidden = true;
    this.dispatchEvent(new CustomEvent('cadence:start', { detail: { config: this._config } }));
    this._runStep();
    this._raf = requestAnimationFrame(() => this._tick());
  }

  _runStep() {
    const entry = this._flat[this._cursor];
    this._updatePosition();
    this._announce(
      `${entry.step.label || ''} — step ${entry.indexInBlock} of ${entry.countInBlock}, ` +
      `rep ${entry.repIndex} of ${entry.repCount}`
    );
    this._stepClock.configure({
      durationSeconds: entry.step.durationSeconds,
      startFrequency: entry.step.startFrequency,
      endFrequency: entry.step.endFrequency,
      onComplete: () => this._advance(),
    });
  }

  _advance() {
    this._cursor += 1;
    if (this._cursor >= this._flat.length) {
      this._complete();
    } else {
      this._runStep();
    }
  }

  _tick() {
    this._updateTimeText(this._completedMs() + this._currentStepElapsedMs());
    if (this._cursor < this._flat.length) {
      this._raf = requestAnimationFrame(() => this._tick());
    }
  }

  _complete() {
    this._updateTimeText(this._totalMs);
    this.setAttribute('data-done', '');
    this.dispatchEvent(new CustomEvent('cadence:complete', { detail: { config: this._config } }));
    this._announce('Complete');
    if (typeof this._config.onComplete === 'function') this._config.onComplete();
  }

  _updatePosition() {
    const entry = this._flat[this._cursor];
    if (!entry) return;
    this._labelEl.textContent = entry.step.label || '';
    this._positionEl.textContent =
      `step ${entry.indexInBlock} of ${entry.countInBlock}, rep ${entry.repIndex} of ${entry.repCount}`;
    // KD-4: one sentence, under the label, for as long as the step runs —
    // the only mechanism that reached a reviewer with their hands full.
    const cue = typeof entry.step.cue === 'string' ? entry.step.cue.trim() : '';
    this._cueEl.textContent = cue;
    this._cueEl.hidden = !cue;
    // KD-14: for the whole block, every repetition. The guidance is true of
    // the exercise, not of its first three seconds.
    renderGuidance(this._guidanceEl, entry.block && entry.block.guidance);
  }

  _updateTimeText(elapsedMs) {
    const remainingSeconds = Math.max(0, (this._totalMs - elapsedMs) / 1000);
    const elapsedSeconds = Math.min(this._totalMs, elapsedMs) / 1000;
    const seconds = this._mode === 'remaining' ? remainingSeconds : elapsedSeconds;
    this._timeEl.textContent = formatTime(seconds);
  }

  // Announces label/position changes only, never a per-tick update — same
  // non-spam rule as cadence-clock's G-6, applied here as G-5/KD-7.
  _announce(text) {
    this._liveEl.textContent = text;
  }

  _pulse() {
    this.setAttribute('data-pulse', '');
    setTimeout(() => this.removeAttribute('data-pulse'), 400);
  }
}

customElements.define('cadence-sequence', CadenceSequence);
