// Registration types
export interface ShooterRegistration {
  id: string
  shooterId: string
  competitionId: string
  competitionName: string
  disciplineId: string
  disciplineName: string
  relayId: string
  relayName: string
  relayTime: string
  status: RegistrationStatus
  registeredAt: string
  updatedAt: string
  hasUnacknowledgedChanges: boolean
}

export type RegistrationStatus = 'pending' | 'confirmed' | 'checked_in' | 'cancelled'

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: 'Gaida apstiprinājumu',
  confirmed: 'Apstiprināts',
  checked_in: 'Ieradies',
  cancelled: 'Atcelts'
}

// Change tracking types
export type ChangeType = 
  | 'discipline_changed'
  | 'relay_moved'
  | 'relay_time_changed'
  | 'relay_cancelled'
  | 'competition_rescheduled'
  | 'competition_cancelled'

export interface CompetitionChange {
  id: string
  competitionId: string
  type: ChangeType
  field: string
  oldValue: string
  newValue: string
  relayId?: string
  affectedShooters: string[]
  timestamp: string
  acknowledgedBy: string[]
}

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  discipline_changed: 'Disciplīna mainīta',
  relay_moved: 'Pārcelts uz citu maiņu',
  relay_time_changed: 'Maiņas laiks mainīts',
  relay_cancelled: 'Maiņa atcelta',
  competition_rescheduled: 'Sacensības pārceltas',
  competition_cancelled: 'Sacensības atceltas'
}

export const CHANGE_TYPE_ICONS: Record<ChangeType, string> = {
  discipline_changed: '📋',
  relay_moved: '↔️',
  relay_time_changed: '🕐',
  relay_cancelled: '❌',
  competition_rescheduled: '📅',
  competition_cancelled: '⛔'
}

// Helper to format change message
export function formatChangeMessage(change: CompetitionChange): { label: string; before: string; after: string } {
  const icon = CHANGE_TYPE_ICONS[change.type]
  const label = CHANGE_TYPE_LABELS[change.type]
  
  return {
    label: `${icon} ${label}`,
    before: change.oldValue,
    after: change.newValue
  }
}
