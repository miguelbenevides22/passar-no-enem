import { stableHash } from "@/domain/audit-hash";
import type { Clock } from "@/domain/clock";
import { diagnose, type Diagnosis } from "@/domain/diagnosis";
import {
  evaluateEvidenceGate,
  type GateDecision,
  type MappingSnapshot,
  type QuestionSnapshot,
} from "@/domain/evidence/evidence-gate";
import { applyEvidence, evidenceWeight, INITIAL_MASTERY, type MasteryState } from "@/domain/mastery";
import { applyReview, INITIAL_RETENTION, projectedRetention, type RetentionState } from "@/domain/retention";
import { ENGINE_VERSION, GRAPH_VERSION } from "./version";

/**
 * Único AdaptiveEngine. Fluxo:
 * Attempt → EvidenceGate → Evidence → Diagnosis → Mastery → Retention → AuditEvent.
 * Puro e determinístico: recebe snapshots e um Clock, devolve a decisão a persistir.
 */

export interface AttemptInput {
  questionId: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  responseTimeMs: number | null;
  attemptContext: "MISSION" | "SIMULATION" | "REVIEW" | "FREE";
  mappingVersion: string;
}

export interface EngineSnapshots {
  question: QuestionSnapshot | null;
  mapping: MappingSnapshot | null;
  mastery: MasteryState | null;
  retention: RetentionState | null;
}

export interface EngineDecision {
  gate: GateDecision;
  occurredAt: string;
  engineVersion: string;
  graphVersion: string;
  evidence: { weight: number; pedagogicalNodeId: string } | null;
  mastery: MasteryState | null;
  retention: RetentionState | null;
  diagnosis: Diagnosis | null;
  decisionHash: string;
}

export async function processAttempt(
  attempt: AttemptInput,
  snapshots: EngineSnapshots,
  clock: Clock,
): Promise<EngineDecision> {
  const occurredAt = clock.isoNow();
  const gate = evaluateEvidenceGate({
    question: snapshots.question,
    mapping: snapshots.mapping,
    expectedMappingVersion: attempt.mappingVersion,
  });

  if (!gate.allowed) {
    const base = { gate, occurredAt, engineVersion: ENGINE_VERSION, graphVersion: GRAPH_VERSION, attempt };
    return {
      gate,
      occurredAt,
      engineVersion: ENGINE_VERSION,
      graphVersion: GRAPH_VERSION,
      evidence: null,
      mastery: null,
      retention: null,
      diagnosis: null,
      decisionHash: await stableHash(base),
    };
  }

  const evidenceInput = {
    isCorrect: attempt.isCorrect,
    cognitiveDimension: gate.cognitiveDimension,
    isOfficialQuestion: gate.isOfficialQuestion,
  };

  const previousMastery = snapshots.mastery ?? INITIAL_MASTERY;
  const previousRetention = snapshots.retention ?? INITIAL_RETENTION;

  const mastery = applyEvidence(previousMastery, evidenceInput);
  const retention = applyReview(previousRetention, attempt.isCorrect, new Date(occurredAt));
  const diagnosis = diagnose(mastery, projectedRetention(retention, new Date(occurredAt)));

  const decision = {
    gate,
    occurredAt,
    engineVersion: ENGINE_VERSION,
    graphVersion: GRAPH_VERSION,
    attempt,
    previousMastery,
    previousRetention,
    mastery,
    retention,
    diagnosis,
  };

  return {
    gate,
    occurredAt,
    engineVersion: ENGINE_VERSION,
    graphVersion: GRAPH_VERSION,
    evidence: { weight: evidenceWeight(evidenceInput), pedagogicalNodeId: gate.pedagogicalNodeId },
    mastery,
    retention,
    diagnosis,
    decisionHash: await stableHash(decision),
  };
}
