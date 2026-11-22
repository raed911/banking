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
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          merchant_id: string
          name: string
          prefix: string
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          merchant_id: string
          name: string
          prefix: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          merchant_id?: string
          name?: string
          prefix?: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      apple_device_registrations: {
        Row: {
          created_at: string
          device_library_identifier: string
          id: string
          pass_id: string
          push_token: string
        }
        Insert: {
          created_at?: string
          device_library_identifier: string
          id?: string
          pass_id: string
          push_token: string
        }
        Update: {
          created_at?: string
          device_library_identifier?: string
          id?: string
          pass_id?: string
          push_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "apple_device_registrations_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "wallet_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: number
          ip: unknown
          merchant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: never
          ip?: unknown
          merchant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: never
          ip?: unknown
          merchant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_deliveries: {
        Row: {
          campaign_id: string
          created_at: string
          customer_id: string
          error: string | null
          id: string
          merchant_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          customer_id: string
          error?: string | null
          id?: string
          merchant_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          customer_id?: string
          error?: string | null
          id?: string
          merchant_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_deliveries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_deliveries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_deliveries_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channel: Database["public"]["Enums"]["campaign_channel"]
          content: Json
          coupon_id: string | null
          created_at: string
          created_by: string | null
          id: string
          merchant_id: string
          name: string
          program_id: string | null
          scheduled_at: string | null
          segment: Json
          sent_at: string | null
          stats: Json
          status: Database["public"]["Enums"]["campaign_status"]
          subject: string | null
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["campaign_channel"]
          content?: Json
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          merchant_id: string
          name: string
          program_id?: string | null
          scheduled_at?: string | null
          segment?: Json
          sent_at?: string | null
          stats?: Json
          status?: Database["public"]["Enums"]["campaign_status"]
          subject?: string | null
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["campaign_channel"]
          content?: Json
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          merchant_id?: string
          name?: string
          program_id?: string | null
          scheduled_at?: string | null
          segment?: Json
          sent_at?: string | null
          stats?: Json
          status?: Database["public"]["Enums"]["campaign_status"]
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      card_designs: {
        Row: {
          accent_color: string
          back_fields: Json
          background_color: string
          barcode_format: string
          foreground_color: string
          header_label: string | null
          icon_path: string | null
          label_color: string
          logo_path: string | null
          logo_text: string | null
          merchant_id: string
          program_id: string
          secondary_fields: Json
          stamp_icon: string
          strip_path: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string
          back_fields?: Json
          background_color?: string
          barcode_format?: string
          foreground_color?: string
          header_label?: string | null
          icon_path?: string | null
          label_color?: string
          logo_path?: string | null
          logo_text?: string | null
          merchant_id: string
          program_id: string
          secondary_fields?: Json
          stamp_icon?: string
          strip_path?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string
          back_fields?: Json
          background_color?: string
          barcode_format?: string
          foreground_color?: string
          header_label?: string | null
          icon_path?: string | null
          label_color?: string
          logo_path?: string | null
          logo_text?: string | null
          merchant_id?: string
          program_id?: string
          secondary_fields?: Json
          stamp_icon?: string
          strip_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_designs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_designs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          business: string | null
          created_at: string
          email: string
          handled_at: string | null
          id: string
          locale: string | null
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          business?: string | null
          created_at?: string
          email: string
          handled_at?: string | null
          id?: string
          locale?: string | null
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          business?: string | null
          created_at?: string
          email?: string
          handled_at?: string | null
          id?: string
          locale?: string | null
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          card_id: string | null
          coupon_id: string
          created_at: string
          customer_id: string | null
          id: string
          idempotency_key: string
          location_id: string | null
          merchant_id: string
          redeemed_by: string | null
        }
        Insert: {
          card_id?: string | null
          coupon_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          idempotency_key: string
          location_id?: string | null
          merchant_id: string
          redeemed_by?: string | null
        }
        Update: {
          card_id?: string | null
          coupon_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          idempotency_key?: string
          location_id?: string | null
          merchant_id?: string
          redeemed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          kind: Database["public"]["Enums"]["coupon_kind"]
          max_redemptions: number | null
          merchant_id: string
          min_purchase_millimes: number | null
          name: string
          per_customer_limit: number
          program_id: string | null
          redemptions_count: number
          starts_at: string | null
          status: Database["public"]["Enums"]["coupon_status"]
          terms: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["coupon_kind"]
          max_redemptions?: number | null
          merchant_id: string
          min_purchase_millimes?: number | null
          name: string
          per_customer_limit?: number
          program_id?: string | null
          redemptions_count?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["coupon_status"]
          terms?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["coupon_kind"]
          max_redemptions?: number | null
          merchant_id?: string
          min_purchase_millimes?: number | null
          name?: string
          per_customer_limit?: number
          program_id?: string | null
          redemptions_count?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["coupon_status"]
          terms?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birthday: string | null
          consent_at: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          enrolled_location_id: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string | null
          last_visit_at: string | null
          locale: string
          marketing_consent: boolean
          merchant_id: string
          notes: string | null
          phone: string | null
          source: string
          tags: string[]
          total_visits: number
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          consent_at?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          enrolled_location_id?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name?: string | null
          last_visit_at?: string | null
          locale?: string
          marketing_consent?: boolean
          merchant_id: string
          notes?: string | null
          phone?: string | null
          source?: string
          tags?: string[]
          total_visits?: number
          updated_at?: string
        }
        Update: {
          birthday?: string | null
          consent_at?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          enrolled_location_id?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string | null
          last_visit_at?: string | null
          locale?: string
          marketing_consent?: boolean
          merchant_id?: string
          notes?: string | null
          phone?: string | null
          source?: string
          tags?: string[]
          total_visits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_enrolled_location_id_fkey"
            columns: ["enrolled_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_links: {
        Row: {
          code: string
          collect_birthday: boolean
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          location_id: string | null
          max_uses: number | null
          merchant_id: string
          name: string
          program_id: string
          require_email: boolean
          require_phone: boolean
          updated_at: string
          uses: number
        }
        Insert: {
          code?: string
          collect_birthday?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          max_uses?: number | null
          merchant_id: string
          name?: string
          program_id: string
          require_email?: boolean
          require_phone?: boolean
          updated_at?: string
          uses?: number
        }
        Update: {
          code?: string
          collect_birthday?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          max_uses?: number | null
          merchant_id?: string
          name?: string
          program_id?: string
          require_email?: boolean
          require_phone?: boolean
          updated_at?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_links_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_links_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_links_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_signals: {
        Row: {
          actor_id: string | null
          card_id: string | null
          created_at: string
          customer_id: string | null
          details: Json
          id: string
          merchant_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          rule: string
          severity: string
        }
        Insert: {
          actor_id?: string | null
          card_id?: string | null
          created_at?: string
          customer_id?: string | null
          details?: Json
          id?: string
          merchant_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule: string
          severity?: string
        }
        Update: {
          actor_id?: string | null
          card_id?: string | null
          created_at?: string
          customer_id?: string | null
          details?: Json
          id?: string
          merchant_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_signals_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_signals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_signals_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          last_error: string | null
          last_verified_at: string | null
          merchant_id: string | null
          provider: string
          secret_ciphertext: string | null
          secret_hints: Json
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          last_error?: string | null
          last_verified_at?: string | null
          merchant_id?: string | null
          provider: string
          secret_ciphertext?: string | null
          secret_hints?: Json
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          last_error?: string | null
          last_verified_at?: string | null
          merchant_id?: string | null
          provider?: string
          secret_ciphertext?: string | null
          secret_hints?: Json
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          location_ids: string[] | null
          merchant_id: string
          revoked_at: string | null
          role_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          location_ids?: string[] | null
          merchant_id: string
          revoked_at?: string | null
          role_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          location_ids?: string[] | null
          merchant_id?: string
          revoked_at?: string | null
          role_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          currency: string
          due_at: string | null
          id: string
          issued_at: string
          line_items: Json
          merchant_id: string
          number: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string | null
          subtotal_millimes: number
          tax_millimes: number
          total_millimes: number
        }
        Insert: {
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          issued_at?: string
          line_items?: Json
          merchant_id: string
          number: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          subtotal_millimes: number
          tax_millimes?: number
          total_millimes: number
        }
        Update: {
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          issued_at?: string
          line_items?: Json
          merchant_id?: string
          number?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          subtotal_millimes?: number
          tax_millimes?: number
          total_millimes?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          merchant_id: string
          name: string
          nfc_reader_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          merchant_id: string
          name: string
          nfc_reader_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          merchant_id?: string
          name?: string
          nfc_reader_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_cards: {
        Row: {
          balance: number
          created_at: string
          customer_id: string
          id: string
          last_activity_at: string | null
          lifetime_earned: number
          lifetime_redeemed: number
          merchant_id: string
          program_id: string
          public_token: string
          rewards_earned: number
          serial: string
          status: Database["public"]["Enums"]["card_status"]
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          customer_id: string
          id?: string
          last_activity_at?: string | null
          lifetime_earned?: number
          lifetime_redeemed?: number
          merchant_id: string
          program_id: string
          public_token?: string
          rewards_earned?: number
          serial?: string
          status?: Database["public"]["Enums"]["card_status"]
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          customer_id?: string
          id?: string
          last_activity_at?: string | null
          lifetime_earned?: number
          lifetime_redeemed?: number
          merchant_id?: string
          program_id?: string
          public_token?: string
          rewards_earned?: number
          serial?: string
          status?: Database["public"]["Enums"]["card_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_cards_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_cards_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          cooldown_minutes: number
          created_at: string
          description: string | null
          id: string
          max_earn_per_day: number
          max_earn_per_transaction: number
          merchant_id: string
          name: string
          points_expire_days: number | null
          points_per_unit: number | null
          reward_title: string | null
          settings: Json
          stamps_required: number | null
          status: Database["public"]["Enums"]["program_status"]
          terms: string | null
          type: Database["public"]["Enums"]["program_type"]
          updated_at: string
          welcome_bonus: number
        }
        Insert: {
          cooldown_minutes?: number
          created_at?: string
          description?: string | null
          id?: string
          max_earn_per_day?: number
          max_earn_per_transaction?: number
          merchant_id: string
          name: string
          points_expire_days?: number | null
          points_per_unit?: number | null
          reward_title?: string | null
          settings?: Json
          stamps_required?: number | null
          status?: Database["public"]["Enums"]["program_status"]
          terms?: string | null
          type: Database["public"]["Enums"]["program_type"]
          updated_at?: string
          welcome_bonus?: number
        }
        Update: {
          cooldown_minutes?: number
          created_at?: string
          description?: string | null
          id?: string
          max_earn_per_day?: number
          max_earn_per_transaction?: number
          merchant_id?: string
          name?: string
          points_expire_days?: number | null
          points_per_unit?: number | null
          reward_title?: string | null
          settings?: Json
          stamps_required?: number | null
          status?: Database["public"]["Enums"]["program_status"]
          terms?: string | null
          type?: Database["public"]["Enums"]["program_type"]
          updated_at?: string
          welcome_bonus?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          amount: number
          balance_after: number
          card_id: string
          created_at: string
          customer_id: string
          id: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          location_id: string | null
          merchant_id: string
          metadata: Json
          note: string | null
          performed_by: string | null
          program_id: string
          purchase_amount_millimes: number | null
          reversed_transaction_id: string | null
          reward_id: string | null
          source: string
        }
        Insert: {
          amount: number
          balance_after: number
          card_id: string
          created_at?: string
          customer_id: string
          id?: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          location_id?: string | null
          merchant_id: string
          metadata?: Json
          note?: string | null
          performed_by?: string | null
          program_id: string
          purchase_amount_millimes?: number | null
          reversed_transaction_id?: string | null
          reward_id?: string | null
          source?: string
        }
        Update: {
          amount?: number
          balance_after?: number
          card_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          idempotency_key?: string
          kind?: Database["public"]["Enums"]["ledger_kind"]
          location_id?: string | null
          merchant_id?: string
          metadata?: Json
          note?: string | null
          performed_by?: string | null
          program_id?: string
          purchase_amount_millimes?: number | null
          reversed_transaction_id?: string | null
          reward_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_reversed_transaction_id_fkey"
            columns: ["reversed_transaction_id"]
            isOneToOne: false
            referencedRelation: "loyalty_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_tx_reward_fk"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_members: {
        Row: {
          created_at: string
          id: string
          last_active_at: string | null
          location_ids: string[] | null
          merchant_id: string
          pin_hash: string | null
          role_id: string
          status: Database["public"]["Enums"]["member_status"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_active_at?: string | null
          location_ids?: string[] | null
          merchant_id: string
          pin_hash?: string | null
          role_id: string
          status?: Database["public"]["Enums"]["member_status"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_active_at?: string | null
          location_ids?: string[] | null
          merchant_id?: string
          pin_hash?: string | null
          role_id?: string
          status?: Database["public"]["Enums"]["member_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_members_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          accent_color: string
          address: string | null
          brand_color: string
          city: string | null
          country: string
          created_at: string
          created_by: string | null
          currency: string
          email: string | null
          id: string
          industry: string | null
          legal_name: string | null
          locale: string
          logo_path: string | null
          name: string
          onboarding_completed_at: string | null
          phone: string | null
          settings: Json
          slug: string
          status: Database["public"]["Enums"]["merchant_status"]
          suspended_at: string | null
          suspended_reason: string | null
          tax_id: string | null
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          accent_color?: string
          address?: string | null
          brand_color?: string
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          email?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          locale?: string
          logo_path?: string | null
          name: string
          onboarding_completed_at?: string | null
          phone?: string | null
          settings?: Json
          slug: string
          status?: Database["public"]["Enums"]["merchant_status"]
          suspended_at?: string | null
          suspended_reason?: string | null
          tax_id?: string | null
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          accent_color?: string
          address?: string | null
          brand_color?: string
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          email?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          locale?: string
          logo_path?: string | null
          name?: string
          onboarding_completed_at?: string | null
          phone?: string | null
          settings?: Json
          slug?: string
          status?: Database["public"]["Enums"]["merchant_status"]
          suspended_at?: string | null
          suspended_reason?: string | null
          tax_id?: string | null
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          merchant_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          merchant_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          merchant_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_provider_events: {
        Row: {
          created_at: string
          error: string | null
          event_id: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          type: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider: string
          type: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          type?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_millimes: number
          created_at: string
          currency: string
          id: string
          invoice_id: string | null
          merchant_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          provider: string
          received_at: string
          received_by: string | null
          reference: string | null
        }
        Insert: {
          amount_millimes: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          merchant_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          provider?: string
          received_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Update: {
          amount_millimes?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          merchant_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          provider?: string
          received_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_prices: {
        Row: {
          amount_millimes: number
          badge: string | null
          created_at: string
          currency: string
          id: string
          interval_months: number
          is_active: boolean
          label: string | null
          period: Database["public"]["Enums"]["billing_period"]
          plan_id: string
        }
        Insert: {
          amount_millimes: number
          badge?: string | null
          created_at?: string
          currency?: string
          id?: string
          interval_months: number
          is_active?: boolean
          label?: string | null
          period: Database["public"]["Enums"]["billing_period"]
          plan_id: string
        }
        Update: {
          amount_millimes?: number
          badge?: string | null
          created_at?: string
          currency?: string
          id?: string
          interval_months?: number
          is_active?: boolean
          label?: string | null
          period?: Database["public"]["Enums"]["billing_period"]
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_public: boolean
          key: string
          limits: Json
          name: string
          sort: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_public?: boolean
          key: string
          limits?: Json
          name: string
          sort?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_public?: boolean
          key?: string
          limits?: Json
          name?: string
          sort?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          full_name: string | null
          id: string
          last_merchant_id: string | null
          locale: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          last_merchant_id?: string | null
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_merchant_id?: string | null
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_last_merchant_fk"
            columns: ["last_merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          card_id: string
          code: string
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          location_id: string | null
          merchant_id: string
          redeemed_at: string | null
          redeemed_by: string | null
          reward_id: string
          status: Database["public"]["Enums"]["redemption_status"]
          transaction_id: string | null
        }
        Insert: {
          card_id: string
          code?: string
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          location_id?: string | null
          merchant_id: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          reward_id: string
          status?: Database["public"]["Enums"]["redemption_status"]
          transaction_id?: string | null
        }
        Update: {
          card_id?: string
          code?: string
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          location_id?: string | null
          merchant_id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          reward_id?: string
          status?: Database["public"]["Enums"]["redemption_status"]
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "loyalty_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          cost: number
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          is_active: boolean
          merchant_id: string
          name: string
          program_id: string
          sort: number
          stock: number | null
          updated_at: string
          valid_days: number | null
        }
        Insert: {
          cost: number
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          merchant_id: string
          name: string
          program_id: string
          sort?: number
          stock?: number | null
          updated_at?: string
          valid_days?: number | null
        }
        Update: {
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          merchant_id?: string
          name?: string
          program_id?: string
          sort?: number
          stock?: number | null
          updated_at?: string
          valid_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          merchant_id: string
          name: string
          permissions: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          merchant_id: string
          name: string
          permissions?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          merchant_id?: string
          name?: string
          permissions?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          merchant_id: string
          notes: string | null
          plan_id: string
          price_id: string | null
          provider: string
          provider_ref: string | null
          quantity: number
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          merchant_id: string
          notes?: string | null
          plan_id: string
          price_id?: string | null
          provider?: string
          provider_ref?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          merchant_id?: string
          notes?: string | null
          plan_id?: string
          price_id?: string | null
          provider?: string
          provider_ref?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "plan_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          context: Json
          created_at: string
          id: number
          level: string
          message: string
          source: string
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: never
          level: string
          message: string
          source: string
        }
        Update: {
          context?: Json
          created_at?: string
          id?: never
          level?: string
          message?: string
          source?: string
        }
        Relationships: []
      }
      wallet_passes: {
        Row: {
          auth_token_hash: string | null
          card_id: string
          created_at: string
          google_class_id: string | null
          google_object_id: string | null
          id: string
          installed_at: string | null
          last_pushed_at: string | null
          last_updated_at: string
          merchant_id: string
          pass_type_identifier: string | null
          platform: Database["public"]["Enums"]["wallet_platform"]
          removed_at: string | null
          serial_number: string
          version: number
        }
        Insert: {
          auth_token_hash?: string | null
          card_id: string
          created_at?: string
          google_class_id?: string | null
          google_object_id?: string | null
          id?: string
          installed_at?: string | null
          last_pushed_at?: string | null
          last_updated_at?: string
          merchant_id: string
          pass_type_identifier?: string | null
          platform: Database["public"]["Enums"]["wallet_platform"]
          removed_at?: string | null
          serial_number: string
          version?: number
        }
        Update: {
          auth_token_hash?: string | null
          card_id?: string
          created_at?: string
          google_class_id?: string | null
          google_object_id?: string | null
          id?: string
          installed_at?: string | null
          last_pushed_at?: string | null
          last_updated_at?: string
          merchant_id?: string
          pass_type_identifier?: string | null
          platform?: Database["public"]["Enums"]["wallet_platform"]
          removed_at?: string | null
          serial_number?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "wallet_passes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_passes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { p_token_hash: string }; Returns: string }
      admin_extend_trial: {
        Args: { p_days: number; p_merchant_id: string }
        Returns: undefined
      }
      admin_merchants: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
        }
        Returns: {
          cards: number
          city: string
          created_at: string
          current_period_end: string
          customers: number
          id: string
          last_activity: string
          name: string
          owner_email: string
          period: Database["public"]["Enums"]["billing_period"]
          phone: string
          quantity: number
          slug: string
          status: Database["public"]["Enums"]["merchant_status"]
          sub_status: Database["public"]["Enums"]["subscription_status"]
          total_count: number
          trial_ends_at: string
        }[]
      }
      admin_record_payment: {
        Args: {
          p_amount_millimes: number
          p_invoice_id?: string
          p_merchant_id: string
          p_method: Database["public"]["Enums"]["payment_method"]
          p_notes?: string
          p_price_id: string
          p_quantity: number
          p_reference?: string
        }
        Returns: Json
      }
      admin_set_merchant_status: {
        Args: {
          p_merchant_id: string
          p_reason?: string
          p_status: Database["public"]["Enums"]["merchant_status"]
        }
        Returns: undefined
      }
      apply_loyalty_transaction: {
        Args: {
          p_amount: number
          p_card_id: string
          p_idempotency_key: string
          p_kind: Database["public"]["Enums"]["ledger_kind"]
          p_location_id?: string
          p_note?: string
          p_purchase_millimes?: number
          p_source?: string
        }
        Returns: Json
      }
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      create_invitation: {
        Args: {
          p_email: string
          p_location_ids?: string[]
          p_merchant_id: string
          p_role_id: string
          p_token_hash: string
        }
        Returns: string
      }
      create_merchant: {
        Args: {
          p_city?: string
          p_industry?: string
          p_locale?: string
          p_name: string
          p_phone?: string
          p_slug: string
        }
        Returns: string
      }
      enroll_customer: {
        Args: {
          p_birthday?: string
          p_email: string
          p_first_name: string
          p_last_name: string
          p_link_code: string
          p_locale?: string
          p_marketing_consent?: boolean
          p_phone: string
        }
        Returns: Json
      }
      has_merchant_permission: {
        Args: { mid: string; perm: string }
        Returns: boolean
      }
      invitation_preview: { Args: { p_token_hash: string }; Returns: Json }
      is_merchant_member: { Args: { mid: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      merchant_analytics: {
        Args: { p_days?: number; p_merchant_id: string }
        Returns: Json
      }
      merchant_is_entitled: { Args: { p_merchant: string }; Returns: boolean }
      merchant_overview: {
        Args: { p_days?: number; p_merchant_id: string }
        Returns: Json
      }
      merchant_team: {
        Args: { p_merchant_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          last_active_at: string
          location_ids: string[]
          member_id: string
          role_id: string
          role_key: string
          role_name: string
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }[]
      }
      my_permissions: { Args: { mid: string }; Returns: string[] }
      platform_overview: { Args: { p_days?: number }; Returns: Json }
      redeem_coupon: {
        Args: {
          p_card_id: string
          p_code: string
          p_idempotency_key: string
          p_location_id?: string
          p_merchant_id: string
        }
        Returns: Json
      }
      redeem_reward: {
        Args: {
          p_card_id: string
          p_idempotency_key: string
          p_location_id?: string
          p_reward_id: string
          p_source?: string
        }
        Returns: Json
      }
      request_subscription_invoice: {
        Args: { p_merchant_id: string; p_price_id: string; p_quantity?: number }
        Returns: string
      }
      reverse_transaction: {
        Args: { p_reason: string; p_transaction_id: string }
        Returns: Json
      }
    }
    Enums: {
      billing_period: "monthly" | "semiannual" | "annual"
      campaign_channel: "email" | "wallet" | "sms"
      campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "sent"
        | "canceled"
        | "failed"
      card_status: "active" | "blocked" | "archived"
      coupon_kind: "percent" | "fixed" | "free_item" | "custom"
      coupon_status: "draft" | "active" | "paused" | "expired" | "archived"
      integration_status: "not_configured" | "configured" | "verified" | "error"
      invoice_status: "draft" | "open" | "paid" | "void"
      job_status: "pending" | "running" | "done" | "failed"
      ledger_kind: "earn" | "redeem" | "adjust" | "expire" | "reverse"
      member_status: "active" | "invited" | "disabled"
      merchant_status: "active" | "suspended" | "closed"
      payment_method: "cash" | "bank_transfer" | "card" | "cheque" | "other"
      program_status: "draft" | "active" | "paused" | "archived"
      program_type: "stamps" | "points" | "visits"
      redemption_status: "issued" | "redeemed" | "expired" | "canceled"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "expired"
        | "canceled"
      wallet_platform: "apple" | "google"
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
      billing_period: ["monthly", "semiannual", "annual"],
      campaign_channel: ["email", "wallet", "sms"],
      campaign_status: [
        "draft",
        "scheduled",
        "sending",
        "sent",
        "canceled",
        "failed",
      ],
      card_status: ["active", "blocked", "archived"],
      coupon_kind: ["percent", "fixed", "free_item", "custom"],
      coupon_status: ["draft", "active", "paused", "expired", "archived"],
      integration_status: ["not_configured", "configured", "verified", "error"],
      invoice_status: ["draft", "open", "paid", "void"],
      job_status: ["pending", "running", "done", "failed"],
      ledger_kind: ["earn", "redeem", "adjust", "expire", "reverse"],
      member_status: ["active", "invited", "disabled"],
      merchant_status: ["active", "suspended", "closed"],
      payment_method: ["cash", "bank_transfer", "card", "cheque", "other"],
      program_status: ["draft", "active", "paused", "archived"],
      program_type: ["stamps", "points", "visits"],
      redemption_status: ["issued", "redeemed", "expired", "canceled"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "expired",
        "canceled",
      ],
      wallet_platform: ["apple", "google"],
    },
  },
} as const
