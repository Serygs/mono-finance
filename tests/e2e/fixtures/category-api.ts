import type { Page } from '@playwright/test'
import type {
  CustomCategory,
  SourceCategory,
} from '../../../src/features/categories/categories-api'
import { breakdowns, installFinanceApiMock } from './finance-api'

/** Synthetic-only logical dataset, with server-side filtering before pagination. */
export async function installCategoryApiMock(page: Page) {
  await installFinanceApiMock(page)
  let categories: CustomCategory[] = Array.from({ length: 9 }, (_, index) => ({
    id: `personal-${index}`,
    name:
      index === 0
        ? 'Dining and groceries for the whole household'
        : `Personal category ${index}`,
    icon: index === 0 ? 'dining' : 'wallet',
    colorToken: index === 0 ? 'purple' : 'blue',
  }))
  const sources: SourceCategory[] = Array.from({ length: 82 }, (_, index) => ({
    code: `mcc-${5000 + index}`,
    originalName:
      index === 81
        ? 'Remote bank type found beyond the first page'
        : `Bank transaction type ${index + 1}`,
    transactionCount: index + 1,
    mappedCategory: index % 3 === 0 ? categories[0]! : null,
  }))
  const calls = {
    analysis: 0,
    categories: 0,
    writes: [] as Array<{ path: string; method: string; body: unknown }>,
  }
  await page.route('**/api/categories**', async (route) => {
    const { pathname } = new URL(route.request().url())
    const method = route.request().method()
    if (method === 'GET') {
      calls.categories++
      return route.fulfill({ json: { data: { categories } } })
    }
    const input = method === 'DELETE' ? null : route.request().postDataJSON()
    calls.writes.push({ path: pathname, method, body: input })
    const id = pathname.split('/')[3]
    if (method === 'POST' && pathname.endsWith('/merge')) {
      const target = categories.find(
        (category) => category.id === input.targetCategoryId,
      )!
      for (const source of sources)
        if (source.mappedCategory?.id === id) source.mappedCategory = target
      categories = categories.filter((category) => category.id !== id)
      return route.fulfill({ json: { data: { category: target } } })
    }
    if (method === 'DELETE') {
      if (sources.some((source) => source.mappedCategory?.id === id))
        return route.fulfill({
          status: 409,
          json: {
            error: {
              code: 'CATEGORY_IN_USE',
              message: 'Synthetic dependency protection',
            },
          },
        })
      categories = categories.filter((category) => category.id !== id)
      return route.fulfill({ json: { data: {} } })
    }
    const category: CustomCategory = {
      ...input,
      id: method === 'POST' ? `personal-${categories.length + 100}` : id,
    }
    categories =
      method === 'POST'
        ? [...categories, category]
        : categories.map((value) => (value.id === id ? category : value))
    for (const source of sources)
      if (source.mappedCategory?.id === id) source.mappedCategory = category
    return route.fulfill({ json: { data: { category } } })
  })
  await page.route('**/api/category-sources**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    if (method !== 'GET') {
      const input = method === 'DELETE' ? null : route.request().postDataJSON()
      calls.writes.push({ path: url.pathname, method, body: input })
      const source = sources.find(
        (value) => value.code === url.pathname.split('/')[3],
      )!
      source.mappedCategory =
        method === 'DELETE'
          ? null
          : categories.find((category) => category.id === input.categoryId)!
      return route.fulfill({ json: { data: { source } } })
    }
    const query = (url.searchParams.get('query') ?? '').toLowerCase()
    const mapping = url.searchParams.get('mapping') ?? 'all'
    const filtered = sources.filter(
      (source) =>
        `${source.code} ${source.originalName}`.toLowerCase().includes(query) &&
        (mapping === 'all' ||
          (mapping === 'mapped'
            ? source.mappedCategory !== null
            : source.mappedCategory === null)),
    )
    const current = Number(url.searchParams.get('page') ?? 1)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10)
    return route.fulfill({
      json: {
        data: {
          page: current,
          pageSize,
          sources: filtered.slice((current - 1) * pageSize, current * pageSize),
          totalItems: filtered.length,
        },
      },
    })
  })
  await page.route('**/api/analytics/breakdowns?*', async (route) => {
    calls.analysis++
    const filtered =
      new URL(route.request().url()).searchParams.getAll('accountId').length > 0
    return route.fulfill({
      json: {
        data: {
          ...breakdowns,
          expensesByCategory: filtered
            ? []
            : [
                ...Array.from({ length: 8 }, (_, index) => ({
                  categoryId: index === 0 ? 'personal-0' : `bank-${index}`,
                  categoryName:
                    index === 0
                      ? categories[0]!.name
                      : `Everyday category ${index + 1} with a readable full name`,
                  currencyCode: 'UAH',
                  amountMinor:
                    index < 2 ? Number.MAX_SAFE_INTEGER : 5000 - index * 100,
                })),
                {
                  categoryId: 'bank-foreign',
                  categoryName: 'Travel abroad',
                  currencyCode: 'USD',
                  amountMinor: 1050,
                },
              ],
          incomeByCategory: filtered
            ? []
            : [
                {
                  categoryId: 'salary',
                  categoryName: 'Salary',
                  currencyCode: 'UAH',
                  amountMinor: 1800000,
                },
              ],
        },
      },
    })
  })
  return { calls, sources }
}
