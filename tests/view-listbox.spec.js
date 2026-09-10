import { test, expect } from '@playwright/test';
import { blocks, longTitled } from './view-fixture.mjs';

// The six criteria that came in through the two discoveries — the listbox
// pattern and selection following focus. They carry no check command of their
// own (the harness refused --check on a proposed criterion at the time), so
// this file is the evidence they are attested against.

test.use({ viewport: { width: 390, height: 844 } });

// VC-1 — roles and a single selection.
test('a listbox of options, with exactly one selected at any time', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const s = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    prog._showList(true);   // the list is a place you go now
    const list = prog.querySelector('.cdp-list');
    const before = prog.querySelectorAll('[aria-selected="true"]').length;
    prog.querySelectorAll('.cdp-row')[9].click();
    return {
      listRole: list.getAttribute('role'),
      labelled: list.getAttribute('aria-label'),
      options: prog.querySelectorAll('[role="option"]').length,
      rows: prog.querySelectorAll('.cdp-row').length,
      before,
      after: prog.querySelectorAll('[aria-selected="true"]').length,
      nonOptionChildren: [...list.children].filter((el) => el.getAttribute('role') !== 'option').length,
    };
  }, longTitled());

  expect(s.listRole).toBe('listbox');
  expect(s.labelled).toBe('Long titles');
  expect(s.options).toBe(s.rows);
  expect(s.before).toBe(1);
  expect(s.after).toBe(1);
  expect(s.nonOptionChildren).toBe(0);   // a listbox owns options and nothing else
});

// VC-2 — the keys, and the browser doing the scrolling.
test('arrows move one row, Home and End reach the ends, and the focused row is in view', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog._showList(true);   // the list is a place you go now
    prog.querySelectorAll('.cdp-row')[0].click();
  }, longTitled());

  const index = () => page.evaluate(() =>
    [...document.querySelectorAll('#prog .cdp-row')].findIndex((r) => r.getAttribute('aria-selected') === 'true'));
  const inView = () => page.evaluate(() => {
    const row = document.querySelector('#prog .cdp-row[aria-selected="true"]');
    const list = document.querySelector('#prog .cdp-list');
    const r = row.getBoundingClientRect(), l = list.getBoundingClientRect();
    return r.top >= l.top - 1 && r.bottom <= l.bottom + 1;
  });

  await page.keyboard.press('ArrowDown');
  expect(await index()).toBe(1);
  await page.keyboard.press('ArrowDown');
  expect(await index()).toBe(2);
  await page.keyboard.press('ArrowUp');
  expect(await index()).toBe(1);
  await page.keyboard.press('End');
  expect(await index()).toBe(59);
  expect(await inView()).toBe(true);   // scrolled by the browser, not by us
  await page.keyboard.press('Home');
  expect(await index()).toBe(0);
  expect(await inView()).toBe(true);
});

// VC-3 — opening, completing and dropping all leave the current step in view.
test('the current step is focused and in view after a completion and after a drop', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  page.on('dialog', (d) => d.accept());
  const s = await page.evaluate(async (seqBlocks) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({
      title: 'Three',
      entries: [1, 2, 3].map((w) => ({ week: w, day: 1, label: `S${w}`, sequence: { title: `S${w}`, blocks: seqBlocks } })),
    });
    const chosen = () => prog.querySelector('.cdp-row[aria-selected="true"]').querySelector('.cdp-row-label').textContent.trim();
    const opened = chosen();

    const done = new Promise((r) => prog.addEventListener('cadence:entryComplete', r, { once: true }));
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await done;
    const afterRun = chosen();

    prog.querySelector('.cdp-drop').click();   // drops S2, the new current step
    return { opened, afterRun, afterDrop: chosen() };
  }, blocks);

  expect(s.opened).toBe('S1');
  expect(s.afterRun).toBe('S2');    // moved on by itself
  expect(s.afterDrop).toBe('S3');
});

// VC-10 — what is arrowed onto is what Start and Drop act on.
test('arrowing arms the row it lands on, and the bar says so', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });

  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog._showList(true);   // the list is a place you go now
    prog.querySelectorAll('.cdp-row')[0].click();
  }, longTitled());

  for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowDown');
  const s = await page.evaluate(() => {
    const prog = document.getElementById('prog');
    const armed = prog.querySelector('.cdp-row[aria-selected="true"]').querySelector('.cdp-row-label').textContent.trim();
    prog.querySelector('.cdp-drop').click();
    return { armed, next: prog.querySelector('.cdp-next').textContent };
  });

  expect(s.next).toContain(s.armed);
  expect(dialogs[0]).toContain(s.armed);   // Drop acts on the same row
});

// VC-11 — the jump reads the program, not the selection.
test('after browsing away, the jump returns to the soonest unsettled session', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const s = await page.evaluate((p) => {
    p.entries.forEach((e, i) => { if (i < 7) e.actualDate = '2026-01-01'; });
    p.entries[7].dropped = true;
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    prog._showList(true);   // the list is a place you go now
    prog.querySelectorAll('.cdp-row')[55].click();
    prog.querySelector('.cdp-jump').click();
    return [...prog.querySelectorAll('.cdp-row')].findIndex((r) => r.getAttribute('aria-selected') === 'true');
  }, longTitled());

  expect(s).toBe(8);   // seven done, one dropped, so the eighth index is next
});

// VC-12 — the confirmation leads with the name.
test('the drop confirmation opens with the name of what is going', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });

  await page.evaluate((seqBlocks) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure({
      title: 'Naming',
      entries: [
        { week: 1, day: 1, label: 'Tuesday tempo', sequence: { title: 'T', blocks: seqBlocks } },
        { week: 2, day: 7, milestone: true, date: '2026-09-27', title: 'Berlin Marathon' },
      ],
    });
    prog.querySelector('.cdp-drop').click();
    prog.querySelectorAll('.cdp-row')[1].click();
    prog.querySelector('.cdp-drop').click();
  }, blocks);

  expect(dialogs[0].startsWith('"Tuesday tempo"')).toBe(true);
  expect(dialogs[1].startsWith('"Berlin Marathon"')).toBe(true);
});
