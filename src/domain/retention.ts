import { clamp, round } from "./mastery";

/**
 * Retention — probabilidade de lembrar depois de um intervalo.
 * Entidade SEPARADA de Mastery: mastery mede domínio observado,
 * retention mede a curva de esquecimento e agenda revisões.
 * Determinístico; o instante vem sempre de fora (Clock injetado).
 */

export const MIN_STABILITY_DAYS = 1;
export const MAX_STABILITY_DAYS = 365;
export const GROWTH_ON_SUCCESS = 1.6;
export const DECAY_ON_LAPSE = 0.5;
export const DAY_MS = 24 * 60 * 60 * 1000;

export interface RetentionState {
  retention: number;
  stabilityDays: number;
  reviewCount: number;
  lapseCount: number;
  lastReviewAt: string | null;
  nextReviewAt: string | null;
}

export const INITIAL_RETENTION: RetentionState = {
  retention: 0,
  stabilityDays: MIN_STABILITY_DAYS,
  reviewCount: 0,
  lapseCount: 0,
  lastReviewAt: null,
  nextReviewAt: null,
};

/** Retenção prevista em `at`, dado o último contato e a estabilidade atual. */
export function projectedRetention(state: RetentionState, at: Date): number {
  if (!state.lastReviewAt) return 0;
  const elapsedDays = (at.getTime() - new Date(state.lastReviewAt).getTime()) / DAY_MS;
  if (elapsedDays <= 0) return 1;
  return round(clamp(Math.exp(-elapsedDays / state.stabilityDays)));
}

export function applyReview(state: RetentionState, isCorrect: boolean, at: Date): RetentionState {
  const stability = isCorrect
    ? Math.min(MAX_STABILITY_DAYS, state.stabilityDays * GROWTH_ON_SUCCESS)
    : Math.max(MIN_STABILITY_DAYS, state.stabilityDays * DECAY_ON_LAPSE);
  return {
    retention: isCorrect ? 1 : round(clamp(projectedRetention(state, at) * DECAY_ON_LAPSE)),
    stabilityDays: round(stability),
    reviewCount: state.reviewCount + 1,
    lapseCount: state.lapseCount + (isCorrect ? 0 : 1),
    lastReviewAt: at.toISOString(),
    nextReviewAt: new Date(at.getTime() + stability * DAY_MS).toISOString(),
  };
}
