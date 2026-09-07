import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAPPING_VERSION } from "@/domain/engine/version";

/** Questões que o EvidenceGate autoriza hoje + estado do estudante. Sem regra pedagógica na UI. */
export const getStudyState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [questions, mastery, retention, attempts, audit] = await Promise.all([
      supabase
        .from("question_mappings")
        .select("question_id, official_skill_code, pedagogical_content, cognitive_dimension, pedagogical_node_id")
        .eq("mapping_version", MAPPING_VERSION)
        .eq("evidence_allowed", true)
        .order("question_id"),
      supabase.from("mastery_states").select("pedagogical_node_id, mastery, evidence_count, correct_count").eq("user_id", userId),
      supabase.from("retention_states").select("pedagogical_node_id, retention, stability_days, next_review_at, lapse_count").eq("user_id", userId),
      supabase
        .from("attempts")
        .select("id, question_id, is_correct, evidence_status, rejection_reason, occurred_at")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false })
        .limit(20),
      supabase
        .from("audit_events")
        .select("event_type, subject_kind, subject_id, decision_hash, occurred_at")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false })
        .limit(20),
    ]);

    return {
      questions: questions.data ?? [],
      mastery: mastery.data ?? [],
      retention: retention.data ?? [],
      attempts: attempts.data ?? [],
      audit: audit.data ?? [],
    };
  });
