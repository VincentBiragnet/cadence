import { test, expect } from '@playwright/test';

// VC-2 (G-2) — KD-2. The warning used to compare planned dates to the
// milestone, and planned dates only slide when something is completed. So it
// could only fire for someone still moving. A reviewer eleven sessions short
// of a fixed date thirteen days away saw nothing but "5 of 37 done".

const blocks = [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 20 }] }];

function programFrom(sessionDates, milestoneDate) {
  return {
    title: 'Overrun',
    entries: [
      ...sessionDates.map((d, i) => ({
        week: i + 1, day: 1, label: `S${i + 1}`, expectedDate: d,
        sequence: { title: `S${i + 1}`, blocks },
      })),
      { week: 20, day: 7, milestone: true, date: milestoneDate, title: 'Reassessment' },
    ],
  };
}

async function summary(page, program) {
  await page.goto('/tests/fixture.html');
  return page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    const el = prog.querySelector('.cdp-summary');
    return { text: el.textContent.replace(/\s+/g, ' ').trim(),
             over: !!prog.querySelector('.cdp-over'),
             overrun: prog._overrun() };
  }, program);
}

test('a stalled programme reports the overrun, though nothing has moved', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-12T09:00:00Z'));
  // Every session was planned for the past and none was done; the milestone
  // is still ahead. Under the old rule nothing here overran anything.
  const out = await summary(page, programFrom(
    ['2026-09-01', '2026-09-08', '2026-09-15'], '2026-10-05'));
  expect(out.overrun, 'a programme three weeks stalled reports no overrun').not.toBe(null);
  expect(out.overrun.title).toContain('Reassessment');
  expect(out.over).toBe(true);
  expect(out.text.toLowerCase()).toMatch(/past|over/);
});

test('a programme on schedule reports none', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-12T09:00:00Z'));
  const out = await summary(page, programFrom(
    ['2026-10-13', '2026-10-20', '2026-10-27'], '2026-11-30'));
  expect(out.overrun).toBe(null);
  expect(out.over).toBe(false);
});

test('a milestone already behind is still reported, as it was before', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-12T09:00:00Z'));
  const out = await summary(page, programFrom(
    ['2026-11-01', '2026-11-08'], '2026-10-20'));
  expect(out.overrun).not.toBe(null);
});

test('a programme with no milestone reports nothing, however late it is', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-12T09:00:00Z'));
  await page.goto('/tests/fixture.html');
  const out = await page.evaluate((blocks) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure({ title: 'No milestone', entries: [
      { week: 1, day: 1, expectedDate: '2026-01-01', sequence: { title: 'S', blocks } }] });
    return prog._overrun();
  }, blocks);
  expect(out).toBe(null);
});
