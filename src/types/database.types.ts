export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      addons: {
        Row: {
          id: string
          slug: string
          name: string
          billing_cycle: "monthly" | "yearly"
          currency: string
          amount_cents: number
          stripe_price_id: string
          trial_days: number | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          billing_cycle: "monthly" | "yearly"
          currency?: string
          amount_cents: number
          stripe_price_id: string
          trial_days?: number | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          billing_cycle?: "monthly" | "yearly"
          currency?: string
          amount_cents?: number
          stripe_price_id?: string
          trial_days?: number | null
          active?: boolean
          created_at?: string
        }
      }
      empresa_addons: {
        Row: {
          empresa_id: string
          addon_slug: string
          billing_cycle: "monthly" | "yearly"
          status: "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired"
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          empresa_id: string
          addon_slug: string
          billing_cycle: "monthly" | "yearly"
          status: "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired"
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          empresa_id?: string
          addon_slug?: string
          billing_cycle?: "monthly" | "yearly"
          status?: "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired"
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      empresas: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          razao_social: string
          fantasia: string | null
          cnpj: string | null
          logotipo_url: string | null
          telefone: string | null
          email: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          endereco_complemento: string | null
          endereco_bairro: string | null
          endereco_cidade: string | null
          endereco_uf: string | null
          endereco_cep: string | null
          stripe_customer_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          razao_social: string
          fantasia?: string | null
          cnpj?: string | null
          logotipo_url?: string | null
          telefone?: string | null
          email?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_complemento?: string | null
          endereco_bairro?: string | null
          endereco_cidade?: string | null
          endereco_uf?: string | null
          endereco_cep?: string | null
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          razao_social?: string
          fantasia?: string | null
          cnpj?: string | null
          logotipo_url?: string | null
          telefone?: string | null
          email?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_complemento?: string | null
          endereco_bairro?: string | null
          endereco_cidade?: string | null
          endereco_uf?: string | null
          endereco_cep?: string | null
          stripe_customer_id?: string | null
        }
      }
      empresa_usuarios: {
        Row: {
          empresa_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          empresa_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          empresa_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          nome_completo: string | null
          cpf: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          nome_completo?: string | null
          cpf?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          nome_completo?: string | null
          cpf?: string | null
        }
      }
      plans: {
        Row: {
          id: string
          slug: string
          name: string
          billing_cycle: "monthly" | "yearly"
          currency: string
          amount_cents: number
          stripe_price_id: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          billing_cycle: "monthly" | "yearly"
          currency?: string
          amount_cents: number
          stripe_price_id: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          billing_cycle?: "monthly" | "yearly"
          currency?: string
          amount_cents?: number
          stripe_price_id?: string
          active?: boolean
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          empresa_id: string
          status: "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired"
          current_period_end: string | null
          created_at: string
          updated_at: string
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          plan_slug: string | null
          billing_cycle: "monthly" | "yearly" | null
          cancel_at_period_end: boolean
        }
        Insert: {
          id?: string
          empresa_id: string
          status: "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired"
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          plan_slug?: string | null
          billing_cycle?: "monthly" | "yearly" | null
          cancel_at_period_end?: boolean
        }
        Update: {
          id?: string
          empresa_id?: string
          status?: "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired"
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          plan_slug?: string | null
          billing_cycle?: "monthly" | "yearly" | null
          cancel_at_period_end?: boolean
        }
      }
    }
    Views: {
      empresa_features: {
        Row: {
          empresa_id: string | null
          revo_send_enabled: boolean | null
        }
      }
    }
    Functions: {
      create_empresa_and_link_owner: {
        Args: {
          p_razao_social: string
          p_fantasia: string
          p_cnpj: string
        }
        Returns: {
          empresa_id: string
          razao_social: string
          fantasia: string | null
          cnpj: string | null
        }[]
      }
      list_members_of_company: {
        Args: { p_empresa: string }
        Returns: { user_id: string; role: string; created_at: string }[]
      }
      whoami: {
        Args: Record<string, unknown>
        Returns: string
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
