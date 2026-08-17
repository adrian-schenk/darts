import getBearer from './auth'

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: getBearer(),
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message ?? `Request failed (${response.status})`)
  }
  return data as T
}
