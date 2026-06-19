const AUTH_COOKIE_NAME = 'shipzi-auth'
const ONBOARDING_COOKIE_NAME = 'shipzi-onboarding-complete'

/**
 * Sets the auth cookie with the Firebase UID.
 * Uses 7-day expiry so it survives browser restarts.
 * SameSite=Lax ensures it's sent on same-site navigations (Next.js middleware can read it).
 */
export function setAuthCookie(uid: string): void {
  if (typeof document === 'undefined' || !uid) return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  // 7 days — gives enough time for normal usage without being too long
  const maxAge = 7 * 24 * 60 * 60 // 604800 seconds
  document.cookie = `${AUTH_COOKIE_NAME}=${uid}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`
  console.log('[auth-cookies] setAuthCookie set for uid:', uid.substring(0, 8) + '...')
}

/**
 * Sets the onboarding-complete cookie so middleware and other pages know
 * the user has finished onboarding.
 */
export function setOnboardingComplete(): void {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  // 1 year
  document.cookie = `${ONBOARDING_COOKIE_NAME}=true; path=/; max-age=31536000; SameSite=Lax${secure}`
  console.log('[auth-cookies] setOnboardingComplete cookie set')
}

/**
 * Clears all auth-related cookies (called on logout).
 */
export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  document.cookie = `${ONBOARDING_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  console.log('[auth-cookies] All auth cookies cleared')
}

/**
 * Reads the auth cookie client-side.
 */
export function getAuthCookie(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`))
  return m ? m[1] : null
}

/**
 * Reads the onboarding-complete cookie client-side.
 */
export function getOnboardingCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.includes(`${ONBOARDING_COOKIE_NAME}=true`)
}
