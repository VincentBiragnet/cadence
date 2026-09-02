import { test, expect } from '@playwright/test';

// VC-2 — a dated milestone anchors the program backwards from itself, so
// every session carries a real date before anything has been run
// (G-2, KD-9, KD-14, KD-20).

const step = { repetitions: 1, steps: [{ label: 'run', durationSeconds: 0.2 }] };

function berlin() {
  const entries = [];
  for (let week = 1; week <= 16; week += 1) {
    entries.push({ week, day: 1, sequence: { title: `Week ${week} easy`, blocks: [step] } });
    entries.push({ week, day: 7, sequence: { title: `Week ${week} long run`, blocks: [step] } });
  }
  // The race: week 16 day 7, on the day it is actually held.
  entries[entries.length - 1] = {
    week: 16, day: 7, milestone: true, date: '2026-09-27',
    title: 'Berlin Marathon', sequence: { title: 'Berlin Marathon', blocks: [step] },
  };
  return { title: 'Berlin 2026', entries };
}

test('the race date lays the whole plan out backwards, before anything is run', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-05-04T09:00:00') });
  await page.goto('/tests/fixture.html');

  const result = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p); // configured only — nothing launched
    const e = prog.config.entries;
    return {
      anchorDate: prog.config.anchorDate,
      firstSession: e[0].expectedDate,
      lastMilestone: e[e.length - 1].expectedDate,
      everyEntryDated: e.every((x) => Boolean(x.expectedDate)),
      firstLabel: prog.querySelectorAll('.cdp-row')[0].getAttribute('aria-label'),
      milestoneLabel: prog.querySelectorAll('.cdp-row')[e.length - 1].getAttribute('aria-label'),
    };
  }, berlin());

  // 15 weeks and 6 days before Sunday 2026-09-27 is Monday 2026-06-08.
  expect(result.firstSession).toBe('2026-06-08');
  expect(result.anchorDate).toBe('2026-06-08');
  expect(result.lastMilestone).toBe('2026-09-27');
  expect(result.everyEntryDated).toBe(true);
  expect(result.firstLabel).toContain('2026-06-08');
  expect(result.milestoneLabel).toContain('Milestone — 2026-09-27, Berlin Marathon');

  const days = (Date.parse('2026-09-27') - Date.parse(result.firstSession)) / 86400000;
  expect(days).toBe(15 * 7 + 6);
});

test('a milestone without a date, and a date on something that is not a milestone, are both refused', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const messages = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    const seq = { title: 'X', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] };
    const attempt = (entry) => {
      try { prog.configure({ title: 'Bad', entries: [entry] }); return 'no error'; } catch (err) { return err.message; }
    };
    return {
      undated: attempt({ week: 1, day: 1, milestone: true, title: 'Race', sequence: seq }),
      datedSession: attempt({ week: 1, day: 1, date: '2026-09-27', sequence: seq }),
      untitled: attempt({ week: 1, day: 1, milestone: true, date: '2026-09-27' }),
    };
  });
  expect(messages.undated).toContain('needs a real date');
  expect(messages.datedSession).toContain('not a milestone');
  expect(messages.untitled).toContain('needs a title');
});
