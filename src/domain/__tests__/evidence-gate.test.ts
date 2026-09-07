import { describe, expect, it } from "vitest";
import { evaluateEvidenceGate, type MappingSnapshot, type QuestionSnapshot } from "@/domain/evidence/evidence-gate";
import { processAttempt } from "@/domain/engine/adaptive-engine";
import { fixedClock } from "@/domain/clock";
import { recomputeMastery, applyEvidence, INITIAL_MASTERY } from "@/domain/mastery";
import { applyReview, INITIAL_RETENTION, projectedRetention } from "@/domain/retention";
import { diagnose } from "@/domain/diagnosis";

const VERSION = "V12.1-F.2";

const validQuestion: QuestionSnapshot = { id: "ENEM2025-Q001", status: "ATIVA", isAnnulled: false, isOfficial: true };
const rawExtractQuestion: QuestionSnapshot = { ...validQuestion, status: "RAW_EXTRACT" };
const validMapping: MappingSnapshot = {
  questionId: "ENEM2025-Q001",
  mappingVersion: VERSION,
  mappingStatus: "VALIDADO",
  releaseStatus: "SIM",
  nodeLinkStatus: "MAPPED",
  pedagogicalNodeId: "LC-N01",
  officialSkillCode: "LC.H1",
  cognitiveDimension: "EXECUTION",
  evidenceAllowed: true,
};

const gate = (q: QuestionSnapshot | null, m: MappingSnapshot | null) =>
  evaluateEvidenceGate({ question: q, mapping: m, expectedMappingVersion: VERSION });

describe("EvidenceGate", () => {
  it("aceita questão ativa com mapeamento inequívoco liberado", () => {
    const d = gate(validQuestion, validMapping);
    expect(d.allowed).toBe(true);
  });

  it("recusa questão inexistente", () => {
    expect(gate(null, validMapping)).toEqual({ allowed: false, reason: "QUESTION_NOT_FOUND" });
  });

  it("recusa questão anulada", () => {
    expect(gate({ ...validQuestion, isAnnulled: true }, validMapping)).toEqual({
      allowed: false,
      reason: "QUESTION_ANNULLED",
    });
  });

  it("recusa questão inativa ou em quarentena", () => {
    expect(gate({ ...validQuestion, status: "QUARENTENA" }, validMapping).allowed).toBe(false);
    expect(gate({ ...validQuestion, status: "INATIVA" }, validMapping)).toEqual({
      allowed: false,
      reason: "QUESTION_NOT_ACTIVE",
    });
  });

  it("aceita a situação RAW_EXTRACT do Banco Mestre V12.1", () => {
    expect(gate(rawExtractQuestion, validMapping).allowed).toBe(true);
  });

  it("recusa quando não há mapeamento", () => {
    expect(gate(validQuestion, null)).toEqual({ allowed: false, reason: "MAPPING_NOT_FOUND" });
  });

  it("recusa mapeamento de outra versão", () => {
    expect(gate(validQuestion, { ...validMapping, mappingVersion: "V12.0" })).toEqual({
      allowed: false,
      reason: "MAPPING_VERSION_MISMATCH",
    });
  });

  it("recusa mapeamento não liberado pela auditoria", () => {
    expect(gate(validQuestion, { ...validMapping, releaseStatus: "NAO" })).toEqual({
      allowed: false,
      reason: "MAPPING_QUARANTINED",
    });
    expect(gate(validQuestion, { ...validMapping, mappingStatus: "PENDENTE" })).toEqual({
      allowed: false,
      reason: "MAPPING_QUARANTINED",
    });
  });

  it("recusa vínculo ambíguo ou inexistente com o grafo", () => {
    expect(gate(validQuestion, { ...validMapping, nodeLinkStatus: "AMBIGUOUS", pedagogicalNodeId: null })).toEqual({
      allowed: false,
      reason: "MAPPING_NOT_UNAMBIGUOUS",
    });
    expect(gate(validQuestion, { ...validMapping, nodeLinkStatus: "UNMAPPED", pedagogicalNodeId: null })).toEqual({
      allowed: false,
      reason: "MAPPING_NOT_UNAMBIGUOUS",
    });
  });

  it("recusa quando evidenceAllowed é falso", () => {
    expect(gate(validQuestion, { ...validMapping, evidenceAllowed: false })).toEqual({
      allowed: false,
      reason: "EVIDENCE_NOT_ALLOWED",
    });
  });
});

describe("Mastery", () => {
  it("é recalculado a partir das evidências, nunca copiado", () => {
    const evidences = [
      { isCorrect: true, cognitiveDimension: "EXECUTION" as const, isOfficialQuestion: true },
      { isCorrect: false, cognitiveDimension: "TRANSFER" as const, isOfficialQuestion: true },
    ];
    const fold = evidences.reduce(applyEvidence, INITIAL_MASTERY);
    expect(recomputeMastery(evidences)).toEqual(fold);
    expect(recomputeMastery(evidences).evidenceCount).toBe(2);
  });

  it("é determinístico", () => {
    const e = { isCorrect: true, cognitiveDimension: "RECOGNITION" as const, isOfficialQuestion: false };
    expect(applyEvidence(INITIAL_MASTERY, e)).toEqual(applyEvidence(INITIAL_MASTERY, e));
  });
});

describe("Retention (separado de Mastery)", () => {
  it("cresce a estabilidade no acerto e agenda a próxima revisão", () => {
    const at = new Date("2026-01-01T00:00:00.000Z");
    const r = applyReview(INITIAL_RETENTION, true, at);
    expect(r.stabilityDays).toBeGreaterThan(INITIAL_RETENTION.stabilityDays);
    expect(r.nextReviewAt).toBe("2026-01-02T14:24:00.000Z");
    expect(r.retention).toBe(1);
  });

  it("registra lapso e encurta o intervalo no erro", () => {
    const at = new Date("2026-01-01T00:00:00.000Z");
    const ok = applyReview(INITIAL_RETENTION, true, at);
    const fail = applyReview(ok, false, new Date("2026-01-05T00:00:00.000Z"));
    expect(fail.lapseCount).toBe(1);
    expect(fail.stabilityDays).toBeLessThan(ok.stabilityDays);
  });

  it("decai com o tempo sem alterar o mastery", () => {
    const at = new Date("2026-01-01T00:00:00.000Z");
    const r = applyReview(INITIAL_RETENTION, true, at);
    expect(projectedRetention(r, new Date("2026-01-08T00:00:00.000Z"))).toBeLessThan(1);
  });
});

describe("Diagnosis", () => {
  it("classifica sem evidência como desconhecido", () => {
    expect(diagnose(INITIAL_MASTERY, 0).state).toBe("UNKNOWN");
  });
  it("classifica domínio baixo como lacuna", () => {
    expect(diagnose({ mastery: 0.1, evidenceCount: 3, correctCount: 0 }, 0.5).state).toBe("GAP");
  });
  it("classifica domínio alto com evidência suficiente como consolidado", () => {
    expect(diagnose({ mastery: 0.9, evidenceCount: 6, correctCount: 6 }, 0.9).state).toBe("CONSOLIDATED");
  });
});

describe("AdaptiveEngine — Attempt → Evidence → Diagnosis → Mastery → Retention → Audit", () => {
  const attempt = {
    questionId: "ENEM2025-Q001",
    selectedAnswer: "A",
    isCorrect: true,
    responseTimeMs: 42000,
    attemptContext: "FREE" as const,
    mappingVersion: VERSION,
  };
  const clock = fixedClock("2026-01-01T00:00:00.000Z");

  it("produz evidência, diagnóstico, mastery, retenção e hash quando o gate aprova", async () => {
    const d = await processAttempt(attempt, { question: validQuestion, mapping: validMapping, mastery: null, retention: null }, clock);
    expect(d.gate.allowed).toBe(true);
    expect(d.evidence?.pedagogicalNodeId).toBe("LC-N01");
    expect(d.mastery?.evidenceCount).toBe(1);
    expect(d.retention?.reviewCount).toBe(1);
    expect(d.diagnosis?.state).toBeDefined();
    expect(d.decisionHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("não produz evidência alguma quando a questão é anulada", async () => {
    const d = await processAttempt(
      attempt,
      { question: { ...validQuestion, isAnnulled: true }, mapping: validMapping, mastery: null, retention: null },
      clock,
    );
    expect(d.gate).toEqual({ allowed: false, reason: "QUESTION_ANNULLED" });
    expect(d.evidence).toBeNull();
    expect(d.mastery).toBeNull();
    expect(d.retention).toBeNull();
    expect(d.diagnosis).toBeNull();
  });

  it("é auditável e determinístico: mesma entrada, mesmo hash", async () => {
    const snaps = { question: validQuestion, mapping: validMapping, mastery: null, retention: null };
    const a = await processAttempt(attempt, snaps, clock);
    const b = await processAttempt(attempt, snaps, clock);
    expect(a.decisionHash).toBe(b.decisionHash);
    const c = await processAttempt({ ...attempt, isCorrect: false }, snaps, clock);
    expect(c.decisionHash).not.toBe(a.decisionHash);
  });
});
