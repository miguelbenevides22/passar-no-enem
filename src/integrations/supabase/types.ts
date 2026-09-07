export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          attempt_context: string
          created_at: string
          evidence_status: string
          id: string
          is_correct: boolean
          mapping_version: string
          occurred_at: string
          question_id: string
          rejection_reason: string | null
          response_time_ms: number | null
          selected_answer: string | null
          user_id: string
        }
        Insert: {
          attempt_context: string
          created_at?: string
          evidence_status: string
          id?: string
          is_correct: boolean
          mapping_version: string
          occurred_at?: string
          question_id: string
          rejection_reason?: string | null
          response_time_ms?: number | null
          selected_answer?: string | null
          user_id: string
        }
        Update: {
          attempt_context?: string
          created_at?: string
          evidence_status?: string
          id?: string
          is_correct?: boolean
          mapping_version?: string
          occurred_at?: string
          question_id?: string
          rejection_reason?: string | null
          response_time_ms?: number | null
          selected_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          created_at: string
          decision: Json
          decision_hash: string
          engine_version: string
          event_type: string
          id: string
          occurred_at: string
          subject_id: string | null
          subject_kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision: Json
          decision_hash: string
          engine_version: string
          event_type: string
          id?: string
          occurred_at: string
          subject_id?: string | null
          subject_kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          decision?: Json
          decision_hash?: string
          engine_version?: string
          event_type?: string
          id?: string
          occurred_at?: string
          subject_id?: string | null
          subject_kind?: string
          user_id?: string
        }
        Relationships: []
      }
      diagnoses: {
        Row: {
          correct_count: number
          created_at: string
          details: Json
          diagnosis_state: string
          engine_version: string
          evidence_count: number
          evidence_id: string | null
          fragility: number
          id: string
          occurred_at: string
          pedagogical_node_id: string
          user_id: string
        }
        Insert: {
          correct_count: number
          created_at?: string
          details?: Json
          diagnosis_state: string
          engine_version: string
          evidence_count: number
          evidence_id?: string | null
          fragility: number
          id?: string
          occurred_at: string
          pedagogical_node_id: string
          user_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          details?: Json
          diagnosis_state?: string
          engine_version?: string
          evidence_count?: number
          evidence_id?: string | null
          fragility?: number
          id?: string
          occurred_at?: string
          pedagogical_node_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnoses_pedagogical_node_id_fkey"
            columns: ["pedagogical_node_id"]
            isOneToOne: false
            referencedRelation: "pedagogical_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      evidences: {
        Row: {
          attempt_id: string
          cognitive_dimension: string
          created_at: string
          engine_version: string
          graph_version: string
          id: string
          is_correct: boolean
          is_official_question: boolean
          mapping_version: string
          occurred_at: string
          official_skill_code: string
          pedagogical_node_id: string
          question_id: string
          user_id: string
          weight: number
        }
        Insert: {
          attempt_id: string
          cognitive_dimension: string
          created_at?: string
          engine_version: string
          graph_version: string
          id?: string
          is_correct: boolean
          is_official_question: boolean
          mapping_version: string
          occurred_at: string
          official_skill_code: string
          pedagogical_node_id: string
          question_id: string
          user_id: string
          weight: number
        }
        Update: {
          attempt_id?: string
          cognitive_dimension?: string
          created_at?: string
          engine_version?: string
          graph_version?: string
          id?: string
          is_correct?: boolean
          is_official_question?: boolean
          mapping_version?: string
          occurred_at?: string
          official_skill_code?: string
          pedagogical_node_id?: string
          question_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "evidences_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_pedagogical_node_id_fkey"
            columns: ["pedagogical_node_id"]
            isOneToOne: false
            referencedRelation: "pedagogical_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      import_validations: {
        Row: {
          check_name: string
          created_at: string
          detail: string
          id: string
          master_version_label: string
          status: string
        }
        Insert: {
          check_name: string
          created_at?: string
          detail: string
          id?: string
          master_version_label: string
          status: string
        }
        Update: {
          check_name?: string
          created_at?: string
          detail?: string
          id?: string
          master_version_label?: string
          status?: string
        }
        Relationships: []
      }
      mapping_review_queue: {
        Row: {
          candidate_node_ids: string[]
          created_at: string
          current_mapping_status: string
          id: string
          mapping_version: string
          node_link_status: string
          official_object: string | null
          official_skill_code: string
          pedagogical_content: string | null
          pedagogical_subcontent: string | null
          pending_reason: string
          question_id: string
          resolved_at: string | null
          resolved_by: string | null
          resolved_node_id: string | null
          review_status: string
          updated_at: string
        }
        Insert: {
          candidate_node_ids?: string[]
          created_at?: string
          current_mapping_status: string
          id?: string
          mapping_version: string
          node_link_status: string
          official_object?: string | null
          official_skill_code: string
          pedagogical_content?: string | null
          pedagogical_subcontent?: string | null
          pending_reason: string
          question_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_node_id?: string | null
          review_status?: string
          updated_at?: string
        }
        Update: {
          candidate_node_ids?: string[]
          created_at?: string
          current_mapping_status?: string
          id?: string
          mapping_version?: string
          node_link_status?: string
          official_object?: string | null
          official_skill_code?: string
          pedagogical_content?: string | null
          pedagogical_subcontent?: string | null
          pending_reason?: string
          question_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_node_id?: string | null
          review_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mapping_review_queue_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mapping_review_queue_resolved_node_id_fkey"
            columns: ["resolved_node_id"]
            isOneToOne: false
            referencedRelation: "pedagogical_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      master_versions: {
        Row: {
          created_at: string
          graph_version: string
          id: string
          is_active: boolean
          label: string
          mapping_version: string
          question_version: string
          source_file: string
          taxonomy_version: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          graph_version: string
          id?: string
          is_active?: boolean
          label: string
          mapping_version: string
          question_version: string
          source_file: string
          taxonomy_version: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          graph_version?: string
          id?: string
          is_active?: boolean
          label?: string
          mapping_version?: string
          question_version?: string
          source_file?: string
          taxonomy_version?: string
          updated_at?: string
        }
        Relationships: []
      }
      mastery_states: {
        Row: {
          correct_count: number
          created_at: string
          engine_version: string
          evidence_count: number
          id: string
          last_evidence_at: string | null
          mastery: number
          pedagogical_node_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          engine_version: string
          evidence_count?: number
          id?: string
          last_evidence_at?: string | null
          mastery?: number
          pedagogical_node_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          engine_version?: string
          evidence_count?: number
          id?: string
          last_evidence_at?: string | null
          mastery?: number
          pedagogical_node_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_states_pedagogical_node_id_fkey"
            columns: ["pedagogical_node_id"]
            isOneToOne: false
            referencedRelation: "pedagogical_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_map: {
        Row: {
          created_at: string
          id: string
          legacy_key: string
          legacy_kind: string
          migration_version: string
          reason: string
          status: string
          target_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          legacy_key: string
          legacy_kind: string
          migration_version: string
          reason: string
          status: string
          target_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          legacy_key?: string
          legacy_kind?: string
          migration_version?: string
          reason?: string
          status?: string
          target_id?: string | null
        }
        Relationships: []
      }
      node_prerequisites: {
        Row: {
          blocking: boolean | null
          created_at: string
          dependent_node_id: string
          graph_version: string
          id: string
          prerequisite_node_id: string
          weight: number | null
        }
        Insert: {
          blocking?: boolean | null
          created_at?: string
          dependent_node_id: string
          graph_version: string
          id?: string
          prerequisite_node_id: string
          weight?: number | null
        }
        Update: {
          blocking?: boolean | null
          created_at?: string
          dependent_node_id?: string
          graph_version?: string
          id?: string
          prerequisite_node_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "node_prerequisites_dependent_node_id_fkey"
            columns: ["dependent_node_id"]
            isOneToOne: false
            referencedRelation: "pedagogical_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "node_prerequisites_prerequisite_node_id_fkey"
            columns: ["prerequisite_node_id"]
            isOneToOne: false
            referencedRelation: "pedagogical_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      official_competencies: {
        Row: {
          area: string
          created_at: string
          id: string
          number: number
          official_text: string
          taxonomy_version: string
        }
        Insert: {
          area: string
          created_at?: string
          id: string
          number: number
          official_text: string
          taxonomy_version: string
        }
        Update: {
          area?: string
          created_at?: string
          id?: string
          number?: number
          official_text?: string
          taxonomy_version?: string
        }
        Relationships: []
      }
      official_objects: {
        Row: {
          area: string
          block: string
          created_at: string
          id: string
          official_text: string
          taxonomy_version: string
        }
        Insert: {
          area: string
          block: string
          created_at?: string
          id: string
          official_text: string
          taxonomy_version: string
        }
        Update: {
          area?: string
          block?: string
          created_at?: string
          id?: string
          official_text?: string
          taxonomy_version?: string
        }
        Relationships: []
      }
      official_skills: {
        Row: {
          area: string
          code: string
          competency_number: number
          created_at: string
          id: string
          official_text: string
          skill_index_in_competency: number
          skill_number_in_area: number
          taxonomy_version: string
        }
        Insert: {
          area: string
          code: string
          competency_number: number
          created_at?: string
          id: string
          official_text: string
          skill_index_in_competency: number
          skill_number_in_area: number
          taxonomy_version: string
        }
        Update: {
          area?: string
          code?: string
          competency_number?: number
          created_at?: string
          id?: string
          official_text?: string
          skill_index_in_competency?: number
          skill_number_in_area?: number
          taxonomy_version?: string
        }
        Relationships: []
      }
      pedagogical_nodes: {
        Row: {
          created_at: string
          graph_version: string
          id: string
          name: string
          node_type: string
          role_description: string | null
        }
        Insert: {
          created_at?: string
          graph_version: string
          id: string
          name: string
          node_type: string
          role_description?: string | null
        }
        Update: {
          created_at?: string
          graph_version?: string
          id?: string
          name?: string
          node_type?: string
          role_description?: string | null
        }
        Relationships: []
      }
      question_mappings: {
        Row: {
          cognitive_dimension: string
          confidence: number
          created_at: string
          evidence_allowed: boolean
          id: string
          justification: string | null
          mapping_status: string
          mapping_version: string
          node_link_status: string
          official_object: string | null
          official_skill_code: string
          pedagogical_content: string | null
          pedagogical_node_id: string | null
          pedagogical_subcontent: string | null
          question_id: string
          release_status: string
          secondary_skill_code: string | null
        }
        Insert: {
          cognitive_dimension: string
          confidence: number
          created_at?: string
          evidence_allowed?: boolean
          id?: string
          justification?: string | null
          mapping_status: string
          mapping_version: string
          node_link_status: string
          official_object?: string | null
          official_skill_code: string
          pedagogical_content?: string | null
          pedagogical_node_id?: string | null
          pedagogical_subcontent?: string | null
          question_id: string
          release_status: string
          secondary_skill_code?: string | null
        }
        Update: {
          cognitive_dimension?: string
          confidence?: number
          created_at?: string
          evidence_allowed?: boolean
          id?: string
          justification?: string | null
          mapping_status?: string
          mapping_version?: string
          node_link_status?: string
          official_object?: string | null
          official_skill_code?: string
          pedagogical_content?: string | null
          pedagogical_node_id?: string | null
          pedagogical_subcontent?: string | null
          question_id?: string
          release_status?: string
          secondary_skill_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_mappings_pedagogical_node_id_fkey"
            columns: ["pedagogical_node_id"]
            isOneToOne: false
            referencedRelation: "pedagogical_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_mappings_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer_english: string | null
          answer_spanish: string | null
          area: string
          bank_number: number
          created_at: string
          discipline: string | null
          exam_day: number | null
          exam_year: number
          id: string
          is_annulled: boolean
          is_official: boolean
          official_answer: string | null
          question_version: string
          raw_extract: string | null
          source_file: string | null
          source_type: string
          status: string
        }
        Insert: {
          answer_english?: string | null
          answer_spanish?: string | null
          area: string
          bank_number: number
          created_at?: string
          discipline?: string | null
          exam_day?: number | null
          exam_year: number
          id: string
          is_annulled?: boolean
          is_official: boolean
          official_answer?: string | null
          question_version: string
          raw_extract?: string | null
          source_file?: string | null
          source_type: string
          status: string
        }
        Update: {
          answer_english?: string | null
          answer_spanish?: string | null
          area?: string
          bank_number?: number
          created_at?: string
          discipline?: string | null
          exam_day?: number | null
          exam_year?: number
          id?: string
          is_annulled?: boolean
          is_official?: boolean
          official_answer?: string | null
          question_version?: string
          raw_extract?: string | null
          source_file?: string | null
          source_type?: string
          status?: string
        }
        Relationships: []
      }
      retention_states: {
        Row: {
          created_at: string
          engine_version: string
          id: string
          lapse_count: number
          last_review_at: string | null
          next_review_at: string | null
          pedagogical_node_id: string
          retention: number
          review_count: number
          stability_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engine_version: string
          id?: string
          lapse_count?: number
          last_review_at?: string | null
          next_review_at?: string | null
          pedagogical_node_id: string
          retention?: number
          review_count?: number
          stability_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          engine_version?: string
          id?: string
          lapse_count?: number
          last_review_at?: string | null
          next_review_at?: string | null
          pedagogical_node_id?: string
          retention?: number
          review_count?: number
          stability_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retention_states_pedagogical_node_id_fkey"
            columns: ["pedagogical_node_id"]
            isOneToOne: false
            referencedRelation: "pedagogical_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      evaluate_evidence_gate: {
        Args: { _mapping_version: string; _question_id: string }
        Returns: Json
      }
      record_attempt: { Args: { _payload: Json }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
