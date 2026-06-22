export type AuthErrorKey =
  | 'errorInvalidCredentials'
  | 'errorEmailInUse'
  | 'errorWeakPassword'
  | 'errorGeneric'

/**
 * Classifies a raw Supabase Auth error message into a translation key.
 *
 * Single source of truth for the `(A || B) && C` precedence-sensitive
 * weak-password check -- this logic was previously duplicated between
 * `AuthModal.tsx` (`mapError`) and `mapBusinessError.ts`, which had to be
 * fixed for the same precedence bug independently in each copy. Both
 * call sites now wrap this function instead of reimplementing it.
 */
export function mapAuthError(message: string): AuthErrorKey {
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
    return 'errorInvalidCredentials'
  }
  if (
    message.includes('User already registered') ||
    message.includes('already been registered') ||
    message.includes('already exists')
  ) {
    return 'errorEmailInUse'
  }
  if (
    (message.includes('Password should be at least') || message.includes('password')) &&
    message.includes('6')
  ) {
    return 'errorWeakPassword'
  }
  return 'errorGeneric'
}
