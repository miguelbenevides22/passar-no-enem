import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { systemClock } from "@/domain/clock";
import { processAttempt, type AttemptInput } from "@/domain/engine/adaptive-engine";
import { ENGINE_VERSION, GRAPH_VERSION, MAPPING_VERSION } from "@/domain/engine/version";
import type { MappingSnapshot, QuestionSnapshot } from "@/domain/evidence/evidence-gate";
import { INITIAL_MASTERY, type MasteryState } from "@/domain/mastery";
import { INITIAL_RETENTION, type RetentionState } from "@/domain/retention";

const attemptSchema = z.object({
  questionId: z.string().min(1),
  selectedAnswer: z.string().max(4).nullable(),
  isCorrect: z.boolean(),
  responseTimeMs: z.number().int().positive().nullable(),
  attemptContext: z.enum(["MISSION", "SIMULATION", "REVIEW", "FREE"]),
});

/**
 * Endpoint único do Evidence Pipeline.
 * A UI só envia o fato bruto (questão, alternativa, tempo). Nenhuma decisão
 * pedagógica vem do cliente: gate, mastery, retention, diagnóstico e auditoria
 * são calculados aqui pelo AdaptiveEngine e persistidos numa única transação.
 */
export const submitAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => attemptSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [questionRes, mappingRes, retentionRes] = await Promise.all([
      supabase.from("questions").select("id, status, is_annulled, is_official").eq("id", data.questionId).maybeSingle(),
      supabase
        .from("question_mappings")
        .select(
          "question_id, mapping_version, mapping_status, release_status, node_link_status, pedagogical_node_id, official_skill_code, cognitive_dimension, evidence_allowed",
        )
        .eq("question_id", data.questionId)
        .eq("mapping_version", MAPPING_VERSION)
        .maybeSingle(),
      supabase
        .from("retention_states")
        .select("retention, stability_days, review_count, lapse_count, last_review_at, next_review_at, pedagogical_node_id")
        .eq("user_id", userId),
    ]);


    const question: QuestionSnapshot | null = questionRes.data
      ? {
          id: questionRes.data.id,
          status: questionRes.data.status,
          isAnnulled: questionRes.data.is_annulled,
          isOfficial: questionRes.data.is_official,
        }
      : null;

    const mapping: MappingSnapshot | null = mappingRes.data
      ? {
          questionId: mappingRes.data.question_id,
          mappingVersion: mappingRes.data.mapping_version,
          mappingStatus: mappingRes.data.mapping_status,
          releaseStatus: mappingRes.data.release_status,
          nodeLinkStatus: mappingRes.data.node_link_status as MappingSnapshot["nodeLinkStatus"],
          pedagogicalNodeId: mappingRes.data.pedagogical_node_id,
          officialSkillCode: mappingRes.data.official_skill_code,
          cognitiveDimension: mappingRes.data.cognitive_dimension as MappingSnapshot["cognitiveDimension"],
          evidenceAllowed: mappingRes.data.evidence_allowed,
        }
      : null;

    const nodeId = mapping?.pedagogicalNodeId ?? null;
    const masteryRow = nodeId
      ? await supabase
          .from("mastery_states")
          .select("mastery, evidence_count, correct_count")
          .eq("user_id", userId)
          .eq("pedagogical_node_id", nodeId)
          .maybeSingle()
      : null;
    const retentionRow = nodeId
      ? (retentionRes.data ?? []).find((r) => r.pedagogical_node_id === nodeId) ?? null
      : null;

    const mastery: MasteryState | null = masteryRow?.data
      ? {
          mastery: Number(masteryRow.data.mastery),
          evidenceCount: masteryRow.data.evidence_count,
          correctCount: masteryRow.data.correct_count,
        }
      : nodeId
        ? INITIAL_MASTERY
        : null;

    const retention: RetentionState | null = retentionRow
      ? {
          retention: Number(retentionRow.retention),
          stabilityDays: Number(retentionRow.stability_days),
          reviewCount: retentionRow.review_count,
          lapseCount: retentionRow.lapse_count,
          lastReviewAt: retentionRow.last_review_at,
          nextReviewAt: retentionRow.next_review_at,
        }
      : nodeId
        ? INITIAL_RETENTION
        : null;

    const attempt: AttemptInput = { ...data, mappingVersion: MAPPING_VERSION };
    const decision = await processAttempt(attempt, { question, mapping, mastery, retention }, systemClock);

    const { data: result, error } = await supabase.rpc("record_attempt", {
      _payload: {
        question_id: attempt.questionId,
        mapping_version: MAPPING_VERSION,
        graph_version: GRAPH_VERSION,
        engine_version: ENGINE_VERSION,
        occurred_at: decision.occurredAt,
        selected_answer: attempt.selectedAnswer,
        is_correct: attempt.isCorrect,
        response_time_ms: attempt.responseTimeMs,
        attempt_context: attempt.attemptContext,
        decision_hash: decision.decisionHash,
        weight: decision.evidence?.weight ?? null,
        mastery: decision.mastery
          ? {
              mastery: decision.mastery.mastery,
              evidence_count: decision.mastery.evidenceCount,
              correct_count: decision.mastery.correctCount,
            }
          : null,
        retention: decision.retention
          ? {
              retention: decision.retention.retention,
              stability_days: decision.retention.stabilityDays,
              review_count: decision.retention.reviewCount,
              lapse_count: decision.retention.lapseCount,
              next_review_at: decision.retention.nextReviewAt,
            }
          : null,
        diagnosis: decision.diagnosis
          ? {
              state: decision.diagnosis.state,
              fragility: decision.diagnosis.fragility,
              details: decision.diagnosis.details,
            }
          : null,
      },
    });

    if (error) throw new Error(error.message);

    return {
      accepted: decision.gate.allowed,
      reason: decision.gate.allowed ? null : decision.gate.reason,
      decisionHash: decision.decisionHash,
      diagnosis: decision.diagnosis,
      mastery: decision.mastery,
      retention: decision.retention,
      persisted: result,
    };
  });

/** Fila de revisão dos mapeamentos pendentes (somente leitura, sem inferência). */
export const listMappingReviewQueue = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await client
    .from("mapping_review_queue")
    .select(
      "question_id, official_skill_code, official_object, pedagogical_content, current_mapping_status, node_link_status, pending_reason, mapping_version, review_status",
    )
    .order("question_id");
  return data ?? [];
});
