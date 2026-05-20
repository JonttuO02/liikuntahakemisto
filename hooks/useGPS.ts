'use client'
import { useState, useCallback, useEffect } from 'react'

export type GPSStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'timeout'

export interface GPSState {
  status: GPSStatus
  coords: { lat: number; lng: number } | null
  requestLocation: () => void
}

export function useGPS(): GPSState {
  const [status, setStatus] = useState<GPSStatus>('requesting')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable')
      return
    }
    setStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('granted')
      },
      (err) => {
        setCoords(null)
        if (err.code === 1) setStatus('denied')
        else if (err.code === 2) setStatus('unavailable')
        else if (err.code === 3) setStatus('timeout')
        else setStatus('unavailable')
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    )
  }, [])

  // Auto-request GPS on mount
  useEffect(() => {
    requestLocation()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { status, coords, requestLocation }
}
