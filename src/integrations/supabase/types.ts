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
      brand_stats: {
        Row: {
          avg_pure_score: number | null
          brand: string
          last_updated_at: string | null
          most_common_flag: string | null
          total_products: number | null
          total_scans: number | null
        }
        Insert: {
          avg_pure_score?: number | null
          brand: string
          last_updated_at?: string | null
          most_common_flag?: string | null
          total_products?: number | null
          total_scans?: number | null
        }
        Update: {
          avg_pure_score?: number | null
          brand?: string
          last_updated_at?: string | null
          most_common_flag?: string | null
          total_products?: number | null
          total_scans?: number | null
        }
        Relationships: []
      }
      ingredient_stats: {
        Row: {
          category: string | null
          ingredient_name: string
          last_seen_at: string | null
          total_occurrences: number | null
          unique_products: number | null
        }
        Insert: {
          category?: string | null
          ingredient_name: string
          last_seen_at?: string | null
          total_occurrences?: number | null
          unique_products?: number | null
        }
        Update: {
          category?: string | null
          ingredient_name?: string
          last_seen_at?: string | null
          total_occurrences?: number | null
          unique_products?: number | null
        }
        Relationships: []
      }
      product_submissions: {
        Row: {
          barcode: string
          brand: string | null
          created_at: string | null
          id: string
          image_url: string | null
          ingredients_raw: string | null
          notes: string | null
          product_name: string | null
          session_id: string
          status: string | null
        }
        Insert: {
          barcode: string
          brand?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          ingredients_raw?: string | null
          notes?: string | null
          product_name?: string | null
          session_id: string
          status?: string | null
        }
        Update: {
          barcode?: string
          brand?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          ingredients_raw?: string | null
          notes?: string | null
          product_name?: string | null
          session_id?: string
          status?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string
          brand: string | null
          categories_raw: string | null
          country_code: string | null
          created_at: string | null
          data_source: string | null
          first_scanned_at: string | null
          flagged_categories: string[] | null
          flagged_count: number | null
          flagged_ingredients: string[] | null
          id: string
          image_url: string | null
          ingredients_raw: string | null
          is_water: boolean | null
          last_scanned_at: string | null
          manually_verified: boolean | null
          product_name: string
          pure_score: number | null
          scan_count: number | null
          updated_at: string | null
          user_submitted: boolean | null
          water_brand: string | null
        }
        Insert: {
          barcode: string
          brand?: string | null
          categories_raw?: string | null
          country_code?: string | null
          created_at?: string | null
          data_source?: string | null
          first_scanned_at?: string | null
          flagged_categories?: string[] | null
          flagged_count?: number | null
          flagged_ingredients?: string[] | null
          id?: string
          image_url?: string | null
          ingredients_raw?: string | null
          is_water?: boolean | null
          last_scanned_at?: string | null
          manually_verified?: boolean | null
          product_name: string
          pure_score?: number | null
          scan_count?: number | null
          updated_at?: string | null
          user_submitted?: boolean | null
          water_brand?: string | null
        }
        Update: {
          barcode?: string
          brand?: string | null
          categories_raw?: string | null
          country_code?: string | null
          created_at?: string | null
          data_source?: string | null
          first_scanned_at?: string | null
          flagged_categories?: string[] | null
          flagged_count?: number | null
          flagged_ingredients?: string[] | null
          id?: string
          image_url?: string | null
          ingredients_raw?: string | null
          is_water?: boolean | null
          last_scanned_at?: string | null
          manually_verified?: boolean | null
          product_name?: string
          pure_score?: number | null
          scan_count?: number | null
          updated_at?: string | null
          user_submitted?: boolean | null
          water_brand?: string | null
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
      increment_ingredient: {
        Args: { p_category: string; p_name: string }
        Returns: undefined
      }
      increment_session_scan: {
        Args: { p_flagged_count: number; p_session_id: string }
        Returns: undefined
      }
      update_brand_stats: {
        Args: { p_brand: string; p_flag: string; p_score: number }
        Returns: undefined
      }
      upsert_product: {
        Args: {
          p_barcode: string
          p_brand: string
          p_categories_raw: string
          p_flagged_categories: string[]
          p_flagged_count: number
          p_flagged_ingredients: string[]
          p_image_url: string
          p_ingredients_raw: string
          p_is_water: boolean
          p_product_name: string
          p_pure_score: number
          p_water_brand: string
        }
        Returns: undefined
      }
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
