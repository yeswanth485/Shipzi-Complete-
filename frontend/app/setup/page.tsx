'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

interface CheckResult {
  name: string
  status: 'ok' | 'error' | 'loading'
  detail: string
}

export default function SetupPage() {
  const [checks, setChecks] = useState<CheckResult[]>([
    { name: 'Firebase Auth', status: 'loading', detail: 'Checking...' },
    { name: 'Supabase Connection', status: 'loading', detail: 'Checking...' },
    { name: 'Users Table', status: 'loading', detail: 'Checking...' },
    { name: 'Companies Table', status: 'loading', detail: 'Checking...' },
  ])

  const updateCheck = (index: number, update: Partial<CheckResult>) => {
    setChecks(prev => prev.map((c, i) => i === index ? { ...c, ...update } : c))
  }

  useEffect(() => {
    // Check 1: Firebase Auth
    const unsub = onAuthStateChanged(auth, (user) => {
      updateCheck(0, {
        status: 'ok',
        detail: user ? `Connected. User: ${user.email || user.uid}` : 'Connected. No user signed in.',
      })
    }, (err) => {
      updateCheck(0, { status: 'error', detail: `Error: ${err.message}` })
    })

    // Check 2: Supabase connection
    const checkSupabase = async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!url || !key || url.includes('your_') || key.includes('your_')) {
          updateCheck(1, { status: 'error', detail: 'Environment variables not set. Check .env.local' })
          updateCheck(2, { status: 'error', detail: 'Skipped — Supabase not configured' })
          updateCheck(3, { status: 'error', detail: 'Skipped — Supabase not configured' })
          return
        }
        updateCheck(1, { status: 'ok', detail: `Connected to ${url}` })
      } catch (err: any) {
        updateCheck(1, { status: 'error', detail: err.message })
      }

      // Check 3: Users table
      try {
        const { data, error } = await supabase.from('users').select('id').limit(1)
        if (error) {
          if (error.code === '42P01') {
            updateCheck(2, { status: 'error', detail: 'TABLE DOES NOT EXIST — Run SQL migrations in Supabase SQL Editor' })
          } else {
            updateCheck(2, { status: 'error', detail: `Error (${error.code}): ${error.message}` })
          }
        } else {
          updateCheck(2, { status: 'ok', detail: `Table exists. Found ${data?.length ?? 0} rows (limited to 1).` })
        }
      } catch (err: any) {
        updateCheck(2, { status: 'error', detail: err.message })
      }

      // Check 4: Companies table
      try {
        const { data, error } = await supabase.from('companies').select('id').limit(1)
        if (error) {
          if (error.code === '42P01') {
            updateCheck(3, { status: 'error', detail: 'TABLE DOES NOT EXIST — Run SQL migrations in Supabase SQL Editor' })
          } else {
            updateCheck(3, { status: 'error', detail: `Error (${error.code}): ${error.message}` })
          }
        } else {
          updateCheck(3, { status: 'ok', detail: `Table exists. Found ${data?.length ?? 0} rows (limited to 1).` })
        }
      } catch (err: any) {
        updateCheck(3, { status: 'error', detail: err.message })
      }
    }

    checkSupabase()
    return unsub
  }, [])

  const allOk = checks.every(c => c.status === 'ok')

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg-void)' }}>
      <div className="w-full max-w-lg">
        <h1 className="font-syne text-2xl font-bold text-white mb-2">Shipzi Setup Diagnostic</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          This page checks if Firebase and Supabase are properly configured.
        </p>

        <div className="space-y-3">
          {checks.map((check) => (
            <div key={check.name} className="p-4 rounded-xl"
              style={{
                background: check.status === 'ok' ? 'rgba(16,185,129,0.08)' : check.status === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${check.status === 'ok' ? 'rgba(16,185,129,0.3)' : check.status === 'error' ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
              }}>
              <div className="flex items-center gap-2 mb-1">
                <span>{check.status === 'ok' ? '✅' : check.status === 'error' ? '❌' : '⏳'}</span>
                <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{check.name}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{check.detail}</p>
            </div>
          ))}
        </div>

        {!allOk && (
          <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.3)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>How to fix:</p>
            <ol className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li>1. Go to <a href="https://supabase.com/dashboard" target="_blank" style={{ color: 'var(--accent-secondary)' }}>Supabase Dashboard</a></li>
              <li>2. Select your project → SQL Editor</li>
              <li>3. Paste the contents of <code style={{ color: 'var(--accent-primary)' }}>database/supabase/migrations/001_initial_schema.sql</code></li>
              <li>4. Click &quot;Run&quot; to execute</li>
              <li>5. Then paste and run <code style={{ color: 'var(--accent-primary)' }}>database/supabase/migrations/007_nuclear_disable_rls.sql</code></li>
              <li>6. Refresh this page to verify</li>
            </ol>
          </div>
        )}

        {allOk && (
          <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--accent-success)' }}>
              All checks passed! You can now <a href="/signup" style={{ color: 'var(--accent-secondary)' }}>sign up</a> or <a href="/login" style={{ color: 'var(--accent-secondary)' }}>log in</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
