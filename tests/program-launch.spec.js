import { test, expect } from '@playwright/test';

test('start: launching mounts a real, visible, running cadence-sequence and hides the list', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({
      entries: [{ plannedDatetime: '2030-01-01T00:00:00', sequence: { title: 'X', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 10 }] }] } }],
    });
    prog.querySelector('.cdp-start').click();
    return {
      listHidden: prog.querySelector('.cdp-list').hidden,
      runVisible: !prog.querySelector('.cdp-run').hidden,
      hasSequence: prog.querySelector('cadence-sequence') !== null,
    };
  });
  expect(result).toEqual({ listHidden: true, runVisible: true, hasSequence: true });
});

test('back: abandons the run with no actualDatetime recorded, restores the list unchanged', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({
      entries: [{ plannedDatetime: '2030-01-01T00:00:00', sequence: { title: 'X', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 10 }] }] } }],
    });
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click(); // actually running now
    prog.querySelector('.cdp-back').click();
    return {
      listVisible: !prog.querySelector('.cdp-list').hidden,
      sequenceGone: prog.querySelector('cadence-sequence') === null,
      entryDone: prog.querySelector('.cdp-select').innerHTML.includes('(done)'),
      actualDatetimeSet: !!prog.config.entries[0].actualDatetime,
    };
  });
  expect(result).toEqual({ listVisible: true, sequenceGone: true, entryDone: false, actualDatetimeSet: false });
});

test('complete: records actualDatetime, fires cadence:entryComplete, restores the list showing done', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(async () => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    const events = [];
    prog.addEventListener('cadence:entryComplete', (e) => events.push(e.detail));
    prog.configure({
      entries: [{ plannedDatetime: '2030-01-01T00:00:00', sequence: { title: 'X', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.15 }] }] } }],
    });
    const before = new Date().toISOString();
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await new Promise((r) => setTimeout(r, 500));
    return {
      events: events.length,
      actualDatetime: prog.config.entries[0].actualDatetime,
      before,
      listVisible: !prog.querySelector('.cdp-list').hidden,
      entryDone: prog.querySelector('.cdp-select').innerHTML.includes('(done)'),
    };
  });
  expect(result.events).toBe(1);
  expect(new Date(result.actualDatetime).getTime()).toBeGreaterThanOrEqual(new Date(result.before).getTime());
  expect(result.listVisible).toBe(true);
  expect(result.entryDone).toBe(true);
});
