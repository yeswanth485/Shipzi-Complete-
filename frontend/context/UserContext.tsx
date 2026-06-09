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
    const { data, error } = await supabase
      .from('users')
      .select('*, companies(*)')
      .eq('id', uid)
      .single()
    if (error) {
      console.error("fetchUserData error:", error);
    }
    if (!error && data) setUserData(data as UserRow)
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
