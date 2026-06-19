"use client"
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { User as FirebaseUser } from "firebase/auth"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import type { UserRow } from "@/lib/supabase"

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
  if (!ctx) throw new Error("useUser must be used within UserProvider")
  return ctx
}

export function UserProvider({ children }: { children: ReactNode }) {
  const { firebaseUser, loading: authLoading, profile } = useAuth()
  const [userData, setUserData] = useState<UserRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserData = useCallback(async (uid: string) => {
    try {
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("*")
        .eq("id", uid)
        .maybeSingle()

      if (userErr || !userRow) {
        setUserData(null)
        return
      }

      let companyData = null
      if (userRow.company_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("*")
          .eq("id", userRow.company_id)
          .maybeSingle()
        companyData = company
      }

      setUserData({ ...userRow, companies: companyData } as UserRow)
    } catch {
      setUserData(null)
    }
  }, [])

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true)
      return
    }

    if (firebaseUser) {
      fetchUserData(firebaseUser.uid).finally(() => setIsLoading(false))
    } else {
      setUserData(null)
      setIsLoading(false)
    }
  }, [firebaseUser, authLoading, fetchUserData])

  const refreshUser = useCallback(async () => {
    if (firebaseUser) await fetchUserData(firebaseUser.uid)
  }, [firebaseUser, fetchUserData])

  return (
    <UserContext.Provider
      value={{
        firebaseUser,
        userData,
        companyId: userData?.company_id ?? null,
        isLoading,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}
