import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import NavBar from './components/NavBar'
import MapProvider from './components/MapProvider'

const inter    = Inter({ subsets: ['latin'], variable: '--font-sans' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' })

export const metadata: Metadata = {
  title: 'Liikuntahakemisto',
  description: 'Löydä liikuntapaikat läheltäsi Tampereella',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi" className={cn('font-sans', inter.variable, playfair.variable)}>
      <body className="antialiased bg-white text-[#111111]">
        <MapProvider>
          <NavBar />
          <main>{children}</main>
        </MapProvider>
      </body>
    </html>
  )
}
