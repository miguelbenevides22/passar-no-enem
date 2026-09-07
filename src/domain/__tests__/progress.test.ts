import { describe, expect, it } from "vitest";
import {
  buildErrorHypotheses,
  buildTimeline,
  explainRecommendation,
  summarizeAttempts,
  type AttemptRecord,
  type EvidenceRecord,
} from "../progress";
import { diagnose } from "../diagnosis";
import { computeNodePriority } from "../priority";
import { INITIAL_RETENTION } from "../retention";

const attempts: AttemptRecord[] = [
  { occurredAt: "2026-09-01T10:00:00.000Z", isCorrect: true, evidenceStatus: "ACCEPTED", attemptContext: "MISSION" },
  { occurredAt: "2026-09-01T11:00:00.000Z", isCorrect: false, evidenceStatus: "ACCEPTED", attemptContext: "MISSION" },
  { occurredAt: "2026-09-02T09:00:00.000Z", isCorrect: false, evidenceStatus: "REJECTED", attemptContext: "FREE" },
];

describe("progress", () => {
  it("soma tentativas, acertos, erros e evidências", () => {
    expect(summarizeAttempts(attempts)).toEqual({
      attempts: 3,
      correct: 1,
      wrong: 2,
      accuracy: 0.333333,
      evidences: 2,
      rejected: 1,
    });
  });

  it("monta a evolução por dia em ordem cronológica", () => {
    expect(buildTimeline(attempts)).toEqual([
      { day: "2026-09-01", attempts: 2, correct: 1, accuracy: 0.5 },
      { day: "2026-09-02", attempts: 1, correct: 0, accuracy: 0 },
    ]);
  });

  it("gera hipóteses de erro sem afirmar certeza", () => {
    const evidences: EvidenceRecord[] = [
      { pedagogicalNodeId: "N1", cognitiveDimension: "EXECUTION", isCorrect: false, isOfficialQuestion: true, occurredAt: "2026-09-01T10:00:00.000Z" },
      { pedagogicalNodeId: "N1", cognitiveDimension: "EXECUTION", isCorrect: true, isOfficialQuestion: true, occurredAt: "2026-09-01T11:00:00.000Z" },
      { pedagogicalNodeId: "N2", cognitiveDimension: "TRANSFER", isCorrect: true, isOfficialQuestion: true, occurredAt: "2026-09-01T12:00:00.000Z" },
    ];
    const result = buildErrorHypotheses(evidences);
    expect(result).toHaveLength(1);
    expect(result[0]?.nodeId).toBe("N1");
    expect(result[0]?.hypothesis).toContain("possível");
    expect(result[0]?.confidence).toBe("BAIXA");
  });

  it("explica cada recomendação", () => {
    const at = new Date("2026-09-06T12:00:00.000Z");
    const d = diagnose({ mastery: 0.2, evidenceCount: 1, correctCount: 0 }, 0);
    const p = computeNodePriority(
      { nodeId: "N1", diagnosis: d, retention: INITIAL_RETENTION, prerequisitesReady: false, candidateCount: 3 },
      at,
    );
    const reasons = explainRecommendation(p, d);
    expect(reasons[0]).toContain("GAP");
    expect(reasons.join(" ")).toContain("pré-requisito");
  });
});
