import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// VC-1, VC-4 — hidden has to mean gone, and the list has to hold only
// options (G-1, G-4, KD-1, KD-3).
//
// The criterion this replaces asserted the `hidden` property and passed while
// four live buttons sat on an empty page: an author's display rule outranks
// the user agent's [hidden] rule. So everything here is measured on what the
// browser computes and renders.

test.use({ viewport: { width: 390, height: 844 } });

// Measured in the page: a thing is gone when the browser says so.
const MEASURE = `(sel) => {
  const el = document.querySelector(sel);
  if (!el) return { present: false };
  const box = el.getBoundingClientRect();
  return {
    present: true,
    display: getComputedStyle(el).display,
    area: Math.round(box.width * box.height),
    liveControls: [...el.querySelectorAll('button, input, [role="option"]')]
      .filter((c) => c.getBoundingClientRect().height > 0).length,
  };
}`;

test('with nothing stored the program is not rendered at all', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const program = await page.evaluate(`(${MEASURE})('#program')`);
  const listbox = await page.evaluate(() =>
    Boolean(document.querySelector('[role="listbox"]')?.checkVisibility()));

  expect(program.display).toBe('none');
  expect(program.area).toBe(0);
  expect(program.liveControls).toBe(0);
  expect(listbox).toBe(false);   // not rendered, so not in the accessibility tree
});

test('while a session runs, the list and its bar are gone by the same measure', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem('cadence-program', JSON.stringify(p));
  }, { title: 'Running', entries: [{ week: 1, day: 1, label: 'One', sequence: { title: 'A', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 5 }] }] } }] });
  await page.reload();

  // The list is a screen you go to now, so this claim — that it is genuinely
  // gone while a session runs, not merely transparent — is measured from it.
  await page.evaluate(() => document.querySelector('cadence-program')._showList(true));
  const before = await page.evaluate(`(${MEASURE})('.cdp-view')`);
  await page.click('.cdp-start');
  const view = await page.evaluate(`(${MEASURE})('.cdp-view')`);
  const run = await page.evaluate(`(${MEASURE})('.cdp-run')`);
  const listbox = await page.evaluate(() =>
    Boolean(document.querySelector('[role="listbox"]')?.checkVisibility()));

  expect(before.display).toBe('flex');
  expect(view.display).toBe('none');
  expect(view.area).toBe(0);
  expect(view.liveControls).toBe(0);
  expect(run.display).not.toBe('none');
  expect(listbox).toBe(false);   // one view at a time, not two
});

test('the listbox owns options and nothing else, and today marks the row it falls on', async ({ page }) => {
  const rehab = JSON.parse(readFileSync('examples/rehab-acl-12wk-am-pm.json', 'utf8'));
  await page.goto('/index.html');
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem('cadence-program', JSON.stringify(p));
  }, rehab);
  await page.reload();

  const s = await page.evaluate(() => {
    const list = document.querySelector('.cdp-list');
    const marked = [...document.querySelectorAll('.cdp-row.cdp-today')];
    const rows = [...document.querySelectorAll('.cdp-row')];
    return {
      children: list.children.length,
      options: [...list.children].filter((el) => el.getAttribute('role') === 'option').length,
      markedCount: marked.length,
      markerIsFirstAhead: marked.length === 1
        && rows.indexOf(marked[0]) === rows.findIndex((r) => !r.classList.contains('stale') && !r.classList.contains('missed')
             && !/, (done|dropped)$/.test(r.getAttribute('aria-label'))),
    };
  });

  expect(s.children).toBe(s.options);      // no divider element inside the list
  expect(s.markedCount).toBeLessThanOrEqual(1);
  if (s.markedCount === 1) expect(s.markerIsFirstAhead).toBe(true);
});
