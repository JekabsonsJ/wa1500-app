/**
 * WA1500 Discipline Configurations
 * Based on WA1500 Rulebook Issue 2026-01-01, Section 7
 *
 * Each discipline defines its complete course of fire:
 * - Matches contain Stages
 * - Each Stage has distance, shot count, position, time limit, action type
 * - This config drives both the Training UI and Competition Scoring UI
 */

// ─── Types ───────────────────────────────────────────────────────────

export type ActionType = "DA" | "SA" | "SA/DA";

export type Position =
  | "standing_no_support"
  | "standing_no_support_one_hand"
  | "kneeling"
  | "kneeling_barricade"
  | "sitting"
  | "prone"
  | "left_barricade"
  | "right_barricade";

export interface StageConfig {
  /** Stage label, e.g. "Stage 1" or "S1" */
  label: string;
  /** Distance in meters (or yards — invitation specifies) */
  distance: number;
  /** Unit: "m" or "yd" */
  distanceUnit: "m" | "yd";
  /** Total shots in this stage */
  shots: number;
  /** How shots are grouped into strings, e.g. [6, 6] = two 6-shot strings */
  strings: number[];
  /** Positions used in order within this stage */
  positions: Position[];
  /** Time limit in seconds for entire stage */
  timeSeconds: number;
  /** Required trigger action */
  action: ActionType;
  /** Whether firearm starts holstered */
  startFromHolster: boolean;
  /** Hands allowed: "one" | "both" | "one_or_both" */
  hands: "one" | "both" | "one_or_both";
  /** Additional notes for scorer/shooter */
  notes?: string;
}

export interface MatchConfig {
  /** Match label, e.g. "Match 1" */
  label: string;
  /** Stages within this match */
  stages: StageConfig[];
  /** Whether a new target is required for this match */
  newTarget: boolean;
}

export interface DisciplineConfig {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short code for UI */
  shortName: string;
  /** Total shots in full course */
  totalShots: number;
  /** Maximum possible score */
  maxScore: number;
  /** Matches in firing order */
  matches: MatchConfig[];
  /** Rules reference */
  rulesReference: string;
  /** Description */
  description: string;
}

// ─── PPC 48 (Rule 7.9) ──────────────────────────────────────────────

export const PPC_48: DisciplineConfig = {
  id: "ppc48",
  name: "WA1500 – 48 Shot Course",
  shortName: "PPC 48",
  totalShots: 48,
  maxScore: 480,
  rulesReference: "Rule 7.9",
  description: "4 stages, distances 3–25m, includes one-hand and barricade shooting",
  matches: [
    {
      label: "Match 1",
      newTarget: true,
      stages: [
        {
          label: "Stage 1",
          distance: 3,
          distanceUnit: "m",
          shots: 6,
          strings: [6],
          positions: ["standing_no_support_one_hand"],
          timeSeconds: 8,
          action: "DA",
          startFromHolster: true,
          hands: "one",
          notes: "One hand only, 3 meters",
        },
        {
          label: "Stage 2",
          distance: 7,
          distanceUnit: "m",
          shots: 12,
          strings: [6, 6],
          positions: ["standing_no_support"],
          timeSeconds: 20,
          action: "DA",
          startFromHolster: true,
          hands: "one_or_both",
          notes: "One or both hands, includes reload",
        },
        {
          label: "Stage 3",
          distance: 15,
          distanceUnit: "m",
          shots: 12,
          strings: [6, 6],
          positions: ["standing_no_support"],
          timeSeconds: 20,
          action: "DA",
          startFromHolster: true,
          hands: "one_or_both",
          notes: "One or both hands, includes reload",
        },
        {
          label: "Stage 4",
          distance: 25,
          distanceUnit: "m",
          shots: 18,
          strings: [6, 6, 6],
          positions: ["kneeling_barricade", "left_barricade", "right_barricade"],
          timeSeconds: 90,
          action: "DA",
          startFromHolster: true,
          hands: "one_or_both",
          notes:
            "6 kneeling (using post, observe fault line), 6 left barricade, 6 right barricade. Includes reloads.",
        },
      ],
    },
  ],
};

// ─── PPC 60 (Rule 7.8) ──────────────────────────────────────────────

export const PPC_60: DisciplineConfig = {
  id: "ppc60",
  name: "WA1500 – 60 Shot Course",
  shortName: "PPC 60",
  totalShots: 60,
  maxScore: 600,
  rulesReference: "Rule 7.8",
  description: "4 stages, distances 7–50m, includes sitting, prone and barricade positions",
  matches: [
    {
      label: "Match 1",
      newTarget: true,
      stages: [
        {
          label: "Stage 1",
          distance: 7,
          distanceUnit: "m",
          shots: 12,
          strings: [6, 6],
          positions: ["standing_no_support"],
          timeSeconds: 20,
          action: "DA",
          startFromHolster: true,
          hands: "one_or_both",
        },
        {
          label: "Stage 2",
          distance: 25,
          distanceUnit: "m",
          shots: 18,
          strings: [6, 6, 6],
          positions: ["kneeling", "left_barricade", "right_barricade"],
          timeSeconds: 90,
          action: "DA",
          startFromHolster: true,
          hands: "one_or_both",
          notes: "6 kneeling, 6 left barricade, 6 right barricade. Includes reloads.",
        },
      ],
    },
    {
      label: "Match 2",
      newTarget: true,
      stages: [
        {
          label: "Stage 3",
          distance: 50,
          distanceUnit: "m",
          shots: 24,
          strings: [6, 6, 6, 6],
          positions: ["sitting", "prone", "left_barricade", "right_barricade"],
          timeSeconds: 165, // 2:45
          action: "SA/DA",
          startFromHolster: true,
          hands: "one_or_both",
          notes:
            "6 sitting, 6 prone, 6 left barricade, 6 right barricade. Single or double action. Includes reloads.",
        },
        {
          label: "Stage 4",
          distance: 25,
          distanceUnit: "m",
          shots: 6,
          strings: [6],
          positions: ["standing_no_support"],
          timeSeconds: 12,
          action: "DA",
          startFromHolster: true,
          hands: "one_or_both",
        },
      ],
    },
  ],
};

// ─── Pistol 1500 / 150 Shot Course (Rule 7.7) ───────────────────────

export const PISTOL_1500: DisciplineConfig = {
  id: "pistol1500",
  name: "WA1500 – 150 Shot Course",
  shortName: "Pistol 1500",
  totalShots: 150,
  maxScore: 1500,
  rulesReference: "Rule 7.7",
  description: "5 matches, 150 shots total, distances 7–50m, full course of fire",
  matches: [
    // ── Match 1 (Rule 7.2) ──
    {
      label: "Match 1",
      newTarget: true,
      stages: [
        {
          label: "Stage 1",
          distance: 7,
          distanceUnit: "m",
          shots: 12,
          strings: [6, 6],
          positions: ["standing_no_support"],
          timeSeconds: 20,
          action: "DA",
          startFromHolster: true,
          hands: "one_or_both",
        },
        {
          label: "Stage 2",
          distance: 15,
          distanceUnit: "m",
          shots: 12,
          strings: [6, 6],
          positions: ["standing_no_support"],
          timeSeconds: 20,
          action: "DA",
          startFromHolster: true,
          hands: "one_or_both",
        },
      ],
    },
    // ── Match 2 (Rule 7.3) ──
    {
      label: "Match 2",
      newTarget: true,
      stages: [
        {
          label: "Stage 1",
          distance: 25,
          distanceUnit: "m",
          shots: 18,
          strings: [6, 6, 6],
          positions: ["kneeling", "left_barricade", "right_barricade"],
          timeSeconds: 90,
          action: "DA",
          startFromHolster: true,
          hands: "one_or_both",
          notes: "6 kneeling, 6 left barricade, 6 right barricade. Includes reloads.",
        },
      ],
    },
    // ── Match 3 (Rule 7.4) ──
    {
      label: "Match 3",
      newTarget: true,
      stages: [
        {
          label: "Stage 1",
          distance: 50,
          distanceUnit: "m",
          shots: 24,
          strings: [6, 6, 6, 6],
          positions: ["sitting", "prone", "left_barricade", "right_barricade"],
          timeSeconds: 165,
          action: "SA/DA",
          startFromHolster: true,
          hands: "one_or_both",
          notes:
            "6 sitting, 6 prone, 6 left barricade, 6 right barricade. Single or double action.",
        },
      ],
    },
    // ── Match 4 (Rule 7.5) ──
    {
      label: "Match 4",
      newTarget: true,
      stages: [
        {
          label: "Stage 1",
          distance: 25,
          distanceUnit: "m",
          shots: 12,
          strings: [6, 6],
          positions: ["standing_no_support"],
          timeSeconds: 35,
          action: "DA",
          startFromHolster: true,
          hands: "one_or_both",
        },
        {
          label: "Stage 2",
          distance: 25,
          distanceUnit: "m",
          shots: 12,
          strings: [6, 6],
          positions: ["standing_no_support"],
          timeSeconds: 35,
          action: "DA",
          startFromHolster: true,
          hands: "one_or_both",
        },
      ],
    },
    // ── Match 5 (mixed) ──
    {
      label: "Match 5",
      newTarget: true, // new target for S1+S2, then another for S3+S4
      stages: [
        {
          label: "Stage 1",
          distance: 7,
          distanceUnit: "m",
          shots: 12,
          strings: [6, 6],
          positions: ["standing_no_support"],
          timeSeconds: 20,
          action: "DA",
          startFromHolster: true,
          hands: "one_or_both",
        },
        {
          label: "Stage 2",
          distance: 25,
          distanceUnit: "m",
          shots: 18,
          strings: [6, 6, 6],
          positions: ["kneeling", "left_barricade", "right_barricade"],
          timeSeconds: 90,
          action: "DA",
          startFromHolster: true,
          hands: "one_or_both",
          notes: "6 kneeling, 6 left barricade, 6 right barricade.",
        },
        {
          label: "Stage 3",
          distance: 50,
          distanceUnit: "m",
          shots: 24,
          strings: [6, 6, 6, 6],
          positions: ["sitting", "prone", "left_barricade", "right_barricade"],
          timeSeconds: 165,
          action: "SA/DA",
          startFromHolster: true,
          hands: "one_or_both",
          notes: "6 sitting, 6 prone, 6 left barricade, 6 right barricade.",
        },
        {
          label: "Stage 4",
          distance: 25,
          distanceUnit: "m",
          shots: 6,
          strings: [6],
          positions: ["standing_no_support"],
          timeSeconds: 12,
          action: "DA",
          startFromHolster: true,
          hands: "one_or_both",
        },
      ],
    },
  ],
};

// ─── All Disciplines ─────────────────────────────────────────────────

export const ALL_DISCIPLINES: DisciplineConfig[] = [PPC_48, PPC_60, PISTOL_1500];

export function getDisciplineById(id: string): DisciplineConfig | undefined {
  return ALL_DISCIPLINES.find((d) => d.id === id);
}

/**
 * Get total stages count for a discipline
 */
export function getTotalStages(discipline: DisciplineConfig): number {
  return discipline.matches.reduce((sum, m) => sum + m.stages.length, 0);
}

/**
 * Get flat list of all stages with match context
 */
export interface FlatStage extends StageConfig {
  matchLabel: string;
  matchIndex: number;
  stageIndex: number;
  globalIndex: number;
}

export function getFlatStages(discipline: DisciplineConfig): FlatStage[] {
  const result: FlatStage[] = [];
  let globalIndex = 0;
  discipline.matches.forEach((match, mi) => {
    match.stages.forEach((stage, si) => {
      result.push({
        ...stage,
        matchLabel: match.label,
        matchIndex: mi,
        stageIndex: si,
        globalIndex,
      });
      globalIndex++;
    });
  });
  return result;
}