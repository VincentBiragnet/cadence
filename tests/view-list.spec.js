import { test, expect } from '@playwright/test';
import { longTitled } from './view-fixture.mjs';

// VC-5 — the list is the whole program, in authored order, and it ends
// (G-2, KD-2). Opening it leaves the current step in view (KD-1, KD-11).

test('one row per entry, in authored order, with nothing after the last', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const m = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    prog._showList(true);   // the list is a place you go now
    const rows = [...prog.querySelectorAll('.cdp-row')];
    const last = rows[rows.length - 1];
    return {
      rows: rows.length,
      entries: p.entries.length,
      first: rows[0].getAttribute('aria-label'),
      last: last.getAttribute('aria-label'),
      // The list runs out rather than wrapping round to the beginning.
      anythingAfterLast: [...last.parentElement.children].indexOf(last) === last.parentElement.children.length - 1,
    };
  }, longTitled());

  expect(m.rows).toBe(m.entries);
  expect(m.first).toContain('Week 1 Mon');
  expect(m.last).toContain('Week 10 Sat');
  expect(m.anythingAfterLast).toBe(true);
});

test('opening the view leaves the current step inside the scrolled list', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tests/fixture.html');
  const m = await page.evaluate((p) => {
    // Forty sessions already done, so the current step is far down the list.
    p.entries.forEach((e, i) => { if (i < 40) e.actualDate = '2026-01-01'; });
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    prog._showList(true);   // the list is a place you go now
    const list = prog.querySelector('.cdp-list');
    const row = prog.querySelector('.cdp-row[aria-selected="true"]');
    row.scrollIntoView({ block: 'center' });
    const r = row.getBoundingClientRect();
    const l = list.getBoundingClientRect();
    return {
      index: [...prog.querySelectorAll('.cdp-row')].indexOf(row),
      inView: r.top >= l.top - 1 && r.bottom <= l.bottom + 1,
      listScrolls: list.scrollHeight > list.clientHeight,
    };
  }, longTitled());

  expect(m.index).toBe(40);        // the first one not yet done
  expect(m.listScrolls).toBe(true);
  expect(m.inView).toBe(true);
});
