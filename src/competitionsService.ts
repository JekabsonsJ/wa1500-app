import { db } from './firebase'
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  updateDoc
} from 'firebase/firestore'

export interface Competition {
  id: string
  name: string
  date: string
  location: string
  disciplineId: string
  disciplineName: string
  organizerId: string
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
  createdAt: string
  updatedAt: string
}

/**
 * Save competition to Firebase
 */
export async function saveCompetition(
  id: string,
  name: string,
  date: string,
  location: string,
  disciplineId: string,
  disciplineName: string,
  organizerId: string
): Promise<void> {
  const competition: Competition = {
    id,
    name,
    date,
    location,
    disciplineId,
    disciplineName,
    organizerId,
    status: 'upcoming',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await setDoc(doc(db, 'competitions', id), competition)
}

/**
 * Update competition status
 */
export async function updateCompetitionStatus(
  id: string,
  status: Competition['status']
): Promise<void> {
  await updateDoc(doc(db, 'competitions', id), {
    status,
    updatedAt: new Date().toISOString()
  })
}

/**
 * Get competition by ID
 */
export async function getCompetition(id: string): Promise<Competition | null> {
  const docSnap = await getDoc(doc(db, 'competitions', id))
  
  if (!docSnap.exists()) return null
  
  return docSnap.data() as Competition
}

/**
 * Get upcoming competitions (for shooters to see)
 */
export async function getUpcomingCompetitions(): Promise<Competition[]> {
  const q = query(
    collection(db, 'competitions'),
    where('status', 'in', ['upcoming', 'active']),
    orderBy('date', 'asc'),
    limit(10)
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data() as Competition)
}

/**
 * Get shooter's registered competitions
 */
export async function getShooterCompetitions(shooterId: string): Promise<Competition[]> {
  // Get all shooter's registrations
  const registrationsQuery = query(
    collection(db, 'registrations'),
    where('shooterId', '==', shooterId)
  )
  
  const registrationsSnap = await getDocs(registrationsQuery)
  const competitionIds = registrationsSnap.docs.map(doc => doc.data().competitionId)
  
  if (competitionIds.length === 0) return []
  
  // Get competitions for those IDs
  const competitions: Competition[] = []
  for (const compId of competitionIds) {
    const comp = await getCompetition(compId)
    if (comp) competitions.push(comp)
  }
  
  return competitions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
