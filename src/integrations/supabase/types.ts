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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bets: {
        Row: {
          created_at: string
          game: string
          id: number
          is_vip: boolean
          multiplier: number
          payout: number
          user_id: string
          user_wagered: number
          username: string
          wager: number
        }
        Insert: {
          created_at?: string
          game: string
          id?: number
          is_vip?: boolean
          multiplier: number
          payout: number
          user_id: string
          user_wagered?: number
          username: string
          wager: number
        }
        Update: {
          created_at?: string
          game?: string
          id?: number
          is_vip?: boolean
          multiplier?: number
          payout?: number
          user_id?: string
          user_wagered?: number
          username?: string
          wager?: number
        }
        Relationships: [
          {
            foreignKeyName: "bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: number
          is_vip: boolean
          kind: string
          user_id: string | null
          user_wagered: number
          username: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: number
          is_vip?: boolean
          kind?: string
          user_id?: string | null
          user_wagered?: number
          username?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: number
          is_vip?: boolean
          kind?: string
          user_id?: string | null
          user_wagered?: number
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      code_redemptions: {
        Row: {
          code_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crash_bets: {
        Row: {
          auto: number | null
          cashed_at: number | null
          created_at: string
          id: number
          payout: number
          round_id: number
          settled: boolean
          user_id: string
          username: string
          wager: number
        }
        Insert: {
          auto?: number | null
          cashed_at?: number | null
          created_at?: string
          id?: number
          payout?: number
          round_id: number
          settled?: boolean
          user_id: string
          username: string
          wager: number
        }
        Update: {
          auto?: number | null
          cashed_at?: number | null
          created_at?: string
          id?: number
          payout?: number
          round_id?: number
          settled?: boolean
          user_id?: string
          username?: string
          wager?: number
        }
        Relationships: [
          {
            foreignKeyName: "crash_bets_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "crash_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crash_bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crash_rounds: {
        Row: {
          crash_point: number
          created_at: string
          ends_at: string
          id: number
          seed_hash: string
          seq: number
          server_seed: string
          settled: boolean
          starts_at: string
        }
        Insert: {
          crash_point: number
          created_at?: string
          ends_at: string
          id?: number
          seed_hash: string
          seq: number
          server_seed: string
          settled?: boolean
          starts_at: string
        }
        Update: {
          crash_point?: number
          created_at?: string
          ends_at?: string
          id?: number
          seed_hash?: string
          seq?: number
          server_seed?: string
          settled?: boolean
          starts_at?: string
        }
        Relationships: []
      }
      daily_quests: {
        Row: {
          created_at: string
          day: string
          quests: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          quests: Json
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          quests?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_quests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fair_seeds: {
        Row: {
          client_seed: string
          nonce: number
          prev_client_seed: string | null
          prev_nonce: number | null
          prev_server_seed: string | null
          prev_server_seed_hash: string | null
          server_seed: string
          server_seed_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_seed: string
          nonce?: number
          prev_client_seed?: string | null
          prev_nonce?: number | null
          prev_server_seed?: string | null
          prev_server_seed_hash?: string | null
          server_seed: string
          server_seed_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_seed?: string
          nonce?: number
          prev_client_seed?: string | null
          prev_nonce?: number | null
          prev_server_seed?: string | null
          prev_server_seed_hash?: string | null
          server_seed?: string
          server_seed_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fair_seeds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          game: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game: string
          user_id: string
        }
        Update: {
          created_at?: string
          game?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          created_at: string
          game: string
          id: string
          state: Json
          status: string
          updated_at: string
          user_id: string
          wager: number
        }
        Insert: {
          created_at?: string
          game: string
          id?: string
          state: Json
          status?: string
          updated_at?: string
          user_id: string
          wager: number
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          state?: Json
          status?: string
          updated_at?: string
          user_id?: string
          wager?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_until: string | null
          bets_count: number
          biggest_multiplier: number
          biggest_win: number
          created_at: string
          id: string
          is_vip: boolean
          total_payout: number
          total_wagered: number
          username: string
          wins_count: number
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          bets_count?: number
          biggest_multiplier?: number
          biggest_win?: number
          created_at?: string
          id: string
          is_vip?: boolean
          total_payout?: number
          total_wagered?: number
          username: string
          wins_count?: number
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          bets_count?: number
          biggest_multiplier?: number
          biggest_win?: number
          created_at?: string
          id?: string
          is_vip?: boolean
          total_payout?: number
          total_wagered?: number
          username?: string
          wins_count?: number
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          amount: number
          code: string
          created_at: string
          expires_at: string | null
          id: string
          max_redemptions: number | null
          redemptions: number
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          redemptions?: number
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          redemptions?: number
        }
        Relationships: []
      }
      pvp_games: {
        Row: {
          config: Json
          created_at: string
          creator_id: string
          creator_name: string
          id: string
          joiner_id: string | null
          joiner_name: string | null
          kind: string
          server_seed: string | null
          server_seed_hash: string
          state: Json
          status: string
          updated_at: string
          wager: number
          winner_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          creator_id: string
          creator_name: string
          id?: string
          joiner_id?: string | null
          joiner_name?: string | null
          kind: string
          server_seed?: string | null
          server_seed_hash: string
          state?: Json
          status?: string
          updated_at?: string
          wager: number
          winner_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          creator_id?: string
          creator_name?: string
          id?: string
          joiner_id?: string | null
          joiner_name?: string | null
          kind?: string
          server_seed?: string | null
          server_seed_hash?: string
          state?: Json
          status?: string
          updated_at?: string
          wager?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pvp_games_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pvp_games_joiner_id_fkey"
            columns: ["joiner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pvp_secrets: {
        Row: {
          game_id: string
          secret: Json
          server_seed: string
        }
        Insert: {
          game_id: string
          secret?: Json
          server_seed: string
        }
        Update: {
          game_id?: string
          secret?: Json
          server_seed?: string
        }
        Relationships: [
          {
            foreignKeyName: "pvp_secrets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "pvp_games"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_claims: {
        Row: {
          amount: number
          created_at: string
          day: string
          idx: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          day: string
          idx: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          day?: string
          idx?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rain_entries: {
        Row: {
          created_at: string
          rain_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          rain_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          rain_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rain_entries_rain_id_fkey"
            columns: ["rain_id"]
            isOneToOne: false
            referencedRelation: "rains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rain_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rains: {
        Row: {
          amount: number
          created_at: string
          ends_at: string
          host_id: string
          host_username: string
          id: string
          participants: number
          settled: boolean
        }
        Insert: {
          amount: number
          created_at?: string
          ends_at: string
          host_id: string
          host_username: string
          id?: string
          participants?: number
          settled?: boolean
        }
        Update: {
          amount?: number
          created_at?: string
          ends_at?: string
          host_id?: string
          host_username?: string
          id?: string
          participants?: number
          settled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "rains_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      wallets: {
        Row: {
          balance: number
          cosmetics: string[]
          last_daily_at: string | null
          last_quest_day: string | null
          last_wheel_at: string | null
          quest_streak: number
          rakeback: number
          rakeback_boost: number
          rakeback_boost_until: string | null
          updated_at: string
          user_id: string
          vault: number
          vault_interest_total: number
          vault_locked_until: string | null
          vault_since: string | null
        }
        Insert: {
          balance?: number
          cosmetics?: string[]
          last_daily_at?: string | null
          last_quest_day?: string | null
          last_wheel_at?: string | null
          quest_streak?: number
          rakeback?: number
          rakeback_boost?: number
          rakeback_boost_until?: string | null
          updated_at?: string
          user_id: string
          vault?: number
          vault_interest_total?: number
          vault_locked_until?: string | null
          vault_since?: string | null
        }
        Update: {
          balance?: number
          cosmetics?: string[]
          last_daily_at?: string | null
          last_quest_day?: string | null
          last_wheel_at?: string | null
          quest_streak?: number
          rakeback?: number
          rakeback_boost?: number
          rakeback_boost_until?: string | null
          updated_at?: string
          user_id?: string
          vault?: number
          vault_interest_total?: number
          vault_locked_until?: string | null
          vault_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wheel_spins: {
        Row: {
          created_at: string
          id: number
          label: string
          slice: number
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          label: string
          slice: number
          tier: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          label?: string
          slice?: number
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wheel_spins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_balance: {
        Args: { p_delta: number; p_user: string }
        Returns: number
      }
      admin_ban: {
        Args: { p_reason: string; p_until: string; p_user: string }
        Returns: undefined
      }
      admin_create_code: {
        Args: {
          p_amount: number
          p_code: string
          p_expires: string
          p_max: number
        }
        Returns: string
      }
      admin_delete_code: { Args: { p_id: string }; Returns: undefined }
      admin_set_admin: {
        Args: { p_admin: boolean; p_user: string }
        Returns: undefined
      }
      admin_set_vip: {
        Args: { p_user: string; p_vip: boolean }
        Returns: undefined
      }
      admin_unban: { Args: { p_user: string }; Returns: undefined }
      assert_admin: { Args: never; Returns: undefined }
      assert_not_banned: { Args: { p_user: string }; Returns: undefined }
      cancel_rain: { Args: { p_rain: string }; Returns: undefined }
      claim_daily: { Args: never; Returns: number }
      claim_rakeback: { Args: never; Returns: number }
      daily_race: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          is_vip: boolean
          total_wagered: number
          user_id: string
          username: string
          wagered: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_player: { Args: { _uid: string }; Returns: boolean }
      join_rain: { Args: { p_rain: string }; Returns: undefined }
      my_race_place: {
        Args: never
        Returns: {
          place: number
          wagered: number
        }[]
      }
      rank_index: { Args: { w: number }; Returns: number }
      record_bet: {
        Args: {
          p_game: string
          p_payout: number
          p_user: string
          p_wager: number
        }
        Returns: undefined
      }
      redeem_code: { Args: { p_code: string }; Returns: number }
      send_tip: {
        Args: { p_amount: number; p_username: string }
        Returns: number
      }
      settle_instant: {
        Args: {
          p_game: string
          p_payout: number
          p_user: string
          p_wager: number
        }
        Returns: number
      }
      settle_rains: { Args: never; Returns: number }
      settle_session: {
        Args: {
          p_game: string
          p_payout: number
          p_user: string
          p_wager: number
        }
        Returns: number
      }
      start_rain:
        | { Args: { p_amount: number }; Returns: string }
        | { Args: { p_amount: number; p_minutes: number }; Returns: string }
      username_available: { Args: { p_name: string }; Returns: boolean }
      vault_accrue: { Args: { p_user: string }; Returns: number }
      vault_collect: { Args: never; Returns: number }
      vault_deposit: { Args: { p_amount: number }; Returns: undefined }
      vault_lock: { Args: never; Returns: string }
      vault_rate: { Args: { p_user: string }; Returns: number }
      vault_withdraw: { Args: { p_amount: number }; Returns: undefined }
      wallet_credit: {
        Args: { p_amount: number; p_user: string }
        Returns: number
      }
      wallet_debit: {
        Args: { p_amount: number; p_user: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
