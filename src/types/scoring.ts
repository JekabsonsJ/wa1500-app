/**
 * WA1500 Scoring Types & Interfaces
 * Based on WA1500 Rulebook Sections 14, 15, 16, 20
 */

// ─── Hit Values ──────────────────────────────────────────────────────

/** All possible hit values in descending order of priority */
export const HIT_VALUES = ["x", "ten", "nine", "eight", "seven", "zero", "miss"] as const;
export type HitValue = (typeof HIT_VALUES)[number];

/** Point value for each hit type */
export const HIT_POINTS: Record<HitValue, number> = {
  x: 10,
  ten: 10,
  nine: 9,
  eight: 8,
  seven: 7,
  zero: 0,
  miss: 0,
};

/** Display labels for hit values */
export const HIT_LABELS: Record<HitValue, string> = {
  x: "X",
  ten: "10",
  nine: "9",
  eight: "8",
  seven: "7",
  zero: "0",
  miss: "M",
};

/** Hit counts for a single stage */
export interface HitCounts {
  x: number;
  ten: number;
  nine: number;
  eight: number;
  seven: number;
  zero: number;
  miss: number;
}

export const EMPTY_HITS: HitCounts = {
  x: 0,
  ten: 0,
  nine: 0,
  eight: 0,
  seven: 0,
  zero: 0,
  miss: 0,
};

// ─── Penalties ───────────────────────────────────────────────────────

/** Penalty types per Rules 15.1–15.3 */
export type PenaltyType =
  | "late_shot"
  | "early_shot"
  | "wrong_position"
  | "fault_line"
  | "other";

export const PENALTY_LABELS: Record<PenaltyType, string> = {
  late_shot: "Late Shot",
  early_shot: "Early Shot",
  wrong_position: "Wrong Position",
  fault_line: "Fault Line",
  other: "Other",
};

export interface Penalty {
  type: PenaltyType;
  count: number;
  note?: string;
}

// ─── Score ───────────────────────────────────────────────────────────

export type ScoreStatus = "draft" | "confirmed" | "challenged" | "resolved";

/** Score for a single stage */
export interface StageScore {
  matchIndex: number;
  stageIndex: number;
  hits: HitCounts;
  penalties: Penalty[];
  totalBeforePenalty: number;
  totalAfterPenalty: number;
  xCount: number;
  shotsFired: number;
  status: ScoreStatus;
  challengeNote?: string;
  resolvedBy?: string;
  resolvedHits?: HitCounts;
}

/** Aggregate score for a full discipline */
export interface AggregateScore {
  disciplineId: string;
  stages: StageScore[];
  totalScore: number;
  totalX: number;
  totalMisses: number;
  /** Hit distribution for tie-breaking */
  totalHits: HitCounts;
  /** Display format: "1480-96X" */
  displayScore: string;
}

// ─── Classification ──────────────────────────────────────────────────

/** WA1500 Classification classes (Rule 20.12) */
export type Classification =
  | "high_master"
  | "master"
  | "expert"
  | "sharpshooter"
  | "marksman"
  | "unclassified";

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  high_master: "High Master",
  master: "Master",
  expert: "Expert",
  sharpshooter: "Sharpshooter",
  marksman: "Marksman",
  unclassified: "Unclassified",
};

/** Classification thresholds based on 150-shot aggregate (Rule 20.12) */
export const CLASSIFICATION_THRESHOLDS: { class: Classification; minScore: number }[] = [
  { class: "high_master", minScore: 1476 },
  { class: "master", minScore: 1440 },
  { class: "expert", minScore: 1379 },
  { class: "sharpshooter", minScore: 1290 },
  { class: "marksman", minScore: 0 },
];

// ─── Weapon Categories ───────────────────────────────────────────────

/** Weapon categories per Rules 3.1–3.13 */
export type WeaponCategory =
  | "revolver_1500"
  | "pistol_1500"
  | "revolver_optical"
  | "pistol_optical"
  | "open_match"
  | "distinguished_revolver"
  | "distinguished_pistol"
  | "standard_revolver_425"
  | "standard_revolver_275"
  | "standard_revolver_275_5shot"
  | "standard_semi_auto_55_production"
  | "standard_semi_auto_55"
  | "standard_semi_auto_37";

export const WEAPON_CATEGORY_LABELS: Record<WeaponCategory, string> = {
  revolver_1500: "Revolver 1500",
  pistol_1500: "Pistol 1500",
  revolver_optical: "Revolver Optical Sight 1500",
  pistol_optical: "Pistol Optical Sight 1500",
  open_match: "Open Match",
  distinguished_revolver: "Distinguished Revolver",
  distinguished_pistol: "Distinguished Pistol",
  standard_revolver_425: 'Standard Revolver 4.25"',
  standard_revolver_275: 'Standard Revolver 2.75"',
  standard_revolver_275_5shot: 'Standard Revolver 2.75" 5-Shot',
  standard_semi_auto_55_production: 'Standard Semi-Auto 5.5" Production',
  standard_semi_auto_55: 'Standard Semi-Auto 5.5"',
  standard_semi_auto_37: 'Standard Semi-Auto 3.7"',
};

// ─── Competition Types ───────────────────────────────────────────────

export type Gender = "male" | "female";

export const GENDER_LABELS: Record<Gender, string> = {
  male: "Vīrietis",
  female: "Sieviete",
};

export type RegistrationStatus = "pending" | "approved" | "cancelled";

export interface Registration {
  id: string;
  shooterName: string;
  club: string;
  team: string;
  gender: Gender;
  classification: Classification;
  weaponCategory: WeaponCategory;
  disciplineId: string;
  relayId: string;
  status: RegistrationStatus;
  timestamp: number;
}

export interface Relay {
  id: string;
  name: string;
  time: string;
  maxShooters: number;
}

export interface CompetitionDiscipline {
  id: string;
  disciplineConfigId: string; // references DisciplineConfig.id
  relays: Relay[];
}

export type CompetitionStatus = "draft" | "registration" | "active" | "completed";

export interface Competition {
  id: string;
  name: string;
  date: string;
  location: string;
  code: string;
  status: CompetitionStatus;
  createdBy: string;
  disciplines: CompetitionDiscipline[];
}

// ─── Training ────────────────────────────────────────────────────────

export interface TrainingSession {
  id: string;
  disciplineId: string;
  shooterName: string;
  date: string;
  stages: StageScore[];
  totalScore: number;
  totalX: number;
  displayScore: string;
  timestamp: number;
}