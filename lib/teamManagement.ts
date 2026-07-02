/**
 * Shared row types + pure mapper for the TeamManagementPopup approve flow
 * (Phase 64-05 gap closure). Single source of truth for the "pending
 * request" and "team member" row shapes so the client-side optimistic
 * update in handleApprove stays structurally in sync with the
 * /api/business/access-request/list response shape.
 */

export type PendingRequestRow = {
  id: number
  requesterId: string
  name: string
  email: string | null
}

export type TeamMemberRow = {
  userId: string
  name: string
  email: string | null
  role: string | null
  isSelf: boolean
}

/**
 * Converts an approved pending request row into a team-member row.
 * Pure — no imports, no side effects. A pending requester is never the
 * approving owner, so isSelf is always false; role is hardcoded to the
 * literal 'member' since approve only ever grants member-level access.
 */
export function pendingRowToTeamMember(row: PendingRequestRow): TeamMemberRow {
  return {
    userId: row.requesterId,
    name: row.name,
    email: row.email,
    role: 'member',
    isSelf: false,
  }
}
