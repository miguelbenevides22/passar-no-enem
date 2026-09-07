/**
 * EvidenceGate — único ponto que decide se uma tentativa pode virar evidência.
 * Função pura e determinística: mesma entrada, mesma saída. Sem relógio, sem
 * aleatoriedade, sem acesso a banco. A mesma regra é replicada no banco
 * (public.evaluate_evidence_gate) para que a UI nunca seja a autoridade.
 */

export type CognitiveDimension = "RECOGNITION" | "EXECUTION" | "TRANSFER";

export type GateRejectionReason =
  | "QUESTION_NOT_FOUND"
  | "QUESTION_ANNULLED"
  | "QUESTION_NOT_ACTIVE"
  | "MAPPING_NOT_FOUND"
  | "MAPPING_VERSION_MISMATCH"
  | "MAPPING_QUARANTINED"
  | "MAPPING_NOT_UNAMBIGUOUS"
  | "EVIDENCE_NOT_ALLOWED";

export interface QuestionSnapshot {
  id: string;
  status: string;
  isAnnulled: boolean;
  isOfficial: boolean;
}

export interface MappingSnapshot {
  questionId: string;
  mappingVersion: string;
  mappingStatus: string;
  releaseStatus: string;
  nodeLinkStatus: "MAPPED" | "AMBIGUOUS" | "UNMAPPED";
  pedagogicalNodeId: string | null;
  officialSkillCode: string;
  cognitiveDimension: CognitiveDimension;
  evidenceAllowed: boolean;
}

export type GateDecision =
  | {
      allowed: true;
      pedagogicalNodeId: string;
      officialSkillCode: string;
      cognitiveDimension: CognitiveDimension;
      isOfficialQuestion: boolean;
    }
  | { allowed: false; reason: GateRejectionReason };

/** Situações do Banco Mestre que autorizam evidência. "RAW_EXTRACT" é a situação
 * com que o V12.1 importa as 180 questões oficiais; nenhum dado oficial é reescrito. */
export const ACTIVE_QUESTION_STATUSES: readonly string[] = ["ATIVA", "RAW_EXTRACT"];

export function evaluateEvidenceGate(input: {
  question: QuestionSnapshot | null;
  mapping: MappingSnapshot | null;
  expectedMappingVersion: string;
}): GateDecision {
  const { question, mapping, expectedMappingVersion } = input;

  if (!question) return { allowed: false, reason: "QUESTION_NOT_FOUND" };
  if (question.isAnnulled) return { allowed: false, reason: "QUESTION_ANNULLED" };
  if (!ACTIVE_QUESTION_STATUSES.includes(question.status)) return { allowed: false, reason: "QUESTION_NOT_ACTIVE" };

  if (!mapping) return { allowed: false, reason: "MAPPING_NOT_FOUND" };
  if (mapping.mappingVersion !== expectedMappingVersion || mapping.questionId !== question.id) {
    return { allowed: false, reason: "MAPPING_VERSION_MISMATCH" };
  }
  if (mapping.releaseStatus !== "SIM" || mapping.mappingStatus !== "VALIDADO") {
    return { allowed: false, reason: "MAPPING_QUARANTINED" };
  }
  if (mapping.nodeLinkStatus !== "MAPPED" || !mapping.pedagogicalNodeId) {
    return { allowed: false, reason: "MAPPING_NOT_UNAMBIGUOUS" };
  }
  if (!mapping.evidenceAllowed) return { allowed: false, reason: "EVIDENCE_NOT_ALLOWED" };

  return {
    allowed: true,
    pedagogicalNodeId: mapping.pedagogicalNodeId,
    officialSkillCode: mapping.officialSkillCode,
    cognitiveDimension: mapping.cognitiveDimension,
    isOfficialQuestion: question.isOfficial,
  };
}
