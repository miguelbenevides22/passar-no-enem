import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Camada de Repositório (leitura pública do Banco Mestre).
 * Nenhuma regra pedagógica vive aqui nem na UI: este módulo apenas lê dados
 * oficiais já validados na importação.
 */
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
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
}

export const getMasterBankOverview = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();

  const [version, validations, nodes, prereqs, mappings, skills, questions] = await Promise.all([
    supabase.from("master_versions").select("*").eq("is_active", true).maybeSingle(),
    supabase.from("import_validations").select("check_name, status, detail").order("created_at"),
    supabase.from("pedagogical_nodes").select("id, name, node_type, role_description").order("id"),
    supabase.from("node_prerequisites").select("prerequisite_node_id, dependent_node_id"),
    supabase
      .from("question_mappings")
      .select("question_id, official_skill_code, pedagogical_content, cognitive_dimension, confidence, node_link_status, evidence_allowed, pedagogical_node_id, release_status"),
    supabase.from("official_skills").select("code, area, official_text").order("code"),
    supabase.from("questions").select("id, bank_number, area, discipline, exam_day, official_answer, is_annulled, is_official").order("bank_number"),
  ]);

  return {
    version: version.data,
    validations: validations.data ?? [],
    nodes: nodes.data ?? [],
    prerequisites: prereqs.data ?? [],
    mappings: mappings.data ?? [],
    skills: skills.data ?? [],
    questions: questions.data ?? [],
  };
});
