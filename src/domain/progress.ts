import type { CognitiveDimension } from "./evidence/evidence-gate";
import type { Diagnosis, DiagnosisState } from "./diagnosis";
import type { NodePriority } from "./priority";
import { round } from "./mastery";

/**
 * Progress — leitura agregada do histórico do estudante.
 * Somente descrição do que já foi observado: não cria regra pedagógica nova,
 * não infere mapeamento e não altera nenhum estado. Determinístico.
 */

export interface AttemptRecord {
  occurredAt: string;
  isCorrect: boolean;
  evidenceStatus: "ACCEPTED" | "REJECTED";
  attemptContext: string;
}

export interface EvidenceRecord {
  pedagogicalNodeId: string;
  cognitiveDimension: CognitiveDimension;
  isCorrect: boolean;
  isOfficialQuestion: boolean;
  occurredAt: string;
}

export interface AnswerTotals {
  attempts: number;
  correct: number;
  wrong: number;
  accuracy: number;
  evidences: number;
  rejected: number;
}

export function summarizeAttempts(attempts: readonly AttemptRecord[]): AnswerTotals {
  const correct = attempts.filter((a) => a.isCorrect).length;
  const evidences = attempts.filter((a) => a.evidenceStatus === "ACCEPTED").length;
  return {
    attempts: attempts.length,
    correct,
    wrong: attempts.length - correct,
    accuracy: attempts.length ? round(correct / attempts.length) : 0,
    evidences,
    rejected: attempts.length - evidences,
  };
}

export interface TimelinePoint {
  day: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

/** Evolução ao longo do tempo, um ponto por dia (UTC), em ordem cronológica. */
export function buildTimeline(attempts: readonly AttemptRecord[]): TimelinePoint[] {
  const byDay = new Map<string, { attempts: number; correct: number }>();
  for (const a of attempts) {
    const day = a.occurredAt.slice(0, 10);
    const bucket = byDay.get(day) ?? { attempts: 0, correct: 0 };
    bucket.attempts += 1;
    if (a.isCorrect) bucket.correct += 1;
    byDay.set(day, bucket);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, b]) => ({ day, attempts: b.attempts, correct: b.correct, accuracy: round(b.correct / b.attempts) }));
}

export interface ErrorHypothesis {
  nodeId: string;
  dimension: CognitiveDimension;
  wrong: number;
  total: number;
  /** Leitura provisória; nunca afirmação de certeza. */
  hypothesis: string;
  confidence: "BAIXA" | "MÉDIA";
}

const DIMENSION_HYPOTHESIS: Record<CognitiveDimension, string> = {
  RECOGNITION: "possível dificuldade em reconhecer o conceito no enunciado",
  EXECUTION: "possível dificuldade em executar o procedimento",
  TRANSFER: "possível dificuldade em transferir o conceito para um contexto novo",
};

/** Hipóteses de erro por nó e dimensão. Só descreve o que as evidências mostram. */
export function buildErrorHypotheses(evidences: readonly EvidenceRecord[]): ErrorHypothesis[] {
  const groups = new Map<string, { nodeId: string; dimension: CognitiveDimension; wrong: number; total: number }>();
  for (const e of evidences) {
    const key = `${e.pedagogicalNodeId}|${e.cognitiveDimension}`;
    const g = groups.get(key) ?? { nodeId: e.pedagogicalNodeId, dimension: e.cognitiveDimension, wrong: 0, total: 0 };
    g.total += 1;
    if (!e.isCorrect) g.wrong += 1;
    groups.set(key, g);
  }
  return [...groups.values()]
    .filter((g) => g.wrong > 0)
    .map((g) => ({
      ...g,
      hypothesis: DIMENSION_HYPOTHESIS[g.dimension],
      confidence: g.total >= 3 ? ("MÉDIA" as const) : ("BAIXA" as const),
    }))
    .sort((a, b) => b.wrong - a.wrong || a.nodeId.localeCompare(b.nodeId) || a.dimension.localeCompare(b.dimension));
}

/** Explicação textual da recomendação: cada fator que entrou na prioridade. */
export function explainRecommendation(
  priority: NodePriority,
  diagnosis: Diagnosis,
  hasReviewHistory = true,
): string[] {
  const reasons: string[] = [];
  reasons.push(`diagnóstico ${priority.diagnosisState} (fragilidade ${priority.fragility.toFixed(2)})`);
  if (!hasReviewHistory) reasons.push("sem revisão registrada até agora");
  else if (priority.urgency >= 1) reasons.push("revisão vencida");
  else if (priority.urgency > 0) reasons.push(`retenção prevista em queda (urgência ${priority.urgency.toFixed(2)})`);
  if (priority.coverageGap > 0)
    reasons.push(`poucas evidências: ${diagnosis.details.evidenceCount} registradas (lacuna ${priority.coverageGap.toFixed(2)})`);
  if (!priority.prerequisitesReady) reasons.push("pré-requisito ainda não consolidado (prioridade reduzida)");
  return reasons;
}

export interface SkillProgress {
  nodeId: string;
  name: string;
  diagnosisState: DiagnosisState;
  mastery: number;
  retention: number;
  evidenceCount: number;
  correctCount: number;
  accuracy: number;
}

export function sortSkillProgress(rows: readonly SkillProgress[]): SkillProgress[] {
  return [...rows].sort((a, b) => b.evidenceCount - a.evidenceCount || a.name.localeCompare(b.name));
}

/**
 * Missões concluídas: dias em que o estudante registrou pelo menos o tamanho
 * da missão em tentativas de missão/revisão. Critério único, sem heurística na UI.
 */
export function countCompletedMissions(attempts: readonly AttemptRecord[], missionSize: number): number {
  const byDay = new Map<string, number>();
  for (const a of attempts) {
    if (a.attemptContext !== "MISSION" && a.attemptContext !== "REVIEW") continue;
    const day = a.occurredAt.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  return [...byDay.values()].filter((n) => n >= missionSize).length;
}
