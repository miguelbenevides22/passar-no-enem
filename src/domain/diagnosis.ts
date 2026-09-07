import type { MasteryState } from "./mastery";
import { clamp, round } from "./mastery";

/**
 * Diagnosis — leitura pedagógica determinística do estado do nó.
 * Único sistema de diagnóstico do produto. Sem aleatoriedade.
 */

export type DiagnosisState = "UNKNOWN" | "GAP" | "FRAGILE" | "DEVELOPING" | "CONSOLIDATED";

export const CONFIDENCE_EVIDENCE_TARGET = 5;
export const GAP_THRESHOLD = 0.35;
export const FRAGILE_THRESHOLD = 0.6;
export const CONSOLIDATED_THRESHOLD = 0.8;

export interface Diagnosis {
  state: DiagnosisState;
  fragility: number;
  confidence: number;
  details: { mastery: number; evidenceCount: number; correctCount: number; retention: number };
}

export function diagnose(mastery: MasteryState, retention: number): Diagnosis {
  const confidence = round(clamp(mastery.evidenceCount / CONFIDENCE_EVIDENCE_TARGET));
  const fragility = round(clamp((1 - mastery.mastery) * 0.7 + (1 - retention) * 0.3));

  let state: DiagnosisState;
  if (mastery.evidenceCount === 0) state = "UNKNOWN";
  else if (mastery.mastery < GAP_THRESHOLD) state = "GAP";
  else if (mastery.mastery < FRAGILE_THRESHOLD) state = "FRAGILE";
  else if (mastery.mastery < CONSOLIDATED_THRESHOLD || confidence < 1) state = "DEVELOPING";
  else state = "CONSOLIDATED";

  return {
    state,
    fragility,
    confidence,
    details: {
      mastery: mastery.mastery,
      evidenceCount: mastery.evidenceCount,
      correctCount: mastery.correctCount,
      retention,
    },
  };
}
