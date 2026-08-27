import { test, expect } from '@playwright/test';

// VC-6 — run state survives a page reload on its own, with no export and no
// load: eight weeks guarantees the tab is closed in between (G-5, KD-8).

const step = (label) => ({ repetitions: 1, steps: [{ label, durationSeconds: 0.2 }] });

const PROGRAM = {
  title: 'Persisting program',
  entries: [
    { week: 1, day: 1, sequence: { title: 'A', blocks: [step('a')] } },
    { week: 1, day: 3, sequence: { title: 'B', blocks: [step('b')] } },
    { week: 2, day: 1, sequence: { title: 'C', blocks: [step('c')] } },
  ],
};

test('reloading restores the same dates and the same entry marked run', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const before = await page.evaluate(async (p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
    return { anchorDate: prog.config.anchorDate, entries: prog.config.entries.map((e) => ({ expected: e.expectedDate, actual: e.actualDate || null })) };
  }, PROGRAM);

  expect(before.anchorDate).toBeTruthy();
  expect(before.entries[0].actual).toBe(before.anchorDate);

  await page.reload();

  // Configured with the *pristine* program — no dates, nothing run. The
  // stored state is what must win (KD-8).
  const after = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    return {
      anchorDate: prog.config.anchorDate,
      entries: prog.config.entries.map((e) => ({ expected: e.expectedDate, actual: e.actualDate || null })),
      done: prog.querySelector('.cdp-select').options[0].textContent.includes('(done'),
    };
  }, PROGRAM);

  expect(after.anchorDate).toBe(before.anchorDate);
  expect(after.entries).toEqual(before.entries);
  expect(after.done).toBe(true);
});
