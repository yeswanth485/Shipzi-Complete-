'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { supabase } from '@/lib/supabase'
import { setAuthCookie } from '@/lib/auth-cookies'
import { useUser } from '@/context/UserContext'

interface FormData {
  fullName: string; email: string; password: string
  confirmPassword: string; companyName: string; agreeTerms: boolean
}
interface Errors { fullName?: string; email?: string; password?: string; confirmPassword?: string; companyName?: string; agreeTerms?: string }

function setAuthCookieLocal(uid: string) { setAuthCookie(uid) }

export default function SignupPage() {
  const router = useRouter()
  const { firebaseUser, userData, isLoading } = useUser()
  const [form, setForm] = useState<FormData>({
    fullName: '', email: '', password: '', confirmPassword: '', companyName: '', agreeTerms: false,
  })
  const [showPwd,      setShowPwd]      = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [errors,       setErrors]       = useState<Errors>({})
  const [serverError,  setServerError]  = useState('')

  useEffect(() => {
    if (!isLoading && firebaseUser) {
      if (userData?.onboarding_complete) {
        router.replace('/dashboard')
      } else {
        router.replace('/onboarding')
      }
    }
  }, [isLoading, firebaseUser, userData, router])

  const validate = (): boolean => {
    const e: Errors = {}
    if (!form.fullName.trim())        e.fullName        = 'Full name is required'
    if (!form.email.includes('@'))    e.email           = 'Valid email required'
    if (form.password.length < 8)     e.password        = 'Min 8 characters'
    if (!/\d/.test(form.password))    e.password        = 'Must include a number'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    if (!form.companyName.trim())     e.companyName     = 'Company name required'
    if (!form.agreeTerms)             e.agreeTerms      = 'You must accept the terms'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true); setServerError('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      // Upsert so we don't fail if row already exists
      const { error: insertErr } = await supabase.from('users').upsert({
        id:                  cred.user.uid,
        email:               form.email,
        full_name:           form.fullName,
        onboarding_complete: false,
      }, { onConflict: 'id' })
      if (insertErr) {
        console.error('User insert error:', insertErr)
        // Continue anyway — onboarding or UserContext will retry
      }
      setAuthCookieLocal(cred.user.uid)
      router.push('/onboarding')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setServerError(msg.includes('email-already-in-use')
        ? 'This email is already registered — please sign in instead.'
        : 'Sign up failed. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
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

      setLoading(true); setServerError('')

      const uid = result.user.uid
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('id', uid)
        .single()
      if (!existing) {
        await supabase.from('users').upsert({
          id: uid,
          email: result.user.email!,
          full_name: result.user.displayName,
          avatar_url: result.user.photoURL,
          onboarding_complete: false,
        }, { onConflict: 'id' })
      }
      setAuthCookieLocal(uid)
      router.push('/onboarding')
    } catch (err: any) {
      console.error('Google sign-up error:', err)
      if (err.message && err.message.includes('popups')) {
        setServerError(err.message)
      } else {
        setServerError('Google sign-up failed. Please try again or use email sign-up.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle redirect result on page load
  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        const uid = result.user.uid
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('id', uid)
          .single()
        if (!existing) {
          await supabase.from('users').upsert({
            id: uid,
            email: result.user.email!,
            full_name: result.user.displayName,
            avatar_url: result.user.photoURL,
            onboarding_complete: false,
          }, { onConflict: 'id' })
        }
        setAuthCookieLocal(uid)
        router.push('/onboarding')
      }
    }).catch((err) => {
      console.error('Redirect result error:', err)
    })
  }, [])

  const field = (key: keyof FormData) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }))
      setErrors(prev => ({ ...prev, [key]: undefined }))
    },
  })

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

            {serverError && (
              <div className="mb-5 p-4 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-danger)' }}>
                {serverError}
              </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
              {([
                { label: 'Full Name',    key: 'fullName',    type: 'text',     ph: 'John Smith'         },
                { label: 'Work Email',   key: 'email',       type: 'email',    ph: 'you@company.com'    },
                { label: 'Company Name', key: 'companyName', type: 'text',     ph: 'Acme Logistics'     },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                  <input type={f.type} {...field(f.key)} className="input-dark" placeholder={f.ph} />
                  {errors[f.key] && <p className="text-xs mt-1" style={{ color: 'var(--accent-danger)' }}>{errors[f.key]}</p>}
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} {...field('password')}
                    className="input-dark" placeholder="Min 8 chars + number" style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPwd ? '🙈' : '👁'}
                  </button>
                </div>
                {errors.password && <p className="text-xs mt-1" style={{ color: 'var(--accent-danger)' }}>{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
                <input type="password" {...field('confirmPassword')} className="input-dark" placeholder="••••••••" />
                {errors.confirmPassword && <p className="text-xs mt-1" style={{ color: 'var(--accent-danger)' }}>{errors.confirmPassword}</p>}
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.agreeTerms}
                    onChange={e => setForm(f => ({ ...f, agreeTerms: e.target.checked }))}
                    style={{ accentColor: 'var(--accent-primary)', marginTop: 2 }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    I agree to the <a href="#" style={{ color: 'var(--accent-secondary)' }}>Terms</a> and{' '}
                    <a href="#" style={{ color: 'var(--accent-secondary)' }}>Privacy Policy</a>
                  </span>
                </label>
                {errors.agreeTerms && <p className="text-xs mt-1" style={{ color: 'var(--accent-danger)' }}>{errors.agreeTerms}</p>}
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
