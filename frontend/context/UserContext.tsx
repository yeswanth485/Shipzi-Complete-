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

  const fetchUserData = useCallback(async (uid: string) => {
    // Stage 1: Get the user row (simple query — no joins that could fail)
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single()

    if (userErr) {
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
    if (firebaseUser) await fetchUserData(firebaseUser.uid)
  }, [firebaseUser, fetchUserData])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (user) {
        await fetchUserData(user.uid)
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
