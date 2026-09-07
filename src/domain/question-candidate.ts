import type { CognitiveDimension } from "./evidence/evidence-gate";
import type { DiagnosisState } from "./diagnosis";

/**
 * Question Candidate Engine — ÚNICO seletor de questões do produto.
 * Só recebe questões já liberadas pelo EvidenceGate (evidence_allowed = true e
 * vínculo inequívoco com o grafo). Nunca infere mapeamento e nunca sorteia.
 */

export interface QuestionCandidate {
  questionId: string;
  pedagogicalNodeId: string;
  cognitiveDimension: CognitiveDimension;
  isOfficialQuestion: boolean;
}

/** Progressão cognitiva alvo por estado de diagnóstico. */
export const TARGET_DIMENSION: Record<DiagnosisState, CognitiveDimension> = {
  UNKNOWN: "RECOGNITION",
  GAP: "RECOGNITION",
  FRAGILE: "EXECUTION",
  DEVELOPING: "EXECUTION",
  CONSOLIDATED: "TRANSFER",
};

const DIMENSION_ORDER: CognitiveDimension[] = ["RECOGNITION", "EXECUTION", "TRANSFER"];

/**
 * Ordena candidatas de um nó: primeiro a dimensão alvo, depois a distância dela;
 * questões oficiais antes das autorais; desempate final estável por questionId.
 */
export function selectCandidates(
  candidates: readonly QuestionCandidate[],
  nodeId: string,
  diagnosisState: DiagnosisState,
  excludeQuestionIds: ReadonlySet<string> = new Set(),
): QuestionCandidate[] {
  const target = DIMENSION_ORDER.indexOf(TARGET_DIMENSION[diagnosisState]);
  return candidates
    .filter((c) => c.pedagogicalNodeId === nodeId && !excludeQuestionIds.has(c.questionId))
    .sort((a, b) => {
      const da = Math.abs(DIMENSION_ORDER.indexOf(a.cognitiveDimension) - target);
      const db = Math.abs(DIMENSION_ORDER.indexOf(b.cognitiveDimension) - target);
      if (da !== db) return da - db;
      if (a.isOfficialQuestion !== b.isOfficialQuestion) return a.isOfficialQuestion ? -1 : 1;
      return a.questionId.localeCompare(b.questionId);
    });
}
