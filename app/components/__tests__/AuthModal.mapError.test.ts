import { describe, it, expect } from 'vitest'
import { mapError } from '@/app/components/AuthModal'
import { mapBusinessError } from '@/app/business/rekisteroidy/mapBusinessError'

describe('mapError', () => {
  it('resolves invalid credentials message to errorInvalidCredentials', () => {
    expect(mapError('Invalid login credentials')).toBe('errorInvalidCredentials')
  })

  it('resolves duplicate-registration message to errorEmailInUse', () => {
    expect(mapError('User already registered')).toBe('errorEmailInUse')
  })

  it('resolves a message containing "password" and "6" but not "Password should be at least" to errorWeakPassword (weak password precedence regression)', () => {
    expect(mapError('your password must be 6 characters')).toBe('errorWeakPassword')
  })

  it('does NOT resolve a message containing "password" without "6" to errorWeakPassword (precedence guard)', () => {
    expect(mapError('password reset failed')).toBe('errorGeneric')
  })

  it('resolves an unrecognized message to errorGeneric', () => {
    expect(mapError('some totally unrelated error')).toBe('errorGeneric')
  })

  it('resolves the real Supabase weak-password message', () => {
    expect(mapError('Password should be at least 6 characters')).toBe('errorWeakPassword')
  })
})

describe('mapBusinessError', () => {
  it('resolves duplicate-registration message to errorEmailInUse', () => {
    expect(mapBusinessError('User already registered')).toBe('errorEmailInUse')
  })

  it('resolves a message containing "password" and "6" but not "Password should be at least" to errorWeakPassword (weak password precedence regression)', () => {
    expect(mapBusinessError('your password must be 6 characters')).toBe('errorWeakPassword')
  })

  it('does NOT resolve a message containing "password" without "6" to errorWeakPassword (precedence guard)', () => {
    expect(mapBusinessError('password reset failed')).toBe('errorGeneric')
  })

  it('resolves the real Supabase weak-password message', () => {
    expect(mapBusinessError('Password should be at least 6 characters')).toBe('errorWeakPassword')
  })
})
