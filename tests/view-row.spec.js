import { test, expect } from '@playwright/test';
import { blocks, longTitled } from './view-fixture.mjs';

// VC-6 — a row is legible at a glance: the short label and the date, never
// the authored title, with the state carried in the accessible name
// (G-3, KD-25, KD-29, KD-30).

test('a row shows the short label and the date, and not the long title', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T09:00:00') });
  await page.goto('/tests/fixture.html');
  const m = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    prog._showList(true);   // the list is a place you go now
    prog.querySelector('.cdp-start').click();   // anchors, so rows carry dates
    prog.querySelector('.cdp-back').click();
    const row = prog.querySelectorAll('.cdp-row')[0];
    return {
      text: row.textContent.replace(/\s+/g, ' ').trim(),
      name: row.getAttribute('aria-label'),
      longTitle: p.entries[0].sequence.title,
    };
  }, longTitled());

  expect(m.text).toContain('Scales 85');          // the short label
  expect(m.text).toMatch(/\d{4}-\d{2}-\d{2}/);    // and when it is due
  expect(m.text).not.toContain(m.longTitle);      // never the authored title
});

test('the accessible name ends with the row state, and the icon carries only that', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T09:00:00') });
  await page.goto('/tests/fixture.html');
  const m = await page.evaluate((seqBlocks) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({
      title: 'States',
      anchorDate: '2026-09-07',
      entries: [
        { week: 1, day: 1, label: 'Done one', expectedDate: '2026-09-07', actualDate: '2026-09-07', sequence: { title: 'A', blocks: seqBlocks } },
        { week: 1, day: 3, label: 'Dropped one', expectedDate: '2026-09-09', dropped: true, sequence: { title: 'B', blocks: seqBlocks } },
        { week: 2, day: 1, label: 'Ahead', expectedDate: '2026-09-14', sequence: { title: 'C', blocks: seqBlocks } },
        { week: 3, day: 7, milestone: true, date: '2026-09-27', title: 'Race' },
      ],
    });
    return [...prog.querySelectorAll('.cdp-row')].map((r) => ({
      name: r.getAttribute('aria-label'),
      icon: r.querySelector('.cdp-row-icon').textContent,
      iconHidden: r.querySelector('.cdp-row-icon').getAttribute('aria-hidden'),
    }));
  }, blocks);

  expect(m[0].name).toMatch(/, done$/);
  expect(m[1].name).toMatch(/, dropped$/);
  expect(m[2].name).not.toMatch(/, (done|dropped|overdue|missed)$/);
  expect(m[3].name).toContain('Milestone — 2026-09-27');  // the lead says what it is
  expect(m[3].icon).toBe('');                              // not the icon
  expect(m[0].iconHidden).toBe('true');                    // the icon never speaks twice
});
