const AUTH_COOKIE_NAME = 'shipzi-auth'
const ONBOARDING_COOKIE_NAME = 'shipzi-onboarding-complete'

function getCookieFlags(httpOnly = false): string {
  if (typeof window === 'undefined') return ''
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const httpOnlyFlag = httpOnly ? '; HttpOnly' : ''
  return `; path=/; SameSite=Strict${secure}${httpOnlyFlag}`
}

export function setAuthCookie(uid: string): void {
  if (typeof document === 'undefined') return
  // Sanitize: only allow alphanumeric, hyphens, and underscores (Firebase UIDs)
  const sanitized = uid.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!sanitized || sanitized.length < 10) return
  const flags = getCookieFlags()
  document.cookie = `${AUTH_COOKIE_NAME}=${sanitized}; max-age=86400${flags}`
}

export function setOnboardingComplete(): void {
  if (typeof document === 'undefined') return
  const flags = getCookieFlags()
  document.cookie = `${ONBOARDING_COOKIE_NAME}=true; max-age=31536000${flags}`
}

export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Secure`
  document.cookie = `${ONBOARDING_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Secure`
}

export function getAuthCookie(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`))
  const value = m ? m[1] : null
  // Validate format: Firebase UIDs are 28+ chars alphanumeric
  if (value && /^[a-zA-Z0-9_-]{20,}$/.test(value)) return value
  return null
}
