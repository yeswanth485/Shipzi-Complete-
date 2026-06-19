'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'

export default function SignupPage() {
  const router = useRouter()
  const { firebaseUser, userData, isLoading } = useUser()

  const [fullName, setFullName]         = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [companyName, setCompanyName]   = useState('')
  const [agreeTerms, setAgreeTerms]     = useState(false)
  const [showPwd, setShowPwd]           = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  const redirectHandled = useRef(false)
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle Google redirect result (runs once on mount)
  useEffect(() => {
    if (redirectHandled.current) return
    redirectHandled.current = true

    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          setLoading(true)
          const uid = result.user.uid

          const { data } = await supabase
            .from('users')
            .select('onboarding_complete')
            .eq('id', uid)
            .single()

          if (!data) {
            await supabase.from('users').upsert({
              id: uid,
              email: result.user.email || '',
              full_name: result.user.displayName || '',
              avatar_url: result.user.photoURL || '',
              onboarding_complete: false,
            }, { onConflict: 'id' })
          }
        }
      })
      .catch((err) => {
        console.error('[Signup] Google redirect error:', err)
        setError('Google sign-in failed. Please try again.')
        setLoading(false)
      })
  }, [])

  // Redirect effect with timeout: wait up to 4s for userData to load after
  // firebaseUser is resolved before falling back to /onboarding.
  useEffect(() => {
    if (isLoading) return

    if (!firebaseUser) {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current)
        redirectTimer.current = null
      }
      return
    }

    if (userData) {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current)
        redirectTimer.current = null
      }
      if (userData.onboarding_complete) {
        router.replace('/dashboard')
      } else {
        router.replace('/onboarding')
      }
      return
    }

    if (!redirectTimer.current) {
      console.log('[Signup] firebaseUser set, waiting up to 4s for userData...')
      redirectTimer.current = setTimeout(() => {
        console.log('[Signup] userData timeout — redirecting to /onboarding as fallback')
        redirectTimer.current = null
        router.replace('/onboarding')
      }, 4000)
    }

    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current)
        redirectTimer.current = null
      }
    }
  }, [isLoading, firebaseUser, userData, router])

  // Validate form
  const validate = (): boolean => {
    if (!fullName.trim()) { setError('Full name is required.'); return false }
    if (!email.includes('@')) { setError('Valid email required.'); return false }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return false }
    if (!/\d/.test(password)) { setError('Password must include a number.'); return false }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return false }
    if (!companyName.trim()) { setError('Company name is required.'); return false }
    if (!agreeTerms) { setError('You must accept the terms.'); return false }
    return true
  }

  // Email + password signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setError('')

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)

      // Update display name
      if (fullName) {
        await updateProfile(cred.user, { displayName: fullName })
      }

      // Create user row in Supabase
      const { error: insertErr } = await supabase.from('users').upsert({
        id: cred.user.uid,
        email: email,
        full_name: fullName,
        avatar_url: '',
        onboarding_complete: false,
      }, { onConflict: 'id' })

      if (insertErr) {
        console.error('[Signup] Supabase insert error:', insertErr)
        // Continue anyway — UserContext will retry on next auth state change
      }

      // Auth cookie is set by UserContext.onAuthStateChanged.
      // Redirect effect above will handle routing to /onboarding.
    } catch (err: any) {
      const code = err?.code || ''
      if (code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.')
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.')
      } else if (code === 'auth/invalid-email') {
        setError('Invalid email address.')
      } else {
        setError('Sign up failed. Please try again.')
      }
      setLoading(false)
    }
  }

  // Google signup via redirect
  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    try {
      await signInWithRedirect(auth, new GoogleAuthProvider())
    } catch (err: any) {
      console.error('[Signup] Google sign-up error:', err)
      setError('Failed to start Google sign-in.')
      setLoading(false)
    }
  }

  // Loading state — only block while actively processing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,var(--bg-void) 0%,#060A10 100%)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: 'var(--accent-primary)', borderRightColor: 'var(--accent-secondary)' }} />
      </div>
    )
  }

  // Already logged in — wait for redirect
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
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="flex items-center gap-3 mb-10">
            <Image src="/shipzi-logo.png" alt="Shipzi Logo" width={40} height={40} className="object-contain" priority />
            <span className="font-syne font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Shipzi</span>
          </div>

          <div className="glass-card p-8">
            <h1 className="font-syne text-3xl font-bold text-white mb-2">Create your account</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Start optimizing shipments in minutes</p>

            {error && (
              <div className="mb-5 p-4 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-danger)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  className="input-dark" placeholder="John Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Work Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="input-dark" placeholder="you@company.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Company Name</label>
                <input type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)}
                  className="input-dark" placeholder="Acme Logistics" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-dark" placeholder="Min 8 chars + number" style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPwd ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
                <input type="password" required value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="input-dark" placeholder="••••••••" />
              </div>
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={agreeTerms}
                    onChange={e => setAgreeTerms(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)', marginTop: 2 }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    I agree to the <a href="#" style={{ color: 'var(--accent-secondary)' }}>Terms</a> and{' '}
                    <a href="#" style={{ color: 'var(--accent-secondary)' }}>Privacy Policy</a>
                  </span>
                </label>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center" style={{ padding: 14 }}>
                {loading
                  ? <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : 'Create Account'}
              </button>
            </form>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
            </div>

            <button onClick={handleGoogle} disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-medium text-sm transition-opacity hover:opacity-90"
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
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--accent-secondary)' }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center"
        style={{ background: 'linear-gradient(135deg,rgba(37,99,235,0.08) 0%,rgba(6,182,212,0.05) 100%)' }}>
        <div className="text-center p-12 max-w-sm">
          <div className="text-6xl mb-6">🚀</div>
          <h2 className="font-syne text-3xl font-bold text-white mb-4">Join 500+ Logistics Teams</h2>
          <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
            The average business wastes 23% of shipping spend on oversized packaging.
          </p>
          <div className="p-5 rounded-xl text-left"
            style={{ background: 'rgba(17,22,32,0.6)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-sm italic mb-3" style={{ color: 'var(--text-secondary)' }}>
              &quot;Upload your first CSV to see exactly how much you could save per shipment — instantly.&quot;
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>— Shipzi AI Insight Engine</p>
          </div>
        </div>
      </div>
    </div>
  )
}
