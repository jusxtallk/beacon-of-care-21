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
  public: {
    Tables: {
      courses: {
        Row: {
          created_at: string
          id: string
          level: string
          slug: string
          sort_order: number
          summary: string
          title: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          slug: string
          sort_order?: number
          summary: string
          title: string
          topic_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          slug?: string
          sort_order?: number
          summary?: string
          title?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activity: {
        Row: {
          activity_date: string
          lessons_completed: number
          minutes: number
          user_id: string
        }
        Insert: {
          activity_date?: string
          lessons_completed?: number
          minutes?: number
          user_id: string
        }
        Update: {
          activity_date?: string
          lessons_completed?: number
          minutes?: number
          user_id?: string
        }
        Relationships: []
      }
      debate_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debate_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "debate_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      debate_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          lesson_id: string | null
          stance: string | null
          topic_title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          lesson_id?: string | null
          stance?: string | null
          topic_title: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          lesson_id?: string | null
          stance?: string | null
          topic_title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debate_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_gaps: {
        Row: {
          concept: string
          created_at: string
          id: string
          lesson_id: string | null
          resolved: boolean
          severity: number
          topic_id: string | null
          user_id: string
        }
        Insert: {
          concept: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          resolved?: boolean
          severity?: number
          topic_id?: string | null
          user_id: string
        }
        Update: {
          concept?: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          resolved?: boolean
          severity?: number
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_gaps_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_gaps_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          id: string
          last_seen_at: string
          lesson_id: string
          minutes_spent: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          last_seen_at?: string
          lesson_id: string
          minutes_spent?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          last_seen_at?: string
          lesson_id?: string
          minutes_spent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          bloom_label: string
          bloom_level: number
          content_md: string
          course_id: string
          created_at: string
          est_minutes: number
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          bloom_label: string
          bloom_level: number
          content_md: string
          course_id: string
          created_at?: string
          est_minutes?: number
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          bloom_label?: string
          bloom_level?: number
          content_md?: string
          course_id?: string
          created_at?: string
          est_minutes?: number
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_streak: number
          daily_goal_minutes: number
          full_name: string
          id: string
          last_active_date: string | null
          onboarded: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number
          daily_goal_minutes?: number
          full_name?: string
          id?: string
          last_active_date?: string | null
          onboarded?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number
          daily_goal_minutes?: number
          full_name?: string
          id?: string
          last_active_date?: string | null
          onboarded?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          bloom_level: number
          created_at: string
          id: string
          is_correct: boolean
          lesson_id: string
          question_id: string
          selected_index: number
          user_id: string
        }
        Insert: {
          bloom_level: number
          created_at?: string
          id?: string
          is_correct: boolean
          lesson_id: string
          question_id: string
          selected_index: number
          user_id: string
        }
        Update: {
          bloom_level?: number
          created_at?: string
          id?: string
          is_correct?: boolean
          lesson_id?: string
          question_id?: string
          selected_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          bloom_level: number
          choices: Json
          correct_index: number
          explanation: string | null
          id: string
          lesson_id: string
          prompt: string
          sort_order: number
        }
        Insert: {
          bloom_level: number
          choices: Json
          correct_index: number
          explanation?: string | null
          id?: string
          lesson_id: string
          prompt: string
          sort_order?: number
        }
        Update: {
          bloom_level?: number
          choices?: Json
          correct_index?: number
          explanation?: string | null
          id?: string
          lesson_id?: string
          prompt?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          slug: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string
          id?: string
          slug: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          slug?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          created_at: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
