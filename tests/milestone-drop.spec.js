import { test, expect } from '@playwright/test';

// VC-11 — a milestone can be dropped, because a race can be cancelled, but
// the confirmation says what it really is and a cancelled date stops being a
// deadline (KD-25).

const blocks = [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.2 }] }];

const PROGRAM = {
  title: 'With a race',
  entries: [
    { week: 1, day: 1, sequence: { title: 'A', blocks } },
    { week: 2, day: 1, sequence: { title: 'B', blocks } },
    { week: 3, day: 7, milestone: true, date: '2026-09-20', title: 'Race' },
  ],
};

test('the confirmation names a milestone as a fixed date being cancelled, not a session skipped', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T09:00:00') });
  await page.goto('/tests/fixture.html');
  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });

  const result = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelector('.cdp-select').value = '2'; // the milestone
    prog.querySelector('.cdp-drop').click();
    return { dropped: Boolean(prog.config.entries[2].dropped), label: prog.querySelector('.cdp-select').options[2].textContent };
  }, PROGRAM);

  expect(dialogs).toHaveLength(1);
  expect(dialogs[0]).toContain('Cancel the milestone "Race" on 2026-09-20');
  expect(dialogs[0]).not.toContain('nothing else moves'); // that is a session's wording
  expect(result.dropped).toBe(true);
  expect(result.label).toContain('(dropped)');
});

test('a cancelled milestone is no longer something the sessions can overrun', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T09:00:00') });
  await page.goto('/tests/fixture.html');
  page.on('dialog', (d) => d.accept());

  const result = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    // Push the sessions well past the race so there is a real overrun.
    prog.config.entries[0].expectedDate = '2026-09-28';
    prog.config.entries[1].expectedDate = '2026-10-05';
    prog._renderList();
    const before = prog.querySelector('.cdp-overrun').textContent;

    prog.querySelector('.cdp-select').value = '2';
    prog.querySelector('.cdp-drop').click();
    return { before, after: prog.querySelector('.cdp-overrun').textContent, hidden: prog.querySelector('.cdp-overrun').hidden };
  }, PROGRAM);

  expect(result.before).toBe('15 days past "Race" (2026-09-20)');
  expect(result.after).toBe('');
  expect(result.hidden).toBe(true);
});
