import type { ApiResponse } from '../../types/api'

export interface CustomCategory {
  colorToken: string | null
  icon: string | null
  id: string
  name: string
}
export interface EffectiveCategory {
  category: {
    id: string | null
    name: string | null
    source: 'custom' | 'mapped' | 'original' | null
  }
  originalCategory: { id: string | null; name: string | null }
}
export interface SourceCategory {
  code: string
  originalName: string
  transactionCount: number
  mappedCategory: CustomCategory | null
}
export interface SourceCategoryPage {
  page: number
  pageSize: number
  sources: SourceCategory[]
  totalItems: number
}
export interface CategoryInput {
  colorToken: string | null
  icon: string | null
  name: string
}

export async function getCategories(): Promise<CustomCategory[]> {
  const payload = await request<{ categories: CustomCategory[] }>(
    '/api/categories',
  )
  return payload.categories
}
export async function getCategorySources(input: {
  mapping: 'all' | 'mapped' | 'unmapped'
  page: number
  pageSize: number
  query: string
}): Promise<SourceCategoryPage> {
  const params = new URLSearchParams({
    mapping: input.mapping,
    page: String(input.page),
    pageSize: String(input.pageSize),
    query: input.query,
  })
  return request<SourceCategoryPage>(`/api/category-sources?${params}`)
}
export async function saveCategorySourceMapping(
  sourceCode: string,
  categoryId: string,
): Promise<void> {
  await request(
    `/api/category-sources/${encodeURIComponent(sourceCode)}`,
    'PUT',
    {
      categoryId,
    },
  )
}
export async function resetCategorySourceMapping(
  sourceCode: string,
): Promise<void> {
  await request(
    `/api/category-sources/${encodeURIComponent(sourceCode)}`,
    'DELETE',
  )
}
export async function mergeCategories(
  sourceCategoryId: string,
  targetCategoryId: string,
): Promise<CustomCategory> {
  const payload = await request<{ category: CustomCategory }>(
    `/api/categories/${encodeURIComponent(sourceCategoryId)}/merge`,
    'POST',
    { targetCategoryId },
  )
  return payload.category
}
export async function createCategory(
  input: CategoryInput,
): Promise<CustomCategory> {
  return (
    await request<{ category: CustomCategory }>(
      '/api/categories',
      'POST',
      input,
    )
  ).category
}
export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<CustomCategory> {
  return (
    await request<{ category: CustomCategory }>(
      `/api/categories/${id}`,
      'PUT',
      input,
    )
  ).category
}
export async function deleteCategory(id: string): Promise<void> {
  await request(`/api/categories/${id}`, 'DELETE')
}
export function saveTransactionCategory(
  transactionId: string,
  categoryId: string,
): Promise<EffectiveCategory> {
  return request(`/api/transactions/${transactionId}/category`, 'PUT', {
    categoryId,
  })
}
export function resetTransactionCategory(
  transactionId: string,
): Promise<EffectiveCategory> {
  return request(`/api/transactions/${transactionId}/category`, 'DELETE')
}

async function request<T>(
  path: string,
  method: 'DELETE' | 'GET' | 'POST' | 'PUT' = 'GET',
  body?: object,
): Promise<T> {
  const response = await fetch(path, {
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    method,
  })
  const payload = (await response.json()) as ApiResponse<T>
  if (!response.ok || !('data' in payload))
    throw new Error(
      'error' in payload
        ? payload.error.message
        : 'Category request could not be completed.',
    )
  return payload.data
}
