import { test, expect } from '@playwright/test';
import { blocks } from './view-fixture.mjs';

// VC-8 — a backlog is visible without reading every date
// (G-5, KD-15, KD-16, KD-17, KD-18, KD-27, KD-31).

const anchored = {
  title: 'Stale',
  anchorDate: '2026-08-31',
  entries: [
    { week: 1, day: 1, label: 'Behind, unrun', expectedDate: '2026-08-31', sequence: { title: 'A', blocks } },
    { week: 1, day: 3, label: 'Behind, done', expectedDate: '2026-09-02', actualDate: '2026-09-02', sequence: { title: 'B', blocks } },
    { week: 1, day: 5, label: 'Behind, dropped', expectedDate: '2026-09-04', dropped: true, sequence: { title: 'C', blocks } },
    { week: 3, day: 1, label: 'Due today', expectedDate: '2026-09-14', sequence: { title: 'D', blocks } },
    { week: 4, day: 1, label: 'Ahead', expectedDate: '2026-09-21', sequence: { title: 'E', blocks } },
  ],
};

const rows = () => [...document.querySelectorAll('.cdp-row')].map((r) => ({
  name: r.getAttribute('aria-label'),
  stale: r.classList.contains('stale'),
  missed: r.classList.contains('missed'),
}));

test('only a past date that is neither run nor dropped is stale, and today is not', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-14T09:00:00') }); // the Monday
  await page.goto('/tests/fixture.html');
  const r = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    return [...prog.querySelectorAll('.cdp-row')].map((row) => ({
      name: row.getAttribute('aria-label'),
      stale: row.classList.contains('stale'),
    }));
  }, anchored);

  expect(r[0].stale).toBe(true);            // behind and unrun
  expect(r[0].name).toMatch(/, overdue$/);  // and it says so out loud
  expect(r[1].stale).toBe(false);           // behind but done
  expect(r[2].stale).toBe(false);           // behind but dropped
  expect(r[3].stale).toBe(false);           // due today is not a backlog
  expect(r[4].stale).toBe(false);
});

test('the divider falls between what is behind and what is still ahead', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-14T09:00:00') });
  await page.goto('/tests/fixture.html');
  const order = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    return [...prog.querySelector('.cdp-list').children].map((el) =>
      el.classList.contains('cdp-divider') ? 'TODAY' : el.querySelector('.cdp-row-label').textContent.trim());
  }, anchored);

  expect(order).toEqual(['Behind, unrun', 'Behind, done', 'Behind, dropped', 'TODAY', 'Due today', 'Ahead']);
});

test('everything behind puts the divider at the end; nothing dated shows none at all', async ({ page }) => {
  await page.clock.install({ time: new Date('2027-01-01T09:00:00') }); // long after
  await page.goto('/tests/fixture.html');
  const s = await page.evaluate((p) => {
    const past = document.createElement('cadence-program');
    document.body.appendChild(past);
    past.configure(p);
    const children = [...past.querySelector('.cdp-list').children];

    localStorage.clear();
    const undated = document.createElement('cadence-program');
    document.body.appendChild(undated);
    undated.configure({ title: 'No dates', entries: p.entries.map(({ week, day, label, sequence }) => ({ week, day, label, sequence })) });

    return {
      dividerLast: children[children.length - 1].classList.contains('cdp-divider'),
      undatedDividers: undated.querySelectorAll('.cdp-divider').length,
    };
  }, anchored);

  expect(s.dividerLast).toBe(true);
  expect(s.undatedDividers).toBe(0);   // KD-27: no today to mark
});

test('a milestone whose date passed unreached reads as missed, not overdue', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-05T09:00:00') });
  await page.goto('/tests/fixture.html');
  const r = await page.evaluate((seqBlocks) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    localStorage.clear();
    prog.configure({
      title: 'Missed',
      entries: [
        { week: 1, day: 1, label: 'Session', sequence: { title: 'A', blocks: seqBlocks } },
        { week: 2, day: 7, milestone: true, date: '2026-09-20', title: 'Race' },
      ],
    });
    const row = prog.querySelectorAll('.cdp-row')[1];
    return { name: row.getAttribute('aria-label'), missed: row.classList.contains('missed'), stale: row.classList.contains('stale') };
  }, blocks);

  expect(r.missed).toBe(true);
  expect(r.stale).toBe(false);
  expect(r.name).toMatch(/, missed$/);
});
