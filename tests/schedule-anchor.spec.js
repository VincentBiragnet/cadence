import { test, expect } from '@playwright/test';

// VC-2 — launching anchors the program to that day, and week 1 is the
// anchor's *own* week (G-2, KD-1, KD-2, KD-10, KD-12).

const THURSDAY = new Date('2026-09-03T09:00:00'); // a Thursday
const MONDAY_OF_THAT_WEEK = '2026-08-31';

function program() {
  const entries = [];
  for (let week = 1; week <= 3; week += 1) {
    [1, 3, 5].forEach((day) => {
      entries.push({ week, day, sequence: { title: `w${week}d${day}`, blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } });
    });
  }
  return { title: 'Anchoring', entries };
}

test('starting on a Thursday lays week 1 across that same week, on the authored weekdays', async ({ page }) => {
  await page.clock.install({ time: THURSDAY });
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelector('.cdp-start').click();
    return {
      anchorDate: prog.config.anchorDate,
      dates: prog.config.entries.map((e) => e.expectedDate),
    };
  }, program());

  expect(result.anchorDate).toBe('2026-09-03');
  expect(result.dates).toEqual([
    '2026-08-31', '2026-09-02', '2026-09-04', // week 1 — the anchor's own week
    '2026-09-07', '2026-09-09', '2026-09-11',
    '2026-09-14', '2026-09-16', '2026-09-18',
  ]);
  // Week 1 Monday is the Monday of the anchor's week, already past on the
  // Thursday the program began — which is legal: it is simply due (KD-5).
  expect(result.dates[0]).toBe(MONDAY_OF_THAT_WEEK);
  expect(result.dates[0] < result.anchorDate).toBe(true);
});

test('an entry already carrying dates is treated as anchored and is not re-anchored (KD-19)', async ({ page }) => {
  await page.clock.install({ time: THURSDAY });
  await page.goto('/tests/fixture.html');
  const dates = await page.evaluate(() => {
    const loaded = {
      title: 'Already anchored',
      anchorDate: '2026-01-05',
      entries: [
        { week: 1, day: 1, expectedDate: '2026-01-05', sequence: { title: 'A', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { week: 1, day: 3, expectedDate: '2026-01-07', sequence: { title: 'B', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
      ],
    };
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(loaded);
    prog.querySelector('.cdp-start').click();
    return { anchorDate: prog.config.anchorDate, dates: prog.config.entries.map((e) => e.expectedDate) };
  });

  expect(dates.anchorDate).toBe('2026-01-05');
  expect(dates.dates).toEqual(['2026-01-05', '2026-01-07']);
});
