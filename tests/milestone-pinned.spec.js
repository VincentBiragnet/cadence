import { test, expect } from '@playwright/test';

// VC-1 — the milestone does not move, whatever the sessions around it do
// (G-1, KD-1, KD-15).

const blocks = [{ repetitions: 1, steps: [{ label: 'run', durationSeconds: 0.2 }] }];

function program() {
  return {
    title: 'Pinned',
    entries: [
      { week: 1, day: 1, sequence: { title: 'A', blocks } },
      { week: 2, day: 1, sequence: { title: 'B', blocks } },
      { week: 3, day: 1, sequence: { title: 'C', blocks } },
      { week: 4, day: 7, milestone: true, date: '2026-09-27', title: 'Race', sequence: { title: 'Race', blocks } },
    ],
  };
}

test('a session finished 18 days late moves every unrun session after it, and not the milestone', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-31T09:00:00') }); // Monday, week 1 day 1
  await page.goto('/tests/fixture.html');

  const planned = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    return prog.config.entries.map((e) => e.expectedDate);
  }, program());
  expect(planned).toEqual(['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-27']);

  await page.clock.setSystemTime(new Date('2026-09-18T09:00:00')); // 18 days late
  const after = await page.evaluate(async () => {
    const prog = document.getElementById('prog');
    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelector('.cdp-select').value = '0';
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
    return prog.config.entries.map((e) => e.expectedDate);
  });

  expect(after).toEqual([
    '2026-08-31', // ran, keeps the date it was expected on
    '2026-09-25', // +18
    '2026-10-02', // +18
    '2026-09-27', // the race does not move
  ]);
});

test('completing the milestone itself moves nothing at all (KD-15)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-31T09:00:00') });
  await page.goto('/tests/fixture.html');

  const dates = await page.evaluate(async (p) => {
    // A milestone with sessions after it, so there is something that could move.
    p.entries.push({ week: 5, day: 1, sequence: { title: 'Recovery', blocks: p.entries[0].sequence.blocks } });
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    const before = prog.config.entries.map((e) => e.expectedDate);
    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelector('.cdp-select').value = '3'; // the milestone, run 27 days early
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
    return { before, after: prog.config.entries.map((e) => e.expectedDate), actual: prog.config.entries[3].actualDate };
  }, program());

  expect(dates.after).toEqual(dates.before);
  expect(dates.actual).toBe('2026-08-31'); // the day it really happened is still recorded
});
