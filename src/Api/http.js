import { useAuthStore } from '@/stores/auth.js'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''
// In dev with Vite proxy: '' (same origin). In prod: 'https://yourdomain.com'

async function doFetch(path, { headers: extraHeaders, ...restOptions } = {}, token) {
  return fetch(`${API_BASE}${path}`, {
    credentials: 'include', // needed so the refresh cookie is sent on /auth/refresh
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
  })
}

export async function api(path, options = {}) {
  const authStore = useAuthStore()

  let res = await doFetch(path, options, authStore.accessToken)

  // Attempt a silent token refresh on 401, then retry once.
  if (res.status === 401) {
    const refreshRes = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })

    if (refreshRes.ok) {
      const { accessToken } = await refreshRes.json()
      authStore.accessToken = accessToken
      res = await doFetch(path, options, accessToken)
    } else {
      authStore.clear()
      throw new Error('Session expired — please log in again')
    }
  }

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    const msg = typeof data === 'string' ? data : (data.error || 'Request failed')
    throw new Error(msg)
  }
  return data
}
