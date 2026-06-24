export function deriveVenueStatus(
  claimStatus: string,
  hasDraft: boolean
): 'kesken' | 'approved' | 'rejected' | 'pending' {
  if (hasDraft) return 'kesken'
  if (claimStatus === 'approved') return 'approved'
  if (claimStatus === 'rejected') return 'rejected'
  return 'pending'
}
