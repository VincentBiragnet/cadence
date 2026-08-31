import { test, expect } from '@playwright/test';
import { blocks } from './view-fixture.mjs';

// VC-7 — the view says where the program as a whole stands, and the overrun
// takes the finish's place once there is one (G-4, KD-7, KD-28).

const program = () => ({
  title: 'Summarised',
  entries: [
    { week: 1, day: 1, label: 'One', sequence: { title: 'A', blocks } },
    { week: 2, day: 1, label: 'Two', sequence: { title: 'B', blocks } },
    { week: 3, day: 1, label: 'Three', sequence: { title: 'C', blocks } },
    { week: 4, day: 7, milestone: true, date: '2026-09-27', title: 'Race' },
  ],
});

test('it counts what is done and names the day the program is projected to end', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-31T09:00:00') });
  await page.goto('/tests/fixture.html');
  const text = await page.evaluate(async (p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
    return prog.querySelector('.cdp-summary').textContent;
  }, program());

  expect(text).toContain('1 of 4 done');
  expect(text).toContain('finishes 2026-09-27');   // the milestone is the end
});

test('once a milestone is overrun the summary says that instead of a finish', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-31T09:00:00') });
  await page.goto('/tests/fixture.html');
  const text = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    prog.config.entries[2].expectedDate = '2026-10-04';   // a week past the race
    prog._renderList();
    return prog.querySelector('.cdp-summary').textContent;
  }, program());

  expect(text).toContain('7 days past "Race" (2026-09-27)');
  expect(text).not.toContain('finishes');
});

test('a program with nothing left says so, and one with no dates yet does not', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const s = await page.evaluate((p) => {
    const unanchored = document.createElement('cadence-program');
    document.body.appendChild(unanchored);
    unanchored.configure({ title: 'Fresh', entries: p.entries.slice(0, 3) });
    const fresh = unanchored.querySelector('.cdp-summary').textContent;

    const finished = document.createElement('cadence-program');
    document.body.appendChild(finished);
    localStorage.clear();
    finished.configure({
      title: 'All done',
      anchorDate: '2026-09-07',
      entries: p.entries.slice(0, 3).map((e) => ({ ...e, expectedDate: '2026-09-07', actualDate: '2026-09-07' })),
    });
    return { fresh, finished: finished.querySelector('.cdp-summary').textContent };
  }, program());

  expect(s.fresh).toBe('0 of 3 done');          // no dates yet is not "finished"
  expect(s.finished).toContain('finished');
});
