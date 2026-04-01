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
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      buzz_signals: {
        Row: {
          id: string
          phase: Database["public"]["Enums"]["buzz_phase"]
          round_id: string
          server_received_at: string
          table_id: string
        }
        Insert: {
          id?: string
          phase?: Database["public"]["Enums"]["buzz_phase"]
          round_id: string
          server_received_at?: string
          table_id: string
        }
        Update: {
          id?: string
          phase?: Database["public"]["Enums"]["buzz_phase"]
          round_id?: string
          server_received_at?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buzz_signals_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buzz_signals_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "table_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buzz_signals_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      device_sessions: {
        Row: {
          connected_at: string
          id: string
          is_active: boolean
          last_seen_at: string
          session_token: string
          table_id: string
        }
        Insert: {
          connected_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          session_token: string
          table_id: string
        }
        Update: {
          connected_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          session_token?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "table_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          created_at: string
          eliminated_table_ids: string[]
          first_buzz_table_id: string | null
          id: string
          resolved_at: string | null
          round_number: number
          status: Database["public"]["Enums"]["round_status"]
        }
        Insert: {
          created_at?: string
          eliminated_table_ids?: string[]
          first_buzz_table_id?: string | null
          id?: string
          resolved_at?: string | null
          round_number: number
          status?: Database["public"]["Enums"]["round_status"]
        }
        Update: {
          created_at?: string
          eliminated_table_ids?: string[]
          first_buzz_table_id?: string | null
          id?: string
          resolved_at?: string | null
          round_number?: number
          status?: Database["public"]["Enums"]["round_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rounds_first_buzz_table_id_fkey"
            columns: ["first_buzz_table_id"]
            isOneToOne: false
            referencedRelation: "table_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_first_buzz_table_id_fkey"
            columns: ["first_buzz_table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      score_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          reason: string | null
          table_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          reason?: string | null
          table_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          reason?: string | null
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_ledger_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "table_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_ledger_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          table_number: number
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          table_number: number
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          table_number?: number
        }
        Relationships: []
      }
    }
    Views: {
      table_scores: {
        Row: {
          current_score: number | null
          display_name: string | null
          id: string | null
          is_active: boolean | null
          table_number: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      buzz_phase:
        | "initial"
        | "steal_1"
        | "steal_2"
        | "steal_3"
        | "steal_4"
        | "steal_5"
        | "steal_6"
        | "steal_7"
        | "steal_8"
        | "steal_9"
        | "steal_10"
      round_status:
        | "idle"
        | "buzzer_active"
        | "buzz_received"
        | "steal_active"
        | "resolved"
        | "aborted"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      buzz_phase: [
        "initial",
        "steal_1",
        "steal_2",
        "steal_3",
        "steal_4",
        "steal_5",
        "steal_6",
        "steal_7",
        "steal_8",
        "steal_9",
        "steal_10",
      ],
      round_status: [
        "idle",
        "buzzer_active",
        "buzz_received",
        "steal_active",
        "resolved",
        "aborted",
      ],
    },
  },
} as const
