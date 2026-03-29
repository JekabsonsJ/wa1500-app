import { trackChange } from './registrationService'
import type { ChangeType } from './types/registration'

/**
 * Track discipline change
 */
export async function trackDisciplineChange(
  competitionId: string,
  oldDisciplineName: string,
  newDisciplineName: string,
  affectedShooters: string[]
): Promise<void> {
  if (affectedShooters.length === 0) return
  
  await trackChange(
    competitionId,
    'discipline_changed',
    'discipline',
    oldDisciplineName,
    newDisciplineName,
    affectedShooters
  )
}

/**
 * Track relay time change
 */
export async function trackRelayTimeChange(
  competitionId: string,
  relayId: string,
  oldTime: string,
  newTime: string,
  affectedShooters: string[]
): Promise<void> {
  if (affectedShooters.length === 0 || oldTime === newTime) return
  
  await trackChange(
    competitionId,
    'relay_time_changed',
    'time',
    oldTime,
    newTime,
    affectedShooters,
    relayId
  )
}

/**
 * Track shooter moved to different relay
 */
export async function trackShooterRelayMove(
  competitionId: string,
  shooterId: string,
  oldRelayName: string,
  newRelayName: string
): Promise<void> {
  await trackChange(
    competitionId,
    'relay_moved',
    'relay',
    oldRelayName,
    newRelayName,
    [shooterId]
  )
}

/**
 * Track relay cancelled
 */
export async function trackRelayCancelled(
  competitionId: string,
  relayId: string,
  relayName: string,
  affectedShooters: string[]
): Promise<void> {
  if (affectedShooters.length === 0) return
  
  await trackChange(
    competitionId,
    'relay_cancelled',
    'relay',
    relayName,
    'Atcelts',
    affectedShooters,
    relayId
  )
}

/**
 * Track competition rescheduled
 */
export async function trackCompetitionRescheduled(
  competitionId: string,
  oldDate: string,
  newDate: string,
  affectedShooters: string[]
): Promise<void> {
  if (affectedShooters.length === 0 || oldDate === newDate) return
  
  await trackChange(
    competitionId,
    'competition_rescheduled',
    'date',
    oldDate,
    newDate,
    affectedShooters
  )
}
