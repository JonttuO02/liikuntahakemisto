export function deriveVenueStatus(
  claimStatus: string,
  hasDraft: boolean,
  submittedAt: string | null
): 'kesken' | 'approved' | 'rejected' | 'pending' {
  if (hasDraft) return 'kesken'
  if (claimStatus === 'pending' && !submittedAt) return 'kesken'
  if (claimStatus === 'approved') return 'approved'
  if (claimStatus === 'rejected') return 'rejected'
  return 'pending'
}
