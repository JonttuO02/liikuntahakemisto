import { mapAuthError } from '@/lib/authErrors'

export function mapBusinessError(
  message: string
): 'errorEmailInUse' | 'errorWeakPassword' | 'errorGeneric' {
  const result = mapAuthError(message)
  // Business registration has no sign-in flow, so it never needs to
  // distinguish "invalid credentials" -- fold it into the generic bucket.
  return result === 'errorInvalidCredentials' ? 'errorGeneric' : result
}
