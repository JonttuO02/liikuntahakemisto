export function mapBusinessError(
  message: string
): 'errorEmailInUse' | 'errorWeakPassword' | 'errorGeneric' {
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
