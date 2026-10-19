import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FACTUAL_DAYS, factualQuestionById } from '../src/data/factual-bank.ts';
import { familiarityPoints } from '../src/domain/familiarity.ts';
import type { Mode } from '../src/domain/types.ts';

const modes: Mode[] = ['blend', 'swerve', 'sweet', 'swerve', 'blend'];
async function start(page: Page, day = '2026-10-19') {
  await page.clock.install({ time: new Date(day + 'T12:00:00Z') });
  await page.goto('/');
  await page.getByRole('button', { name: /Play today/ }).click();
}

test('open answers, strategy scores, discovery, saved results, sharing and practice', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    }),
  );
  await start(page);
  let expected = 0;
  for (const [i, id] of FACTUAL_DAYS[0].questionIds.entries()) {
    const q = factualQuestionById(id)!;
    const answer = q.answers.find(
      (a) => familiarityPoints(modes[i], a.index) === 100,
    )!;
    await expect(page.getByRole('heading')).toHaveText(q.q);
    await expect(page.locator('.answer-choice')).toHaveCount(0);
    await expect(page.locator('.answer-discovery')).toHaveCount(0);
    await page.locator(`[data-mode="${modes[i]}"]`).click();
    await expect(page.getByLabel('YOUR ANSWER', { exact: true })).toBeFocused();
    await page.getByLabel('YOUR ANSWER', { exact: true }).fill(answer.name);
    if (i === 0) {
      await page.clock.fastForward(5000);
      await page.reload();
      await expect(page.getByLabel('YOUR ANSWER', { exact: true })).toHaveValue(
        answer.name,
      );
      expect(
        Number(
          (await page.locator('#timer').textContent())!.replace(/\D/g, ''),
        ),
      ).toBeLessThanOrEqual(25);
    }
    await page.getByLabel('YOUR ANSWER', { exact: true }).press('Enter');
    expected += 100;
    await expect(page.locator('.big')).toHaveText('100 / 100');
    await expect(page.locator('.attention-card')).toContainText(
      'not a percentage of people',
    );
    await expect(page.locator('.reveal-head')).toContainText(
      '20 for a listed correct answer + 80 strategy points',
    );
    await page
      .getByText(`Explore all ${q.answers.length} accepted answers`, {
        exact: true,
      })
      .click();
    await expect(
      page.locator('.answer-explorer .answer-discovery'),
    ).toHaveCount(q.answers.length);
    await expect(
      page.getByRole('link', { name: 'Answer sources & scoring evidence' }),
    ).toHaveAttribute('href', `./factual-credits.html#${id}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (i === 1)
      await page.screenshot({
        path: `test-results/${info.project.name}-factual-reveal.png`,
        fullPage: true,
      });
    await page
      .getByRole('button', {
        name: i === 4 ? 'See your results' : 'Next question',
      })
      .click();
  }
  await expect(page.locator('.result-number')).toContainText(String(expected));
  await page.getByRole('button', { name: 'Copy result', exact: true }).click();
  const share = await page.evaluate(
    () => (window as unknown as { copied: string }).copied,
  );
  expect(share).toContain('500/500');
  expect(share).toContain('Open answers');
  expect(share).not.toContain('Pixar');
  await page.reload();
  await expect(page.locator('.result-number')).toContainText('500');
  await page.getByRole('button', { name: 'Replay for practice' }).click();
  await page.getByRole('button', { name: 'Keep my score' }).click();
  await expect(page.locator('.result-number')).toContainText('500');
  expect(errors).toEqual([]);
});

test('new scoring help is honest; survey saves stay separate and unknown answers are safe', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-19T12:00:00Z') });
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'swerve_attempt_v2:reference-surveys-v2-unique-2026-10-19',
      JSON.stringify({ phase: 'complete', results: [] }),
    ),
  );
  await page.reload();
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'not a survey or live player percentage',
  );
  await expect(page.getByRole('dialog')).toContainText('40–60');
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: /Play today/ }).click();
  await page.locator('[data-mode="swerve"]').click();
  await page
    .getByLabel('YOUR ANSWER', { exact: true })
    .fill('<img src=x onerror=alert(1)>');
  await page.getByRole('button', { name: 'Lock it in' }).click();
  await expect(
    page.getByRole('heading', { name: 'Not on this list' }),
  ).toBeVisible();
  await expect(page.locator('.big')).toHaveText('0 / 100');
  await expect(page.locator('.response-label img')).toHaveCount(0);
  await expect(page.locator('.attention-card')).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Not on this list' }),
  ).toBeVisible();
  await page.goto('/factual-credits.html#facts-stan-countries');
  await expect(page.locator('#facts-stan-countries')).toHaveAttribute(
    'open',
    '',
  );
  await expect(
    page.getByRole('heading', { name: 'Answer sources and scoring' }),
  ).toBeVisible();
  await expect(page.locator('#facts-stan-countries')).toContainText(
    'Kyrgyzstan',
  );
});

test('timeout remains zero and consumes exactly one token even while help is open', async ({
  page,
}) => {
  await start(page);
  await page.locator('[data-mode="sweet"]').click();
  await page.getByLabel('YOUR ANSWER', { exact: true }).fill('Pakistan');
  await page.getByRole('button', { name: 'How to play' }).click();
  await page.clock.fastForward(31000);
  await expect(page.getByText('Your round has ended')).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(
    page.getByRole('heading', { name: 'Time is up!' }),
  ).toBeVisible();
  await expect(page.locator('.big')).toHaveText('0 / 100');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Time is up!' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next question' }).click();
  await expect(page.locator('[data-mode="sweet"]')).toBeDisabled();
  await expect(page.getByText('QUESTION 2 OF 5')).toBeVisible();
});

test('mobile controls and calendar boundaries do not repeat the pilot', async ({
  page,
}, info) => {
  const last = FACTUAL_DAYS.at(-1)!;
  await start(page, last.day);
  await page.screenshot({
    path: `test-results/${info.project.name}-factual-round.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const button of await page.locator('.mode,#helpBtn,#submit').all())
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const input = await page.locator('#answer').boundingBox();
  const actions = await page.locator('.answer-actions').boundingBox();
  expect(actions!.y).toBeGreaterThanOrEqual(input!.y + input!.height);
  await page.clock.fastForward(86400000);
  await page.reload();
  await expect(
    page.getByText(
      'The next Swerve challenge is being prepared. Please check back soon.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Play today/ })).toHaveCount(0);
});
