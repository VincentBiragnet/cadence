import { test, expect } from '@playwright/test';

// Rewritten onto week and day by KD-15; actualDatetime became actualDate,
// since nothing carries a time of day any more (KD-3).

const ENTRY = (title, seconds) => ({
  week: 1, day: 1,
  sequence: { title, blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: seconds }] }] },
});

test('start: launching mounts a real, visible, running cadence-sequence and hides the list', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate((entry) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({ title: 'Launching', entries: [entry] });
    prog.querySelector('.cdp-start').click();
    return {
      listHidden: prog.querySelector('.cdp-view').hidden,
      runVisible: !prog.querySelector('.cdp-run').hidden,
      hasSequence: prog.querySelector('cadence-sequence') !== null,
    };
  }, ENTRY('X', 10));
  expect(result).toEqual({ listHidden: true, runVisible: true, hasSequence: true });
});

test('back: abandons the run with no actualDate recorded, restores the list unchanged', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate((entry) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({ title: 'Abandoning', entries: [entry] });
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click(); // actually running now
    prog.querySelector('.cdp-back').click();
    return {
      listVisible: !prog.querySelector('.cdp-view').hidden,
      sequenceGone: prog.querySelector('cadence-sequence') === null,
      entryDone: prog.querySelector('.cdp-list').innerHTML.includes('done'),
      actualDateSet: !!prog.config.entries[0].actualDate,
      // The launch still anchored the program, even though the run was
      // abandoned — the anchor is the launch, not the completion (KD-12).
      anchored: !!prog.config.anchorDate,
    };
  }, ENTRY('X', 10));
  expect(result).toEqual({ listVisible: true, sequenceGone: true, entryDone: false, actualDateSet: false, anchored: true });
});

test('complete: records actualDate, fires cadence:entryComplete, restores the list showing done', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async (entry) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    const events = [];
    prog.addEventListener('cadence:entryComplete', (e) => events.push(e.detail));
    prog.configure({ title: 'Completing', entries: [entry] });
    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
    return {
      events: events.length,
      actualDate: prog.config.entries[0].actualDate,
      anchorDate: prog.config.anchorDate,
      listVisible: !prog.querySelector('.cdp-view').hidden,
      entryDone: prog.querySelector('.cdp-list').innerHTML.includes('done'),
    };
  }, ENTRY('X', 0.15));
  expect(result.events).toBe(1);
  expect(result.actualDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(result.actualDate).toBe(result.anchorDate); // run the day it began
  expect(result.listVisible).toBe(true);
  expect(result.entryDone).toBe(true);
});
