export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      calendar_events: {
        Row: {
          created_at: string | null
          description: string | null
          duration: string
          id: string
          project_id: string | null
          start_date: string
          status: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration: string
          id?: string
          project_id?: string | null
          start_date: string
          status?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: string
          id?: string
          project_id?: string | null
          start_date?: string
          status?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          file_url: string
          id: string
          name: string
          size_bytes: number
          type: string
        }
        Insert: {
          created_at?: string | null
          file_url: string
          id?: string
          name: string
          size_bytes: number
          type: string
        }
        Update: {
          created_at?: string | null
          file_url?: string
          id?: string
          name?: string
          size_bytes?: number
          type?: string
        }
        Relationships: []
      }
      gss_view_sync: {
        Row: {
          created_at: string | null
          field_mappings: Json | null
          id: string
          last_synced_at: string | null
          postgres_table_name: string
          sync_status: string | null
          updated_at: string | null
          view_name: string
        }
        Insert: {
          created_at?: string | null
          field_mappings?: Json | null
          id?: string
          last_synced_at?: string | null
          postgres_table_name: string
          sync_status?: string | null
          updated_at?: string | null
          view_name: string
        }
        Update: {
          created_at?: string | null
          field_mappings?: Json | null
          id?: string
          last_synced_at?: string | null
          postgres_table_name?: string
          sync_status?: string | null
          updated_at?: string | null
          view_name?: string
        }
        Relationships: []
      }
      image_notes: {
        Row: {
          created_at: string | null
          id: string
          media_id: string | null
          note: string
          user_avatar: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_id?: string | null
          note: string
          user_avatar?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          media_id?: string | null
          note?: string
          user_avatar?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_notes_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string | null
          description: string | null
          file_url: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_url: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_url?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          project_id: string | null
          user_avatar: string | null
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          user_avatar?: string | null
          user_name?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          user_avatar?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_areas: {
        Row: {
          color: string
          coordinates: Json
          created_at: string | null
          description: string | null
          id: string
          map_id: string | null
          name: string
        }
        Insert: {
          color: string
          coordinates: Json
          created_at?: string | null
          description?: string | null
          id?: string
          map_id?: string | null
          name: string
        }
        Update: {
          color?: string
          coordinates?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          map_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_areas_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "project_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      project_maps: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          name: string
          project_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          name: string
          project_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          name?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_maps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          name: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      user_projects: {
        Row: {
          created_at: string | null
          id: string
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          password: string
          role: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          password: string
          role?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          password?: string
          role?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_gss_table: {
        Args: {
          view_name: string
          sample_data: Json
        }
        Returns: string
      }
    }
    Enums: {
      document_type: "technical" | "business"
      event_type: "milestone" | "task" | "meeting"
      project_status: "active" | "pending" | "completed"
      reaction_type: "like" | "dislike"
      user_role: "super_admin" | "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
