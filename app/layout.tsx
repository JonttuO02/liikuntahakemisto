import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import NavBar from './components/NavBar'
import MapProvider from './components/MapProvider'
import { cookies } from 'next/headers'
import { createServerSupabase } from '@/lib/supabaseSSR'

const inter    = Inter({ subsets: ['latin'], variable: '--font-sans' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' })

export const metadata: Metadata = {
  title: 'Liikuntahakemisto',
  description: 'Löydä liikuntapaikat läheltäsi Tampereella',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const supabase = createServerSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="fi" className={cn('font-sans', inter.variable, playfair.variable)}>
      <body className="antialiased bg-white text-[#111111]">
        <MapProvider>
          <NavBar userEmail={user?.email ?? null} />
          <main>{children}</main>
        </MapProvider>
      </body>
    </html>
  )
}
