import { test, expect } from '@playwright/test';

// VC-4 — a program may carry any number of milestones, each pinned to its
// own date, with the sessions between them free to move (G-1, KD-2, KD-18).

const blocks = [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.2 }] }];
const seq = (title) => ({ title, blocks });

// A phased rehab protocol: two clinical reviews and a discharge, each on a
// date the clinic actually gave, with sessions in between.
const PROGRAM = {
  title: 'Phased rehab',
  entries: [
    { week: 1, day: 1, sequence: seq('Phase 1 session') },
    { week: 1, day: 4, sequence: seq('Phase 1 session') },
    { week: 2, day: 1, milestone: true, date: '2026-09-07', title: 'Review 1' },
    { week: 2, day: 4, sequence: seq('Phase 2 session') },
    { week: 3, day: 1, sequence: seq('Phase 2 session') },
    { week: 4, day: 1, milestone: true, date: '2026-09-21', title: 'Review 2' },
    { week: 5, day: 1, sequence: seq('Phase 3 session') },
    { week: 6, day: 1, milestone: true, date: '2026-10-05', title: 'Discharge' },
  ],
};

test('three milestones keep their dates through completions late and early, while sessions move', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-31T09:00:00') }); // Monday of week 1
  await page.goto('/tests/fixture.html');

  const laid = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    return prog.config.entries.map((e) => ({ d: e.expectedDate, m: Boolean(e.milestone) }));
  }, PROGRAM);

  // Anchored from the earliest milestone (KD-20): Review 1 is week 2 day 1,
  // so week 1 day 1 is the Monday seven days before 2026-09-07.
  expect(laid.map((x) => x.d)).toEqual([
    '2026-08-31', '2026-09-03',
    '2026-09-07',                 // Review 1, its own date
    '2026-09-10', '2026-09-14',
    '2026-09-21',                 // Review 2, its own date
    '2026-09-28',
    '2026-10-05',                 // Discharge, its own date
  ]);

  await page.clock.setSystemTime(new Date('2026-09-11T09:00:00')); // 11 days late
  const after = await page.evaluate(async () => {
    const prog = document.getElementById('prog');
    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelectorAll('.cdp-row')[0].click();
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
    return prog.config.entries.map((e) => e.expectedDate);
  });

  // Every milestone is exactly where it was; only the sessions moved (+11).
  expect(after[2]).toBe('2026-09-07');
  expect(after[5]).toBe('2026-09-21');
  expect(after[7]).toBe('2026-10-05');
  expect(after[1]).toBe('2026-09-14');
  expect(after[3]).toBe('2026-09-21');
  expect(after[4]).toBe('2026-09-25');
  expect(after[6]).toBe('2026-10-09');
});
