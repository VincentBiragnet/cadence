import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// VC-6 — one file to paste into an LLM: the schema it must answer in, the
// whole record including what was already done, and the overrun that says
// why a replan is needed (G-5, KD-5, KD-6, KD-7, KD-16).

const blocks = [{ repetitions: 2, steps: [{ label: 'Intervals', durationSeconds: 0.2, startFrequency: 440 }] }];
const PROGRAM = {
  title: 'Berlin build',
  entries: [
    { week: 1, day: 1, sequence: { title: 'Easy run', blocks } },
    { week: 2, day: 1, sequence: { title: 'Intervals', blocks } },
    { week: 3, day: 1, sequence: { title: 'Tempo', blocks } },
    { week: 4, day: 7, milestone: true, date: '2026-09-27', title: 'Berlin Marathon' },
  ],
};

test('the replanning prompt carries the contract, the state, the overrun and the ask', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-31T09:00:00') });
  await page.goto('/tests/fixture.html');

  await page.evaluate(async (p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog._showList(true);   // the More menu lives in the list bar
    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
    prog._showList(true);   // finishing returns to the card; the menu is on the list
  }, PROGRAM);

  // Push the remainder past the race so there is a real overrun to report.
  await page.evaluate(() => {
    const prog = document.getElementById('prog');
    prog.config.entries[1].expectedDate = '2026-10-01';
    prog.config.entries[2].expectedDate = '2026-10-08';
    prog._renderList();
  });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#prog .cdp-more').then(() => page.click('#prog .cdp-replan')),
  ]);
  expect(download.suggestedFilename()).toBe('berlin-build-replanning-prompt.md');
  const text = readFileSync(await download.path(), 'utf8');

  // The problem, stated in days against the fixed date.
  expect(text).toContain('11 days past "Berlin Marathon", which is fixed to 2026-09-27');
  expect(text).toContain('Today is 2026-08-31.');

  // The state: what is done, what is not, and which entry is the milestone.
  expect(text).toContain('done 2026-08-31');
  expect(text).toContain('not yet done');
  expect(text).toContain('MILESTONE (fixed)');

  // The whole record, with the sequences in it (KD-6).
  expect(text).toContain('"durationSeconds": 0.2');
  expect(text).toContain('"startFrequency": 440');
  expect(text).toContain('"actualDate": "2026-08-31"');

  // The contract it must answer in.
  expect(text).toContain('Answer with a single JSON object and nothing else');
  expect(text).toContain('1 for Monday through 7 for Sunday');
  expect(text).toContain('`date` is allowed **only** here');
  expect(text).toContain('Leave `expectedDate` out entirely');
});

test('the plain JSON export survives alongside it, and is the one Load can read (KD-16)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-31T09:00:00') });
  await page.goto('/tests/fixture.html');
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog._showList(true);   // the More menu lives in the list bar
  }, PROGRAM);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#prog .cdp-more').then(() => page.click('#prog .cdp-export')),
  ]);
  expect(download.suggestedFilename()).toBe('berlin-build.json');
  const parsed = JSON.parse(readFileSync(await download.path(), 'utf8'));
  expect(parsed.entries[3]).toMatchObject({ milestone: true, date: '2026-09-27', title: 'Berlin Marathon' });
});
