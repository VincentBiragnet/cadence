import { test, expect } from '@playwright/test';

test('loading the page makes zero requests to any other origin', async ({ page }) => {
  const externalRequests = [];
  page.on('request', (req) => {
    if (new URL(req.url()).origin !== 'http://localhost:4173') externalRequests.push(req.url());
  });
  await page.goto('/index.html');
  await page.waitForTimeout(200);
  expect(externalRequests).toEqual([]);
});
