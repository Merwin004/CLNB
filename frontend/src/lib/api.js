const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'
const TOKEN_KEY = 'cl_auth_token'
const USER_KEY = 'cl_auth_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Core fetch wrapper — attaches the bearer token, parses JSON, and throws
// ApiError on non-2xx so callers can catch one error type. On a 401, clears
// the stored session (see .claude/rules/auth-conventions.md — treat the 8h
// expiry as real) so the next render redirects to /login.
async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (res.status === 401) clearSession()
    throw new ApiError(res.status, data.error ?? 'Request failed')
  }

  return data
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),

  listProfiles: ({ page = 1, pageSize = 6, q = '', status = '' } = {}) => {
    const params = new URLSearchParams({ page, pageSize })
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    return request(`/profiles?${params.toString()}`)
  },
  getProfile: (id) => request(`/profiles/${id}`),
  createProfile: (payload) => request('/profiles', { method: 'POST', body: payload }),
  updateProfile: (id, patch) => request(`/profiles/${id}`, { method: 'PATCH', body: patch }),

  listRegions: () => request('/regions'),
  listProvinces: (regionId) => request(`/provinces?regionId=${regionId}`),
  listCities: (provinceId) => request(`/cities?provinceId=${provinceId}`),
  listBarangays: (cityId) => request(`/barangays?cityId=${cityId}`),

  listLguProfiles: () => request('/lgu/profiles'),
  createReferral: (payload) => request('/lgu/referrals', { method: 'POST', body: payload }),

  importProfiles,
}

// Multipart upload — separate from request() above, which always JSON-encodes
// the body. Never set Content-Type manually here: the browser needs to add
// its own multipart boundary string, which it can only do if it builds the
// header itself from the FormData.
async function importProfiles(file, { year, regionalOfficeCode, fieldOfficeCode }) {
  const form = new FormData()
  form.append('file', file)
  form.append('year', year)
  form.append('regionalOfficeCode', regionalOfficeCode)
  form.append('fieldOfficeCode', fieldOfficeCode)

  const token = getToken()
  const res = await fetch(`${API_URL}/profiles/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) clearSession()
    throw new ApiError(res.status, data.error ?? 'Import failed')
  }
  return data
}

export async function login(email, password) {
  const { user, token } = await api.login(email, password)
  setSession(token, user)
  return user
}
