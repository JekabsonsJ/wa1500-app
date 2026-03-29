import type { Gender, Classification, WeaponCategory, StageScore } from './scoring'

export interface Shooter {
  id: string
  name: string
  number: string
  club: string
  team: string
  gender: Gender
  classification: Classification
  weaponCategory: WeaponCategory
}

export interface Relay {
  id: string
  name: string
  time: string
  shooterIds: string[]
}

export interface ShooterResult {
  shooterId: string
  relayId: string
  stages: StageScore[]
  totalScore: number
  totalX: number
  confirmed: boolean
  disputed: boolean
}

export type CompScreen = 'setup' | 'shooters' | 'relays' | 'relay_scoring' | 'confirm' | 'leaderboard'
export type LeaderboardTab = 'all' | 'men' | 'women' | 'high_master' | 'master' | 'expert' | 'sharpshooter' | 'marksman' | 'teams'