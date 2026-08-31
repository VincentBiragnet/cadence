import { test, expect } from '@playwright/test';

// Rewritten onto week and day by KD-15; git holds the plannedDatetime
// originals, whose behaviour KD-2 superseded.

test('suggested: with no anchor yet, the first not-yet-run entry in authored order is pre-selected (KD-13)', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const selected = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({
      title: 'Unanchored',
      entries: [
        { week: 1, day: 1, sequence: { title: 'A (first)', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { week: 1, day: 3, sequence: { title: 'B', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
      ],
    });
    return prog.querySelector('.cdp-row[aria-selected=\"true\"]').getAttribute('aria-label');
  });
  expect(selected).toContain('A (first)');
});

test('suggested: once anchored, the soonest expected date wins regardless of list position (KD-13)', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const selected = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({
      title: 'Anchored',
      anchorDate: '2026-09-07',
      entries: [
        { week: 3, day: 1, expectedDate: '2026-09-21', sequence: { title: 'C', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { week: 1, day: 1, expectedDate: '2026-09-07', sequence: { title: 'A (soonest)', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { week: 2, day: 1, expectedDate: '2026-09-14', sequence: { title: 'B', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
      ],
    });
    return prog.querySelector('.cdp-row[aria-selected=\"true\"]').getAttribute('aria-label');
  });
  expect(selected).toContain('A (soonest)');
});

test('suggested: an already-run entry is never re-suggested even if its date is soonest', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const selected = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({
      title: 'Partly run',
      anchorDate: '2026-09-07',
      entries: [
        { week: 1, day: 1, expectedDate: '2026-09-07', actualDate: '2026-09-07', sequence: { title: 'Already done', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { week: 1, day: 5, expectedDate: '2026-09-11', sequence: { title: 'Not yet', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
      ],
    });
    return prog.querySelector('.cdp-row[aria-selected=\"true\"]').getAttribute('aria-label');
  });
  expect(selected).toContain('Not yet');
});

test('unfiltered: every entry is listed, in the exact order given in the JSON', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const titles = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({
      title: 'Order',
      entries: [
        { week: 3, day: 1, sequence: { title: 'Third-week-first-listed', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { week: 1, day: 1, sequence: { title: 'First-week-second-listed', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { week: 2, day: 1, sequence: { title: 'Second-week-third-listed', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
      ],
    });
    return [...prog.querySelectorAll('.cdp-row')].map((o) => o.getAttribute('aria-label'));
  });
  expect(titles[0]).toContain('Third-week-first-listed');
  expect(titles[1]).toContain('First-week-second-listed');
  expect(titles[2]).toContain('Second-week-third-listed');
});
