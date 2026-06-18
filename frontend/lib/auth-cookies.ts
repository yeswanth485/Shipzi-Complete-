const AUTH_COOKIE_NAME = 'shipzi-auth'
const ONBOARDING_COOKIE_NAME = 'shipzi-onboarding-complete'

export function setAuthCookie(uid: string): void {
  if (typeof document === 'undefined' || !uid) return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${AUTH_COOKIE_NAME}=${uid}; path=/; max-age=86400; SameSite=Lax${secure}`
}

export function setOnboardingComplete(): void {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${ONBOARDING_COOKIE_NAME}=true; path=/; max-age=31536000; SameSite=Lax${secure}`
}

export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  document.cookie = `${ONBOARDING_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

export function getAuthCookie(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`))
  return m ? m[1] : null
}
