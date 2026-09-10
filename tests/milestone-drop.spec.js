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
    prog._showList(true);   // the list is a place you go now
    prog.querySelectorAll('.cdp-row')[2].click(); // the milestone
    prog.querySelector('.cdp-drop').click();
    return { dropped: Boolean(prog.config.entries[2].dropped), label: prog.querySelectorAll('.cdp-row')[2].getAttribute('aria-label') };
  }, PROGRAM);

  expect(dialogs).toHaveLength(1);
  expect(dialogs[0]).toMatch(/^"Race" \(2026-09-20\) — cancel this milestone\?/); // KD-22: the name leads
  expect(dialogs[0]).not.toContain('nothing else moves'); // that is a session's wording
  expect(result.dropped).toBe(true);
  expect(result.label).toContain('dropped');
});

test('a cancelled milestone is no longer something the sessions can overrun', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T09:00:00') });
  await page.goto('/tests/fixture.html');
  page.on('dialog', (d) => d.accept());

  const result = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    prog._showList(true);   // the list is a place you go now
    // Push the sessions well past the race so there is a real overrun.
    prog.config.entries[0].expectedDate = '2026-09-28';
    prog.config.entries[1].expectedDate = '2026-10-05';
    prog._renderList();
    const before = prog.querySelector('.cdp-summary').textContent;

    prog.querySelectorAll('.cdp-row')[2].click();
    prog.querySelector('.cdp-drop').click();
    return { before, after: prog.querySelector('.cdp-summary').textContent };
  }, PROGRAM);

  expect(result.before).toContain('15 days past "Race" (2026-09-20)');
  expect(result.after).not.toContain('past');
});
