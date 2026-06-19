import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import { UserProvider } from "@/context/UserContext"
import SessionSync from "@/components/SessionSync"
import AuthGate from "@/components/AuthGate"

export const metadata: Metadata = {
  title: "Shipzi — AI Packaging Intelligence",
  description:
    "AI-powered packaging optimization platform that reduces shipping costs and carbon footprint.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://shipzi.vercel.app"
  ),
  openGraph: {
    title: "Shipzi — AI Packaging Intelligence",
    description: "Optimize every shipment. Reduce every cost.",
    images: ["/shipzi-logo.png"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/shipzi-logo.png" sizes="any" />
        <link rel="apple-touch-icon" href="/shipzi-logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <UserProvider>
            <SessionSync />
            <AuthGate>{children}</AuthGate>
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
