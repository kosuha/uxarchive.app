export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      repositories: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          is_public: boolean;
          view_count: number;
          fork_count: number;
          fork_origin_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          is_public?: boolean;
          view_count?: number;
          fork_count?: number;
          fork_origin_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          description?: string | null;
          is_public?: boolean;
          view_count?: number;
          fork_count?: number;
          fork_origin_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          // Add relationships here if needed for type inference,
          // though manual updates usually omit deep relationship typing unless dealing with generated types.
        ];
      };
      repository_folders: {
        Row: {
          id: string;
          repository_id: string;
          parent_id: string | null;
          name: string;
          description: string | null;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          parent_id?: string | null;
          name: string;
          description?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          parent_id?: string | null;
          name?: string;
          description?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "repository_folders_repository_id_fkey";
            columns: ["repository_id"];
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "repository_folders_parent_id_fkey";
            columns: ["parent_id"];
            referencedRelation: "repository_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      assets: {
        Row: {
          id: string;
          repository_id: string | null;
          folder_id: string | null;
          storage_path: string;
          width: number | null;
          height: number | null;
          meta: Json | null;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          repository_id?: string | null;
          folder_id?: string | null;
          storage_path: string;
          width?: number | null;
          height?: number | null;
          meta?: Json | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string | null;
          folder_id?: string | null;
          storage_path?: string;
          width?: number | null;
          height?: number | null;
          meta?: Json | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assets_repository_id_fkey";
            columns: ["repository_id"];
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assets_folder_id_fkey";
            columns: ["folder_id"];
            referencedRelation: "repository_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      repository_snapshots: {
        Row: {
          id: string;
          repository_id: string;
          version_name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          version_name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          version_name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "repository_snapshots_repository_id_fkey";
            columns: ["repository_id"];
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
        ];
      };
      snapshot_items: {
        Row: {
          id: string;
          snapshot_id: string;
          item_type: "folder" | "asset";
          original_item_id: string | null;
          parent_snapshot_item_id: string | null;
          item_data: Json;
        };
        Insert: {
          id?: string;
          snapshot_id: string;
          item_type: "folder" | "asset";
          original_item_id?: string | null;
          parent_snapshot_item_id?: string | null;
          item_data: Json;
        };
        Update: {
          id?: string;
          snapshot_id?: string;
          item_type?: "folder" | "asset";
          original_item_id?: string | null;
          parent_snapshot_item_id?: string | null;
          item_data?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "snapshot_items_snapshot_id_fkey";
            columns: ["snapshot_id"];
            referencedRelation: "repository_snapshots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "snapshot_items_parent_snapshot_item_id_fkey";
            columns: ["parent_snapshot_item_id"];
            referencedRelation: "snapshot_items";
            referencedColumns: ["id"];
          },
        ];
      };
      // Legacy tables placeholders (optional, can add if needed for mixed usage)
      patterns: {
        Row: {
          // ... legacy fields
        };
        Insert: {};
        Update: {};
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
