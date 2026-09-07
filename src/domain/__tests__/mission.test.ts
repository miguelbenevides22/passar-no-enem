import { describe, expect, it } from "vitest";
import { diagnose } from "@/domain/diagnosis";
import { INITIAL_MASTERY } from "@/domain/mastery";
import { buildDailyMission } from "@/domain/mission";
import { computeUrgency, rankNodes, type NodePriorityInput } from "@/domain/priority";
import { selectCandidates, type QuestionCandidate } from "@/domain/question-candidate";
import { INITIAL_RETENTION, type RetentionState } from "@/domain/retention";
import { dueReviews } from "@/domain/review";

const AT = new Date("2026-09-06T12:00:00.000Z");

function retention(partial: Partial<RetentionState>): RetentionState {
  return { ...INITIAL_RETENTION, ...partial };
}

const candidates: QuestionCandidate[] = [
  { questionId: "Q-A2", pedagogicalNodeId: "N1", cognitiveDimension: "EXECUTION", isOfficialQuestion: true },
  { questionId: "Q-A1", pedagogicalNodeId: "N1", cognitiveDimension: "RECOGNITION", isOfficialQuestion: true },
  { questionId: "Q-A3", pedagogicalNodeId: "N1", cognitiveDimension: "RECOGNITION", isOfficialQuestion: false },
  { questionId: "Q-B1", pedagogicalNodeId: "N2", cognitiveDimension: "TRANSFER", isOfficialQuestion: true },
];

describe("Priority", () => {
  it("marca urgência máxima quando a revisão está vencida", () => {
    expect(
      computeUrgency(retention({ lastReviewAt: "2026-09-01T12:00:00.000Z", nextReviewAt: "2026-09-05T12:00:00.000Z", stabilityDays: 4 }), AT),
    ).toBe(1);
  });

  it("nó nunca praticado tem urgência máxima", () => {
    expect(computeUrgency(INITIAL_RETENTION, AT)).toBe(1);
  });

  it("penaliza nó com pré-requisito pendente e ignora nó sem candidata", () => {
    const base: NodePriorityInput = {
      nodeId: "N1",
      diagnosis: diagnose(INITIAL_MASTERY, 0),
      retention: INITIAL_RETENTION,
      prerequisitesReady: true,
      candidateCount: 1,
    };
    const ranked = rankNodes(
      [base, { ...base, nodeId: "N2", prerequisitesReady: false }, { ...base, nodeId: "N3", candidateCount: 0 }],
      AT,
    );
    expect(ranked.map((r) => r.nodeId)).toEqual(["N1", "N2"]);
    expect(ranked[1]!.priority).toBeCloseTo(ranked[0]!.priority * 0.5, 6);
  });

  it("é determinístico e desempata por nodeId", () => {
    const base: NodePriorityInput = {
      nodeId: "N2",
      diagnosis: diagnose(INITIAL_MASTERY, 0),
      retention: INITIAL_RETENTION,
      prerequisitesReady: true,
      candidateCount: 1,
    };
    const a = rankNodes([base, { ...base, nodeId: "N1" }], AT);
    const b = rankNodes([{ ...base, nodeId: "N1" }, base], AT);
    expect(a).toEqual(b);
    expect(a[0]!.nodeId).toBe("N1");
  });
});

describe("Review", () => {
  it("lista apenas revisões vencidas, da mais atrasada para a menos", () => {
    const due = dueReviews(
      [
        { nodeId: "N1", retention: retention({ nextReviewAt: "2026-09-04T12:00:00.000Z" }) },
        { nodeId: "N2", retention: retention({ nextReviewAt: "2026-09-01T12:00:00.000Z" }) },
        { nodeId: "N3", retention: retention({ nextReviewAt: "2026-09-20T12:00:00.000Z" }) },
        { nodeId: "N4", retention: INITIAL_RETENTION },
      ],
      AT,
    );
    expect(due.map((d) => d.nodeId)).toEqual(["N2", "N1"]);
    expect(due[0]!.overdueDays).toBe(5);
  });
});

describe("Question Candidate Engine", () => {
  it("prioriza a dimensão alvo do diagnóstico, oficial antes de autoral", () => {
    expect(selectCandidates(candidates, "N1", "GAP").map((c) => c.questionId)).toEqual(["Q-A1", "Q-A3", "Q-A2"]);
    expect(selectCandidates(candidates, "N1", "DEVELOPING")[0]!.questionId).toBe("Q-A2");
  });

  it("respeita as questões já usadas e nunca cruza nós", () => {
    expect(selectCandidates(candidates, "N1", "GAP", new Set(["Q-A1"]))[0]!.questionId).toBe("Q-A3");
    expect(selectCandidates(candidates, "N2", "GAP").every((c) => c.pedagogicalNodeId === "N2")).toBe(true);
  });
});

describe("Mission", () => {
  const inputs: NodePriorityInput[] = [
    {
      nodeId: "N1",
      diagnosis: diagnose({ mastery: 0.2, evidenceCount: 2, correctCount: 0 }, 0.2),
      retention: retention({ lastReviewAt: "2026-09-01T12:00:00.000Z", nextReviewAt: "2026-09-05T12:00:00.000Z", stabilityDays: 4 }),
      prerequisitesReady: true,
      candidateCount: 3,
    },
    {
      nodeId: "N2",
      diagnosis: diagnose({ mastery: 0.9, evidenceCount: 6, correctCount: 6 }, 0.9),
      retention: retention({ lastReviewAt: "2026-09-06T00:00:00.000Z", nextReviewAt: "2026-09-30T12:00:00.000Z", stabilityDays: 24 }),
      prerequisitesReady: true,
      candidateCount: 1,
    },
  ];

  it("põe a revisão vencida primeiro e nunca repete questão", () => {
    const ranked = rankNodes(inputs, AT);
    const due = dueReviews(inputs.map((i) => ({ nodeId: i.nodeId, retention: i.retention })), AT);
    const mission = buildDailyMission({
      ranked,
      due,
      candidates,
      diagnosisByNode: { N1: "GAP", N2: "CONSOLIDATED" },
      size: 4,
    });
    expect(mission.items[0]!.kind).toBe("REVIEW");
    expect(mission.items[0]!.pedagogicalNodeId).toBe("N1");
    expect(new Set(mission.items.map((i) => i.questionId)).size).toBe(mission.items.length);
    expect(mission.items.length).toBeLessThanOrEqual(4);
  });

  it("é determinístico e limita a fatia de revisão", () => {
    const ranked = rankNodes(inputs, AT);
    const due = dueReviews(inputs.map((i) => ({ nodeId: i.nodeId, retention: i.retention })), AT);
    const args = { ranked, due, candidates, diagnosisByNode: { N1: "GAP" as const, N2: "CONSOLIDATED" as const }, size: 4 };
    expect(buildDailyMission(args)).toEqual(buildDailyMission(args));
    expect(buildDailyMission(args).reviewCount).toBeLessThanOrEqual(2);
  });

  it("devolve missão vazia quando não há questão liberada", () => {
    const mission = buildDailyMission({ ranked: [], due: [], candidates: [], diagnosisByNode: {}, size: 5 });
    expect(mission.items).toEqual([]);
  });
});
