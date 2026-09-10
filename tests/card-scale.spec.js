import { test, expect } from '@playwright/test';

// VC-5 (G-3) — a 172-session programme opens the same way a 25-session one
// does. The whole point of the card is that programme size stops being the
// user's problem: two reviewers measured 110 taps and 7.8 pane-heights to
// cross the old list.

test.use({ viewport: { width: 390, height: 844 } });

async function openFile(page, file) {
  page.on('dialog', (d) => d.accept());
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.setInputFiles('#program .cdp-load', file);
  return page.evaluate(() => {
    const prog = document.getElementById('program');
    const go = prog.querySelector('.cdp-card-go');
    const r = go.getBoundingClientRect();
    return {
      entries: prog.config.entries.length,
      cardShown: prog.querySelector('.cdp-card').checkVisibility(),
      rowsOnScreen: [...prog.querySelectorAll('.cdp-row')].filter((x) => x.checkVisibility()).length,
      goTop: Math.round(r.top),
      goShown: go.checkVisibility(),
      what: prog.querySelector('.cdp-card-what').textContent,
      controls: [...prog.querySelectorAll('.cdp-card button')]
        .filter((b) => b.checkVisibility()).map((b) => b.textContent.trim()),
      pageScrolls: document.documentElement.scrollHeight > window.innerHeight,
    };
  });
}

const shape = (m) => ({
  cardShown: m.cardShown, rowsOnScreen: m.rowsOnScreen,
  goShown: m.goShown, controls: m.controls, pageScrolls: m.pageScrolls,
});

test('25 sessions and 172 open identically', async ({ page }) => {
  const small = await openFile(page, 'examples/eight-week-strength.json');
  const big = await openFile(page, 'examples/rehab-acl-12wk-am-pm.json');

  expect(small.entries).toBe(25);
  expect(big.entries).toBe(172);
  // Same controls, in the same state, whatever the size.
  expect(shape(big)).toEqual(shape(small));
  expect(big.rowsOnScreen).toBe(0);
  expect(big.pageScrolls).toBe(false);
  // Start is on the first screen in both.
  for (const m of [small, big]) {
    expect(m.goTop).toBeGreaterThan(0);
    expect(m.goTop).toBeLessThan(844);
  }
  expect(big.what.length).toBeGreaterThan(0);
});

test('opening the list of 172 lands on the current session, not at week one', async ({ page }) => {
  await openFile(page, 'examples/rehab-acl-12wk-am-pm.json');
  // Settle a long way in, so the top of the list is nowhere near the answer.
  await page.evaluate(() => {
    const prog = document.getElementById('program');
    prog.config.entries.slice(0, 120).forEach((e) => { e.actualDate = '2026-01-01'; });
    prog._select(prog._suggestedIndex(), false);
    prog._renderList();
  });
  await page.click('#program .cdp-card-all');
  const m = await page.evaluate(() => {
    const list = document.querySelector('#program .cdp-list');
    const current = document.querySelector('#program .cdp-row[aria-selected="true"]');
    const lr = list.getBoundingClientRect();
    const cr = current.getBoundingClientRect();
    return {
      scrollTop: Math.round(list.scrollTop),
      scrollHeight: Math.round(list.scrollHeight),
      currentInView: cr.top >= lr.top - 1 && cr.bottom <= lr.bottom + 1,
      label: current.textContent.replace(/\s+/g, ' ').trim(),
    };
  });
  expect(m.currentInView, `current row out of view at scrollTop ${m.scrollTop}`).toBe(true);
  expect(m.scrollTop).toBeGreaterThan(0);   // it really did move off the top
  expect(m.label).toContain('Wk');
});
