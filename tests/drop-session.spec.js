import { test, expect } from '@playwright/test';

// VC-5 — a session can be dropped behind a confirmation; it stays in the
// program marked dropped, nothing else moves, and it is never suggested
// again (G-4, KD-3, KD-4, KD-12).

const blocks = [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.2 }] }];
const PROGRAM = {
  title: 'Dropping',
  entries: [
    { week: 1, day: 1, sequence: { title: 'A', blocks } },
    { week: 1, day: 3, sequence: { title: 'B', blocks } },
    { week: 2, day: 1, sequence: { title: 'C', blocks } },
    { week: 2, day: 3, sequence: { title: 'D', blocks } },
  ],
};

async function anchored(page) {
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelector('.cdp-start').click(); // anchors
    prog.querySelector('.cdp-back').click();  // nothing recorded
  }, PROGRAM);
}

test('confirming a drop marks it, moves nothing, and stops it being suggested', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T09:00:00') }); // Monday
  await page.goto('/tests/fixture.html');
  await anchored(page);

  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });

  const result = await page.evaluate(() => {
    const prog = document.getElementById('prog');
    const before = prog.config.entries.map((e) => e.expectedDate);
    prog.querySelector('.cdp-select').value = '0';
    prog.querySelector('.cdp-drop').click();
    return {
      before,
      after: prog.config.entries.map((e) => e.expectedDate),
      dropped: prog.config.entries.map((e) => Boolean(e.dropped)),
      label: prog.querySelector('.cdp-select').options[0].textContent,
      suggested: prog.querySelector('.cdp-select').selectedOptions[0].textContent,
      announced: prog.querySelector('.cdp-live').textContent,
    };
  });

  expect(dialogs).toHaveLength(1);
  expect(dialogs[0]).toContain('cannot be undone');
  expect(result.after).toEqual(result.before);           // KD-3: nothing moves
  expect(result.dropped).toEqual([true, false, false, false]);
  expect(result.label).toContain('(dropped)');            // KD-4: reads as dropped
  expect(result.suggested).toContain('B');                // never suggested again
  expect(result.announced).toBe('Dropped A');
});

test('declining the confirmation leaves the program exactly as it was', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T09:00:00') });
  await page.goto('/tests/fixture.html');
  await anchored(page);

  page.on('dialog', (d) => d.dismiss());

  const result = await page.evaluate(() => {
    const prog = document.getElementById('prog');
    prog.querySelector('.cdp-select').value = '0';
    prog.querySelector('.cdp-drop').click();
    return {
      dropped: prog.config.entries.some((e) => e.dropped),
      stored: JSON.parse(localStorage.getItem('cadence-program')).entries.some((e) => e.dropped),
      label: prog.querySelector('.cdp-select').options[0].textContent,
    };
  });

  expect(result.dropped).toBe(false);
  expect(result.stored).toBe(false);
  expect(result.label).not.toContain('(dropped)');
});

test('a dropped session counts as settled, so a later early finish still pulls forward (KD-12)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T09:00:00') }); // Monday
  await page.goto('/tests/fixture.html');
  await anchored(page);
  page.on('dialog', (d) => d.accept());

  const dates = await page.evaluate(async () => {
    const prog = document.getElementById('prog');
    // Drop A, then finish B two days early with nothing else outstanding
    // before it. Without KD-12 the drop would block this shift for good.
    prog.querySelector('.cdp-select').value = '0';
    prog.querySelector('.cdp-drop').click();
    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelector('.cdp-select').value = '1';
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
    return prog.config.entries.map((e) => e.expectedDate);
  });

  // B was due 2026-09-09 and ran on the 7th: C and D each move back two days.
  expect(dates).toEqual(['2026-09-07', '2026-09-09', '2026-09-12', '2026-09-14']);
});

// VC-9 — the irreversible control is not the neighbour of the daily one
// (KD-23).
test('Drop is last in the control row, and never adjacent to Start', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const order = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    return [...prog.querySelector('.cdp-list').children].map((el) => el.className);
  }, PROGRAM);

  expect(order[order.length - 1]).toBe('cdp-drop');
  expect(order.indexOf('cdp-drop') - order.indexOf('cdp-start')).toBeGreaterThan(1);
});
