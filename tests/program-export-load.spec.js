import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Rewritten onto week and day by KD-15. What this still covers beyond
// schedule-export.spec.js is the *file* round trip: Load replaces the
// current state rather than merging into it.

test('export produces the current state as JSON; loading it back reproduces it', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  page.on('dialog', (d) => d.accept()); // the stored program is part-run (KD-11)

  await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    prog.id = 'export-test';
    document.body.appendChild(prog);
    prog.configure({
      title: 'Round trip',
      anchorDate: '2026-09-07',
      entries: [
        { week: 1, day: 1, expectedDate: '2026-09-07', actualDate: '2026-09-07', sequence: { title: 'Done one', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { week: 2, day: 4, expectedDate: '2026-09-17', sequence: { title: 'Not yet', blocks: [{ repetitions: 2, steps: [{ label: 'y', durationSeconds: 5, startFrequency: 440 }] }] } },
      ],
    });
    prog._showList(true);   // the More menu lives in the list bar
  });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#export-test .cdp-more').then(() => page.click('#export-test .cdp-export')),
  ]);
  const path = await download.path();
  const exported = JSON.parse(readFileSync(path, 'utf8'));
  expect(exported.title).toBe('Round trip');
  expect(exported.entries).toHaveLength(2);
  expect(exported.entries[0].actualDate).toBe('2026-09-07');

  // Load into an instance that already holds a *different* program — Load
  // fully replaces current state, so this must load into something with
  // prior state to actually exercise "replace, not merge."
  await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    prog.id = 'load-test';
    document.body.appendChild(prog);
    prog.configure({
      title: 'Stale prior program',
      entries: [{ week: 1, day: 1, sequence: { title: 'Should be gone', blocks: [{ repetitions: 1, steps: [{ label: 'z', durationSeconds: 1 }] }] } }],
    });
    prog._showList(true);   // the More menu lives in the list bar
  });
  await page.setInputFiles('#load-test .cdp-load', path);
  const [reloaded, optionTexts] = await page.evaluate(() => [
    document.getElementById('load-test').config,
    [...document.getElementById('load-test').querySelectorAll('.cdp-row')].map((o) => o.getAttribute('aria-label')),
  ]);
  expect(reloaded).toEqual(exported);
  // The stale entry must be gone from the rendered list too, not just
  // absent from .config — a merge bug could leave .config correct while
  // the DOM still shows leftover options from the prior render.
  expect(optionTexts.some((t) => t.includes('Should be gone'))).toBe(false);
  expect(optionTexts).toHaveLength(2);
});
