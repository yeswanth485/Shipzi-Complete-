'use client'
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { supabase } from '@/lib/supabase'
import type { UserRow } from '@/lib/supabase'
import { setAuthCookie, clearAuthCookies } from '@/lib/auth-cookies'

interface UserContextType {
  firebaseUser: FirebaseUser | null
  userData: UserRow | null
  companyId: string | null
  isLoading: boolean
  refreshUser: () => Promise<void>
}

export const UserContext = createContext<UserContextType | null>(null)

export function useUser(): UserContextType {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [userData, setUserData] = useState<UserRow | null>(null)
  // Start as TRUE — stays true until Firebase has resolved its initial auth state.
  // This prevents the dashboard layout from seeing (isLoading=false, user=null)
  // during the brief window while Firebase restores the session from persistence.
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserData = useCallback(async (user: FirebaseUser) => {
    console.log('[UserContext] fetchUserData for uid:', user.uid)

    // Stage 1: Get the user row
    let { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.uid)
      .single()

    // Only create a new user row if it truly doesn't exist (PGRST116 = not found)
    if (userErr && userErr.code === 'PGRST116') {
      console.log('[UserContext] User row not found, creating new user row (NO new company created here)')
      // Do NOT create a company here — onboarding handles company creation.
      // Just create the user row with no company_id so onboarding can assign one.
      const newUser = {
        id: user.uid,
        email: user.email || '',
        full_name: user.displayName || '',
        avatar_url: user.photoURL || '',
        company_id: null,
        onboarding_complete: false,
        role: 'member',
      }
      const { data: inserted, error: insertErr } = await supabase
        .from('users')
        .insert([newUser])
        .select('*')
        .single()

      if (insertErr) {
        // If insert fails with unique violation, the row was created in a race — re-fetch it
        if (insertErr.code === '23505') {
          console.log('[UserContext] Race condition on insert, re-fetching user row')
          const { data: refetched } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.uid)
            .single()
          userRow = refetched
        } else {
          console.error('[UserContext] Error inserting new user:', insertErr)
          return
        }
      } else {
        userRow = inserted
      }
    } else if (userErr) {
      console.error('[UserContext] fetchUserData error:', userErr)
      return
    }

    if (!userRow) {
      console.warn('[UserContext] userRow is null after fetch/insert')
      return
    }

    console.log('[UserContext] userRow loaded:', {
      id: userRow.id,
      onboarding_complete: userRow.onboarding_complete,
      company_id: userRow.company_id,
    })

    // Stage 2: If user has a company_id, load company data separately
    let companyData = null
    if (userRow.company_id) {
      const { data: company, error: companyErr } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userRow.company_id)
        .single()
      if (companyErr) {
        console.warn('[UserContext] fetchCompany error (non-fatal):', companyErr)
      } else {
        companyData = company
      }
    }

    setUserData({ ...userRow, companies: companyData } as UserRow)
  }, [])

  const refreshUser = useCallback(async () => {
    if (firebaseUser) await fetchUserData(firebaseUser)
  }, [firebaseUser, fetchUserData])

  useEffect(() => {
    console.log('[UserContext] Setting up onAuthStateChanged listener')

    const unsub = onAuthStateChanged(auth, async (user) => {
      console.log('[UserContext] onAuthStateChanged fired, user:', user ? user.uid : 'null')
      setFirebaseUser(user)

      if (user) {
        setAuthCookie(user.uid)
        try {
          await fetchUserData(user)
        } catch (e) {
          console.error('[UserContext] fetchUserData failed:', e)
        }
      } else {
        clearAuthCookies()
        setUserData(null)
      }

      // Only mark loading done AFTER we've resolved user state.
      // This is the key fix: isLoading stays true until Firebase confirms
      // whether the user is logged in or not.
      setIsLoading(false)
    })

    return unsub
  }, [fetchUserData])

  return (
    <UserContext.Provider value={{
      firebaseUser,
      userData,
      companyId: userData?.company_id ?? null,
      isLoading,
      refreshUser,
    }}>
      {children}
    </UserContext.Provider>
  )
}
