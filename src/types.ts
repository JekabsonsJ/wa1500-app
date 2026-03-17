export type Discipline = 'PPC48' | 'PPC60' | 'Pistol1500'

export interface Stage {
  stageNumber: number
  distance: number
  shots: number
  timeSeconds: number
  description: string
}

export interface Course {
  discipline: Discipline
  name: string
  totalShots: number
  maxScore: number
  stages: Stage[]
}

export interface ScoreEntry {
  x: number
  ten: number
  nine: number
  eight: number
  seven: number
  zero: number
  miss: number
  penalty: number
}

export interface StageResult {
  stageNumber: number
  score: ScoreEntry
  matchScore: number
}

export interface Session {
  id: string
  date: string
  shooterName: string
  discipline: Discipline
  stages: StageResult[]
  totalScore: number
  totalX: number
}

export const PPC48_COURSE: Course = {
  discipline: 'PPC48',
  name: 'PPC 48',
  totalShots: 48,
  maxScore: 480,
  stages: [
    {
      stageNumber: 1,
      distance: 3,
      shots: 6,
      timeSeconds: 8,
      description: 'Stāvus, viena roka'
    },
    {
      stageNumber: 2,
      distance: 7,
      shots: 12,
      timeSeconds: 20,
      description: 'Stāvus (6+6), aptveres maiņa'
    },
    {
      stageNumber: 3,
      distance: 15,
      shots: 12,
      timeSeconds: 20,
      description: 'Stāvus (6+6), aptveres maiņa'
    },
    {
      stageNumber: 4,
      distance: 25,
      shots: 18,
      timeSeconds: 90,
      description: 'Ceļgals + aizsegi (6+6+6)'
    }
  ]
}

export const PPC60_COURSE: Course = {
  discipline: 'PPC60',
  name: 'PPC 60',
  totalShots: 60,
  maxScore: 600,
  stages: [
    {
      stageNumber: 1,
      distance: 7,
      shots: 12,
      timeSeconds: 20,
      description: 'Stāvus (6+6), aptveres maiņa'
    },
    {
      stageNumber: 2,
      distance: 25,
      shots: 18,
      timeSeconds: 90,
      description: 'Ceļgals + aizsegi (6+6+6)'
    },
    {
      stageNumber: 3,
      distance: 50,
      shots: 24,
      timeSeconds: 165,
      description: 'Sēdus + guļus + aizsegi (6+6+6+6)'
    },
    {
      stageNumber: 4,
      distance: 25,
      shots: 6,
      timeSeconds: 12,
      description: 'Stāvus, bez atbalsta'
    }
  ]
}

export const PISTOL1500_COURSE: Course = {
  discipline: 'Pistol1500',
  name: 'Pistol 1500',
  totalShots: 150,
  maxScore: 1500,
  stages: [
    {
      stageNumber: 1,
      distance: 7,
      shots: 12,
      timeSeconds: 20,
      description: 'Match 1 — Stāvus (6+6)'
    },
    {
      stageNumber: 2,
      distance: 15,
      shots: 12,
      timeSeconds: 20,
      description: 'Match 1 — Stāvus (6+6)'
    },
    {
      stageNumber: 3,
      distance: 25,
      shots: 18,
      timeSeconds: 90,
      description: 'Match 2 — Ceļgals + aizsegi (6+6+6)'
    },
    {
      stageNumber: 4,
      distance: 50,
      shots: 24,
      timeSeconds: 165,
      description: 'Match 3 — Sēdus + guļus + aizsegi (6+6+6+6)'
    },
    {
      stageNumber: 5,
      distance: 25,
      shots: 24,
      timeSeconds: 35,
      description: 'Match 4 — Stāvus (12+12)'
    },
    {
      stageNumber: 6,
      distance: 7,
      shots: 12,
      timeSeconds: 20,
      description: 'Match 5 — Stāvus (6+6)'
    },
    {
      stageNumber: 7,
      distance: 25,
      shots: 18,
      timeSeconds: 90,
      description: 'Match 5 — Ceļgals + aizsegi (6+6+6)'
    },
    {
      stageNumber: 8,
      distance: 50,
      shots: 24,
      timeSeconds: 165,
      description: 'Match 5 — Sēdus + guļus + aizsegi (6+6+6+6)'
    },
    {
      stageNumber: 9,
      distance: 25,
      shots: 6,
      timeSeconds: 12,
      description: 'Match 5 — Stāvus, bez atbalsta'
    }
  ]
}

import { ALL_DISCIPLINES } from './config/disciplines'
export const ALL_COURSES: Course[] = ALL_DISCIPLINES.map(disciplineConfigToCourse)

export function calcMatchScore(s: ScoreEntry): number {
  const raw = s.x * 10 + s.ten * 10 + s.nine * 9 + s.eight * 8 + s.seven * 7
  return Math.max(0, raw - s.penalty * 10)
}

export function calcTotalShots(s: ScoreEntry): number {
  return s.x + s.ten + s.nine + s.eight + s.seven + s.zero + s.miss
}

export function calcTotalX(s: ScoreEntry): number {
  return Math.max(0, s.x - s.penalty)
}

export function emptyScore(): ScoreEntry {
  return { x: 0, ten: 0, nine: 0, eight: 0, seven: 0, zero: 0, miss: 0, penalty: 0 }
}
import type { DisciplineConfig } from './config/disciplines'

export function disciplineConfigToCourse(d: DisciplineConfig): Course {
  const stages: Course['stages'][0][] = []
  let stageNumber = 1
  d.matches.forEach(match => {
    match.stages.forEach(stage => {
      stages.push({
        stageNumber,
        distance: stage.distance,
        shots: stage.shots,
        timeSeconds: stage.timeSeconds,
        description: `${match.label} · ${stage.label} · ${stage.notes || stage.positions.join(', ')}`
      })
      stageNumber++
    })
  })
  return {
    discipline: d.id as any,
    name: d.shortName,
    totalShots: d.totalShots,
    maxScore: d.maxScore,
    stages
  }
}