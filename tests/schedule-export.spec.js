import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// VC-5 — an export is the authored shape plus what running it produced, so
// it is itself a program (G-4, KD-7, KD-18).

const step = (label) => ({ repetitions: 1, steps: [{ label, durationSeconds: 0.2 }] });

const PROGRAM = {
  title: 'Round trip',
  entries: [
    { week: 1, day: 1, sequence: { title: 'A', blocks: [step('a')] } },
    { week: 2, day: 4, sequence: { title: 'B', blocks: [step('b')] } },
  ],
};

test('export carries week and day, the computed dates, and the day the run entry really ran', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T09:00:00') }); // Monday
  await page.goto('/tests/fixture.html');

  await page.evaluate(async (p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
  }, PROGRAM);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => document.getElementById('prog').querySelector('.cdp-export').click()),
  ]);
  const exported = JSON.parse(readFileSync(await download.path(), 'utf8'));

  expect(exported.title).toBe('Round trip');
  expect(exported.anchorDate).toBe('2026-09-07');
  expect(exported.entries[0]).toMatchObject({ week: 1, day: 1, expectedDate: '2026-09-07', actualDate: '2026-09-07' });
  expect(exported.entries[1]).toMatchObject({ week: 2, day: 4, expectedDate: '2026-09-17' });
  expect(exported.entries[1].actualDate).toBeUndefined();
  expect(JSON.stringify(exported)).not.toContain('plannedDatetime');

  // The point of the shape: an export loads straight back in as a program.
  const reloaded = await page.evaluate((json) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(JSON.parse(json));
    return prog.config.entries.map((e) => e.expectedDate);
  }, JSON.stringify(exported));
  expect(reloaded).toEqual(['2026-09-07', '2026-09-17']);
});
