import { test, expect } from '@playwright/test';

// VC-3 (G-2) — KD-3, KD-8: a buzz is the third face of a signal the clock
// already makes in two, so it belongs beside the beep rather than on an event
// forwarded up. That is what makes a clock used on its own get it too.

test('every beep is accompanied by a vibration, in the same order', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const out = await page.evaluate(async () => {
    const beeps = [];
    const buzzes = [];
    navigator.vibrate = (ms) => { buzzes.push({ ms, at: performance.now() }); return true; };

    const clock = document.createElement('cadence-clock');
    document.body.appendChild(clock);
    clock.addEventListener('cadence:beep', (e) => beeps.push({ ...e.detail, at: performance.now() }));
    const done = new Promise((r) => clock.addEventListener('cadence:complete', r, { once: true }));
    clock.configure({ durationSeconds: 0.4, startFrequency: 440, endFrequency: 880 });
    await done;
    return { beeps, buzzes };
  });
  expect(out.beeps.map((b) => b.edge)).toEqual(['start', 'end']);
  expect(out.buzzes.length).toBe(out.beeps.length);
  // Paired, not merely equal in number: each buzz lands with its beep.
  out.beeps.forEach((beep, i) => {
    expect(Math.abs(out.buzzes[i].at - beep.at)).toBeLessThan(50);
  });
  expect(new Set(out.buzzes.map((b) => b.ms))).toEqual(new Set([60]));
});

test('a whole sequence buzzes once per beep, including a clock inside it', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const out = await page.evaluate(async () => {
    const beeps = [];
    const buzzes = [];
    navigator.vibrate = () => { buzzes.push(1); return true; };
    const seq = document.createElement('cadence-sequence');
    document.body.appendChild(seq);
    seq.addEventListener('cadence:beep', () => beeps.push(1));
    const done = new Promise((r) => seq.addEventListener('cadence:complete', r, { once: true }));
    seq.configure({ title: 'S', blocks: [
      { repetitions: 2, steps: [
        { label: 'a', durationSeconds: 0.3, startFrequency: 440, endFrequency: 880 },
        { label: 'b', durationSeconds: 0.3, startFrequency: 660 }] }] });
    seq.querySelector('.cds-start').click();
    await done;
    return { beeps: beeps.length, buzzes: buzzes.length };
  });
  // 2 reps x (2 beeps + 1 beep) = 6
  expect(out.beeps).toBe(6);
  expect(out.buzzes).toBe(6);
});

test('a browser with no navigator.vibrate runs unchanged', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/tests/fixture.html');
  const out = await page.evaluate(async () => {
    // On the prototype: deleting the instance property is a no-op.
    delete Navigator.prototype.vibrate;
    const beeps = [];
    const clock = document.createElement('cadence-clock');
    document.body.appendChild(clock);
    clock.addEventListener('cadence:beep', (e) => beeps.push(e.detail.edge));
    const done = new Promise((r) => clock.addEventListener('cadence:complete', r, { once: true }));
    clock.configure({ durationSeconds: 0.4, startFrequency: 440, endFrequency: 880 });
    await done;
    return { beeps, hasVibrate: 'vibrate' in navigator };
  });
  expect(out.hasVibrate).toBe(false);   // the API really is gone
  expect(out.beeps).toEqual(['start', 'end']);
  expect(errors).toEqual([]);
});

test('a vibrate that throws does not break the timing loop', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/tests/fixture.html');
  const out = await page.evaluate(async () => {
    navigator.vibrate = () => { throw new Error('refused'); };
    const beeps = [];
    const clock = document.createElement('cadence-clock');
    document.body.appendChild(clock);
    clock.addEventListener('cadence:beep', (e) => beeps.push(e.detail.edge));
    const done = new Promise((r) => clock.addEventListener('cadence:complete', r, { once: true }));
    clock.configure({ durationSeconds: 0.4, startFrequency: 440, endFrequency: 880 });
    await done;
    return beeps;
  });
  expect(out).toEqual(['start', 'end']);
  expect(errors).toEqual([]);
});
