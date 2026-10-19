import { test, expect } from '@playwright/test';
import { PREPARED_DAYS, questionById } from '../src/data/challenge-bank.ts';
import { points } from '../src/domain/scoring.ts';
import type { Mode } from '../src/domain/types.ts';

test('verified daily game supports response choices, real scoring, credits, saving, sharing and practice', async ({
  page,
}, testInfo) => {
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
  await expect(
    page.getByRole('link', { name: 'Data credits', exact: true }),
  ).toHaveAttribute('href', './data-credits.html');
  await page.getByRole('button', { name: /Play today/ }).click();
  const modes: Mode[] = ['blend', 'swerve', 'sweet', 'swerve', 'blend'];
  let expected = 0;
  for (const [i, id] of PREPARED_DAYS[0].questionIds.entries()) {
    const q = questionById(id);
    const group = q.groups[0];
    await expect(page.getByRole('heading')).toHaveText(q.q);
    await expect(page.locator('.hint')).toContainText(
      `${q.source!.year} reference group`,
    );
    await expect(page.locator('.answer-choice')).toHaveCount(q.groups.length);
    await expect(page.locator('.answer-choice').first()).toBeDisabled();
    await page.locator(`[data-mode="${modes[i]}"]`).click();
    await expect(
      page.getByLabel('YOUR ANSWER', { exact: true }),
    ).not.toBeFocused();
    const choice = page.getByRole('button', { name: group.name, exact: true });
    expect((await choice.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await choice.click();
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('YOUR ANSWER', { exact: true })).toHaveValue(
      group.name,
    );
    if (i === 0) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `test-results/${testInfo.project.name}-verified-round.png`,
        fullPage: true,
      });
    }
    if (i === 0) {
      await page.clock.fastForward(5000);
      await page.reload();
      await expect(
        page.getByRole('button', { name: group.name, exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      expect(
        Number(
          (await page.locator('#timer').textContent())!.replace(/\D/g, ''),
        ),
      ).toBeLessThanOrEqual(25);
    }
    await page.getByRole('button', { name: 'Lock it in' }).click();
    const score = points(modes[i], group.pct);
    expected += score;
    await expect(page.locator('.big')).toHaveText(`${score} / 100`);
    await expect(page.getByText('WHAT THE REFERENCE GROUP SAID')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Source details' }),
    ).toHaveAttribute('href', `./data-credits.html#${id}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole('button', {
        name: i === 4 ? 'See your results' : 'Next question',
      })
      .click();
  }
  await expect(page.locator('.result-number')).toContainText(String(expected));
  await page.getByRole('button', { name: 'Copy result', exact: true }).click();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toContain(`swerve. #002\n${expected}/500`);
  await page.reload();
  await expect(page.locator('.result-number')).toContainText(String(expected));
  await page.getByRole('button', { name: 'Replay for practice' }).click();
  await page.getByRole('button', { name: 'Keep my score' }).click();
  await expect(page.locator('.result-number')).toContainText(String(expected));
  await page.clock.fastForward(24 * 60 * 60 * 1000);
  await page.reload();
  await expect(page.locator('.tag')).toContainText('#003');
  await page.getByRole('button', { name: /Play today/ }).click();
  await expect(page.getByRole('heading')).toHaveText(
    questionById(PREPARED_DAYS[1].questionIds[0]).q,
  );
});

test('launch retires fabricated saves; source credits disclose counts and a checked historical example', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-19T12:00:00Z') });
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'swerve_attempt_v2:demo-2026-10-19',
      JSON.stringify({ phase: 'complete', results: [] }),
    ),
  );
  await page.reload();
  await expect(page.getByRole('button', { name: /Play today/ })).toBeVisible();
  await page.getByRole('button', { name: /Play today/ }).click();
  await expect(page.getByRole('heading')).toHaveText(
    questionById(PREPARED_DAYS[0].questionIds[0]).q,
  );
  await page.goto('/data-credits.html');
  await expect(
    page.getByRole('heading', { name: 'Data credits' }),
  ).toBeVisible();
  await expect(page.getByText(/109 verified questions rotate/)).toBeVisible();
  const item = page.locator('#comma-survey-01');
  await item.locator('summary').click();
  await expect(item).toContainText('641');
  await expect(item).toContainText('488');
  await expect(item).toContainText('1,129 valid answers');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto('/data-credits.html#steak-survey-09');
  await expect(page.locator('#steak-survey-09')).toHaveAttribute('open', '');
  await expect(page.locator('#steak-survey-09')).toContainText(
    '432 valid answers',
  );
});

test('a question with twelve recorded responses stays usable on narrow screens', async ({
  page,
}) => {
  // Day index eight puts the kids-table item in round two.
  const day = PREPARED_DAYS[8];
  await page.clock.install({ time: new Date(`${day.day}T12:00:00Z`) });
  await page.goto('/');
  await page.getByRole('button', { name: /Play today/ }).click();
  await page.locator('[data-mode="blend"]').click();
  await page.locator('.answer-choice').first().click();
  await page.getByRole('button', { name: 'Lock it in' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await expect(page.getByRole('heading')).toContainText('kids’ tables');
  await expect(page.locator('.answer-choice')).toHaveCount(12);
  await page.locator('[data-mode="swerve"]').click();
  await page.locator('.answer-choice').last().click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Lock it in' }).click();
  await expect(page.getByText('WHAT THE REFERENCE GROUP SAID')).toBeVisible();
});

test('last scheduled draft survives reload and exhausted calendar does not silently repeat', async ({
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
