import { test, expect } from '@playwright/test';

test('suggested: the soonest not-yet-run entry is pre-selected, regardless of list position', async ({ page }) => {
  await page.goto('/index.html');
  const selected = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({
      entries: [
        { plannedDatetime: '2030-01-03T00:00:00', sequence: { title: 'C', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { plannedDatetime: '2030-01-01T00:00:00', sequence: { title: 'A (soonest)', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { plannedDatetime: '2030-01-02T00:00:00', sequence: { title: 'B', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
      ],
    });
    return prog.querySelector('.cdp-select').selectedOptions[0].textContent;
  });
  expect(selected).toContain('A (soonest)');
});

test('suggested: an already-run entry is never re-suggested even if its date is soonest', async ({ page }) => {
  await page.goto('/index.html');
  const selected = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({
      entries: [
        { plannedDatetime: '2030-01-01T00:00:00', actualDatetime: '2030-01-01T00:05:00', sequence: { title: 'Already done', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { plannedDatetime: '2030-01-05T00:00:00', sequence: { title: 'Not yet', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
      ],
    });
    return prog.querySelector('.cdp-select').selectedOptions[0].textContent;
  });
  expect(selected).toContain('Not yet');
});

test('unfiltered: every entry is listed, in the exact order given in the JSON', async ({ page }) => {
  await page.goto('/index.html');
  const titles = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({
      entries: [
        { plannedDatetime: '2030-06-01T00:00:00', sequence: { title: 'Third-planned-first-listed', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { plannedDatetime: '2030-01-01T00:00:00', sequence: { title: 'First-planned-second-listed', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { plannedDatetime: '2030-03-01T00:00:00', sequence: { title: 'Second-planned-third-listed', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
      ],
    });
    return [...prog.querySelector('.cdp-select').options].map((o) => o.textContent);
  });
  expect(titles[0]).toContain('Third-planned-first-listed');
  expect(titles[1]).toContain('First-planned-second-listed');
  expect(titles[2]).toContain('Second-planned-third-listed');
});
