import type { CognitiveDimension } from "./evidence/evidence-gate";

/**
 * Mastery — domínio observado, calculado SOMENTE a partir de evidências.
 * Nunca copiado de estados antigos: o histórico é reprocessado por `recomputeMastery`.
 * Separado de Retention (esquecimento ao longo do tempo).
 */

export const LEARNING_RATE = 0.3;

export const DIMENSION_WEIGHT: Record<CognitiveDimension, number> = {
  RECOGNITION: 0.8,
  EXECUTION: 1.0,
  TRANSFER: 1.2,
};

/** Evidência autoral pesa menos que evidência de prova oficial. */
export const OFFICIAL_SOURCE_WEIGHT = 1.0;
export const AUTHORED_SOURCE_WEIGHT = 0.9;

export interface EvidenceInput {
  isCorrect: boolean;
  cognitiveDimension: CognitiveDimension;
  isOfficialQuestion: boolean;
}

export interface MasteryState {
  mastery: number;
  evidenceCount: number;
  correctCount: number;
}

export const INITIAL_MASTERY: MasteryState = { mastery: 0, evidenceCount: 0, correctCount: 0 };

export function evidenceWeight(evidence: EvidenceInput): number {
  const source = evidence.isOfficialQuestion ? OFFICIAL_SOURCE_WEIGHT : AUTHORED_SOURCE_WEIGHT;
  return round(DIMENSION_WEIGHT[evidence.cognitiveDimension] * source);
}

export function applyEvidence(state: MasteryState, evidence: EvidenceInput): MasteryState {
  const w = evidenceWeight(evidence);
  const outcome = evidence.isCorrect ? 1 : 0;
  const alpha = Math.min(1, LEARNING_RATE * w);
  return {
    mastery: clamp(round(state.mastery + alpha * (outcome - state.mastery))),
    evidenceCount: state.evidenceCount + 1,
    correctCount: state.correctCount + (evidence.isCorrect ? 1 : 0),
  };
}

/** Reprocessamento completo — usado na migração de histórico. */
export function recomputeMastery(evidences: readonly EvidenceInput[]): MasteryState {
  return evidences.reduce(applyEvidence, INITIAL_MASTERY);
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
