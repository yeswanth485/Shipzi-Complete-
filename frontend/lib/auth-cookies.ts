const AUTH_COOKIE_NAME = 'shipzi-auth'
const ONBOARDING_COOKIE_NAME = 'shipzi-onboarding-complete'

function getCookieFlags(): string {
  if (typeof window === 'undefined') return ''
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  return `; path=/; SameSite=Lax${secure}`
}

export function setAuthCookie(uid: string): void {
  if (typeof document === 'undefined') return
  if (!uid || uid.length < 10) return
  const flags = getCookieFlags()
  document.cookie = `${AUTH_COOKIE_NAME}=${uid}; max-age=86400${flags}`
}

export function setOnboardingComplete(): void {
  if (typeof document === 'undefined') return
  const flags = getCookieFlags()
  document.cookie = `${ONBOARDING_COOKIE_NAME}=true; max-age=31536000${flags}`
}

export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`
  document.cookie = `${ONBOARDING_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`
}

export function getAuthCookie(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`))
  return m ? m[1] : null
}
