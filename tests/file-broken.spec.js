import { test, expect } from '@playwright/test';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// VC-2, VC-3, VC-4 — a program that would break mid-session is refused when
// it is loaded, and a file that cannot be read says so (G-2, G-3, G-4).

const seq = (steps) => ({ title: 'S', blocks: [{ repetitions: 1, steps }] });
const one = (sequence) => ({ title: 'Broken', entries: [{ week: 1, day: 1, label: 'X', sequence }] });

const cases = {
  noDuration:      one(seq([{ label: 'x' }])),
  stringDuration:  one(seq([{ label: 'x', durationSeconds: '20' }])),
  negativeDuration: one(seq([{ label: 'x', durationSeconds: -5 }])),
  zeroDuration:    one(seq([{ label: 'x', durationSeconds: 0 }])),
  infiniteDuration: one(seq([{ label: 'x', durationSeconds: 1e400 }])),
  nanDuration:     one(seq([{ label: 'x', durationSeconds: null }])),
  noSteps:         one({ title: 'S', blocks: [{ repetitions: 1, steps: [] }] }),
  noRepetitions:   one({ title: 'S', blocks: [{ repetitions: 0, steps: [{ label: 'x', durationSeconds: 1 }] }] }),
  noBlocks:        one({ title: 'S', blocks: [] }),
  impossibleDate:  { title: 'D', entries: [{ week: 1, day: 1, milestone: true, date: '2026-02-30', title: 'Never' }] },
  hugeWeek:        { title: 'W', entries: [{ week: 1e9, day: 1, label: 'X', sequence: seq([{ label: 'x', durationSeconds: 1 }]) }] },
};

test('every shape that would die at the press of Start is refused at load', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const results = await page.evaluate((all) => {
    const out = {};
    for (const [name, program] of Object.entries(all)) {
      const prog = document.createElement('cadence-program');
      document.body.appendChild(prog);
      try {
        prog.configure(program, { viaLoad: true });
        out[name] = { accepted: true, rows: prog.querySelectorAll('.cdp-row').length };
      } catch (err) {
        out[name] = { accepted: false, message: err.message };
      }
      prog.remove();
    }
    return out;
  }, cases);

  for (const [name, r] of Object.entries(results)) {
    expect(r.accepted, `${name} was accepted: ${JSON.stringify(r)}`).toBe(false);
    expect(r.message, `${name} did not name the entry`).toMatch(/entry \d+/);
  }
  expect(results.noDuration.message).toContain('durationSeconds');
  expect(results.noSteps.message).toContain('at least one step');
  expect(results.noRepetitions.message).toContain('repetitions');
  expect(results.impossibleDate.message).toContain('real date');
  expect(results.hugeWeek.message).toContain('1 to 520');
});

test('no date the app shows or stores can be NaN', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const s = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({
      title: 'Far but legal',
      entries: [
        { week: 520, day: 7, label: 'Last', sequence: { title: 'S', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } },
        { week: 1, day: 1, milestone: true, date: '2026-09-27', title: 'Anchor' },
      ],
    }, { viaLoad: true });
    return {
      dates: prog.config.entries.map((e) => e.expectedDate),
      text: prog.querySelector('.cdp-list').textContent,
      stored: localStorage.getItem('cadence-program'),
    };
  });

  for (const d of s.dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(s.text).not.toContain('NaN');
  expect(s.stored).not.toContain('NaN');
});

test('a truncated file says so and leaves the program that was loaded alone', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const good = { title: 'Keep me', entries: [{ week: 1, day: 1, label: 'Mine', sequence: seq([{ label: 'x', durationSeconds: 1 }]) }] };
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p, { viaLoad: true });
  }, good);

  const dir = mkdtempSync(join(tmpdir(), 'cadence-'));
  const path = join(dir, 'truncated.json');
  writeFileSync(path, '{"title": "Broken", "entries": [ {"week": 1, "day": 1, "sequence": {"tit');

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setInputFiles('#prog .cdp-load', path);
  await page.waitForFunction(() => !document.querySelector('#prog .cdp-problem').hidden);

  const s = await page.evaluate(() => {
    const prog = document.getElementById('prog');
    return {
      problem: prog.querySelector('.cdp-problem').textContent,
      announced: prog.querySelector('.cdp-live').textContent,
      title: prog.config.title,
      rows: prog.querySelectorAll('.cdp-row').length,
    };
  });

  expect(errors).toEqual([]);                    // it is handled, not thrown
  expect(s.problem).toContain('not loaded');
  expect(s.problem).toContain('not valid JSON');
  expect(s.announced).toContain('not loaded');   // heard as well as seen
  expect(s.title).toBe('Keep me');               // and nothing was disturbed
  expect(s.rows).toBe(1);
});

test('a file that parses but is not a program is refused the same way', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure({ title: 'Keep me', entries: [{ week: 1, day: 1, label: 'Mine',
      sequence: { title: 'S', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 1 }] }] } }] }, { viaLoad: true });
  });

  const dir = mkdtempSync(join(tmpdir(), 'cadence-'));
  const path = join(dir, 'not-a-program.json');
  writeFileSync(path, JSON.stringify({ title: 'Nope', entries: [{ week: 1, day: 1, sequence: { title: 'S', blocks: [{ repetitions: 1, steps: [{ label: 'x' }] }] } }] }));

  await page.setInputFiles('#prog .cdp-load', path);
  await page.waitForFunction(() => !document.querySelector('#prog .cdp-problem').hidden);
  const s = await page.evaluate(() => ({
    problem: document.querySelector('#prog .cdp-problem').textContent,
    title: document.getElementById('prog').config.title,
  }));

  expect(s.problem).toContain('durationSeconds');
  expect(s.title).toBe('Keep me');
});
