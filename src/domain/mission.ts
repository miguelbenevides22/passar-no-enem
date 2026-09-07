import type { DiagnosisState } from "./diagnosis";
import type { NodePriority } from "./priority";
import { selectCandidates, type QuestionCandidate } from "./question-candidate";
import type { DueReview } from "./review";

/**
 * Mission — plano de estudo do dia. Não cria regra pedagógica nova:
 * consome Priority (o que estudar), Review (o que está vencido) e o
 * Question Candidate Engine (qual questão). Determinístico e auditável.
 */

export const DEFAULT_MISSION_SIZE = 10;
/** Fatia máxima da missão dedicada a revisão vencida. */
export const MAX_REVIEW_SHARE = 0.5;

export type MissionItemKind = "REVIEW" | "PRACTICE";

export interface MissionItem {
  order: number;
  kind: MissionItemKind;
  questionId: string;
  pedagogicalNodeId: string;
  cognitiveDimension: QuestionCandidate["cognitiveDimension"];
  reason: string;
  priority: number;
}

export interface Mission {
  items: MissionItem[];
  reviewCount: number;
  practiceCount: number;
  size: number;
}

export interface MissionInput {
  ranked: readonly NodePriority[];
  due: readonly DueReview[];
  candidates: readonly QuestionCandidate[];
  diagnosisByNode: Readonly<Record<string, DiagnosisState>>;
  size?: number;
}

export function buildDailyMission(input: MissionInput): Mission {
  const size = input.size ?? DEFAULT_MISSION_SIZE;
  const used = new Set<string>();
  const items: MissionItem[] = [];
  const priorityByNode = new Map(input.ranked.map((r) => [r.nodeId, r.priority]));

  const take = (nodeId: string, kind: MissionItemKind, reason: string) => {
    if (items.length >= size) return;
    const state = input.diagnosisByNode[nodeId] ?? "UNKNOWN";
    const pick = selectCandidates(input.candidates, nodeId, state, used)[0];
    if (!pick) return;
    used.add(pick.questionId);
    items.push({
      order: items.length + 1,
      kind,
      questionId: pick.questionId,
      pedagogicalNodeId: nodeId,
      cognitiveDimension: pick.cognitiveDimension,
      reason,
      priority: priorityByNode.get(nodeId) ?? 0,
    });
  };

  const reviewBudget = Math.floor(size * MAX_REVIEW_SHARE);
  for (const d of input.due) {
    if (items.length >= reviewBudget) break;
    take(d.nodeId, "REVIEW", d.overdueDays > 0 ? `revisão vencida há ${d.overdueDays} dia(s)` : "revisão do dia");
  }

  for (const node of input.ranked) {
    if (items.length >= size) break;
    take(
      node.nodeId,
      "PRACTICE",
      node.prerequisitesReady
        ? `prioridade ${node.priority.toFixed(2)} · ${node.diagnosisState}`
        : `pré-requisito pendente · ${node.diagnosisState}`,
    );
  }

  return {
    items,
    reviewCount: items.filter((i) => i.kind === "REVIEW").length,
    practiceCount: items.filter((i) => i.kind === "PRACTICE").length,
    size,
  };
}
