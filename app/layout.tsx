import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import { cn } from '@/lib/utils'
import NavBar from './components/NavBar'
import BottomNav from './components/BottomNav'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Liikuntahakemisto',
  description: 'Löydä liikuntapaikat läheltäsi Tampereella',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi" className={cn('font-sans', inter.variable)}>
      <body className="antialiased bg-indigo-50 text-gray-900">
        <NavBar />
        <main className="pb-16 sm:pb-0">
          {children}
        </main>
        <Suspense fallback={<div className="h-16 sm:hidden" />}>
          <BottomNav />
        </Suspense>
      </body>
    </html>
  )
}
