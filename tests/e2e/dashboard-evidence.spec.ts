import { expect, test } from '@playwright/test'
import {
  ENGLISH_MESSAGES,
  UKRAINIAN_MESSAGES,
} from '../../src/features/localization/messages'
import type { TransactionListItem } from '../../src/features/transactions/transaction-types'
import { breakdowns, installFinanceApiMock } from './fixtures/finance-api'

for (const theme of ['light', 'dark']) {
  for (const locale of ['en', 'uk'] as const) {
    test(`dashboard evidence direction and complete selection in ${theme}/${locale}`, async ({
      page,
    }) => {
      const messages = locale === 'en' ? ENGLISH_MESSAGES : UKRAINIAN_MESSAGES
      await page.addInitScript(
        ({ theme, locale }) => {
          localStorage.setItem('mono-finance-theme-v1', theme)
          localStorage.setItem('mono-finance-locale-v1', locale)
          localStorage.setItem(
            'mono-finance.dashboard-preferences.v1',
            JSON.stringify({
              enabledWidgetIds: [
                'recent-transactions',
                'top-merchants',
                'largest-transactions',
                'recent-corrections',
                'recent-compensations',
                'recurring-expenses',
                'fixed-variable-expenses',
              ],
              layout: [],
              recentTransactionsLimit: 5,
            }),
          )
        },
        { theme, locale },
      )
      await installFinanceApiMock(page)
      await page.route('**/api/analytics/breakdowns?*', (route) =>
        route.fulfill({
          json: {
            data: {
              ...breakdowns,
              topMerchants: [
                {
                  amountMinor: 4000,
                  currencyCode: 'UAH',
                  description: 'Synthetic merchant',
                  transactionCount: 2,
                },
              ],
              recurringExpenses: [
                {
                  averageAmountMinor: 4000,
                  currencyCode: 'UAH',
                  description: 'Synthetic repeated merchant',
                  frequencyDays: 180,
                  lastAmountMinor: 4000,
                  transactionCount: 2,
                },
              ],
              fixedVariableExpenses: [
                {
                  currencyCode: 'UAH',
                  fixedExpenseAmountMinor: 4000,
                  variableExpenseAmountMinor: 3000,
                },
              ],
              largestTransactions: (['expense', 'income'] as const).map(
                (direction) => ({
                  amountMinor: 4000,
                  currencyCode: 'UAH',
                  description: `Synthetic ${direction}`,
                  direction,
                  timestamp: 1735689600,
                  transactionId: direction,
                }),
              ),
            },
          },
        }),
      )
      const transactionQueries: URLSearchParams[] = []
      const duplicateKeyErrors: string[] = []
      page.on('console', (message) => {
        if (message.type() === 'error' && message.text().includes('same key'))
          duplicateKeyErrors.push(message.text())
      })
      await page.route('**/api/transactions?*', (route) => {
        const query = new URL(route.request().url()).searchParams
        transactionQueries.push(query)
        const old: TransactionListItem = {
          account: { id: 'account-1', maskedPan: null, type: 'black' },
          adjustmentNote: null,
          category: { id: null, name: null, source: null },
          originalCategory: { id: null, name: null },
          currencyCode: 'UAH',
          currencyMinorUnit: 2,
          effectiveAmountMinor: -3000,
          exclusionReason: null,
          hasAdjustment: true,
          hasCompensation: true,
          id: 'old-expense',
          isExcluded: false,
          originalAmountMinor: -4000,
          originalDescription: 'Older corrected expense',
          originalMcc: null,
          originalTimestamp: Number(query.get('dateFrom')) + 1,
        }
        const income: TransactionListItem = {
          ...old,
          id: 'old-income',
          hasAdjustment: false,
          effectiveAmountMinor: 1000,
          originalAmountMinor: 1000,
          originalDescription: 'Older compensation income',
          originalTimestamp: old.originalTimestamp + 1,
        }
        const recent = Array.from({ length: 100 }, (_, index) => ({
          ...old,
          id: `recent-${index}`,
          originalDescription: `Recent purchase ${index}`,
          hasAdjustment: false,
          hasCompensation: false,
          originalTimestamp: Number(query.get('dateTo')) - index,
        }))
        return route.fulfill({
          json: {
            data: {
              nextCursor: null,
              transactions:
                query.get('hasAdjustment') === 'true'
                  ? [
                      old,
                      {
                        ...old,
                        id: 'another-old-expense',
                        originalTimestamp: old.originalTimestamp - 1,
                      },
                    ]
                  : query.get('hasCompensation') === 'true'
                    ? [income, old]
                    : recent,
            },
          },
        })
      })
      let financialRequests = 0
      page.on('request', (request) => {
        if (
          /\/api\/(analytics|transactions)\?/.test(request.url()) ||
          request.url().includes('/api/analytics/')
        )
          financialRequests++
      })
      await page.setViewportSize({ width: 1440, height: 1000 })
      await page.goto('/login')
      await page.getByLabel(messages['Email']).fill('synthetic@example.com')
      await page.getByLabel(messages['Password']).fill('correct-password')
      await page
        .getByRole('button', { name: messages['Sign in'], exact: true })
        .click()
      const corrections = page.locator(
        '.dashboard-widget-card--recent-corrections',
      )
      const compensations = page.locator(
        '.dashboard-widget-card--recent-compensations',
      )
      await expect(corrections).toContainText('Older corrected expense')
      await expect(
        corrections.locator('.dashboard-evidence-list li'),
      ).toHaveCount(2)
      await expect(compensations).toContainText('Older compensation income')
      await expect(page.locator('.dashboard-recent-card')).not.toContainText(
        'Older corrected expense',
      )
      expect(
        transactionQueries.some(
          (query) =>
            query.get('hasAdjustment') === 'true' && query.get('limit') === '5',
        ),
      ).toBe(true)
      expect(
        transactionQueries.some(
          (query) =>
            query.get('hasCompensation') === 'true' &&
            query.get('limit') === '5',
        ),
      ).toBe(true)
      const requestCount = financialRequests
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 })
        const merchant = page.locator('.dashboard-widget-card--top-merchants')
        await expect(merchant).toBeVisible()
        await expect(merchant.locator('b')).toContainText(messages['Expenses'])
        await expect(merchant.locator('b')).toContainText('−')
        await expect(merchant.locator('.is-income')).toHaveCount(0)
        const largest = page.locator(
          '.dashboard-widget-card--largest-transactions',
        )
        await expect(
          largest.locator('li').filter({ hasText: 'Synthetic expense' }),
        ).toContainText(messages['Expenses'])
        await expect(largest.locator('.is-income')).toContainText(
          messages['Income'],
        )
        await expect(largest.locator('.is-income')).toContainText('+')
        const repeated = page.locator(
          '.dashboard-widget-card--recurring-expenses',
        )
        await expect(repeated).toContainText(messages['Repeated purchases'])
        await expect(repeated).toContainText(
          messages[
            'Repeated purchases do not establish recurring or fixed expenses.'
          ],
        )
        const split = page.locator(
          '.dashboard-widget-card--fixed-variable-expenses',
        )
        await expect(split).toContainText(
          messages['Repeated vs other expenses'],
        )
        await expect(split).toContainText(messages['Other expenses'])
        await expect(split).toContainText(
          messages['{percent}% of period expenses'].replace('{percent}', ''),
        )
        await expect(split).not.toContainText(
          messages['{percent}% of category spending'].replace('{percent}', ''),
        )
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true)
        expect(financialRequests).toBe(requestCount)
        expect(duplicateKeyErrors).toEqual([])
        if (locale === 'en' && width !== 320)
          await page.screenshot({
            path: test.info().outputPath(`evidence-${theme}-${width}.png`),
            fullPage: true,
          })
      }
    })
  }
}
