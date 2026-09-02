import { test, expect } from '@playwright/test';
import { blocks } from './view-fixture.mjs';

// VC-2 — focus lands somewhere meaningful whenever a view is swapped
// (G-2, KD-2, KD-6). A hidden element cannot hold focus: the browser punts it
// to the body, which drops a keyboard user at the top of a very long page.

const program = () => ({
  title: 'Focusing',
  entries: [1, 2, 3].map((w) => ({ week: w, day: 1, label: `S${w}`, sequence: { title: `S${w}`, blocks } })),
});

const focused = () => page => page.evaluate(() => {
  const el = document.activeElement;
  return { tag: el.tagName, cls: el.className, label: el.getAttribute?.('aria-label') || null };
});

test('starting a session puts focus on the control that begins it', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const f = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelector('.cdp-start').click();
    return { cls: document.activeElement.className, tag: document.activeElement.tagName };
  }, program());

  expect(f.cls).toContain('cds-start');
  expect(f.tag).toBe('BUTTON');
});

test('abandoning, completing and dropping all return focus to the current row', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  page.on('dialog', (d) => d.accept());

  const s = await page.evaluate(async (p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    const state = () => {
      const el = document.activeElement;
      return {
        isRow: el.classList.contains('cdp-row'),
        selected: el.getAttribute('aria-selected'),
        label: el.querySelector?.('.cdp-row-label')?.textContent.trim() || null,
        inBody: el === document.body,
      };
    };

    prog.querySelector('.cdp-start').click();
    prog.querySelector('.cdp-back').click();
    const afterAbandon = state();

    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
    const afterComplete = state();

    prog.querySelector('.cdp-drop').click();
    const afterDrop = state();
    return { afterAbandon, afterComplete, afterDrop };
  }, program());

  for (const [when, f] of Object.entries(s)) {
    expect(f.inBody, `${when} left focus on the body`).toBe(false);
    expect(f.isRow, `${when} did not focus a row`).toBe(true);
    expect(f.selected).toBe('true');
  }
  expect(s.afterAbandon.label).toBe('S1');   // nothing recorded, still current
  expect(s.afterComplete.label).toBe('S2');  // moved on
  expect(s.afterDrop.label).toBe('S3');      // S2 dropped, so S3 is current
});
