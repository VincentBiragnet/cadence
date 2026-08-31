import { test, expect } from '@playwright/test';

// VC-8 — a marker milestone carries no sequence: it is reached and
// recorded, never played (G-1, KD-8, KD-22).

const blocks = [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.2 }] }];

const PROGRAM = {
  title: 'Phased',
  entries: [
    { week: 1, day: 1, sequence: { title: 'Session', blocks } },
    { week: 2, day: 7, milestone: true, date: '2026-09-13', title: 'Phase 1 review' },
    { week: 3, day: 1, sequence: { title: 'Later session', blocks } },
  ],
};

test('starting a marker records it as reached, mounts no clock and raises no error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-09-13T09:00:00') });
  await page.goto('/tests/fixture.html');

  const result = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    const seen = [];
    prog.addEventListener('cadence:entryComplete', (e) => seen.push(e.detail.entry.title));
    const before = prog.config.entries.map((e) => e.expectedDate);
    prog.querySelectorAll('.cdp-row')[1].click(); // the marker
    prog.querySelector('.cdp-start').click();
    return {
      before,
      after: prog.config.entries.map((e) => e.expectedDate),
      actual: prog.config.entries[1].actualDate,
      mountedClock: prog.querySelector('cadence-sequence') !== null,
      listVisible: !prog.querySelector('.cdp-list').hidden,
      runHidden: prog.querySelector('.cdp-run').hidden,
      announced: prog.querySelector('.cdp-live').textContent,
      events: seen,
      label: prog.querySelectorAll('.cdp-row')[1].getAttribute('aria-label'),
    };
  }, PROGRAM);

  expect(errors).toEqual([]);              // it used to throw from the listener
  expect(result.mountedClock).toBe(false); // nothing to play
  expect(result.listVisible).toBe(true);   // and so nothing to come back from
  expect(result.runHidden).toBe(true);
  expect(result.actual).toBe('2026-09-13');
  expect(result.announced).toBe('Reached Phase 1 review');
  expect(result.events).toEqual(['Phase 1 review']);
  expect(result.label).toContain('done');
  expect(result.after).toEqual(result.before); // a milestone moves nothing
});

test('reaching a marker late still moves nothing (KD-15)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-01T09:00:00') }); // 18 days late
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    const before = prog.config.entries.map((e) => e.expectedDate);
    prog.querySelectorAll('.cdp-row')[1].click();
    prog.querySelector('.cdp-start').click();
    return { before, after: prog.config.entries.map((e) => e.expectedDate), actual: prog.config.entries[1].actualDate };
  }, PROGRAM);

  expect(result.after).toEqual(result.before);
  expect(result.actual).toBe('2026-10-01');
});

test('an ordinary session with no sequence is refused at configure time', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const message = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    try {
      prog.configure({ title: 'Broken', entries: [{ week: 1, day: 1 }] });
      return 'no error';
    } catch (err) {
      return err.message;
    }
  });
  expect(message).toContain('needs a sequence to run');
});
