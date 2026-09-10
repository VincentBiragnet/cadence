import { test, expect } from '@playwright/test';

// A row is a row. The listbox that replaced the old dropdown inherited its
// `display:flex; flex-wrap:wrap` and never overrode it, so rows were flex
// items sized to their content — one per line only by luck of long labels.
// Two reviewers reported it and I dismissed it, because the two examples I
// checked happen to have long labels. A third made it render three to a line.

test.use({ viewport: { width: 390, height: 844 } });

const blocks = [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 20 }] }];

test('short labels still give one row per line, full width', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const m = await page.evaluate((blocks) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure({ title: 'Short', entries: Array.from({ length: 8 }, (_, i) => ({
      week: i + 1, day: 1, label: `S${i + 1}`,
      sequence: { title: `S${i + 1}`, blocks } })) });
    prog._showList(true);
    const rows = [...prog.querySelectorAll('.cdp-row')];
    const list = prog.querySelector('.cdp-list');
    const listW = list.getBoundingClientRect().width;
    return {
      tops: [...new Set(rows.map((r) => Math.round(r.getBoundingClientRect().top)))].length,
      count: rows.length,
      lefts: [...new Set(rows.map((r) => Math.round(r.getBoundingClientRect().left)))],
      widthRatio: rows[0].getBoundingClientRect().width / listW,
    };
  }, blocks);
  expect(m.count).toBe(8);
  expect(m.tops, 'eight rows should occupy eight lines').toBe(8);
  expect(m.lefts.length, 'all rows start at the same edge').toBe(1);
  // The selection highlight has to cover the row, not 56% of it.
  expect(m.widthRatio).toBeGreaterThan(0.9);
});

test('long labels are unchanged', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const m = await page.evaluate((blocks) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure({ title: 'Long', entries: Array.from({ length: 6 }, (_, i) => ({
      week: i + 1, day: 1, label: `Session ${i + 1} · 4x8 · seated and standing`,
      sequence: { title: 'x', blocks } })) });
    prog._showList(true);
    const rows = [...prog.querySelectorAll('.cdp-row')];
    return { tops: [...new Set(rows.map((r) => Math.round(r.getBoundingClientRect().top)))].length,
             overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  }, blocks);
  expect(m.tops).toBe(6);
  expect(m.overflows).toBe(false);
});
