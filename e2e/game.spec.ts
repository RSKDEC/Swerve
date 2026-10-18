import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-18T12:00:00Z') });
});

async function begin(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Play today/ }).click();
  await expect(page.getByText('QUESTION 1 OF 5')).toBeVisible();
}
async function answer(page: Page, mode: string, value: string) {
  await page.locator(`[data-mode="${mode}"]`).click();
  await page.getByLabel('YOUR ANSWER', { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Lock it in' }).click();
}
async function finishGame(page: Page) {
  for (const [i, [mode, value]] of [
    ['blend', 'phone'],
    ['swerve', 'wine'],
    ['sweet', 'wallet'],
    ['swerve', 'book'],
    ['blend', 'keys'],
  ].entries()) {
    await answer(page, mode, value);
    await page
      .getByRole('button', {
        name: i === 4 ? 'See your results' : 'Next question',
      })
      .click();
  }
}

test('full game, token limits, results, share, persisted results, and replay', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
      configurable: true,
    });
  });
  await begin(page);
  await finishGame(page);
  await expect(page.locator('.result-number')).toContainText('437');
  await expect(page.locator('.round-summary')).toHaveCount(5);
  await page.getByRole('button', { name: 'Copy result', exact: true }).click();
  await expect(page.getByText('Result copied!')).toBeVisible();
  const copied = await page.evaluate(
    () => (window as unknown as { copied: string }).copied,
  );
  expect(copied).toContain('437/500');
  expect(copied).not.toContain('phone');
  await page.reload();
  await expect(page.locator('.result-number')).toContainText('437');
  await page.getByRole('button', { name: 'Replay demo' }).click();
  await page.getByRole('button', { name: 'Keep my score' }).click();
  await expect(page.locator('.result-number')).toContainText('437');
  await page.getByRole('button', { name: 'Replay demo' }).click();
  await page.locator('#confirmReplay').click();
  await expect(page.getByRole('button', { name: /Play today/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('refresh retains a draft and elapsed time; expiry in help scores zero once', async ({
  page,
}) => {
  await begin(page);
  await page.locator('[data-mode="blend"]').click();
  await page.getByLabel('YOUR ANSWER', { exact: true }).fill('phone');
  await page.clock.fastForward(12000);
  await page.reload();
  await expect(page.getByLabel('YOUR ANSWER', { exact: true })).toHaveValue(
    'phone',
  );
  await expect(page.locator('[data-mode="blend"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(
    Number((await page.locator('#timer').textContent())?.replace(/\D/g, '')),
  ).toBeLessThanOrEqual(18);
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByText('Your round timer keeps running')).toBeVisible();
  await page.clock.fastForward(31000);
  await expect(page.getByText('Your round has ended')).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(
    page.getByRole('heading', { name: 'Time is up!' }),
  ).toBeVisible();
  await expect(page.locator('.big')).toContainText('0');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Time is up!' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next question' }).click();
  await expect(page.getByText('QUESTION 2 OF 5')).toBeVisible();
  await expect(page.locator('[data-mode="blend"] .tokens')).toHaveText(
    '1 left',
  );
});

test('validation, Enter submission, unknown text escaping, and exhausted tokens', async ({
  page,
}) => {
  await begin(page);
  await expect(page.getByLabel('YOUR ANSWER', { exact: true })).toBeDisabled();
  await page.locator('[data-mode="sweet"]').click();
  await page.getByRole('button', { name: 'Lock it in' }).click();
  await expect(
    page.getByText('Enter an answer before submitting.'),
  ).toBeVisible();
  await page
    .getByLabel('YOUR ANSWER', { exact: true })
    .fill('<img src=x onerror=alert(1)>');
  await expect(page.locator('#answerError')).toBeEmpty();
  await page.getByLabel('YOUR ANSWER', { exact: true }).press('Enter');
  await expect(
    page.getByRole('heading', { name: /Creative answer/ }),
  ).toBeVisible();
  await expect(page.locator('.response-label')).toContainText(
    '<img src=x onerror=alert(1)>',
  );
  await expect(page.locator('.response-label img')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next question' }).click();
  await expect(page.locator('[data-mode="sweet"]')).toBeDisabled();
});

test('blocked storage is visible and the game remains playable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  await begin(page);
  await expect(page.getByText('Progress can’t be saved')).toBeVisible();
  await answer(page, 'blend', 'phone');
  await expect(page.locator('.big')).toContainText('100');
});

test('clipboard failure offers manually selectable result, without a false success', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new Error('Denied');
        },
      },
      configurable: true,
    });
    document.execCommand = () => false;
  });
  await begin(page);
  await finishGame(page);
  await page.getByRole('button', { name: 'Copy result', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Your Swerve result' }),
  ).toBeVisible();
  await expect(page.getByLabel('Your shareable result')).toHaveValue(
    /437\/500/,
  );
  await expect(page.getByText('Result copied!')).toHaveCount(0);
});

test('mobile layout, accessible controls, dialog keyboard handling and reduced motion', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Can you read/ }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-home.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'How to play' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'How to play' })).toBeFocused();
  await page.getByRole('button', { name: /Play today/ }).click();
  await expect(page.locator('[data-mode="blend"]')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const button of await page.locator('.mode, #helpBtn, #submit').all()) {
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  // Guard against a sticky action area covering the modes or the answer field.
  const inputBox = await page.locator('#answer').boundingBox();
  const actionBox = await page.locator('.answer-actions').boundingBox();
  expect(actionBox!.y).toBeGreaterThanOrEqual(inputBox!.y + inputBox!.height);
  for (const button of await page.locator('.mode').all()) {
    await button.scrollIntoViewIfNeeded();
    expect(
      await button.evaluate((node) => {
        const box = node.getBoundingClientRect();
        const hit = document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
        return hit === node || node.contains(hit);
      }),
    ).toBe(true);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-round.png`,
    fullPage: true,
  });
});
