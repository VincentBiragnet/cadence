import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('export produces the current state as JSON; loading it back reproduces it', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    prog.id = 'export-test';
    document.body.appendChild(prog);
    prog.configure({
      title: 'Round trip',
      entries: [
        { plannedDatetime: '2030-01-01T00:00:00', actualDatetime: '2030-01-01T00:05:00', sequence: { title: 'Done one', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { plannedDatetime: '2030-02-01T00:00:00', sequence: { title: 'Not yet', blocks: [{ repetitions: 2, steps: [{ label: 'y', durationSeconds: 5, startFrequency: 440 }] }] } },
      ],
    });
  });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#export-test .cdp-export'),
  ]);
  const path = await download.path();
  const exported = JSON.parse(readFileSync(path, 'utf8'));
  expect(exported.title).toBe('Round trip');
  expect(exported.entries).toHaveLength(2);
  expect(exported.entries[0].actualDatetime).toBe('2030-01-01T00:05:00');

  // Load into an instance that already holds a *different* program — IMPL-8
  // says Load fully replaces current state, so this must load into
  // something with prior state to actually exercise "replace, not merge."
  await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    prog.id = 'load-test';
    document.body.appendChild(prog);
    prog.configure({
      title: 'Stale prior program',
      entries: [{ plannedDatetime: '1999-01-01T00:00:00', sequence: { title: 'Should be gone', blocks: [{ repetitions: 1, steps: [{ label: 'z', durationSeconds: 1 }] }] } }],
    });
  });
  await page.setInputFiles('#load-test .cdp-load', path);
  const [reloaded, optionTexts] = await page.evaluate(() => [
    document.getElementById('load-test').config,
    [...document.getElementById('load-test').querySelectorAll('.cdp-select option')].map((o) => o.textContent),
  ]);
  expect(reloaded).toEqual(exported);
  // The stale entry must be gone from the rendered list too, not just
  // absent from .config — a merge bug could leave .config correct while
  // the DOM still shows leftover options from the prior render.
  expect(optionTexts.some((t) => t.includes('Should be gone'))).toBe(false);
  expect(optionTexts).toHaveLength(2);
});
