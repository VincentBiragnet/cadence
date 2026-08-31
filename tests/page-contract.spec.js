import { test, expect } from '@playwright/test';

// VC-2, VC-3 — the contract must be true, and it must be readable. The page
// documents the shape an agent should send back, so the example it prints has
// to survive the real validator (KD-3), and it has to be in the page's
// *visible* text: the contents of a closed disclosure are dropped from
// innerText, which is what a page reader works on (KD-2).

test('the example the page prints is a program the component accepts', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(() => {
    const text = document.getElementById('contract-example').textContent;
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { return { parseError: e.message }; }
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    try { prog.configure(parsed, { viaLoad: true }); } catch (e) { return { configureError: e.message }; }
    return { entries: prog.config.entries.length, rows: prog.querySelectorAll('.cdp-row').length };
  });

  expect(result.parseError).toBeUndefined();
  expect(result.configureError).toBeUndefined();
  expect(result.entries).toBe(2);
  expect(result.rows).toBe(2);
});

test('the whole contract is in the visible text, and none of it is folded away', async ({ page }) => {
  await page.goto('/index.html');
  const s = await page.evaluate(() => ({
    visible: document.body.innerText,
    disclosures: document.querySelectorAll('#format details').length,
    hiddenParts: document.querySelectorAll('#format [hidden]').length,
  }));

  expect(s.disclosures).toBe(0);
  expect(s.hiddenParts).toBe(0);
  for (const needed of ['For a language model', 'week', 'day', 'label', 'sequence', 'milestone',
                        '1 is Monday, 7 is Sunday', 'durationSeconds', 'Only a milestone']) {
    expect(s.visible).toContain(needed);
  }
  // The worked example too, not just the prose about it.
  expect(s.visible).toContain('"milestone": true');
  expect(s.visible).toContain('"durationSeconds": 20');
});
