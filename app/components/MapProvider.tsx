'use client'
import { APIProvider } from '@vis.gl/react-google-maps'

const LIBRARIES: string[] = ['places']

export default function MapProvider({ children }: { children: React.ReactNode }) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''} libraries={LIBRARIES}>
      {children}
    </APIProvider>
  )
}
