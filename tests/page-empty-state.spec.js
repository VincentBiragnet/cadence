import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Rewritten for a-page-built-for-the-person-holding-the-phone. The claims
// about what an empty page shows come from that spec now: exactly two things,
// and nothing written for a model or a developer visible anywhere.
// Superseded from the archived empty-state-and-a-sober-visual-pass: the
// "A program is a JSON file" intro (JSON is not a person's problem), the
// Try-the-example button (a third thing, moved to parts.html) and the visible
// format link (the contract is out of sight now).

const example = () => JSON.parse(readFileSync('examples/eight-week-strength.json', 'utf8'));

test('an empty store gives exactly two things and nothing else', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const s = await page.evaluate(() => {
    const visibleButtons = [...document.querySelectorAll('button, a.btn-quiet')]
      .filter((b) => b.checkVisibility() && b.getBoundingClientRect().height > 0)
      .map((b) => b.textContent.trim());
    return {
      emptyShown: document.getElementById('empty').checkVisibility(),
      programShown: document.getElementById('program').checkVisibility(),
      liveControls: [...document.querySelectorAll('#program button')]
        .filter((b) => b.getBoundingClientRect().height > 0).length,
      rows: document.querySelectorAll('#program .cdp-row').length,
      visibleButtons,
      contractPresent: Boolean(document.getElementById('format')),
      // checkVisibility() is true for clipped text — which is the point of
      // the technique, and why it has to be measured instead.
      contractWidth: Math.round(document.getElementById('format').getBoundingClientRect().width),
    };
  });

  expect(s.emptyShown).toBe(true);
  expect(s.programShown).toBe(false);
  expect(s.liveControls).toBe(0);   // no ghost buttons rendered under it
  expect(s.rows).toBe(0);           // nothing configured behind the scenes
  // G-2: a file you have, or the prompt to get one. The header's Load is the
  // same act as the empty state's, so the two things are Load and Copy.
  expect(s.visibleButtons).toEqual(['Load a .json file', 'Copy prompt for your AI']);
  // G-1: present for a reader, clipped to nothing for a person.
  expect(s.contractPresent).toBe(true);
  expect(s.contractWidth).toBeLessThanOrEqual(1);
});

test('nothing a person can see mentions JSON or the schema', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const visible = await page.evaluate(() => {
    // innerText deliberately includes clipped text — that is what makes the
    // contract readable to a model. So gather text from the leaf elements a
    // person can actually see, skipping the off-screen section entirely.
    const contract = document.getElementById('format');
    return [...document.body.querySelectorAll('*')]
      .filter((el) => !contract.contains(el) && el !== contract
                      && !el.querySelector('*')
                      && el.checkVisibility()
                      && el.getBoundingClientRect().width > 2)
      .map((el) => el.textContent)
      .join(' | ');
  });
  // The one permitted use is naming the kind of file on the button itself.
  const withoutButtons = visible.replace(/Load a \.json file/gi, '').replace(/Load \.json/gi, '');
  for (const jargon of ['entries', 'durationSeconds', 'sequence', 'blocks',
                        'repetitions', 'milestone', 'YYYY-MM-DD', 'startFrequency']) {
    expect(withoutButtons, `"${jargon}" is visible to a person`).not.toContain(jargon);
  }
  expect(withoutButtons.toLowerCase()).not.toContain('json object');
  expect(visible).not.toContain('The parts');
});

test('a stored program opens on itself, with the empty state gone', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem('cadence-program', JSON.stringify(p));
  }, example());
  await page.reload();

  const s = await page.evaluate(() => ({
    emptyShown: document.getElementById('empty').checkVisibility(),
    programShown: document.getElementById('program').checkVisibility(),
    rows: document.querySelectorAll('#program .cdp-row').length,
    wordmarkSmall: document.getElementById('wordmark').classList.contains('small'),
    wordmarkPx: parseFloat(getComputedStyle(document.getElementById('wordmark')).fontSize),
  }));

  expect(s.emptyShown).toBe(false);
  expect(s.programShown).toBe(true);
  expect(s.rows).toBe(25);
  // KD-2: Cadence names itself once, then gets out of the way.
  expect(s.wordmarkSmall).toBe(true);
  expect(s.wordmarkPx).toBeLessThan(20);
});

test('the prompt a person copies carries the whole contract', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('#copy-prompt');

  const copied = await page.evaluate(() => navigator.clipboard.readText());
  // Everything a model needs, none of which a person had to look at.
  for (const field of ['entries', 'durationSeconds', 'blocks', 'repetitions',
                       'cue', 'guidance', 'record', 'milestone']) {
    expect(copied, `prompt omits ${field}`).toContain(field);
  }
  expect(copied).toMatch(/^Write me a training programme/);
  const said = await page.evaluate(() => document.getElementById('copied').textContent);
  expect(said).toContain('Copied');
});

test('a running session is the subject: the programme name steps aside', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const out = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure({ title: 'A very long programme name that wraps on a phone',
      entries: [{ week: 1, day: 1, sequence: { title: 'Session one', blocks: [
        { repetitions: 1, steps: [{ label: 'x', durationSeconds: 20 }] }] } }] });
    const title = prog.querySelector('.cdp-title');
    const onList = title.checkVisibility();
    prog.querySelector('.cdp-start').click();
    const running = title.checkVisibility();
    prog.querySelector('.cdp-back').click();
    return { onList, running, backOnList: title.checkVisibility(),
             sessionTitle: prog.querySelector('.cdp-title').textContent };
  });
  expect(out.onList).toBe(true);
  expect(out.running).toBe(false);      // the session's own title carries it
  expect(out.backOnList).toBe(true);
  expect(out.sessionTitle).toContain('very long programme name');
});
