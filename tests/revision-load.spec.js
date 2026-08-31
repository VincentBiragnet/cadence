import { test, expect } from '@playwright/test';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// VC-7 — a Load is an explicit act and replaces the whole stored state,
// history included, once warned. A page reload is not, and still restores
// what was stored (G-6, KD-5).

const blocks = [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.2 }] }];
const ORIGINAL = {
  title: 'Rehab protocol',
  entries: [
    { week: 1, day: 1, sequence: { title: 'Phase 1 — heel slides', blocks } },
    { week: 1, day: 3, sequence: { title: 'Phase 1 — quad sets', blocks } },
  ],
};
// The physio revised it: same programme, different content. Under the old
// title-matching rule this was silently discarded.
const REVISED = {
  title: 'Rehab protocol',
  entries: [
    { week: 1, day: 1, sequence: { title: 'REVISED — heel slides, reduced load', blocks } },
    { week: 1, day: 3, sequence: { title: 'REVISED — quad sets, added holds', blocks } },
    { week: 2, day: 1, sequence: { title: 'REVISED — new phase 2 session', blocks } },
  ],
};

function revisionFile() {
  const dir = mkdtempSync(join(tmpdir(), 'cadence-'));
  const path = join(dir, 'revised.json');
  writeFileSync(path, JSON.stringify(REVISED));
  return path;
}

async function partRun(page) {
  await page.evaluate(async (p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
  }, ORIGINAL);
}

test('loading a revision over a part-run program replaces it, history and all, once warned', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await partRun(page);

  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });

  await page.setInputFiles('#prog .cdp-load', revisionFile());
  const after = await page.evaluate(() => {
    const prog = document.getElementById('prog');
    return {
      titles: prog.config.entries.map((e) => e.sequence.title),
      anyDone: prog.config.entries.some((e) => e.actualDate),
      storedTitles: JSON.parse(localStorage.getItem('cadence-program')).entries.map((e) => e.sequence.title),
    };
  });

  expect(dialogs).toHaveLength(1);
  expect(dialogs[0]).toContain('including everything already recorded as done');
  expect(after.titles).toEqual([
    'REVISED — heel slides, reduced load',
    'REVISED — quad sets, added holds',
    'REVISED — new phase 2 session',
  ]);
  expect(after.anyDone).toBe(false); // the history went with it, as warned
  expect(after.storedTitles).toEqual(after.titles);
});

test('declining the warning keeps the program and its history untouched', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await partRun(page);
  page.on('dialog', (d) => d.dismiss());

  await page.setInputFiles('#prog .cdp-load', revisionFile());
  const after = await page.evaluate(() => {
    const prog = document.getElementById('prog');
    return {
      titles: prog.config.entries.map((e) => e.sequence.title),
      done: prog.config.entries.filter((e) => e.actualDate).length,
    };
  });

  expect(after.titles).toEqual(['Phase 1 — heel slides', 'Phase 1 — quad sets']);
  expect(after.done).toBe(1);
});

test('a page reload is not a load: the stored state is still restored', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await partRun(page);
  const before = await page.evaluate(() => document.getElementById('prog').config.entries[0].actualDate);

  await page.reload();

  const after = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p); // the pristine programme again, as index.html would
    return { actual: prog.config.entries[0].actualDate, count: prog.config.entries.length };
  }, ORIGINAL);

  expect(after.actual).toBe(before);
  expect(after.count).toBe(2);
});
