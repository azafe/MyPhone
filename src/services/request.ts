import { apiClient } from '../lib/apiClient'

function isNotFoundError(error: unknown) {
  const err = error as Error & { code?: string }
  const code = String(err?.code ?? '').toLowerCase()
  const message = String(err?.message ?? '').toLowerCase()

  return (
    code.includes('not_found') ||
    code.includes('route_not_found') ||
    message.includes('route not found') ||
    message.includes('api error: 404') ||
    message.includes(' 404')
  )
}

export async function requestFirstAvailable<T>(paths: string[], options?: Parameters<typeof apiClient>[1]): Promise<T> {
  let lastError: unknown = null

  for (const path of paths) {
    try {
      return await apiClient<T>(path, options)
    } catch (error) {
      lastError = error
      if (!isNotFoundError(error)) {
        throw error
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('No endpoint available')
}
