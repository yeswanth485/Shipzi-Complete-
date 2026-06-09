'use client'
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { supabase } from '@/lib/supabase'
import type { UserRow } from '@/lib/supabase'

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
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserData = useCallback(async (user: FirebaseUser) => {
    // Stage 1: Get the user row (simple query — no joins that could fail)
    let { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.uid)
      .single()

    // If the user row does not exist, insert a new one
    if (userErr && userErr.code === 'PGRST116') {
      // Try to create a new user row with demo company id
      const newUser = {
        id: user.uid,
        email: user.email || '',
        full_name: user.displayName || '',
        avatar_url: user.photoURL || '',
        company_id: '00000000-0000-0000-0000-000000000001', // Default to demo company
        onboarding_complete: false,
        role: 'member',
      }
      const { data: inserted, error: insertErr } = await supabase
        .from('users')
        .insert([newUser])
        .select('*')
        .single();
      if (insertErr) {
        console.error('Error inserting new user:', insertErr);
        return;
      }
      userRow = inserted;
    } else if (userErr) {
      console.error("fetchUserData error:", userErr)
      return
    }
    if (!userRow) return

    // Stage 2: If user has a company_id, try to load company data separately
    // This is a separate query so if it fails, we still have companyId
    let companyData = null
    if (userRow.company_id) {
      const { data: company, error: companyErr } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userRow.company_id)
        .single()
      if (companyErr) {
        console.error("fetchCompany error (non-fatal):", companyErr)
      } else {
        companyData = company
      }
    }

    // Merge company data into userData so settings page can access it
    setUserData({ ...userRow, companies: companyData } as UserRow)

  }, [])

  const refreshUser = useCallback(async () => {
    if (firebaseUser) await fetchUserData(firebaseUser)
  }, [firebaseUser, fetchUserData])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (user) {
        await fetchUserData(user)
      } else {
        setUserData(null)
      }
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
