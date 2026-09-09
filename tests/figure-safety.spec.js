import { test, expect } from '@playwright/test';

// KD-1 — a drawing is rebuilt from a permitted subset, never rendered as
// supplied. These are the shapes that get past a filter that asks "is this
// dangerous" instead of "is this permitted".

async function render(page, svg) {
  return page.evaluate((source) => {
    window.__pwned = null;
    const seq = document.createElement('cadence-sequence');
    seq.id = 'seq';
    document.body.appendChild(seq);
    seq.configure({ title: 'S', blocks: [{
      repetitions: 1,
      guidance: [{ heading: 'Form', text: 'words', svg: source }],
      steps: [{ label: 'x', durationSeconds: 20 }],
    }] });
    const host = seq.querySelector('.cds-guidance');
    return {
      html: host.innerHTML,
      hasFigure: !!host.querySelector('svg'),
      tags: [...host.querySelectorAll('*')].map((e) => e.localName),
      pwned: window.__pwned,
    };
  }, svg);
}

test('a real diagram survives', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const out = await render(page, `<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
    <title>Calf raise</title>
    <g stroke="currentColor" stroke-width="2" fill="none">
      <line x1="10" y1="40" x2="90" y2="40"/>
      <circle cx="50" cy="12" r="8"/>
      <path d="M50 20 L50 34"/>
    </g>
    <text x="50" y="48" font-size="6">3s</text>
  </svg>`);
  expect(out.hasFigure).toBe(true);
  expect(out.tags).toContain('line');
  expect(out.tags).toContain('circle');
  expect(out.tags).toContain('path');
  expect(out.tags).toContain('text');
  expect(out.html).toContain('viewBox="0 0 100 50"');
  expect(out.html).toContain('3s');
});

const HOSTILE = {
  'inline script': `<svg xmlns="http://www.w3.org/2000/svg"><script>window.__pwned=1<\/script><circle r="5"/></svg>`,
  'event handler': `<svg xmlns="http://www.w3.org/2000/svg" onload="window.__pwned=1"><circle r="5" onclick="window.__pwned=1"/></svg>`,
  'animate begin': `<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"><animate attributeName="r" onbegin="window.__pwned=1"/></circle></svg>`,
  'foreignObject': `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><img src=x onerror="window.__pwned=1"/></foreignObject></svg>`,
  'style block': `<svg xmlns="http://www.w3.org/2000/svg"><style>*{background:url(javascript:1)}</style><circle r="5"/></svg>`,
  'a href javascript': `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:window.__pwned=1"><circle r="5"/></a></svg>`,
  'xlink href': `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="#x"/><image xlink:href="data:image/svg+xml;base64,AAAA"/><circle r="5"/></svg>`,
  'nested svg with script': `<svg xmlns="http://www.w3.org/2000/svg"><g><svg><script>window.__pwned=1<\/script></svg></g><circle r="5"/></svg>`,
  'set attribute': `<svg xmlns="http://www.w3.org/2000/svg"><set attributeName="onload" to="window.__pwned=1"/><circle r="5"/></svg>`,
  'handler as text': `<svg xmlns="http://www.w3.org/2000/svg"><title>&lt;script&gt;window.__pwned=1&lt;/script&gt;</title><circle r="5"/></svg>`,
};

for (const [name, svg] of Object.entries(HOSTILE)) {
  test(`hostile: ${name} is rebuilt into nothing dangerous`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/tests/fixture.html');
    const out = await render(page, svg);
    await page.waitForTimeout(120);
    const pwned = await page.evaluate(() => window.__pwned);
    expect(pwned, `${name} executed`).toBe(null);
    // Nothing that can carry behaviour survives, by name.
    for (const banned of ['script', 'foreignobject', 'style', 'a', 'use', 'image', 'animate', 'set', 'iframe']) {
      expect(out.tags, `${name} kept <${banned}>`).not.toContain(banned);
    }
    expect(out.html.toLowerCase(), name).not.toContain('onload');
    expect(out.html.toLowerCase(), name).not.toContain('onerror');
    expect(out.html.toLowerCase(), name).not.toContain('onclick');
    expect(out.html.toLowerCase(), name).not.toContain('javascript:');
    expect(out.html.toLowerCase(), name).not.toContain('xlink');
    expect(errors).toEqual([]);
  });
}

test('malformed and oversized drawings are ignored, and the guidance still renders', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  for (const bad of ['<svg', 'not xml at all', '<div>html</div>', '', '   ',
                     `<svg xmlns="http://www.w3.org/2000/svg">${'<circle r="1"/>'.repeat(9000)}</svg>`]) {
    const out = await render(page, bad);
    expect(out.hasFigure, JSON.stringify(bad.slice(0, 20))).toBe(false);
    expect(out.html).toContain('words');   // the words it illustrates survive
  }
});

test('a drawing with no heading is hidden from assistive tech, with one it is labelled', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const out = await page.evaluate(() => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle r="4"/></svg>';
    const mk = (guidance) => {
      const seq = document.createElement('cadence-sequence');
      document.body.appendChild(seq);
      seq.configure({ title: 'S', blocks: [{ repetitions: 1, guidance,
        steps: [{ label: 'x', durationSeconds: 20 }] }] });
      const f = seq.querySelector('.cds-guidance svg');
      return { role: f.getAttribute('role'), label: f.getAttribute('aria-label'),
               hidden: f.getAttribute('aria-hidden') };
    };
    return { titled: mk([{ heading: 'Calf raise', svg }]), bare: mk([{ svg }]) };
  });
  expect(out.titled).toEqual({ role: 'img', label: 'Calf raise', hidden: null });
  expect(out.bare).toEqual({ role: 'img', label: null, hidden: 'true' });
});
