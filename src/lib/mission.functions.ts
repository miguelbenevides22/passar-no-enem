import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { systemClock } from "@/domain/clock";
import { diagnose, type DiagnosisState } from "@/domain/diagnosis";
import { INITIAL_MASTERY } from "@/domain/mastery";
import { buildDailyMission, DEFAULT_MISSION_SIZE } from "@/domain/mission";
import { rankNodes, type NodePriorityInput } from "@/domain/priority";
import type { QuestionCandidate } from "@/domain/question-candidate";
import { INITIAL_RETENTION, projectedRetention, type RetentionState } from "@/domain/retention";
import { dueReviews } from "@/domain/review";
import { CONSOLIDATED_THRESHOLD } from "@/domain/diagnosis";
import { GRAPH_VERSION, MAPPING_VERSION, ENGINE_VERSION } from "@/domain/engine/version";

/**
 * Missão do dia. Toda a decisão pedagógica acontece no domínio;
 * esta função apenas carrega snapshots e devolve o plano pronto.
 */
export const getDailyMission = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const now = systemClock.now();

    const [mappingsRes, masteryRes, retentionRes, prereqRes, nodesRes] = await Promise.all([
      supabase
        .from("question_mappings")
        .select("question_id, pedagogical_node_id, cognitive_dimension")
        .eq("mapping_version", MAPPING_VERSION)
        .eq("evidence_allowed", true),
      supabase.from("mastery_states").select("pedagogical_node_id, mastery, evidence_count, correct_count").eq("user_id", userId),
      supabase
        .from("retention_states")
        .select("pedagogical_node_id, retention, stability_days, review_count, lapse_count, last_review_at, next_review_at")
        .eq("user_id", userId),
      supabase
        .from("node_prerequisites")
        .select("prerequisite_node_id, dependent_node_id")
        .eq("graph_version", GRAPH_VERSION),
      supabase.from("pedagogical_nodes").select("id, name").eq("graph_version", GRAPH_VERSION),
    ]);

    const questionIds = (mappingsRes.data ?? []).map((m) => m.question_id);
    const officialRes = questionIds.length
      ? await supabase.from("questions").select("id, is_official").in("id", questionIds)
      : { data: [] as { id: string; is_official: boolean }[] };
    const officialById = new Map((officialRes.data ?? []).map((q) => [q.id, q.is_official]));

    const candidates: QuestionCandidate[] = (mappingsRes.data ?? [])
      .filter((m): m is typeof m & { pedagogical_node_id: string } => Boolean(m.pedagogical_node_id))
      .map((m) => ({
        questionId: m.question_id,
        pedagogicalNodeId: m.pedagogical_node_id,
        cognitiveDimension: m.cognitive_dimension as QuestionCandidate["cognitiveDimension"],
        isOfficialQuestion: officialById.get(m.question_id) ?? false,
      }));

    const candidateCount = new Map<string, number>();
    for (const c of candidates) candidateCount.set(c.pedagogicalNodeId, (candidateCount.get(c.pedagogicalNodeId) ?? 0) + 1);

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

    const nodeNames = new Map((nodesRes.data ?? []).map((n) => [n.id, n.name]));
    const diagnosisByNode: Record<string, DiagnosisState> = {};
    const inputs: NodePriorityInput[] = [];

    for (const nodeId of candidateCount.keys()) {
      const mastery = masteryByNode.get(nodeId) ?? INITIAL_MASTERY;
      const retention = retentionByNode.get(nodeId) ?? INITIAL_RETENTION;
      const diagnosis = diagnose(mastery, projectedRetention(retention, now));
      diagnosisByNode[nodeId] = diagnosis.state;
      const prereqsReady = (prereqRes.data ?? [])
        .filter((p) => p.dependent_node_id === nodeId)
        .every((p) => (masteryByNode.get(p.prerequisite_node_id)?.mastery ?? 0) >= CONSOLIDATED_THRESHOLD);
      inputs.push({
        nodeId,
        diagnosis,
        retention,
        prerequisitesReady: prereqsReady,
        candidateCount: candidateCount.get(nodeId) ?? 0,
      });
    }

    const ranked = rankNodes(inputs, now);
    const due = dueReviews(
      [...retentionByNode.entries()]
        .filter(([nodeId]) => candidateCount.has(nodeId))
        .map(([nodeId, retention]) => ({ nodeId, retention })),
      now,
    );
    const mission = buildDailyMission({ ranked, due, candidates, diagnosisByNode, size: DEFAULT_MISSION_SIZE });

    return {
      generatedAt: now.toISOString(),
      engineVersion: ENGINE_VERSION,
      graphVersion: GRAPH_VERSION,
      mission,
      ranking: ranked.slice(0, 15).map((r) => ({ ...r, name: nodeNames.get(r.nodeId) ?? r.nodeId })),
      due: due.map((d) => ({ ...d, name: nodeNames.get(d.nodeId) ?? d.nodeId })),
      nodeNames: Object.fromEntries(nodeNames),
    };
  });
