import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { systemClock } from "@/domain/clock";
import { CONSOLIDATED_THRESHOLD, diagnose } from "@/domain/diagnosis";
import { INITIAL_MASTERY } from "@/domain/mastery";
import { DEFAULT_MISSION_SIZE } from "@/domain/mission";
import { computeNodePriority, rankNodes, type NodePriorityInput } from "@/domain/priority";
import { INITIAL_RETENTION, projectedRetention, type RetentionState } from "@/domain/retention";
import { dueReviews } from "@/domain/review";
import {
  buildErrorHypotheses,
  buildTimeline,
  countCompletedMissions,
  explainRecommendation,
  sortSkillProgress,
  summarizeAttempts,
  type AttemptRecord,
  type EvidenceRecord,
  type SkillProgress,
} from "@/domain/progress";
import { ENGINE_VERSION, GRAPH_VERSION, MAPPING_VERSION } from "@/domain/engine/version";
import type { CognitiveDimension } from "@/domain/evidence/evidence-gate";

/**
 * Painel de acompanhamento. Apenas carrega snapshots e delega toda a leitura
 * pedagógica ao domínio; nenhuma regra vive na UI e nenhum dado oficial é tocado.
 */
export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const now = systemClock.now();

    const [attemptsRes, evidencesRes, masteryRes, retentionRes, mappingsRes, nodesRes, prereqRes, queueRes] =
      await Promise.all([
        supabase
          .from("attempts")
          .select("occurred_at, is_correct, evidence_status, attempt_context")
          .eq("user_id", userId)
          .order("occurred_at", { ascending: true }),
        supabase
          .from("evidences")
          .select("pedagogical_node_id, cognitive_dimension, is_correct, is_official_question, occurred_at")
          .eq("user_id", userId)
          .order("occurred_at", { ascending: true }),
        supabase
          .from("mastery_states")
          .select("pedagogical_node_id, mastery, evidence_count, correct_count, last_evidence_at")
          .eq("user_id", userId),
        supabase
          .from("retention_states")
          .select("pedagogical_node_id, retention, stability_days, review_count, lapse_count, last_review_at, next_review_at")
          .eq("user_id", userId),
        supabase
          .from("question_mappings")
          .select("question_id, pedagogical_node_id, official_skill_code")
          .eq("mapping_version", MAPPING_VERSION)
          .eq("evidence_allowed", true),
        supabase.from("pedagogical_nodes").select("id, name").eq("graph_version", GRAPH_VERSION),
        supabase.from("node_prerequisites").select("prerequisite_node_id, dependent_node_id").eq("graph_version", GRAPH_VERSION),
        supabase.from("mapping_review_queue").select("id", { count: "exact", head: true }).eq("review_status", "PENDING"),
      ]);

    const attempts: AttemptRecord[] = (attemptsRes.data ?? []).map((a) => ({
      occurredAt: a.occurred_at,
      isCorrect: a.is_correct,
      evidenceStatus: a.evidence_status as AttemptRecord["evidenceStatus"],
      attemptContext: a.attempt_context,
    }));
    const evidences: EvidenceRecord[] = (evidencesRes.data ?? []).map((e) => ({
      pedagogicalNodeId: e.pedagogical_node_id,
      cognitiveDimension: e.cognitive_dimension as CognitiveDimension,
      isCorrect: e.is_correct,
      isOfficialQuestion: e.is_official_question,
      occurredAt: e.occurred_at,
    }));

    const nodeNames = new Map((nodesRes.data ?? []).map((n) => [n.id, n.name]));
    const skillByNode = new Map<string, string>();
    const candidateCount = new Map<string, number>();
    for (const m of mappingsRes.data ?? []) {
      if (!m.pedagogical_node_id) continue;
      candidateCount.set(m.pedagogical_node_id, (candidateCount.get(m.pedagogical_node_id) ?? 0) + 1);
      if (!skillByNode.has(m.pedagogical_node_id)) skillByNode.set(m.pedagogical_node_id, m.official_skill_code);
    }

    const masteryByNode = new Map(
      (masteryRes.data ?? []).map((m) => [
        m.pedagogical_node_id,
        { mastery: Number(m.mastery), evidenceCount: m.evidence_count, correctCount: m.correct_count },
      ]),
    );
    const retentionByNode = new Map<string, RetentionState>(
      (retentionRes.data ?? []).map((r) => [
        r.pedagogical_node_id,
        {
          retention: Number(r.retention),
          stabilityDays: Number(r.stability_days),
          reviewCount: r.review_count,
          lapseCount: r.lapse_count,
          lastReviewAt: r.last_review_at,
          nextReviewAt: r.next_review_at,
        },
      ]),
    );

    const relevantNodes = new Set<string>([...candidateCount.keys(), ...masteryByNode.keys()]);
    const inputs: NodePriorityInput[] = [];
    const skills: SkillProgress[] = [];

    for (const nodeId of relevantNodes) {
      const mastery = masteryByNode.get(nodeId) ?? INITIAL_MASTERY;
      const retention = retentionByNode.get(nodeId) ?? INITIAL_RETENTION;
      const projected = projectedRetention(retention, now);
      const diagnosis = diagnose(mastery, projected);
      const prerequisitesReady = (prereqRes.data ?? [])
        .filter((p) => p.dependent_node_id === nodeId)
        .every((p) => (masteryByNode.get(p.prerequisite_node_id)?.mastery ?? 0) >= CONSOLIDATED_THRESHOLD);

      inputs.push({
        nodeId,
        diagnosis,
        retention,
        prerequisitesReady,
        candidateCount: candidateCount.get(nodeId) ?? 0,
      });

      if (mastery.evidenceCount > 0) {
        skills.push({
          nodeId,
          name: nodeNames.get(nodeId) ?? nodeId,
          diagnosisState: diagnosis.state,
          mastery: mastery.mastery,
          retention: projected,
          evidenceCount: mastery.evidenceCount,
          correctCount: mastery.correctCount,
          accuracy: mastery.evidenceCount ? Number((mastery.correctCount / mastery.evidenceCount).toFixed(2)) : 0,
        });
      }
    }

    const ranked = rankNodes(inputs, now);
    const byNodeInput = new Map(inputs.map((i) => [i.nodeId, i]));
    const recommendations = ranked.slice(0, 8).map((p) => {
      const input = byNodeInput.get(p.nodeId)!;
      return {
        nodeId: p.nodeId,
        name: nodeNames.get(p.nodeId) ?? p.nodeId,
        officialSkillCode: skillByNode.get(p.nodeId) ?? null,
        priority: p.priority,
        diagnosisState: p.diagnosisState,
        reasons: explainRecommendation(
          computeNodePriority(input, now),
          input.diagnosis,
          input.retention.lastReviewAt !== null,
        ),
      };
    });

    const due = dueReviews(
      [...retentionByNode.entries()].map(([nodeId, retention]) => ({ nodeId, retention })),
      now,
    ).map((d) => ({ ...d, name: nodeNames.get(d.nodeId) ?? d.nodeId }));

    return {
      generatedAt: now.toISOString(),
      engineVersion: ENGINE_VERSION,
      graphVersion: GRAPH_VERSION,
      mappingVersion: MAPPING_VERSION,
      totals: summarizeAttempts(attempts),
      completedMissions: countCompletedMissions(attempts, DEFAULT_MISSION_SIZE),
      pendingMappings: queueRes.count ?? 0,
      releasedQuestions: (mappingsRes.data ?? []).length,
      timeline: buildTimeline(attempts),
      skills: sortSkillProgress(skills),
      errorHypotheses: buildErrorHypotheses(evidences).slice(0, 10).map((h) => ({
        ...h,
        name: nodeNames.get(h.nodeId) ?? h.nodeId,
      })),
      due,
      recommendations,
    };
  });
