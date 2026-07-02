import { describe, it, expect } from 'vitest'
import { pendingRowToTeamMember } from './teamManagement'

describe('pendingRowToTeamMember', () => {
  it('kartoittaa requesterId → userId, role: member, isSelf: false', () => {
    const result = pendingRowToTeamMember({ id: 5, requesterId: 'u-123', name: 'Aino', email: 'a@x.fi' })
    expect(result).toEqual({ userId: 'u-123', name: 'Aino', email: 'a@x.fi', role: 'member', isSelf: false })
  })

  it('läpäisee email: null muuttumattomana', () => {
    const result = pendingRowToTeamMember({ id: 7, requesterId: 'u-456', name: 'Pekka', email: null })
    expect(result.email).toBeNull()
  })
})
