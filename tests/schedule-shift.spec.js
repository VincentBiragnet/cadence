import { test, expect } from '@playwright/test';

// VC-4 — finishing late slides the rest of the program by exactly that
// much, keeping the intervals the author planned (G-5, KD-4, KD-9).

const step = (label) => ({ repetitions: 1, steps: [{ label, durationSeconds: 0.2 }] });

function program() {
  return {
    title: 'Sliding',
    entries: [
      { week: 1, day: 1, sequence: { title: 'A', blocks: [step('a')] } },
      { week: 1, day: 3, sequence: { title: 'B', blocks: [step('b')] } },
      { week: 2, day: 1, sequence: { title: 'C', blocks: [step('c')] } },
      { week: 2, day: 3, sequence: { title: 'D', blocks: [step('d')] } },
    ],
  };
}

test('completing two days late moves every later date exactly two days on, intervals unchanged', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T09:00:00') }); // Monday
  await page.goto('/tests/fixture.html');

  const planned = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelector('.cdp-start').click();  // anchors the program (KD-12)
    prog.querySelector('.cdp-back').click();   // abandoned: nothing recorded
    return prog.config.entries.map((e) => e.expectedDate);
  }, program());
  expect(planned).toEqual(['2026-09-07', '2026-09-09', '2026-09-14', '2026-09-16']);

  // Two days pass; the Monday session is finally done on the Wednesday.
  await page.clock.setSystemTime(new Date('2026-09-09T09:00:00'));
  const after = await page.evaluate(async () => {
    const prog = document.getElementById('prog');
    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelector('.cdp-select').value = '0';
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
    return {
      actual: prog.config.entries[0].actualDate,
      dates: prog.config.entries.map((e) => e.expectedDate),
    };
  });

  expect(after.actual).toBe('2026-09-09');
  expect(after.dates).toEqual([
    '2026-09-07', // the one that ran keeps the date it was expected on
    '2026-09-11', // +2
    '2026-09-16', // +2
    '2026-09-18', // +2
  ]);
  // The gaps the author planned — 2 days, 5 days, 2 days — are untouched.
  const gaps = after.dates.slice(1).map((d, i) => (Date.parse(d) - Date.parse(after.dates[i + 1 - 1])) / 86400000);
  expect(gaps.slice(1)).toEqual([5, 2]);
});

test('an unrun entry earlier in the order keeps its date, and nothing is pulled back past it (KD-14, KD-20)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T09:00:00') });
  await page.goto('/tests/fixture.html');

  const dates = await page.evaluate(async (p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelector('.cdp-select').value = '2';   // week 2 day 1, out of order
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
    return prog.config.entries.map((e) => ({ expected: e.expectedDate, actual: e.actualDate || null }));
  }, program());

  // Run on 09-07, seven days before it was due on 09-14 — but two entries
  // before it are still unrun, so nothing moves at all (KD-20). Only the
  // actual date is recorded.
  expect(dates[0]).toEqual({ expected: '2026-09-07', actual: null });
  expect(dates[1]).toEqual({ expected: '2026-09-09', actual: null });
  expect(dates[2]).toEqual({ expected: '2026-09-14', actual: '2026-09-07' });
  expect(dates[3]).toEqual({ expected: '2026-09-16', actual: null });
});

test('finishing early with every earlier session done does pull the rest forward (KD-20)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T09:00:00') }); // Monday
  await page.goto('/tests/fixture.html');

  const dates = await page.evaluate(async (p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    const run = async (index) => {
      const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
      prog.querySelector('.cdp-select').value = String(index);
      prog.querySelector('.cdp-start').click();
      prog.querySelector('cadence-sequence .cds-start').click();
      await done;
    };
    await run(0);  // due today: on time, nothing moves
    await run(1);  // due Wednesday, done today: two days early, and entry 0 is done
    return prog.config.entries.map((e) => e.expectedDate);
  }, program());

  expect(dates).toEqual([
    '2026-09-07',
    '2026-09-09', // the one that ran keeps the date it was expected on
    '2026-09-12', // -2
    '2026-09-14', // -2
  ]);
});
