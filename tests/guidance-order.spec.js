import { test, expect } from '@playwright/test';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// VC-7 (G-1) — KD-20. Guidance is unbounded; the clock is the thing you
// watch. Anything unbounded placed above the clock can push it off the
// screen, and VC-1 cannot detect that: guidance sitting between the cue and
// the clock only makes "cue above clock" easier to satisfy. So the claim
// here is about the clock, whatever the program throws at the page.

test.use({ viewport: { width: 390, height: 844 } });

function bullets(n, tag) {
  return [{ heading: 'Watch for',
            items: Array.from({ length: n },
              (_, i) => `${tag} point ${i + 1}: keep the ribs down and the hips level.`) }];
}

function program(n) {
  return {
    title: 'Order test',
    guidance: bullets(n, 'Program'),
    entries: [{
      week: 1, day: 1, label: 'Heavy',
      guidance: bullets(n, 'Entry'),
      sequence: { title: 'Heavy session', blocks: [{
        repetitions: 1,
        guidance: bullets(n, 'Block'),
        steps: [{ label: 'Push-up', durationSeconds: 60, cue: 'Ribs down, elbows back.' }],
      }] },
    }],
  };
}

async function runWith(page, n) {
  await page.goto('/index.html');
  const dir = mkdtempSync(join(tmpdir(), 'cadence-'));
  const file = join(dir, `order-${n}.json`);
  writeFileSync(file, JSON.stringify(program(n)));
  await page.setInputFiles('#program .cdp-load', file);
  await page.evaluate(() => {
    const prog = document.getElementById('program');
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
  });
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const q = (s) => document.querySelector(`#program ${s}`);
    const rect = (el) => { const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom),
               area: Math.round(r.width * r.height), vis: el.checkVisibility() }; };
    return {
      cue: rect(q('.cds-cue')),
      clock: rect(q('cadence-clock')),
      total: rect(q('cadence-sequence > .cds-time')),
      guidance: rect(q('.cds-guidance')),
      h: window.innerHeight,
      scrollY: Math.round(window.scrollY),
    };
  });
}

for (const n of [0, 6, 50]) {
  test(`the clock stays on screen with ${n} bullets at every scope`, async ({ page }) => {
    const m = await runWith(page, n);
    const where = `clock ${m.clock.top}..${m.clock.bottom}, guidance ${m.guidance.top}, scrollY ${m.scrollY}`;

    // The two things you watch, both fully on screen.
    expect(m.clock.vis, where).toBe(true);
    expect(m.clock.area).toBeGreaterThan(500);
    expect(m.clock.top >= 0 && m.clock.bottom <= m.h, where).toBe(true);
    expect(m.total.top >= 0 && m.total.bottom <= m.h, where).toBe(true);

    // VC-1's half still holds, and now means something.
    expect(m.cue.top >= 0 && m.cue.bottom <= m.h, where).toBe(true);
    expect(m.cue.top).toBeLessThan(m.clock.bottom);

    // Order: cue, then clock, then guidance — reference material underneath.
    if (n > 0) {
      expect(m.guidance.vis).toBe(true);
      expect(m.guidance.top, where).toBeGreaterThanOrEqual(m.clock.bottom);
    }
  });
}
