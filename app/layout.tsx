import type { Metadata, Viewport } from 'next'
import { Outfit, Playfair_Display } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import MapProvider from './components/MapProvider'

const outfit   = Outfit({ subsets: ['latin'], variable: '--font-sans' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' })

export const metadata: Metadata = {
  title: 'AKTIIVI',
  description: 'Löydä liikuntapaikat läheltäsi — AKTIIVI',
  manifest: '/manifest.webmanifest',
  appleWebApp: { statusBarStyle: 'default' },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = { themeColor: '#4F46E5' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi" className={cn('font-sans', outfit.variable, playfair.variable)}>
      <body className="antialiased bg-white text-[#111111]">
        <MapProvider>
          <main>{children}</main>
        </MapProvider>
      </body>
    </html>
  )
}
