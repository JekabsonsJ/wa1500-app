/**
 * WA1500 Scoring Utility Functions
 * Implements scoring logic per Rulebook Sections 14, 15, 16
 */

import type {
  HitCounts,
  HitValue,
  Penalty,
  StageScore,
  AggregateScore,
  Classification,
} from "../types/scoring";
import {
  HIT_VALUES,
  HIT_POINTS,
  EMPTY_HITS,
  CLASSIFICATION_THRESHOLDS,
} from "../types/scoring";

// ─── Basic Calculations ──────────────────────────────────────────────

/** Count total shots from hit counts */
export function countShots(hits: HitCounts): number {
  return HIT_VALUES.reduce((sum, key) => sum + hits[key], 0);
}

/** Calculate raw score (before penalties) */
export function calculateRawScore(hits: HitCounts): number {
  return HIT_VALUES.reduce((sum, key) => sum + hits[key] * HIT_POINTS[key], 0);
}

/** Count X hits */
export function countX(hits: HitCounts): number {
  return hits.x;
}

/** Count total misses (zero + miss) */
export function countMisses(hits: HitCounts): number {
  return hits.zero + hits.miss;
}

// ─── Penalty Application (Rules 15.1–15.3) ──────────────────────────

/**
 * Priority order for removing hits as penalty.
 * Highest value first: X → 10 → 9 → 8 → 7 → 0
 * (miss is not removed since it's already 0)
 */
const PENALTY_REMOVAL_ORDER: HitValue[] = [
  "x",
  "ten",
  "nine",
  "eight",
  "seven",
  "zero",
];

/**
 * Apply penalties to hit counts.
 *
 * Per Rules 15.1–15.3:
 * "shots of highest value equal to the number fired in error are scored as misses"
 *
 * This means: for each penalty, remove the highest-value hit and add a miss.
 *
 * @param hits - Original hit counts
 * @param penalties - Array of penalties to apply
 * @returns New hit counts after penalties
 */
export function applyPenalties(hits: HitCounts, penalties: Penalty[]): HitCounts {
  const totalPenalties = penalties.reduce((sum, p) => sum + p.count, 0);
  if (totalPenalties === 0) return { ...hits };

  // Work with a mutable copy
  const result: HitCounts = { ...hits };
  let remaining = totalPenalties;

  for (const hitType of PENALTY_REMOVAL_ORDER) {
    if (remaining <= 0) break;

    const available = result[hitType];
    const toRemove = Math.min(available, remaining);

    if (toRemove > 0) {
      result[hitType] -= toRemove;
      result.miss += toRemove;
      remaining -= toRemove;
    }
  }

  return result;
}

// ─── Stage Score Calculation ─────────────────────────────────────────

/**
 * Calculate complete stage score with penalties
 */
export function calculateStageScore(
  hits: HitCounts,
  penalties: Penalty[],
  matchIndex: number,
  stageIndex: number
): StageScore {
  const totalBeforePenalty = calculateRawScore(hits);
  const hitsAfterPenalty = applyPenalties(hits, penalties);
  const totalAfterPenalty = calculateRawScore(hitsAfterPenalty);

  return {
    matchIndex,
    stageIndex,
    hits, // Original hits (before penalty)
    penalties,
    totalBeforePenalty,
    totalAfterPenalty,
    xCount: hitsAfterPenalty.x, // X count after penalties
    shotsFired: countShots(hits),
    status: "draft",
  };
}

// ─── Aggregate Score ─────────────────────────────────────────────────

/**
 * Calculate aggregate score from all stages
 */
export function calculateAggregate(
  disciplineId: string,
  stages: StageScore[]
): AggregateScore {
  const totalHits: HitCounts = { ...EMPTY_HITS };
  let totalScore = 0;
  let totalX = 0;
  let totalMisses = 0;

  for (const stage of stages) {
    const hitsAfterPenalty = applyPenalties(stage.hits, stage.penalties);

    for (const key of HIT_VALUES) {
      totalHits[key] += hitsAfterPenalty[key];
    }

    totalScore += stage.totalAfterPenalty;
    totalX += stage.xCount;
    totalMisses += countMisses(hitsAfterPenalty);
  }

  return {
    disciplineId,
    stages,
    totalScore,
    totalX,
    totalMisses,
    totalHits,
    displayScore: formatScore(totalScore, totalX),
  };
}

// ─── Score Formatting ────────────────────────────────────────────────

/** Format score as "1480-96X" */
export function formatScore(total: number, xCount: number): string {
  return `${total}-${xCount}X`;
}

// ─── Tie-Breaking (Rule 16.4) ────────────────────────────────────────

/**
 * Compare two aggregate scores for ranking.
 * Returns negative if A ranks higher, positive if B ranks higher, 0 if tied.
 *
 * Tie-break order per Rule 16.4:
 * 1. Highest total score
 * 2. Greatest number of X's
 * 3. Fewest misses
 * 4. Fewest shots of lowest value (7)
 * 5. Fewest shots of next lowest value (8)
 * 6. Continue upward (9, 10)
 * 7. Last fired stage score (not implemented here — requires stage-level data)
 */
export function compareTieBreak(a: AggregateScore, b: AggregateScore): number {
  // 1. Highest total (descending)
  if (a.totalScore !== b.totalScore) {
    return b.totalScore - a.totalScore;
  }

  // 2. Most X's (descending)
  if (a.totalX !== b.totalX) {
    return b.totalX - a.totalX;
  }

  // 3. Fewest misses (ascending)
  if (a.totalMisses !== b.totalMisses) {
    return a.totalMisses - b.totalMisses;
  }

  // 4. Fewest 7's (ascending)
  if (a.totalHits.seven !== b.totalHits.seven) {
    return a.totalHits.seven - b.totalHits.seven;
  }

  // 5. Fewest 8's (ascending)
  if (a.totalHits.eight !== b.totalHits.eight) {
    return a.totalHits.eight - b.totalHits.eight;
  }

  // 6. Fewest 9's (ascending)
  if (a.totalHits.nine !== b.totalHits.nine) {
    return a.totalHits.nine - b.totalHits.nine;
  }

  // 7. Fewest 10's (ascending) — very rare to reach this
  if (a.totalHits.ten !== b.totalHits.ten) {
    return a.totalHits.ten - b.totalHits.ten;
  }

  // 8. Last fired stage comparison
  if (a.stages.length > 0 && b.stages.length > 0) {
    const lastA = a.stages[a.stages.length - 1];
    const lastB = b.stages[b.stages.length - 1];

    if (lastA.totalAfterPenalty !== lastB.totalAfterPenalty) {
      return lastB.totalAfterPenalty - lastA.totalAfterPenalty;
    }
    if (lastA.xCount !== lastB.xCount) {
      return lastB.xCount - lastA.xCount;
    }
  }

  // Still tied — would need shoot-off per Rule 16.4(g)
  return 0;
}

/**
 * Sort an array of aggregate scores by rank (highest first)
 */
export function rankScores(scores: AggregateScore[]): AggregateScore[] {
  return [...scores].sort(compareTieBreak);
}

// ─── Classification (Rule 20.12) ────────────────────────────────────

/**
 * Determine classification based on 150-shot aggregate score.
 * Only applicable for Pistol 1500 (150 shots).
 */
export function getClassification(score150: number): Classification {
  for (const threshold of CLASSIFICATION_THRESHOLDS) {
    if (score150 >= threshold.minScore) {
      return threshold.class;
    }
  }
  return "marksman";
}

// ─── Validation ──────────────────────────────────────────────────────

/**
 * Validate that hit counts match expected shot count for a stage
 */
export function validateShotCount(
  hits: HitCounts,
  expectedShots: number
): { valid: boolean; actual: number; expected: number } {
  const actual = countShots(hits);
  return {
    valid: actual === expectedShots,
    actual,
    expected: expectedShots,
  };
}

/**
 * Merge two HitCounts (for aggregating across stages)
 */
export function mergeHits(a: HitCounts, b: HitCounts): HitCounts {
  return {
    x: a.x + b.x,
    ten: a.ten + b.ten,
    nine: a.nine + b.nine,
    eight: a.eight + b.eight,
    seven: a.seven + b.seven,
    zero: a.zero + b.zero,
    miss: a.miss + b.miss,
  };
}