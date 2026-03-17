import type { StageResult } from './types'

export interface SavedSession {
  id: string
  date: string
  shooterName: string
  discipline: string
  disciplineName: string
  totalScore: number
  totalX: number
  maxScore: number
  stages: StageResult[]
}

export function getSessions(): SavedSession[] {
  try {
    const saved = localStorage.getItem('wa1500_sessions')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function saveSession(session: SavedSession): void {
  const sessions = getSessions()
  sessions.push(session)
  localStorage.setItem('wa1500_sessions', JSON.stringify(sessions))
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter(s => s.id !== id)
  localStorage.setItem('wa1500_sessions', JSON.stringify(sessions))
}