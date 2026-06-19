"use client"
import { useEffect } from "react"
import { onIdTokenChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function SessionSync() {
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken()
        const secure = window.location.protocol === "https:" ? "; Secure" : ""
        document.cookie = `firebase_token=${token}; path=/; max-age=3600; SameSite=Strict${secure}`
        console.log("[SessionSync] Token written to cookie")
      } else {
        document.cookie = "firebase_token=; path=/; max-age=0"
        console.log("[SessionSync] Cookie cleared")
      }
    })

    const interval = setInterval(async () => {
      const user = auth.currentUser
      if (user) {
        await user.getIdToken(true)
      }
    }, 50 * 60 * 1000)

    return () => {
      unsub()
      clearInterval(interval)
    }
  }, [])

  return null
}
