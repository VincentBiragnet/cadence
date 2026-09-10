import { test, expect } from '@playwright/test';

// VC-1 (G-1) — KD-1. Every computed date in a programme hangs off its
// milestones, so recording one is the most consequential write in the app.
// It used to happen on a single unconfirmed press.

const PROGRAM = {
  title: 'Milestone confirm',
  entries: [
    { week: 1, day: 1, label: 'One', sequence: { title: 'One', blocks: [
      { repetitions: 1, steps: [{ label: 'x', durationSeconds: 20 }] }] } },
    { week: 6, day: 7, milestone: true, date: '2026-12-25', title: 'Physio reassessment' },
  ],
};

async function selectMilestone(page) {
  await page.goto('/tests/fixture.html');
  return page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog._select(1, true);
    return {
      button: prog.querySelector('.cdp-start').textContent,
      bar: prog.querySelector('.cdp-next').textContent.trim(),
    };
  }, PROGRAM);
}

test('it offers to mark it reached, not to start it', async ({ page }) => {
  const shown = await selectMilestone(page);
  expect(shown.button).toBe('Mark reached');
  expect(shown.bar).toContain('Start will record');
  expect(shown.bar).toContain('Physio reassessment');
});

test('declining records nothing at all', async ({ page }) => {
  const asked = [];
  page.on('dialog', (d) => { asked.push(d.message()); d.dismiss(); });
  await selectMilestone(page);
  await page.evaluate(() => document.querySelector('#prog .cdp-start').click());
  const after = await page.evaluate(() => {
    const e = document.getElementById('prog').config.entries[1];
    return { actualDate: e.actualDate ?? null,
             stored: JSON.parse(localStorage.getItem('cadence-program') || '{}')
               .entries?.[1]?.actualDate ?? null };
  });
  expect(asked.length).toBe(1);
  expect(asked[0]).toContain('2026-12-25');          // it names the date
  expect(asked[0]).toContain('Physio reassessment');
  expect(after.actualDate).toBe(null);
  expect(after.stored).toBe(null);
});

test('accepting records it, and the date it names is the milestone’s own', async ({ page }) => {
  const asked = [];
  page.on('dialog', (d) => { asked.push(d.message()); d.accept(); });
  await selectMilestone(page);
  await page.evaluate(() => document.querySelector('#prog .cdp-start').click());
  const after = await page.evaluate(
    () => document.getElementById('prog').config.entries[1].actualDate);
  expect(asked[0]).toContain('2026-12-25');
  expect(after).toBeTruthy();
  expect(after).not.toBe('2026-12-25');   // reached today, not on its own date
});

test('a session is untouched by this: no confirmation, straight to the clock', async ({ page }) => {
  const asked = [];
  page.on('dialog', (d) => { asked.push(d.message()); d.accept(); });
  await page.goto('/tests/fixture.html');
  const out = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog._select(0, true);
    const label = prog.querySelector('.cdp-start').textContent;
    prog.querySelector('.cdp-start').click();
    return { label, running: !!prog.querySelector('cadence-sequence') };
  }, PROGRAM);
  expect(out.label).toBe('Start');
  expect(out.running).toBe(true);
  expect(asked).toEqual([]);
});
