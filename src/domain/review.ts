import type { RetentionState } from "./retention";

/**
 * Review — agenda de revisão derivada SOMENTE de Retention.
 * Mastery não decide revisão; Retention não decide domínio.
 */

export interface ReviewCandidate {
  nodeId: string;
  retention: RetentionState;
}

export interface DueReview {
  nodeId: string;
  dueAt: string;
  overdueDays: number;
  retention: number;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Revisões vencidas em `at`, da mais atrasada para a menos atrasada; desempate por nodeId. */
export function dueReviews(candidates: readonly ReviewCandidate[], at: Date): DueReview[] {
  return candidates
    .filter((c) => c.retention.nextReviewAt !== null && new Date(c.retention.nextReviewAt).getTime() <= at.getTime())
    .map((c) => {
      const dueAt = c.retention.nextReviewAt as string;
      return {
        nodeId: c.nodeId,
        dueAt,
        overdueDays: Math.floor((at.getTime() - new Date(dueAt).getTime()) / DAY_MS),
        retention: c.retention.retention,
      };
    })
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.nodeId.localeCompare(b.nodeId));
}
