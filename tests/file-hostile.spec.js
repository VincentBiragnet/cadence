import { test, expect } from '@playwright/test';

// VC-1 — a program file is shared between people, so its text is untrusted
// (G-1, KD-7). A label carrying an img with an onerror handler used to run.

const PAYLOAD = '<img src=x onerror="window.__PWNED__=1">';

const hostile = {
  title: `Title ${PAYLOAD}`,
  entries: [
    { week: 1, day: 1, label: `Label ${PAYLOAD}`,
      sequence: { title: `Sequence ${PAYLOAD}`, blocks: [{ repetitions: 1, steps: [{ label: `Step ${PAYLOAD}`, durationSeconds: 1 }] }] } },
    { week: 2, day: 7, milestone: true, date: '2026-09-27', title: `Milestone ${PAYLOAD}` },
  ],
};

test('markup in a label, a milestone title or a sequence title is text, not markup', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/tests/fixture.html');

  const s = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p, { viaLoad: true });
    const rows = [...prog.querySelectorAll('.cdp-row')];
    return {
      pwned: window.__PWNED__ ?? null,
      injectedImages: prog.querySelectorAll('img').length,
      injectedAnything: prog.querySelectorAll('.cdp-row *:not(span)').length,
      labelText: rows[0].querySelector('.cdp-row-label').textContent,
      milestoneName: rows[1].getAttribute('aria-label'),
      titleText: prog.querySelector('.cdp-title').textContent,
    };
  }, hostile);

  expect(s.pwned).toBeNull();          // no handler ran
  expect(errors).toEqual([]);
  expect(s.injectedImages).toBe(0);    // and nothing of theirs is in the page
  expect(s.injectedAnything).toBe(0);
  // The text is shown, verbatim and inert.
  expect(s.labelText).toContain('<img src=x onerror=');
  expect(s.milestoneName).toContain('<img src=x onerror=');
  expect(s.titleText).toContain('<img src=x onerror=');
});

test('a quote in a label cannot break out of the accessible name', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const s = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({
      title: 'Quoting',
      entries: [{ week: 1, day: 1, label: '" onmouseover="window.__PWNED__=2" x="',
        sequence: { title: 'A', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } }],
    }, { viaLoad: true });
    const row = prog.querySelector('.cdp-row');
    return {
      pwned: window.__PWNED__ ?? null,
      onmouseover: row.getAttribute('onmouseover'),
      name: row.getAttribute('aria-label'),
    };
  });

  expect(s.pwned).toBeNull();
  expect(s.onmouseover).toBeNull();    // no attribute was forged
  expect(s.name).toContain('onmouseover');   // it is just part of the name
});
