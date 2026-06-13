export function setAuthCookie(uid: string): void {
  if (typeof document === 'undefined') return
  // BUG-004 FIX: Add SameSite=Strict and Secure flag for production
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `shipzi-auth=${uid}; path=/; max-age=86400; SameSite=Strict${secure}`
}

export function setOnboardingComplete(): void {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `shipzi-onboarding-complete=true; path=/; max-age=31536000; SameSite=Strict${secure}`
}

export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return
  document.cookie = 'shipzi-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict'
  document.cookie = 'shipzi-onboarding-complete=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict'
}

export function getAuthCookie(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/shipzi-auth=([^;]+)/)
  return m ? m[1] : null
}
