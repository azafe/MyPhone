import { apiClient } from '../lib/apiClient'

export async function requestFirstAvailable<T>(paths: string[], options?: Parameters<typeof apiClient>[1]): Promise<T> {
  let lastError: unknown = null

  for (const path of paths) {
    try {
      return await apiClient<T>(path, options)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('No endpoint available')
}
