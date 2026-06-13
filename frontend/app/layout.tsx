import type { Metadata } from 'next'
import './globals.css'
import { UserProvider } from '@/context/UserContext'

export const metadata: Metadata = {
  title: 'Shipzi — AI Packaging Intelligence',
  description: 'AI-powered packaging optimization platform that reduces shipping costs and carbon footprint.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://shipzi.vercel.app'),
  openGraph: {
    title: 'Shipzi — AI Packaging Intelligence',
    description: 'Optimize every shipment. Reduce every cost.',
    images: ['/shipzi-logo.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  )
}
