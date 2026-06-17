/**
 * useDebouncedPreviewField.ts — debounce helper for free-text wizard fields.
 *
 * Mirrors the set-in-effect / clear-in-cleanup shape used by StepMediat's
 * stagedPreviewUrls effect (app/business/onboarding/StepMediat.tsx lines 58-65).
 * Used by free-text/numeric step fields (pricing rows, opening-hours times,
 * contact fields) to delay live-preview updates ~250-300ms after the user
 * stops typing (D-04), avoiding a CalloutCard/DiagonaalKortti re-render on
 * every keystroke.
 *
 * No 'use client' directive — this is a pure hook module; it must only be
 * imported by client components.
 */

import { useState, useEffect } from 'react'

/**
 * useDebouncedValue — returns a debounced copy of `value` that updates
 * `delayMs` after the last change. Re-fires (resets the timer) whenever
 * `value` or `delayMs` changes; cleans up the pending timer on unmount or
 * before the next effect run.
 *
 * @param value - the live (un-debounced) value to track
 * @param delayMs - debounce delay in milliseconds (default 280, within D-04's 250-300ms window)
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 280): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value)
    }, delayMs)

    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
