import { test, expect } from '@playwright/test';

// VC-3 — the sessions are allowed to run past the milestone, and the
// overrun is reported rather than compressed away (G-3, KD-1, KD-19).

const blocks = [{ repetitions: 1, steps: [{ label: 'run', durationSeconds: 0.2 }] }];

const PROGRAM = {
  title: 'Overrunning',
  entries: [
    { week: 1, day: 1, sequence: { title: 'A', blocks } },
    { week: 2, day: 1, sequence: { title: 'B', blocks } },
    { week: 3, day: 1, sequence: { title: 'C', blocks } },
    { week: 4, day: 7, milestone: true, date: '2026-09-27', title: 'Race', sequence: { title: 'Race', blocks } },
  ],
};

test('sliding past the race reports the overrun in days, and compresses nothing', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-31T09:00:00') });
  await page.goto('/tests/fixture.html');

  const fresh = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog._showList(true);   // the list is a place you go now
    return { text: prog.querySelector('.cdp-summary').textContent };
  }, PROGRAM);
  // The plan fits to begin with, so there is nothing to say.
  expect(fresh.text).not.toContain('past');

  await page.clock.setSystemTime(new Date('2026-09-18T09:00:00'));
  const after = await page.evaluate(async () => {
    const prog = document.getElementById('prog');
    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelectorAll('.cdp-row')[0].click();
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
    return {
      text: prog.querySelector('.cdp-summary').textContent,
      dates: prog.config.entries.map((e) => e.expectedDate),
    };
  });

  // Last session still to run is 2026-10-02, five days past the race.
  expect(after.text).toContain('5 days past "Race" (2026-09-27)');
  // Nothing was squeezed to fit: B and C are still exactly a week apart.
  const gap = (Date.parse(after.dates[2]) - Date.parse(after.dates[1])) / 86400000;
  expect(gap).toBe(7);
});

test('a dropped session is left out of the overrun (KD-19)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-31T09:00:00') });
  await page.goto('/tests/fixture.html');
  page.on('dialog', (d) => d.accept());

  const result = await page.evaluate(async (p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    prog._showList(true);   // the list is a place you go now
    // Push everything past the race by finishing the first session very late.
    prog.config.entries[1].expectedDate = '2026-10-05';
    prog.config.entries[2].expectedDate = '2026-10-12';
    prog._renderList();
    const withBoth = prog.querySelector('.cdp-summary').textContent;
    // Drop the last one: the overrun should fall back to the one before it.
    prog.querySelectorAll('.cdp-row')[2].click();
    prog.querySelector('.cdp-drop').click();
    return { withBoth, afterDrop: prog.querySelector('.cdp-summary').textContent };
  }, PROGRAM);

  expect(result.withBoth).toContain('15 days past "Race" (2026-09-27)');
  expect(result.afterDrop).toContain('8 days past "Race" (2026-09-27)');
});
