// <cadence-clock> — the reusable single-step clock primitive.
//
// Spawned and driven entirely from JS, never from attributes (KD-13):
//   const clock = document.createElement('cadence-clock');
//   clock.configure({ durationSeconds: 20, startFrequency: 440, endFrequency: 880, onComplete });
//
// Renders in light DOM, not a shadow root, so the shared theme.css (KD-7)
// styles it with no per-component stylesheet duplication.

const BEEP_MS = 150;

function formatTime(seconds) {
  // m:ss always, no leading zero on minutes (KD-17).
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

class CadenceClock extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this._mode = 'remaining'; // KD-4: remaining is the default
    this._startedAt = null;
    this._durationMs = 0;
    this._raf = null;
    this._audioCtx = null;
  }

  connectedCallback() {
    if (!this._timeEl) this._render();
    this.addEventListener('cadence:beep', () => this._pulse());
    this._timeEl.addEventListener('click', () => this.toggleMode());
  }

  disconnectedCallback() {
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _render() {
    this.innerHTML = `
      <button type="button" class="cdc-time" part="time" aria-label="Toggle elapsed/remaining time"></button>
      <div class="cdc-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="cdc-bar__fill"></div>
      </div>
      <div class="cdc-live" aria-live="polite"></div>
    `;
    this._timeEl = this.querySelector('.cdc-time');
    this._barEl = this.querySelector('.cdc-bar');
    this._fillEl = this.querySelector('.cdc-bar__fill');
    this._liveEl = this.querySelector('.cdc-live');
    this._updateTimeText(0);
  }

  // The public JS entry point (KD-13). Auto-starts as soon as it's given a
  // config (KD-5) — there is no separate start() to call.
  configure(config) {
    if (!config || typeof config.durationSeconds !== 'number' || config.durationSeconds <= 0) {
      throw new Error('cadence-clock: durationSeconds must be a positive number');
    }
    if (this._raf) cancelAnimationFrame(this._raf);
    this._config = config;
    this._durationMs = config.durationSeconds * 1000;
    this.removeAttribute('data-done');
    this._start();
  }

  set config(value) { this.configure(value); }
  get config() { return this._config; }

  get mode() { return this._mode; }
  set mode(value) {
    if (value !== 'remaining' && value !== 'elapsed') return;
    this._mode = value;
    this._updateTimeText(this._elapsedMs());
  }

  toggleMode() {
    this.mode = this._mode === 'remaining' ? 'elapsed' : 'remaining';
  }

  _elapsedMs() {
    return this._startedAt === null ? 0 : performance.now() - this._startedAt;
  }

  // Public: lets an embedder reusing this instance headlessly (e.g.
  // cadence-sequence, KD-1) read live progress without reaching into a
  // private method.
  get elapsedMs() { return this._elapsedMs(); }

  _start() {
    this._startedAt = performance.now();
    this.dispatchEvent(new CustomEvent('cadence:start', { detail: { config: this._config } }));
    this._announce('Started');
    if (this._config.startFrequency) this._beep(this._config.startFrequency, 'start');
    this._raf = requestAnimationFrame(() => this._tick());
  }

  _tick() {
    const elapsed = this._elapsedMs();
    const pct = Math.min(100, (elapsed / this._durationMs) * 100);
    this._fillEl.style.width = `${pct}%`;
    this._barEl.setAttribute('aria-valuenow', String(Math.round(pct)));
    this._updateTimeText(elapsed);

    if (elapsed >= this._durationMs) {
      this._complete();
    } else {
      this._raf = requestAnimationFrame(() => this._tick());
    }
  }

  _complete() {
    this._fillEl.style.width = '100%';
    this._barEl.setAttribute('aria-valuenow', '100');
    this._updateTimeText(this._durationMs);
    this.setAttribute('data-done', '');
    if (this._config.endFrequency) this._beep(this._config.endFrequency, 'end');
    this.dispatchEvent(new CustomEvent('cadence:complete', { detail: { config: this._config } }));
    this._announce('Complete');
    if (typeof this._config.onComplete === 'function') this._config.onComplete();
  }

  _updateTimeText(elapsedMs) {
    const remainingSeconds = Math.max(0, (this._durationMs - elapsedMs) / 1000);
    const elapsedSeconds = Math.min(this._durationMs, elapsedMs) / 1000;
    const seconds = this._mode === 'remaining' ? remainingSeconds : elapsedSeconds;
    this._timeEl.textContent = formatTime(seconds);
  }

  // aria-live announces only start/complete, never the continuous tick, so
  // assistive tech isn't spammed once a second (G-6).
  _announce(text) {
    this._liveEl.textContent = text;
  }

  // A blocked/unavailable AudioContext (autoplay policy — see KD-14, which
  // makes unlocking it the embedder's job, not this component's) must not
  // break the timing loop or the visual pulse that stands in for the sound.
  _beep(frequency, edge) {
    this.dispatchEvent(new CustomEvent('cadence:beep', { detail: { frequency, edge } }));
    try {
      if (!this._audioCtx) this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = this._audioCtx;
      // A context created before any user gesture starts suspended and stays
      // that way until resumed; a gesture may have happened since (KD-14
      // leaves unlocking to the embedder, but resuming here is free and
      // recovers a still-running session as soon as one occurs).
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + BEEP_MS / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + BEEP_MS / 1000);
    } catch {
      // Sound is best-effort; the event above and the visual pulse below
      // are what G-6 actually requires to be perceivable.
    }
  }

  _pulse() {
    this.setAttribute('data-pulse', '');
    setTimeout(() => this.removeAttribute('data-pulse'), 400);
  }
}

customElements.define('cadence-clock', CadenceClock);
