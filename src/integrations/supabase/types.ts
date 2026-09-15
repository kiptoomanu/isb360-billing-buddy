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
      app_settings: {
        Row: {
          data: Json
          section: string
          updated_at: string
        }
        Insert: {
          data?: Json
          section: string
          updated_at?: string
        }
        Update: {
          data?: Json
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          expiry_date: string | null
          full_name: string
          id: string
          ip_address: string | null
          loyalty_points: number
          monthly_fee: number
          phone: string | null
          plan_id: string | null
          router_id: string | null
          station_id: string | null
          status: Database["public"]["Enums"]["client_status"]
          type: Database["public"]["Enums"]["client_type"]
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          expiry_date?: string | null
          full_name: string
          id?: string
          ip_address?: string | null
          loyalty_points?: number
          monthly_fee?: number
          phone?: string | null
          plan_id?: string | null
          router_id?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          type: Database["public"]["Enums"]["client_type"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          expiry_date?: string | null
          full_name?: string
          id?: string
          ip_address?: string | null
          loyalty_points?: number
          monthly_fee?: number
          phone?: string | null
          plan_id?: string | null
          router_id?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          points: number
          reason: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          points: number
          reason?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          points?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          device_limit: number
          download_kbps: number
          id: string
          name: string
          price: number
          type: Database["public"]["Enums"]["client_type"]
          updated_at: string
          upload_kbps: number
          validity_days: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          device_limit?: number
          download_kbps?: number
          id?: string
          name: string
          price?: number
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
          upload_kbps?: number
          validity_days?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          device_limit?: number
          download_kbps?: number
          id?: string
          name?: string
          price?: number
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
          upload_kbps?: number
          validity_days?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      renewal_requests: {
        Row: {
          amount: number
          client_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          days_added: number | null
          id: string
          method: string
          note: string | null
          plan_id: string | null
          reference: string | null
          refund_amount: number | null
          refund_reason: string | null
          refunded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          days_added?: number | null
          id?: string
          method?: string
          note?: string | null
          plan_id?: string | null
          reference?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          days_added?: number | null
          id?: string
          method?: string
          note?: string | null
          plan_id?: string | null
          reference?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      router_events: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          router_id: string
          stage: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          router_id: string
          stage: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          router_id?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "router_events_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      routers: {
        Row: {
          auto_bridge: boolean
          auto_configured: boolean
          bridge_name: string
          bridge_ports: string[]
          checked_in_at: string | null
          created_at: string
          host: string
          id: string
          last_seen_at: string | null
          model: string | null
          name: string
          notes: string | null
          os_version: string | null
          password: string
          port: number
          provision_status: string
          provision_token: string
          provisioned_at: string | null
          reported_ip: string | null
          services: string[]
          station_id: string | null
          updated_at: string
          uplink_port: string
          use_https: boolean
          username: string
        }
        Insert: {
          auto_bridge?: boolean
          auto_configured?: boolean
          bridge_name?: string
          bridge_ports?: string[]
          checked_in_at?: string | null
          created_at?: string
          host: string
          id?: string
          last_seen_at?: string | null
          model?: string | null
          name: string
          notes?: string | null
          os_version?: string | null
          password: string
          port?: number
          provision_status?: string
          provision_token?: string
          provisioned_at?: string | null
          reported_ip?: string | null
          services?: string[]
          station_id?: string | null
          updated_at?: string
          uplink_port?: string
          use_https?: boolean
          username: string
        }
        Update: {
          auto_bridge?: boolean
          auto_configured?: boolean
          bridge_name?: string
          bridge_ports?: string[]
          checked_in_at?: string | null
          created_at?: string
          host?: string
          id?: string
          last_seen_at?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          os_version?: string | null
          password?: string
          port?: number
          provision_status?: string
          provision_token?: string
          provisioned_at?: string | null
          reported_ip?: string | null
          services?: string[]
          station_id?: string | null
          updated_at?: string
          uplink_port?: string
          use_https?: boolean
          username?: string
        }
        Relationships: []
      }
      stations: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "viewer"
      client_status: "active" | "expired" | "suspended"
      client_type: "pppoe" | "static" | "hotspot"
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
    Enums: {
      app_role: ["admin", "staff", "viewer"],
      client_status: ["active", "expired", "suspended"],
      client_type: ["pppoe", "static", "hotspot"],
    },
  },
} as const
