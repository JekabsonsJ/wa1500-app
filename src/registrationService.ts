import { db } from './firebase'
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import type { ShooterRegistration, CompetitionChange, ChangeType } from './types/registration'

// ════════════════════════════════════════════════════════════════════════════
// REGISTRATION OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create or update shooter registration
 */
export async function registerShooter(
  shooterId: string,
  competitionId: string,
  competitionName: string,
  disciplineId: string,
  disciplineName: string,
  relayId: string,
  relayName: string,
  relayTime: string
): Promise<void> {
  const registrationId = `${competitionId}_${shooterId}`
  
  const registration: Omit<ShooterRegistration, 'id'> = {
    shooterId,
    competitionId,
    competitionName,
    disciplineId,
    disciplineName,
    relayId,
    relayName,
    relayTime,
    status: 'confirmed',
    registeredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hasUnacknowledgedChanges: false
  }

  console.log('ATTEMPTING TO WRITE TO FIREBASE:')
  console.log('Collection: registrations')
  console.log('Document ID:', registrationId)
  console.log('Data:', registration)

  try {
    await setDoc(doc(db, 'registrations', registrationId), registration)
    console.log('setDoc SUCCESS!')
  } catch (error) {
    console.error('setDoc FAILED:', error)
    throw error
  }
}

/**
 * Get shooter's registration for a competition
 */
export async function getShooterRegistration(
  shooterId: string,
  competitionId: string
): Promise<ShooterRegistration | null> {
  const registrationId = `${competitionId}_${shooterId}`
  const docSnap = await getDoc(doc(db, 'registrations', registrationId))
  
  if (!docSnap.exists()) return null
  
  return {
    id: docSnap.id,
    ...docSnap.data()
  } as ShooterRegistration
}

/**
 * Get all registrations for a shooter
 */
export async function getShooterRegistrations(shooterId: string): Promise<ShooterRegistration[]> {
  const q = query(
    collection(db, 'registrations'),
    where('shooterId', '==', shooterId)
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as ShooterRegistration))
}

/**
 * Listen to registration changes in real-time
 */
export function subscribeToRegistration(
  shooterId: string,
  competitionId: string,
  callback: (registration: ShooterRegistration | null) => void
): () => void {
  const registrationId = `${competitionId}_${shooterId}`
  
  return onSnapshot(doc(db, 'registrations', registrationId), (docSnap) => {
    if (!docSnap.exists()) {
      callback(null)
      return
    }
    
    callback({
      id: docSnap.id,
      ...docSnap.data()
    } as ShooterRegistration)
  })
}

// ════════════════════════════════════════════════════════════════════════════
// CHANGE TRACKING OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Track a change when organizer modifies competition
 */
export async function trackChange(
  competitionId: string,
  type: ChangeType,
  field: string,
  oldValue: string,
  newValue: string,
  affectedShooters: string[],
  relayId?: string
): Promise<void> {
  const changeId = `${competitionId}_${Date.now()}`
  
  const change: Omit<CompetitionChange, 'id'> = {
    competitionId,
    type,
    field,
    oldValue,
    newValue,
    relayId,
    affectedShooters,
    timestamp: new Date().toISOString(),
    acknowledgedBy: []
  }

  await setDoc(doc(db, 'changes', changeId), change)

  // Mark affected registrations as having unacknowledged changes
  for (const shooterId of affectedShooters) {
    const registrationId = `${competitionId}_${shooterId}`
    await updateDoc(doc(db, 'registrations', registrationId), {
      hasUnacknowledgedChanges: true,
      updatedAt: new Date().toISOString()
    })
  }
}

/**
 * Get unacknowledged changes for a shooter
 */
export async function getUnacknowledgedChanges(
  shooterId: string,
  competitionId: string
): Promise<CompetitionChange[]> {
  const q = query(
    collection(db, 'changes'),
    where('competitionId', '==', competitionId),
    where('affectedShooters', 'array-contains', shooterId)
  )
  
  const snapshot = await getDocs(q)
  const changes = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as CompetitionChange))
  
  // Filter out already acknowledged changes
  return changes.filter(change => !change.acknowledgedBy.includes(shooterId))
}

/**
 * Listen to changes in real-time
 */
export function subscribeToChanges(
  shooterId: string,
  competitionId: string,
  callback: (changes: CompetitionChange[]) => void
): () => void {
  const q = query(
    collection(db, 'changes'),
    where('competitionId', '==', competitionId),
    where('affectedShooters', 'array-contains', shooterId)
  )
  
  return onSnapshot(q, (snapshot) => {
    const changes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CompetitionChange))
    
    // Filter unacknowledged
    const unacknowledged = changes.filter(change => !change.acknowledgedBy.includes(shooterId))
    callback(unacknowledged)
  })
}

/**
 * Acknowledge changes (shooter has seen them)
 */
export async function acknowledgeChanges(
  shooterId: string,
  competitionId: string,
  changeIds: string[]
): Promise<void> {
  // Add shooter to acknowledgedBy array for each change
  for (const changeId of changeIds) {
    await updateDoc(doc(db, 'changes', changeId), {
      acknowledgedBy: arrayUnion(shooterId)
    })
  }

  // Mark registration as acknowledged
  const registrationId = `${competitionId}_${shooterId}`
  await updateDoc(doc(db, 'registrations', registrationId), {
    hasUnacknowledgedChanges: false
  })
}
