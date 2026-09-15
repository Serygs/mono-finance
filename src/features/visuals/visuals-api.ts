import type { ApiResponse } from '../../types/api'

export interface VisualMappings {
  merchantVisuals: { key: string; assetId: string }[]
  categoryVisuals: { key: string; assetId: string }[]
}
export async function getVisualMappings(): Promise<VisualMappings> {
  return request('/api/visuals')
}
export async function uploadVisual(
  assetType: 'merchant-icon' | 'category-icon',
  file: File,
): Promise<{ id: string }> {
  const form = new FormData()
  form.set('assetType', assetType)
  form.set('file', file)
  return (
    await request<{ asset: { id: string } }>('/api/visual-assets', 'POST', form)
  ).asset
}
export function saveMerchantVisual(
  key: string,
  displayName: string,
  assetId: string,
) {
  return request(`/api/merchant-visuals/${encodeURIComponent(key)}`, 'PUT', {
    assetId,
    displayName,
  })
}
export function removeMerchantVisual(key: string) {
  return request(`/api/merchant-visuals/${encodeURIComponent(key)}`, 'DELETE')
}
export function saveCategoryVisual(key: string, assetId: string) {
  return request(`/api/categories/${encodeURIComponent(key)}/visual`, 'PUT', {
    assetId,
  })
}
export function removeCategoryVisual(key: string) {
  return request(`/api/categories/${encodeURIComponent(key)}/visual`, 'DELETE')
}
async function request<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: BodyInit | object,
): Promise<T> {
  const isForm = body instanceof FormData
  const response = await fetch(path, {
    ...(body === undefined
      ? {}
      : { body: isForm ? body : JSON.stringify(body) }),
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(body === undefined || isForm
        ? {}
        : { 'Content-Type': 'application/json' }),
    },
    method,
  })
  const payload = (await response.json()) as ApiResponse<T>
  if (!response.ok || !('data' in payload))
    throw new Error(
      'error' in payload ? payload.error.message : 'Visual request failed.',
    )
  return payload.data
}
