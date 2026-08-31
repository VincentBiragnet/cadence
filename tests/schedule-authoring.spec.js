import { test, expect } from '@playwright/test';

// VC-1 — an authored program carries positions, never dates (G-1, KD-2).

const PROGRAM = {
  title: 'Authored by position',
  entries: [
    { week: 1, day: 1, sequence: { title: 'A', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
    { week: 1, day: 3, sequence: { title: 'B', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
    { week: 2, day: 5, sequence: { title: 'C', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
  ],
};

test('a program whose JSON holds no date at all configures and lists every entry by week and day', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const labels = await page.evaluate((program) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(program);
    return [...prog.querySelectorAll('.cdp-row')].map((o) => o.getAttribute('aria-label'));
  }, PROGRAM);

  expect(labels).toHaveLength(3);
  expect(labels[0]).toContain('Week 1 Mon');
  expect(labels[1]).toContain('Week 1 Wed');
  expect(labels[2]).toContain('Week 2 Fri');
  // Nothing dated has appeared: no anchor exists until a launch (KD-12).
  labels.forEach((l) => expect(l).not.toMatch(/\d{4}-\d{2}-\d{2}/));
  expect(JSON.stringify(PROGRAM)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
});

test('an entry still carrying plannedDatetime is refused by name rather than ignored (IMPL-1, KD-18)', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const message = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    try {
      prog.configure({
        title: 'Old shape',
        entries: [{ plannedDatetime: '2030-01-01T00:00:00', sequence: { title: 'X', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } }],
      });
      return 'no error';
    } catch (err) {
      return err.message;
    }
  });
  expect(message).toContain('plannedDatetime');
});

test('a week or day outside the authored range is refused', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const messages = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    const attempt = (entry) => {
      try {
        prog.configure({ title: 'Bad', entries: [entry] });
        return 'no error';
      } catch (err) {
        return err.message;
      }
    };
    const seq = { title: 'X', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] };
    return [attempt({ week: 0, day: 1, sequence: seq }), attempt({ week: 1, day: 8, sequence: seq })];
  });
  expect(messages[0]).toContain('week');
  expect(messages[1]).toContain('day');
});
