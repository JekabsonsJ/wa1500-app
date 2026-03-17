/**
 * Tests for WA1500 Scoring Logic
 * Run with: npx vitest run src/utils/__tests__/scoring.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  calculateRawScore,
  countShots,
  countX,
  countMisses,
  applyPenalties,
  calculateStageScore,
  calculateAggregate,
  compareTieBreak,
  rankScores,
  getClassification,
  validateShotCount,
  formatScore,
} from "../scoring";
import type { HitCounts, Penalty, AggregateScore } from "../../types/scoring";
import { EMPTY_HITS } from "../../types/scoring";

// ─── Helper ──────────────────────────────────────────────────────────

function makeHits(overrides: Partial<HitCounts> = {}): HitCounts {
  return { ...EMPTY_HITS, ...overrides };
}

// ─── Basic Calculations ──────────────────────────────────────────────

describe("calculateRawScore", () => {
  it("calculates perfect 6-shot stage (all X)", () => {
    const hits = makeHits({ x: 6 });
    expect(calculateRawScore(hits)).toBe(60);
  });

  it("calculates mixed hits", () => {
    // X=10, 10=10, 9=9, 8=8, 7=7, miss=0 → 44
    const hits = makeHits({ x: 1, ten: 1, nine: 1, eight: 1, seven: 1, miss: 1 });
    expect(calculateRawScore(hits)).toBe(44);
  });

  it("calculates all misses as 0", () => {
    const hits = makeHits({ miss: 6 });
    expect(calculateRawScore(hits)).toBe(0);
  });

  it("treats zero and miss both as 0 points", () => {
    const hits = makeHits({ zero: 3, miss: 3 });
    expect(calculateRawScore(hits)).toBe(0);
  });
});

describe("countShots", () => {
  it("counts total shots across all values", () => {
    const hits = makeHits({ x: 2, ten: 1, nine: 1, eight: 1, seven: 1 });
    expect(countShots(hits)).toBe(6);
  });

  it("includes misses in shot count", () => {
    const hits = makeHits({ x: 4, miss: 2 });
    expect(countShots(hits)).toBe(6);
  });
});

// ─── Penalty Logic ───────────────────────────────────────────────────

describe("applyPenalties", () => {
  it("removes highest value hit first (X)", () => {
    const hits = makeHits({ x: 2, ten: 2, nine: 1, eight: 1 });
    const penalties: Penalty[] = [{ type: "late_shot", count: 1 }];

    const result = applyPenalties(hits, penalties);

    expect(result.x).toBe(1); // One X removed
    expect(result.miss).toBe(1); // One miss added
    expect(result.ten).toBe(2); // Unchanged
    expect(countShots(result)).toBe(countShots(hits)); // Total shots unchanged
  });

  it("removes multiple penalties in order", () => {
    // X, 10, 10, 9, 8, 7 → 2 penalties → remove X and one 10
    const hits = makeHits({ x: 1, ten: 2, nine: 1, eight: 1, seven: 1 });
    const penalties: Penalty[] = [{ type: "wrong_position", count: 2 }];

    const result = applyPenalties(hits, penalties);

    expect(result.x).toBe(0); // X removed
    expect(result.ten).toBe(1); // One 10 removed
    expect(result.miss).toBe(2); // Two misses added
  });

  it("handles no penalties", () => {
    const hits = makeHits({ x: 6 });
    const result = applyPenalties(hits, []);
    expect(result).toEqual(hits);
  });

  it("handles penalty when only low values exist", () => {
    const hits = makeHits({ seven: 4, zero: 2 });
    const penalties: Penalty[] = [{ type: "fault_line", count: 1 }];

    const result = applyPenalties(hits, penalties);

    expect(result.seven).toBe(3);
    expect(result.miss).toBe(1);
    expect(result.zero).toBe(2); // Zeros not affected (7 removed first)
  });

  it("combines multiple penalty entries", () => {
    const hits = makeHits({ x: 3, ten: 3 });
    const penalties: Penalty[] = [
      { type: "late_shot", count: 1 },
      { type: "wrong_position", count: 1 },
    ];

    const result = applyPenalties(hits, penalties);

    expect(result.x).toBe(1); // 2 X removed
    expect(result.miss).toBe(2);
  });
});

// ─── Stage Score ─────────────────────────────────────────────────────

describe("calculateStageScore", () => {
  it("calculates stage with no penalties", () => {
    const hits = makeHits({ x: 4, ten: 1, nine: 1 });
    const score = calculateStageScore(hits, [], 0, 0);

    expect(score.totalBeforePenalty).toBe(59);
    expect(score.totalAfterPenalty).toBe(59);
    expect(score.xCount).toBe(4);
    expect(score.shotsFired).toBe(6);
  });

  it("calculates stage with penalty", () => {
    const hits = makeHits({ x: 4, ten: 1, nine: 1 });
    const penalties: Penalty[] = [{ type: "late_shot", count: 1 }];
    const score = calculateStageScore(hits, penalties, 0, 0);

    expect(score.totalBeforePenalty).toBe(59);
    expect(score.totalAfterPenalty).toBe(49); // Removed one X (10pts), added miss (0pts)
    expect(score.xCount).toBe(3); // One X removed
  });
});

// ─── Tie Breaking ────────────────────────────────────────────────────

describe("compareTieBreak", () => {
  function makeAggregate(overrides: Partial<AggregateScore>): AggregateScore {
    return {
      disciplineId: "ppc60",
      stages: [],
      totalScore: 0,
      totalX: 0,
      totalMisses: 0,
      totalHits: { ...EMPTY_HITS },
      displayScore: "0-0X",
      ...overrides,
    };
  }

  it("higher score ranks first", () => {
    const a = makeAggregate({ totalScore: 590 });
    const b = makeAggregate({ totalScore: 585 });
    expect(compareTieBreak(a, b)).toBeLessThan(0);
  });

  it("more X's wins when scores are equal", () => {
    const a = makeAggregate({ totalScore: 590, totalX: 40 });
    const b = makeAggregate({ totalScore: 590, totalX: 38 });
    expect(compareTieBreak(a, b)).toBeLessThan(0);
  });

  it("fewer misses wins when score and X are equal", () => {
    const a = makeAggregate({ totalScore: 590, totalX: 40, totalMisses: 1 });
    const b = makeAggregate({ totalScore: 590, totalX: 40, totalMisses: 3 });
    expect(compareTieBreak(a, b)).toBeLessThan(0);
  });

  it("fewer 7's wins at next level", () => {
    const a = makeAggregate({
      totalScore: 590,
      totalX: 40,
      totalMisses: 0,
      totalHits: makeHits({ seven: 2 }),
    });
    const b = makeAggregate({
      totalScore: 590,
      totalX: 40,
      totalMisses: 0,
      totalHits: makeHits({ seven: 5 }),
    });
    expect(compareTieBreak(a, b)).toBeLessThan(0);
  });

  it("returns 0 for fully tied scores", () => {
    const a = makeAggregate({ totalScore: 590, totalX: 40 });
    const b = makeAggregate({ totalScore: 590, totalX: 40 });
    expect(compareTieBreak(a, b)).toBe(0);
  });
});

describe("rankScores", () => {
  it("sorts multiple scores correctly", () => {
    const scores: AggregateScore[] = [
      {
        disciplineId: "ppc60",
        stages: [],
        totalScore: 580,
        totalX: 30,
        totalMisses: 0,
        totalHits: EMPTY_HITS,
        displayScore: "580-30X",
      },
      {
        disciplineId: "ppc60",
        stages: [],
        totalScore: 595,
        totalX: 45,
        totalMisses: 0,
        totalHits: EMPTY_HITS,
        displayScore: "595-45X",
      },
      {
        disciplineId: "ppc60",
        stages: [],
        totalScore: 595,
        totalX: 42,
        totalMisses: 0,
        totalHits: EMPTY_HITS,
        displayScore: "595-42X",
      },
    ];

    const ranked = rankScores(scores);

    expect(ranked[0].displayScore).toBe("595-45X");
    expect(ranked[1].displayScore).toBe("595-42X");
    expect(ranked[2].displayScore).toBe("580-30X");
  });
});

// ─── Classification ──────────────────────────────────────────────────

describe("getClassification", () => {
  it("classifies High Master (1476+)", () => {
    expect(getClassification(1500)).toBe("high_master");
    expect(getClassification(1476)).toBe("high_master");
  });

  it("classifies Master (1440–1475)", () => {
    expect(getClassification(1475)).toBe("master");
    expect(getClassification(1440)).toBe("master");
  });

  it("classifies Expert (1379–1439)", () => {
    expect(getClassification(1439)).toBe("expert");
    expect(getClassification(1379)).toBe("expert");
  });

  it("classifies Sharpshooter (1290–1378)", () => {
    expect(getClassification(1378)).toBe("sharpshooter");
    expect(getClassification(1290)).toBe("sharpshooter");
  });

  it("classifies Marksman (0–1289)", () => {
    expect(getClassification(1289)).toBe("marksman");
    expect(getClassification(0)).toBe("marksman");
  });
});

// ─── Validation ──────────────────────────────────────────────────────

describe("validateShotCount", () => {
  it("validates correct 6-shot stage", () => {
    const hits = makeHits({ x: 3, ten: 2, nine: 1 });
    const result = validateShotCount(hits, 6);
    expect(result.valid).toBe(true);
  });

  it("rejects too few shots", () => {
    const hits = makeHits({ x: 3, ten: 2 });
    const result = validateShotCount(hits, 6);
    expect(result.valid).toBe(false);
    expect(result.actual).toBe(5);
  });

  it("rejects too many shots", () => {
    const hits = makeHits({ x: 4, ten: 2, nine: 1 });
    const result = validateShotCount(hits, 6);
    expect(result.valid).toBe(false);
    expect(result.actual).toBe(7);
  });

  it("validates 12-shot stage", () => {
    const hits = makeHits({ x: 6, ten: 4, nine: 2 });
    const result = validateShotCount(hits, 12);
    expect(result.valid).toBe(true);
  });
});

// ─── Formatting ──────────────────────────────────────────────────────

describe("formatScore", () => {
  it("formats standard score", () => {
    expect(formatScore(1480, 96)).toBe("1480-96X");
  });

  it("formats zero score", () => {
    expect(formatScore(0, 0)).toBe("0-0X");
  });

  it("formats perfect score", () => {
    expect(formatScore(1500, 150)).toBe("1500-150X");
  });
});