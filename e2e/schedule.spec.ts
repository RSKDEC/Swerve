import { test, expect } from '@playwright/test';

test('first prepared day completes with its own questions, scores, share number and saved results', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-20T12:00:00Z') });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('.tag')).toContainText('#002');
  await page.getByRole('button', { name: /Play today/ }).click();
  await expect(page.getByRole('heading')).toHaveText(
    'Name a food people order when nobody wants to cook.',
  );
  const rounds = [
    ['blend', 'pizza', 88],
    ['swerve', 'dusting', 88],
    ['sweet', 'wifi', 95],
    ['swerve', 'luggage', 88],
    ['blend', 'hello', 75],
  ] as const;
  for (const [i, [mode, answer, score]] of rounds.entries()) {
    await page.locator(`[data-mode="${mode}"]`).click();
    await page.getByLabel('YOUR ANSWER', { exact: true }).fill(answer);
    await page.getByRole('button', { name: 'Lock it in' }).click();
    await expect(page.locator('.big')).toHaveText(`${score} / 100`);
    await page
      .getByRole('button', {
        name: i === 4 ? 'See your results' : 'Next question',
      })
      .click();
  }
  await expect(page.locator('.result-number')).toContainText('434');
  await page.getByRole('button', { name: 'Copy result', exact: true }).click();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toContain('swerve. #002');
  await page.reload();
  await expect(page.locator('.result-number')).toContainText('434');
  await page.clock.fastForward(24 * 60 * 60 * 1000);
  await page.reload();
  await expect(page.locator('.tag')).toContainText('#003');
  await page.getByRole('button', { name: /Play today/ }).click();
  await expect(page.getByRole('heading')).toHaveText(
    'What makes people rush in the morning?',
  );
});

test('scheduled draft survives reload and the bank end shows a clear message without replaying old content', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2027-01-27T12:00:00Z') });
  await page.goto('/');
  await expect(page.locator('.tag')).toContainText('#101');
  await page.getByRole('button', { name: /Play today/ }).click();
  const prompt = await page.getByRole('heading').textContent();
  await page.locator('[data-mode="blend"]').click();
  await page.getByLabel('YOUR ANSWER', { exact: true }).fill('a saved answer');
  await page.clock.fastForward(5000);
  await page.reload();
  await expect(page.getByRole('heading')).toHaveText(prompt!);
  await expect(page.getByLabel('YOUR ANSWER', { exact: true })).toHaveValue(
    'a saved answer',
  );
  expect(
    Number((await page.locator('#timer').textContent())!.replace(/\D/g, '')),
  ).toBeLessThanOrEqual(25);
  await page.clock.fastForward(24 * 60 * 60 * 1000);
  await page.reload();
  await expect(
    page.getByText(
      'The next Swerve challenge is being prepared. Please check back soon.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Play today/ })).toHaveCount(0);
});
