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
      alternative_taps: {
        Row: {
          action: string | null
          alternative_brand: string | null
          alternative_name: string | null
          alternative_score: number | null
          created_at: string
          id: string
          scanned_product_name: string | null
          scanned_product_score: number | null
          session_id: string
        }
        Insert: {
          action?: string | null
          alternative_brand?: string | null
          alternative_name?: string | null
          alternative_score?: number | null
          created_at?: string
          id?: string
          scanned_product_name?: string | null
          scanned_product_score?: number | null
          session_id: string
        }
        Update: {
          action?: string | null
          alternative_brand?: string | null
          alternative_name?: string | null
          alternative_score?: number | null
          created_at?: string
          id?: string
          scanned_product_name?: string | null
          scanned_product_score?: number | null
          session_id?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          app_version: string | null
          barcode: string | null
          brand: string | null
          categories_raw: string | null
          created_at: string
          flagged_categories: string[] | null
          flagged_count: number | null
          flagged_ingredients: string[] | null
          id: string
          ingredients_raw: string | null
          is_water: boolean | null
          platform: string | null
          product_name: string | null
          pure_score: number | null
          session_id: string
          water_brand: string | null
        }
        Insert: {
          app_version?: string | null
          barcode?: string | null
          brand?: string | null
          categories_raw?: string | null
          created_at?: string
          flagged_categories?: string[] | null
          flagged_count?: number | null
          flagged_ingredients?: string[] | null
          id?: string
          ingredients_raw?: string | null
          is_water?: boolean | null
          platform?: string | null
          product_name?: string | null
          pure_score?: number | null
          session_id: string
          water_brand?: string | null
        }
        Update: {
          app_version?: string | null
          barcode?: string | null
          brand?: string | null
          categories_raw?: string | null
          created_at?: string
          flagged_categories?: string[] | null
          flagged_count?: number | null
          flagged_ingredients?: string[] | null
          id?: string
          ingredients_raw?: string | null
          is_water?: boolean | null
          platform?: string | null
          product_name?: string | null
          pure_score?: number | null
          session_id?: string
          water_brand?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          dietary_preferences: string[] | null
          last_active_at: string
          platform: string | null
          scan_count: number
          session_id: string
          total_ingredients_flagged: number
        }
        Insert: {
          created_at?: string
          dietary_preferences?: string[] | null
          last_active_at?: string
          platform?: string | null
          scan_count?: number
          session_id: string
          total_ingredients_flagged?: number
        }
        Update: {
          created_at?: string
          dietary_preferences?: string[] | null
          last_active_at?: string
          platform?: string | null
          scan_count?: number
          session_id?: string
          total_ingredients_flagged?: number
        }
        Relationships: []
      }
      unknown_barcodes: {
        Row: {
          barcode: string
          created_at: string
          id: string
          last_scanned_at: string
          scan_count: number
        }
        Insert: {
          barcode: string
          created_at?: string
          id?: string
          last_scanned_at?: string
          scan_count?: number
        }
        Update: {
          barcode?: string
          created_at?: string
          id?: string
          last_scanned_at?: string
          scan_count?: number
        }
        Relationships: []
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
