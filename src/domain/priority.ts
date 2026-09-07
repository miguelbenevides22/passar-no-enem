import { CONFIDENCE_EVIDENCE_TARGET, type Diagnosis } from "./diagnosis";
import { clamp, round } from "./mastery";
import { projectedRetention, type RetentionState } from "./retention";

/**
 * Priority — ÚNICO sistema de prioridade do produto.
 * Combina fragilidade (diagnóstico), urgência (retenção/agenda) e lacuna de cobertura.
 * Determinístico: sem aleatoriedade, sem Date.now() interno, desempate estável por nodeId.
 */

export const WEIGHT_FRAGILITY = 0.5;
export const WEIGHT_URGENCY = 0.35;
export const WEIGHT_COVERAGE = 0.15;

/** Nó cujo pré-requisito bloqueante ainda não está consolidado perde prioridade (não some). */
export const BLOCKED_PENALTY = 0.5;

export interface NodePriorityInput {
  nodeId: string;
  diagnosis: Diagnosis;
  retention: RetentionState;
  prerequisitesReady: boolean;
  candidateCount: number;
}

export interface NodePriority {
  nodeId: string;
  priority: number;
  fragility: number;
  urgency: number;
  coverageGap: number;
  prerequisitesReady: boolean;
  diagnosisState: Diagnosis["state"];
}

/** Urgência de revisão: 1 quando vencida, senão o quanto a retenção prevista já caiu. */
export function computeUrgency(retention: RetentionState, at: Date): number {
  if (!retention.lastReviewAt) return 1;
  if (retention.nextReviewAt && new Date(retention.nextReviewAt).getTime() <= at.getTime()) return 1;
  return round(clamp(1 - projectedRetention(retention, at)));
}

export function computeCoverageGap(diagnosis: Diagnosis): number {
  return round(clamp(1 - diagnosis.details.evidenceCount / CONFIDENCE_EVIDENCE_TARGET));
}

export function computeNodePriority(input: NodePriorityInput, at: Date): NodePriority {
  const fragility = input.diagnosis.fragility;
  const urgency = computeUrgency(input.retention, at);
  const coverageGap = computeCoverageGap(input.diagnosis);
  const raw =
    fragility * WEIGHT_FRAGILITY + urgency * WEIGHT_URGENCY + coverageGap * WEIGHT_COVERAGE;
  const priority = round(clamp(raw * (input.prerequisitesReady ? 1 : BLOCKED_PENALTY)));
  return {
    nodeId: input.nodeId,
    priority,
    fragility,
    urgency,
    coverageGap,
    prerequisitesReady: input.prerequisitesReady,
    diagnosisState: input.diagnosis.state,
  };
}

/** Ordena nós por prioridade. Nós sem questão candidata ficam fora do ranking. */
export function rankNodes(inputs: readonly NodePriorityInput[], at: Date): NodePriority[] {
  return inputs
    .filter((i) => i.candidateCount > 0)
    .map((i) => computeNodePriority(i, at))
    .sort((a, b) => b.priority - a.priority || a.nodeId.localeCompare(b.nodeId));
}
