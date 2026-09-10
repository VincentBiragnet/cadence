import { test, expect } from '@playwright/test';

// VC-2 (G-1) — KD-2: what is not allowed is the silence. A browser that
// refuses or lacks the API still runs the session and says so once, in the
// run view and in the live region, never per step.
//
// Note this file grants nothing: the default headless context already refuses
// screen-wake-lock with NotAllowedError, which is the refusal case for free.

const PROGRAM = { title: 'Fallback', entries: [{ week: 1, day: 1, sequence: { title: 'S', blocks: [
  { repetitions: 3, steps: [{ label: 'a', durationSeconds: 0.3 },
                            { label: 'b', durationSeconds: 0.3 }] }] } }] };

async function run(page, { removeApi } = {}) {
  await page.goto('/tests/fixture.html');
  if (removeApi) {
    // On the prototype, not the instance: `delete navigator.wakeLock` is a
    // silent no-op, and this test passed without it by falling back into the
    // refused-request path it was meant to be distinct from.
    await page.evaluate(() => { delete Navigator.prototype.wakeLock; });
  }
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
  }, PROGRAM);
}

test('a refused request is reported, and the session still runs', async ({ page }) => {
  // Confirm the premise: this context really does refuse.
  await page.goto('/tests/fixture.html');
  const refused = await page.evaluate(async () => {
    try { await navigator.wakeLock.request('screen'); return 'granted'; }
    catch (e) { return e.name; }
  });
  expect(refused).toBe('NotAllowedError');

  await run(page);
  await page.waitForFunction(
    () => document.querySelector('.cds-awake')?.checkVisibility(), null, { timeout: 5000 });
  const said = await page.evaluate(() => ({
    text: document.querySelector('.cds-awake').textContent,
    live: document.querySelector('.cds-live').textContent,
    running: !document.querySelector('cadence-sequence .cds-start').hidden === false,
  }));
  expect(said.text).toContain('will not keep the screen on');
  expect(said.text).toContain('auto-lock');
  expect(said.live).toContain('screen may sleep');
  // The work carries on regardless.
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-card')?.checkVisibility(), null, { timeout: 10000 });
  const done = await page.evaluate(() => !!document.getElementById('prog').config.entries[0].actualDate);
  expect(done).toBe(true);
});

test('a browser with no Wake Lock API at all is treated the same', async ({ page }) => {
  await run(page, { removeApi: true });
  await page.waitForFunction(
    () => document.querySelector('.cds-awake')?.checkVisibility(), null, { timeout: 5000 });
  const seen = await page.evaluate(() => ({
    text: document.querySelector('.cds-awake').textContent,
    apiGone: !('wakeLock' in navigator),
  }));
  expect(seen.apiGone).toBe(true);   // this path is distinct from a refusal
  const text = seen.text;
  expect(text).toContain('will not keep the screen on');
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-card')?.checkVisibility(), null, { timeout: 10000 });
  const done = await page.evaluate(() => !!document.getElementById('prog').config.entries[0].actualDate);
  expect(done).toBe(true);
});

test('it is said once, not once per step', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(() => {
    window.__announced = [];
    const seq = document.createElement('cadence-sequence');
    seq.id = 'seq';
    document.body.appendChild(seq);
    const real = seq._announce.bind(seq);
    seq._announce = (t) => { window.__announced.push(t); real(t); };
    // Six steps, so a per-step notice would say it six times.
    seq.configure({ title: 'S', blocks: [
      { repetitions: 3, steps: [{ label: 'a', durationSeconds: 0.3 },
                                { label: 'b', durationSeconds: 0.3 }] }] });
    seq.querySelector('.cds-start').click();
  });
  await page.waitForFunction(
    () => document.querySelector('#seq').hasAttribute('data-done'), null, { timeout: 10000 });
  const out = await page.evaluate(() => ({
    sleeps: window.__announced.filter((t) => /screen may sleep/.test(t)).length,
    stepAnnouncements: window.__announced.filter((t) => /step \d of \d/.test(t)).length,
    notices: document.querySelectorAll('#seq .cds-awake').length,
  }));
  expect(out.sleeps).toBe(1);
  expect(out.stepAnnouncements).toBeGreaterThan(1); // steps really did advance
  expect(out.notices).toBe(1);
});
