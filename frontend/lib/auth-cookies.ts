export function setAuthCookie(uid: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `shipzi-auth=${uid}; path=/; max-age=86400; SameSite=Lax`
}

export function setOnboardingComplete(): void {
  if (typeof document === 'undefined') return
  document.cookie = `shipzi-onboarding-complete=true; path=/; max-age=31536000; SameSite=Lax`
}

export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return
  document.cookie = 'shipzi-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  document.cookie = 'shipzi-onboarding-complete=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

export function getAuthCookie(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/shipzi-auth=([^;]+)/)
  return m ? m[1] : null
}
