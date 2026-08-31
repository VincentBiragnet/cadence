import { test, expect } from '@playwright/test';

// VC-3 — any entry can be run whatever its date and whatever is unrun
// before it (G-3, KD-6).

const step = (label) => ({ repetitions: 1, steps: [{ label, durationSeconds: 0.2 }] });

const PROGRAM = {
  title: 'Out of order',
  entries: [
    { week: 1, day: 1, sequence: { title: 'w1d1', blocks: [step('a')] } },
    { week: 1, day: 3, sequence: { title: 'w1d3', blocks: [step('b')] } },
    { week: 2, day: 1, sequence: { title: 'w2d1', blocks: [step('c')] } },
    { week: 2, day: 3, sequence: { title: 'w2d3', blocks: [step('d')] } },
    { week: 3, day: 2, sequence: { title: 'w3d2', blocks: [step('e')] } },
    { week: 3, day: 4, sequence: { title: 'w3d4', blocks: [step('f')] } },
  ],
};

test('starting week 3 day 2 while week 1 is unrun runs it and leaves the skipped entries unrun and in place', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T09:00:00') }); // Monday
  await page.goto('/tests/fixture.html');

  const result = await page.evaluate(async (p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelectorAll('.cdp-row')[4].click(); // week 3 day 2
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    const event = await done;
    return {
      ranTitle: event.detail.entry.sequence.title,
      run: prog.config.entries.map((e) => Boolean(e.actualDate)),
      order: [...prog.querySelectorAll('.cdp-row')].map((o) => o.getAttribute('aria-label').match(/Week \d \w+/)[0]),
    };
  }, PROGRAM);

  expect(result.ranTitle).toBe('w3d2');
  // Only the one that was chosen is run; the four before it are untouched.
  expect(result.run).toEqual([false, false, false, false, true, false]);
  // The list is still in authored order — running out of order reorders nothing.
  expect(result.order).toEqual([
    'Week 1 Mon', 'Week 1 Wed', 'Week 2 Mon', 'Week 2 Wed', 'Week 3 Tue', 'Week 3 Thu',
  ]);
});
