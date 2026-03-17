import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from './firebase'

// ==================== TYPES ====================

export type CompetitionStatus = 'draft' | 'registration' | 'active' | 'completed'

export interface FirebaseDiscipline {
  discipline: string
  name: string
  relays: FirebaseRelay[]
}

export interface FirebaseRelay {
  id: string
  name: string
  time: string
  maxShooters: number
}

export interface FirebaseCompetition {
  id?: string
  code: string
  name: string
  date: string
  location: string
  organizerId: string
  status: CompetitionStatus
  disciplines: FirebaseDiscipline[]
  createdAt?: Timestamp
}

export interface FirebaseRegistration {
  id?: string
  competitionId: string
  eventCode: string
  eventName: string
  shooterName: string
  club: string
  gender: string
  shooterClass: string
  team: string
  disciplines: {
    discipline: string
    disciplineName: string
    relayId: string
    relayName: string
    relayTime: string
    shooterClass?: string
  }[]
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt?: Timestamp
}

export interface FirebaseScorer {
  id?: string
  competitionId: string
  name: string
  accessCode: string
  firingPoints: number[]
  createdAt?: Timestamp
}

export interface FirebaseScore {
  id?: string
  registrationId: string
  disciplineId: string
  matchIndex: number
  stageIndex: number
  hits: {
    x: number; ten: number; nine: number
    eight: number; seven: number; zero: number; miss: number
  }
  penalties: { type: string; count: number }[]
  totalBeforePenalty: number
  totalAfterPenalty: number
  xCount: number
  scoredBy: string
  status: 'draft' | 'confirmed' | 'challenged' | 'resolved'
  challengeNote?: string
  resolvedBy?: string
  createdAt?: Timestamp
}

// ==================== COMPETITIONS ====================

export async function createCompetition(
  comp: Omit<FirebaseCompetition, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'competitions'), {
    ...comp,
    createdAt: Timestamp.now()
  })
  return ref.id
}

export async function getCompetitionByCode(code: string): Promise<FirebaseCompetition | null> {
  const q = query(collection(db, 'competitions'), where('code', '==', code))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const d = snapshot.docs[0]
  return { id: d.id, ...d.data() } as FirebaseCompetition
}

export async function getOrganizerCompetitions(organizerId: string): Promise<FirebaseCompetition[]> {
  const q = query(collection(db, 'competitions'), where('organizerId', '==', organizerId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirebaseCompetition))
}

export async function updateCompetitionStatus(
  competitionId: string,
  status: CompetitionStatus
): Promise<void> {
  await updateDoc(doc(db, 'competitions', competitionId), { status })
}

export async function deleteCompetition(competitionId: string): Promise<void> {
  const batch = writeBatch(db)
  // Delete main document
  batch.delete(doc(db, 'competitions', competitionId))
  await batch.commit()
}

// ==================== REGISTRATIONS (subcollection) ====================

export async function registerForCompetition(
  competitionId: string,
  reg: Omit<FirebaseRegistration, 'id' | 'createdAt' | 'competitionId'>
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'competitions', competitionId, 'registrations'),
    { ...reg, competitionId, createdAt: Timestamp.now() }
  )
  return ref.id
}

export async function getCompetitionRegistrations(
  competitionId: string
): Promise<FirebaseRegistration[]> {
  const snapshot = await getDocs(
    collection(db, 'competitions', competitionId, 'registrations')
  )
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirebaseRegistration))
}

export async function updateRegistration(
  competitionId: string,
  regId: string,
  data: Partial<FirebaseRegistration>
): Promise<void> {
  await updateDoc(doc(db, 'competitions', competitionId, 'registrations', regId), data)
}

export async function deleteRegistration(
  competitionId: string,
  regId: string
): Promise<void> {
  await deleteDoc(doc(db, 'competitions', competitionId, 'registrations', regId))
}

export function subscribeToRegistrations(
  competitionId: string,
  callback: (regs: FirebaseRegistration[]) => void
) {
  return onSnapshot(
    collection(db, 'competitions', competitionId, 'registrations'),
    snapshot => {
      const regs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirebaseRegistration))
      callback(regs)
    }
  )
}

export function subscribeToRegistration(
  competitionId: string,
  regId: string,
  callback: (reg: FirebaseRegistration | null) => void
) {
  return onSnapshot(
    doc(db, 'competitions', competitionId, 'registrations', regId),
    snapshot => {
      if (!snapshot.exists()) callback(null)
      else callback({ id: snapshot.id, ...snapshot.data() } as FirebaseRegistration)
    }
  )
}

// ==================== SCORERS (subcollection) ====================

export async function createScorer(
  competitionId: string,
  scorer: Omit<FirebaseScorer, 'id' | 'createdAt' | 'competitionId'>
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'competitions', competitionId, 'scorers'),
    { ...scorer, competitionId, createdAt: Timestamp.now() }
  )
  return ref.id
}

export async function getEventScorers(competitionId: string): Promise<FirebaseScorer[]> {
  const snapshot = await getDocs(
    collection(db, 'competitions', competitionId, 'scorers')
  )
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirebaseScorer))
}

export async function getScorerByCode(
  competitionId: string,
  accessCode: string
): Promise<FirebaseScorer | null> {
  const q = query(
    collection(db, 'competitions', competitionId, 'scorers'),
    where('accessCode', '==', accessCode)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const d = snapshot.docs[0]
  return { id: d.id, ...d.data() } as FirebaseScorer
}

export async function deleteScorer(
  competitionId: string,
  scorerId: string
): Promise<void> {
  await deleteDoc(doc(db, 'competitions', competitionId, 'scorers', scorerId))
}

// ==================== SCORES (subcollection) ====================

export async function saveScore(
  competitionId: string,
  score: Omit<FirebaseScore, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'competitions', competitionId, 'scores'),
    { ...score, createdAt: Timestamp.now() }
  )
  return ref.id
}

export async function getCompetitionScores(
  competitionId: string
): Promise<FirebaseScore[]> {
  const snapshot = await getDocs(
    collection(db, 'competitions', competitionId, 'scores')
  )
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirebaseScore))
}

export async function updateScore(
  competitionId: string,
  scoreId: string,
  data: Partial<FirebaseScore>
): Promise<void> {
  await updateDoc(doc(db, 'competitions', competitionId, 'scores', scoreId), data)
}

export function subscribeToScores(
  competitionId: string,
  callback: (scores: FirebaseScore[]) => void
) {
  return onSnapshot(
    collection(db, 'competitions', competitionId, 'scores'),
    snapshot => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirebaseScore)))
    }
  )
}