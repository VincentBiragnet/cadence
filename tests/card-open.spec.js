import { test, expect } from '@playwright/test';

// VC-4 (G-1, G-2) — KD-8: a loaded programme opens on one session, not on
// every session. KD-3: a card showing anything else says so and offers a way
// back. KD-4: it names what the press will do.

test.use({ viewport: { width: 390, height: 844 } });

const blocks = [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 20 }] }];
const PROGRAM = {
  title: 'Card',
  entries: [
    { week: 1, day: 1, label: 'S1', sequence: { title: 'One', blocks } },
    { week: 1, day: 3, label: 'S2', sequence: { title: 'Two', blocks } },
    { week: 2, day: 1, label: 'S3', sequence: { title: 'Three', blocks } },
  ],
};

async function open(page, program = PROGRAM) {
  page.on('dialog', (d) => d.accept());
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.evaluate((p) => {
    const prog = document.getElementById('program');
    prog.configure(p);
    prog.hidden = false;
  }, program);
}

const card = () => {
  const prog = document.getElementById('program');
  const q = (s) => prog.querySelector(s);
  return {
    cardShown: q('.cdp-card').checkVisibility(),
    listShown: q('.cdp-view').checkVisibility(),
    rowsOnScreen: [...prog.querySelectorAll('.cdp-row')].filter((r) => r.checkVisibility()).length,
    when: q('.cdp-card-when').textContent,
    what: q('.cdp-card-what').textContent,
    does: q('.cdp-card-does').textContent,
    go: q('.cdp-card-go').textContent,
    homeShown: q('.cdp-card-home').checkVisibility(),
    goTop: Math.round(q('.cdp-card-go').getBoundingClientRect().top),
  };
};

test('a loaded programme opens on one session and no list', async ({ page }) => {
  await open(page);
  const c = await page.evaluate(card);
  expect(c.cardShown).toBe(true);
  expect(c.listShown).toBe(false);
  expect(c.rowsOnScreen).toBe(0);        // not merely scrolled away — not shown
  expect(c.when).toBe('Next up');
  expect(c.what).toBe('S1');
  expect(c.does).toBe('Start will run: S1');
  expect(c.goTop).toBeGreaterThan(0);
  expect(c.goTop).toBeLessThan(844);     // reachable without scrolling
  expect(c.homeShown).toBe(false);       // already on the due one
});

test('the list is one press away and one press back', async ({ page }) => {
  await open(page);
  await page.click('#program .cdp-card-all');
  const onList = await page.evaluate(card);
  expect(onList.listShown).toBe(true);
  expect(onList.cardShown).toBe(false);
  expect(onList.rowsOnScreen).toBe(3);

  await page.click('#program .cdp-view-back');
  const back = await page.evaluate(card);
  expect(back.cardShown).toBe(true);
  expect(back.listShown).toBe(false);
});

test('a session you browsed to is marked, and one press returns to the due one', async ({ page }) => {
  await open(page);
  await page.click('#program .cdp-card-all');
  await page.evaluate(() => {
    const prog = document.getElementById('program');
    prog._select(2, true);
    prog._showList(false);
  });
  const browsing = await page.evaluate(card);
  expect(browsing.what).toBe('S3');
  expect(browsing.when).toBe('Just looking');   // not "Next up"
  expect(browsing.does).toBe('Start will run: S3');
  expect(browsing.homeShown).toBe(true);

  await page.click('#program .cdp-card-home');
  const home = await page.evaluate(card);
  expect(home.what).toBe('S1');
  expect(home.when).toBe('Next up');
  expect(home.homeShown).toBe(false);
});

test('a finished programme says so and offers nothing to start', async ({ page }) => {
  const done = new Date().toISOString().slice(0, 10);
  await open(page, { ...PROGRAM,
    entries: PROGRAM.entries.map((e) => ({ ...e, actualDate: done })) });
  const c = await page.evaluate(() => {
    const prog = document.getElementById('program');
    return {
      standing: prog.querySelector('.cdp-standing').textContent,
      bodyShown: prog.querySelector('.cdp-card-body').checkVisibility(),
    };
  });
  expect(c.standing).toContain('complete');
  expect(c.bodyShown).toBe(false);   // nothing dressed up as the next thing
});

test('behind and at risk: the card states it, and says when it will not fit', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-12T09:00:00Z'));
  await open(page, {
    title: 'Adrift',
    entries: [
      ...['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'].map((d, i) => ({
        week: i + 1, day: 1, label: `S${i + 1}`, expectedDate: d,
        sequence: { title: `S${i + 1}`, blocks },
      })),
      { week: 6, day: 7, milestone: true, date: '2026-10-20', title: 'Reassessment' },
    ],
  });
  const standing = await page.evaluate(
    () => document.querySelector('#program .cdp-standing').textContent);
  expect(standing).toContain('4 sessions behind');
  expect(standing).toContain('Reassessment in 8 days');
  expect(standing).toContain('will not fit');
  const bad = await page.evaluate(() => document.querySelector('#program .cdp-standing')
    .classList.contains('cdp-standing-bad'));
  expect(bad).toBe(true);
});
