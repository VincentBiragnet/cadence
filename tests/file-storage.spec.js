import { test, expect } from '@playwright/test';

// VC-5 — a write that failed is stated, not swallowed (G-5, KD-4). The app
// used to show a program fully loaded, keep nothing, and lose all of it at
// the next reload with no warning at either end.

const program = (title, entries = 3) => ({
  title,
  entries: Array.from({ length: entries }, (_, i) => ({
    week: i + 1, day: 1, label: `S${i + 1}`,
    sequence: { title: `S${i + 1}`, blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] },
  })),
});

test('when storage refuses the write, the program runs and says it is not being kept', async ({ page }) => {
  await page.goto('/tests/fixture.html');

  const s = await page.evaluate((p) => {
    // Storage that refuses everything, the way a full quota does.
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function refuse() {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    };
    const events = [];
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.addEventListener('cadence:notSaved', () => events.push('notSaved'));
    try {
      prog.configure(p, { viaLoad: true });
    } finally {
      Storage.prototype.setItem = real;
    }
    return {
      rows: prog.querySelectorAll('.cdp-row').length,
      problemShown: !prog.querySelector('.cdp-problem').hidden,
      problem: prog.querySelector('.cdp-problem').textContent,
      announced: prog.querySelector('.cdp-live').textContent,
      events,
      stored: localStorage.getItem('cadence-program'),
    };
  }, program('Unsaveable'));

  expect(s.rows).toBe(3);                        // the session still works
  expect(s.stored).toBeNull();                   // nothing was actually kept
  expect(s.problemShown).toBe(true);             // and it does not pretend
  expect(s.problem).toContain('not being saved');
  expect(s.problem).toContain('lost when the page is closed');
  expect(s.announced).toContain('not being saved');
  expect(s.events).toEqual(['notSaved']);
});

test('once storage works again the warning goes away', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  page.on('dialog', (d) => d.accept());   // the drop below asks first
  const s = await page.evaluate((p) => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function refuse() { throw new Error('QuotaExceededError'); };
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p, { viaLoad: true });
    const whileFull = !prog.querySelector('.cdp-problem').hidden;

    Storage.prototype.setItem = real;
    prog.querySelectorAll('.cdp-row')[1].click();
    prog.querySelector('.cdp-drop').click();      // any change writes again
    return { whileFull, afterRecovery: !prog.querySelector('.cdp-problem').hidden };
  }, program('Recovers'));

  expect(s.whileFull).toBe(true);
  expect(s.afterRecovery).toBe(false);
});
