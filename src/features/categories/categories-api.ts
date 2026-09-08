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
export interface CategoryInput {
  colorToken: string | null
  icon: string | null
  name: string
}
export interface SourceCategory {
  code: string
  mappedCategory: CustomCategory | null
  originalName: string | null
  transactionCount: number
}

export async function getCategories(): Promise<CustomCategory[]> {
  const payload = await request<{ categories: CustomCategory[] }>(
    '/api/categories',
  )
  return payload.categories
}
export async function getCategorySources(): Promise<SourceCategory[]> {
  return (
    await request<{ sourceCategories: SourceCategory[] }>(
      '/api/category-sources',
    )
  ).sourceCategories
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
export async function mergeCategories(
  sourceCategoryId: string,
  targetCategoryId: string,
): Promise<CustomCategory> {
  return (
    await request<{ category: CustomCategory }>(
      `/api/categories/${sourceCategoryId}/merge`,
      'POST',
      { targetCategoryId },
    )
  ).category
}
export async function saveCategorySourceMapping(
  sourceCode: string,
  categoryId: string,
): Promise<SourceCategory> {
  return (
    await request<{ sourceCategory: SourceCategory }>(
      `/api/category-sources/${encodeURIComponent(sourceCode)}`,
      'PUT',
      { categoryId },
    )
  ).sourceCategory
}
export async function resetCategorySourceMapping(
  sourceCode: string,
): Promise<SourceCategory> {
  return (
    await request<{ sourceCategory: SourceCategory }>(
      `/api/category-sources/${encodeURIComponent(sourceCode)}`,
      'DELETE',
    )
  ).sourceCategory
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
