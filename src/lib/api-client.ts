import type { ApiResponse } from '../types/api'

export async function getApiResponse<T>(path: string): Promise<ApiResponse<T>> {
  const response = await fetch(path, {
    headers: { Accept: 'application/json' },
  })

  return (await response.json()) as ApiResponse<T>
}
