"use client"
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import {
  getProfile,
  upsertProfile,
  type UserProfile,
} from "@/lib/supabase"

interface AuthContextType {
  firebaseUser: FirebaseUser | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  signOutUser: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

function writeAuthCookie(token: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `firebase_token=${token}; path=/; max-age=3600; SameSite=Strict${secure}`
}

function clearAuthCookie() {
  document.cookie = "firebase_token=; path=/; max-age=0"
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    const safetyTimeout = setTimeout(() => {
      if (mountedRef.current) {
        setLoading((prev) => {
          if (prev) {
            console.log("[Auth] Firebase timed out — forcing loading=false")
            return false
          }
          return prev
        })
      }
    }, 8000)

    const unsub = onAuthStateChanged(auth, async (user) => {
      clearTimeout(safetyTimeout)

      if (!mountedRef.current) return

      if (user) {
        console.log("[Auth] Firebase user detected:", user.uid)

        // Write cookie FIRST so middleware allows navigation
        try {
          const token = await user.getIdToken()
          writeAuthCookie(token)
          console.log("[Auth] Token cookie written")
        } catch {
          console.warn("[Auth] Failed to write token cookie")
        }

        // Load or create profile — NEVER let this block the user
        try {
          console.log("[Auth] Loading profile for UID:", user.uid)
          let profileData = await getProfile(user.uid)

          if (!profileData) {
            console.log("[Auth] No profile found — creating one")
            profileData = await upsertProfile(
              user.uid,
              user.email || "",
              user.displayName || null,
              user.photoURL || null
            )
            if (profileData) {
              console.log("[Auth] Profile created:", JSON.stringify(profileData))
            } else {
              console.warn("[Auth] upsertProfile returned null — creating minimal profile")
            }
          } else {
            console.log("[Auth] Profile loaded:", JSON.stringify(profileData))
          }

          if (mountedRef.current) {
            setFirebaseUser(user)
            setProfile(profileData)
            setLoading(false)
          }
        } catch (e: unknown) {
          console.error("[Auth] Profile load failed:", e)
          if (mountedRef.current) {
            setFirebaseUser(user)
            setProfile(null)
            setLoading(false)
            setError(
              e instanceof Error ? e.message : "Failed to load profile"
            )
          }
        }
      } else {
        console.log("[Auth] No Firebase user")
        clearAuthCookie()
        if (mountedRef.current) {
          setFirebaseUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    })

    return () => {
      mountedRef.current = false
      clearTimeout(safetyTimeout)
      unsub()
    }
  }, [])

  const signOutUser = useCallback(async () => {
    console.log("[Auth] Signing out")
    clearAuthCookie()
    await signOut(auth)
    setFirebaseUser(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!firebaseUser) return
    try {
      console.log("[Auth] Refreshing profile for UID:", firebaseUser.uid)
      let profileData = await getProfile(firebaseUser.uid)
      if (!profileData) {
        profileData = await upsertProfile(
          firebaseUser.uid,
          firebaseUser.email || "",
          firebaseUser.displayName || null,
          firebaseUser.photoURL || null
        )
      }
      setProfile(profileData)
    } catch (e: unknown) {
      console.error("[Auth] refreshProfile failed:", e)
      setError(
        e instanceof Error ? e.message : "Failed to refresh profile"
      )
    }
  }, [firebaseUser])

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        error,
        signOutUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
