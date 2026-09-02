import { test, expect } from '@playwright/test';

// VC-1, VC-2 — an hour or more reads as hours; below an hour nothing changes;
// and the step clock and a sequence's total cannot disagree (G-1, G-2, G-3).
//
// The archived clock spec said m:ss always, which rendered a 3h38m marathon
// effort as 218:00. This supersedes that (KD-1).

const CASES = [
  [0, '0:00'], [9, '0:09'], [59, '0:59'],
  [60, '1:00'], [90, '1:30'], [599, '9:59'],
  [3599, '59:59'],          // the last second before the boundary
  [3600, '1:00:00'],        // and the first after it
  [3661, '1:01:01'],        // minutes padded once hours lead
  [13080, '3:38:00'],       // the effort that used to read 218:00
  [86399, '23:59:59'],
];

// The chrono only redraws on an animation frame, and a fake clock does not
// drive this component's rAF — so the clock is read live. Every duration here
// is long enough that a few hundred milliseconds of real ticking rounds to
// the same second, which keeps it deterministic without faking anything.
const LIVE = [
  [59, '0:59'], [60, '1:00'], [599, '9:59'],
  [3599, '59:59'], [3600, '1:00:00'], [3661, '1:01:01'],
  [13080, '3:38:00'], [86399, '23:59:59'],
];

test('the step clock reads m:ss below an hour and h:mm:ss from an hour', async ({ page }) => {
  await page.goto('/tests/fixture.html');

  for (const [seconds, expected] of LIVE) {
    await page.evaluate((s) => {
      document.getElementById('probe-clock')?.remove();
      const el = document.createElement('cadence-clock');
      el.id = 'probe-clock';
      document.body.appendChild(el);
      el.configure({ durationSeconds: s });   // opens on remaining
    }, seconds);
    // Wait for the first frame to draw the duration, rather than the markup's
    // initial 0:00.
    await page.waitForFunction(
      () => document.querySelector('#probe-clock .cdc-time').textContent.trim() !== '0:00');
    const text = await page.evaluate(() =>
      document.querySelector('#probe-clock .cdc-time').textContent.trim());
    expect(text, `${seconds}s`).toBe(expected);
  }
});

test('a sequence total reads by the same rule', async ({ page }) => {
  await page.goto('/tests/fixture.html');

  const shown = await page.evaluate((cases) => cases.map(([seconds]) => {
    const el = document.createElement('cadence-sequence');
    document.body.appendChild(el);
    el.configure({
      title: 'T',
      blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: seconds || 0.001 }] }],
    });
    const text = el.querySelector('.cds-time').textContent.trim();
    el.remove();
    return text;
  }), CASES);

  CASES.forEach(([seconds, expected], i) => {
    if (seconds === 0) return;
    expect(shown[i], `${seconds}s`).toBe(expected);
  });
});

test('the two agree on every boundary, so they cannot disagree on screen', async ({ page }) => {
  await page.goto('/tests/fixture.html');

  const disagreements = [];
  for (const [seconds] of LIVE) {
    await page.evaluate((s) => {
      document.getElementById('probe-clock')?.remove();
      document.getElementById('probe-seq')?.remove();
      const el = document.createElement('cadence-clock');
      el.id = 'probe-clock';
      document.body.appendChild(el);
      el.configure({ durationSeconds: s });
    }, seconds);
    await page.waitForFunction(
      () => document.querySelector('#probe-clock .cdc-time').textContent.trim() !== '0:00');

    const pair = await page.evaluate((s) => {
      const clock = document.querySelector('#probe-clock .cdc-time').textContent.trim();
      const seq = document.createElement('cadence-sequence');
      seq.id = 'probe-seq';
      document.body.appendChild(seq);
      seq.configure({ title: 'T', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: s }] }] });
      return { clock, sequence: seq.querySelector('.cds-time').textContent.trim() };
    }, seconds);
    if (pair.clock !== pair.sequence) disagreements.push({ seconds, ...pair });
  }

  expect(disagreements).toEqual([]);
});
