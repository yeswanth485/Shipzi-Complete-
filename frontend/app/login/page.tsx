'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { supabase } from '@/lib/supabase'
import { setAuthCookie, setOnboardingComplete } from '@/lib/auth-cookies'
import { useUser } from '@/context/UserContext'

export default function LoginPage() {
  const router = useRouter()
  const { firebaseUser, userData, isLoading } = useUser()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // If the user is already authenticated, redirect them away from login.
  // This runs AFTER Firebase has restored the session (isLoading=false),
  // so we know the auth state is definitive.
  useEffect(() => {
    if (!isLoading && firebaseUser) {
      console.log('[LoginPage] User already authenticated, checking onboarding status')
      
      if (userData?.onboarding_complete) {
        console.log('[LoginPage] Onboarding complete, redirecting to /dashboard')
        router.replace('/dashboard')
      } else {
        console.log('[LoginPage] Onboarding incomplete (or user row missing), redirecting to /onboarding')
        router.replace('/onboarding')
      }
    }
  }, [isLoading, firebaseUser, userData, router])

  /**
   * After a successful auth event (email login, register, or Google),
   * this function:
   * 1. Sets the auth cookie so middleware allows /dashboard access
   * 2. Checks Supabase for onboarding_complete flag
   * 3. Redirects to the correct destination
   */
  const handlePostAuth = async (uid: string, isNew = false) => {
    console.log('[LoginPage] handlePostAuth uid:', uid, 'isNew:', isNew)

    // Set the auth cookie BEFORE any redirect so middleware passes the request
    setAuthCookie(uid)

    if (isNew) {
      console.log('[LoginPage] New user → /onboarding')
      router.push('/onboarding')
      return
    }

    // Existing user: check their onboarding status from Supabase
    const { data, error: supaErr } = await supabase
      .from('users')
      .select('onboarding_complete')
      .eq('id', uid)
      .single()

    console.log('[LoginPage] Supabase onboarding check:', { data, supaErr })

    if (supaErr) {
      // If we can't fetch the user row, treat as new (send to onboarding)
      console.warn('[LoginPage] Could not fetch user row, defaulting to /onboarding:', supaErr)
      router.push('/onboarding')
      return
    }

    if (data?.onboarding_complete) {
      setOnboardingComplete()
      console.log('[LoginPage] onboarding_complete=true → /dashboard')
      router.push('/dashboard')
    } else {
      console.log('[LoginPage] onboarding_complete=false → /onboarding')
      router.push('/onboarding')
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      console.log('[LoginPage] Email login attempt for:', email)
      const cred = await signInWithEmailAndPassword(auth, email, password)
      console.log('[LoginPage] Firebase sign-in success, uid:', cred.user.uid)

      // Check if the user exists in Supabase
      const { data: existing, error: fetchErr } = await supabase
        .from('users')
        .select('id')
        .eq('id', cred.user.uid)
        .single()

      if (fetchErr && fetchErr.code !== 'PGRST116') {
        console.error('[LoginPage] Supabase fetch error:', fetchErr)
      }

      // If user doesn't exist in Supabase, create them
      if (!existing) {
        await supabase.from('users').upsert({
          id: cred.user.uid,
          email: cred.user.email || email,
          full_name: cred.user.displayName || '',
          avatar_url: cred.user.photoURL || '',
          onboarding_complete: false,
        }, { onConflict: 'id' })
      }

      await handlePostAuth(cred.user.uid, !existing)
    } catch (err: any) {
      console.error('[LoginPage] Email login error:', err)
      setError('Invalid email or password. Please try again.')
      setLoading(false)
    }
    // Note: don't setLoading(false) on success — page is navigating away
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      if (name) {
        await updateProfile(cred.user, { displayName: name })
      }
      await supabase.from('users').upsert({
        id: cred.user.uid,
        email: email,
        full_name: name,
        avatar_url: '',
        onboarding_complete: false,
      }, { onConflict: 'id' })
      await handlePostAuth(cred.user.uid, true)
    } catch (err: any) {
      const msg = err.message || 'Registration failed'
      if (msg.includes('email-already-in-use')) {
        setError('This email is already registered. Please sign in instead.')
      } else if (msg.includes('weak-password')) {
        setError('Password must be at least 6 characters.')
      } else {
        setError(`Registration failed: ${msg}`)
      }
      setLoading(false)
    }
    // Note: don't setLoading(false) on success — page is navigating away
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    try {
      const provider = new GoogleAuthProvider()
      let result
      try {
        result = await signInWithPopup(auth, provider)
      } catch (popupErr: any) {
        if (
          popupErr?.code === 'auth/popup-blocked' ||
          popupErr?.code === 'auth/popup-closed-by-user' ||
          popupErr?.code === 'auth/cancelled-popup-request'
        ) {
          throw new Error('Please allow popups for this site to sign in with Google.')
        }
        throw popupErr
      }

      const uid = result.user.uid
      const { data: existing } = await supabase
        .from('users')
        .select('id, onboarding_complete')
        .eq('id', uid)
        .single()

      await handlePostAuth(uid, !existing)
    } catch (err: any) {
      console.error('[LoginPage] Google sign-in error:', err)
      if (err.message && err.message.includes('popups')) {
        setError(err.message)
      } else {
        setError('Google sign-in failed. Please try again or use email sign-in.')
      }
      setLoading(false)
    }
    // Note: don't setLoading(false) on success — page is navigating away
  }

  // Handle Google redirect result on page load
  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        console.log('[LoginPage] Google redirect result, uid:', result.user.uid)
        setLoading(true)
        const uid = result.user.uid
        const { data: existing } = await supabase
          .from('users')
          .select('id, onboarding_complete')
          .eq('id', uid)
          .single()
        await handlePostAuth(uid, !existing)
      }
    }).catch((err) => {
      console.error('[LoginPage] Redirect result error:', err)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Show loading spinner while checking existing auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,var(--bg-void) 0%,#060A10 100%)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: 'var(--accent-primary)', borderRightColor: 'var(--accent-secondary)' }} />
      </div>
    )
  }

  // If user is already logged in, show spinner while redirect completes
  if (firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,var(--bg-void) 0%,#060A10 100%)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: 'var(--accent-primary)', borderRightColor: 'var(--accent-secondary)' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg,var(--bg-void) 0%,#060A10 100%)' }}>
      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <Image src="/shipzi-logo.png" alt="Shipzi Logo" width={40} height={40} className="object-contain" priority />
            <span className="font-syne font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Shipzi</span>
          </div>

          <div className="glass-card p-8">
            <h1 className="font-syne text-3xl font-bold text-white mb-2">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'login' ? 'Sign in to your Shipzi workspace' : 'Start optimizing your shipments today'}
            </p>

            {error && (
              <div className="mb-5 p-4 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-danger)' }}>
                {error}
              </div>
            )}

            <form onSubmit={mode === 'login' ? handleEmailLogin : handleRegister} className="space-y-5">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="input-dark" placeholder="John Doe" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="input-dark" placeholder="you@company.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-dark" placeholder="••••••••" style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showPwd ? '🙈' : '👁'}
                  </button>
                </div>
                {mode === 'login' && (
                  <div className="text-right mt-1">
                    <a href="#" className="text-xs" style={{ color: 'var(--accent-secondary)' }}>Forgot password?</a>
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center" style={{ padding: 14 }}>
                {loading
                  ? <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : mode === 'login' ? 'Sign In' : 'Register'}
              </button>
            </form>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
            </div>

            <button onClick={handleGoogle} disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium text-sm transition-opacity hover:opacity-90"
              style={{ background: 'white', color: '#1a1a1a', border: 'none', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
              {mode === 'login' ? (
                <>No account?{' '}
                  <button onClick={() => { setMode('register'); setError('') }}
                    style={{ color: 'var(--accent-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}>
                    Register
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button onClick={() => { setMode('login'); setError('') }}
                    style={{ color: 'var(--accent-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}>
                    Sign In
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Visual panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center"
        style={{ background: 'linear-gradient(135deg,rgba(37,99,235,0.08) 0%,rgba(6,182,212,0.05) 100%)' }}>
        <div className="text-center p-12 max-w-sm">
          <div className="text-6xl mb-6">📦</div>
          <h2 className="font-syne text-3xl font-bold text-white mb-4">Ship Smarter</h2>
          <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
            AI-optimized packaging that saves money and the planet.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Cost Savings', value: '23%' },
              { label: 'Utilization', value: '85%+' },
              { label: 'CO₂ Reduced', value: '340T' },
              { label: 'Teams', value: '500+' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl"
                style={{ background: 'rgba(17,22,32,0.6)', border: '1px solid var(--border-subtle)' }}>
                <div className="font-syne font-bold text-2xl" style={{ color: 'var(--accent-primary)' }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
