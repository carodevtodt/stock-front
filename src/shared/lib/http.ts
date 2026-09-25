import { env } from '@/shared/config/env'

/** Normalized error thrown by every failed backend request. */
export interface ApiError {
  status: number
  message: string
  fieldErrors: Record<string, string[]>
}

const NETWORK_ERROR: ApiError = {
  status: 0,
  message: 'Network error. Please try again.',
  fieldErrors: {},
}

/** Map an error response to ApiError: `{detail}` -> message, 400 `{field: [msg]}` -> fieldErrors. */
export function toApiError(status: number, data: unknown): ApiError {
  const error: ApiError = { status, message: `Request failed (${status}).`, fieldErrors: {} }
  if (!data || typeof data !== 'object') return error

  const body = data as Record<string, unknown>
  if (typeof body.detail === 'string') {
    error.message = body.detail
  } else if (status === 400) {
    error.fieldErrors = body as Record<string, string[]>
  }
  return error
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw { ...NETWORK_ERROR }
  }

  if (response.status === 204) return undefined as T

  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) throw toApiError(response.status, data)
  return data as T
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
