import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          is_completed: boolean
          target_date: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          is_completed?: boolean
          target_date?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          is_completed?: boolean
          target_date?: string | null
        }
      }
      events: {
        Row: {
          id: string
          user_id: string
          title: string
          start_time: string
          end_time: string | null
          description: string | null
          is_recurring: boolean
          recurrence_days: number[] | null
          recurrence_end_date: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          start_time: string
          end_time?: string | null
          description?: string | null
          is_recurring?: boolean
          recurrence_days?: number[] | null
          recurrence_end_date?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          start_time?: string
          end_time?: string | null
          description?: string | null
          is_recurring?: boolean
          recurrence_days?: number[] | null
          recurrence_end_date?: string | null
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          notifications_enabled: boolean
          notification_minutes_before: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notifications_enabled?: boolean
          notification_minutes_before?: number
        }
        Update: {
          id?: string
          user_id?: string
          notifications_enabled?: boolean
          notification_minutes_before?: number
        }
      }
      finance_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          kind: 'expense' | 'income' | 'investment'
          icon: string
          color: string
          is_archived: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          kind: 'expense' | 'income' | 'investment'
          icon?: string
          color?: string
          is_archived?: boolean
          sort_order?: number
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          kind?: 'expense' | 'income' | 'investment'
          icon?: string
          color?: string
          is_archived?: boolean
          sort_order?: number
        }
      }
      finance_transactions: {
        Row: {
          id: string
          user_id: string
          kind: 'expense' | 'income' | 'investment'
          category_id: string | null
          title: string
          amount: number
          occurred_on: string
          payment_method: string | null
          notes: string | null
          tags: string[]
          recurring_id: string | null
          installment_id: string | null
          installment_index: number | null
          paid: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kind: 'expense' | 'income' | 'investment'
          category_id?: string | null
          title: string
          amount: number
          occurred_on: string
          payment_method?: string | null
          notes?: string | null
          tags?: string[]
          recurring_id?: string | null
          installment_id?: string | null
          installment_index?: number | null
          paid?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          kind?: 'expense' | 'income' | 'investment'
          category_id?: string | null
          title?: string
          amount?: number
          occurred_on?: string
          payment_method?: string | null
          notes?: string | null
          tags?: string[]
          recurring_id?: string | null
          installment_id?: string | null
          installment_index?: number | null
          paid?: boolean
        }
      }
      finance_recurring: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          kind: 'expense' | 'income' | 'investment'
          title: string
          amount: number
          day_of_month: number
          start_date: string
          end_date: string | null
          payment_method: string | null
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          kind: 'expense' | 'income' | 'investment'
          title: string
          amount: number
          day_of_month: number
          start_date: string
          end_date?: string | null
          payment_method?: string | null
          notes?: string | null
          active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          kind?: 'expense' | 'income' | 'investment'
          title?: string
          amount?: number
          day_of_month?: number
          start_date?: string
          end_date?: string | null
          payment_method?: string | null
          notes?: string | null
          active?: boolean
        }
      }
      finance_installments: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          title: string
          total_amount: number
          total_count: number
          first_due: string
          payment_method: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          title: string
          total_amount: number
          total_count: number
          first_due: string
          payment_method?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          title?: string
          total_amount?: number
          total_count?: number
          first_due?: string
          payment_method?: string | null
          notes?: string | null
        }
      }
      finance_budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          monthly_limit: number
          alert_threshold: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          monthly_limit: number
          alert_threshold?: number
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          monthly_limit?: number
          alert_threshold?: number
        }
      }
      finance_loans: {
        Row: {
          id: string
          user_id: string
          counterpart_name: string
          direction: 'lent' | 'borrowed'
          principal: number
          taken_on: string
          due_date: string | null
          status: 'open' | 'partial' | 'paid'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          counterpart_name: string
          direction: 'lent' | 'borrowed'
          principal: number
          taken_on: string
          due_date?: string | null
          status?: 'open' | 'partial' | 'paid'
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          counterpart_name?: string
          direction?: 'lent' | 'borrowed'
          principal?: number
          taken_on?: string
          due_date?: string | null
          status?: 'open' | 'partial' | 'paid'
          notes?: string | null
        }
      }
      finance_loan_payments: {
        Row: {
          id: string
          loan_id: string
          user_id: string
          amount: number
          paid_on: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          loan_id: string
          user_id: string
          amount: number
          paid_on: string
          notes?: string | null
        }
        Update: {
          id?: string
          loan_id?: string
          user_id?: string
          amount?: number
          paid_on?: string
          notes?: string | null
        }
      }
      finance_attachments: {
        Row: {
          id: string
          transaction_id: string
          user_id: string
          storage_path: string
          file_name: string
          mime_type: string | null
          size_bytes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          user_id: string
          storage_path: string
          file_name: string
          mime_type?: string | null
          size_bytes?: number | null
        }
        Update: {
          id?: string
          transaction_id?: string
          user_id?: string
          storage_path?: string
          file_name?: string
          mime_type?: string | null
          size_bytes?: number | null
        }
      }
      subjects: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          level: number
          xp_current: number
          xp_next_level: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          level?: number
          xp_current?: number
          xp_next_level?: number
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          level?: number
          xp_current?: number
          xp_next_level?: number
        }
      }
      study_topics: {
        Row: {
          id: string
          subject_id: string
          title: string
          is_completed: boolean
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          title: string
          is_completed?: boolean
          completed_at?: string | null
        }
        Update: {
          id?: string
          subject_id?: string
          title?: string
          is_completed?: boolean
          completed_at?: string | null
        }
      }
      study_sessions: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          start_time: string
          end_time: string
          duration_minutes: number
          topics_covered: string[] | null
          notes: string | null
          xp_earned: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_id: string | null
          start_time: string
          end_time: string
          duration_minutes: number
          topics_covered?: string[] | null
          notes?: string | null
          xp_earned: number
        }
        Update: {
          id?: string
          user_id?: string
          subject_id?: string | null
          start_time?: string
          end_time?: string
          duration_minutes?: number
          topics_covered?: string[] | null
          notes?: string | null
          xp_earned?: number
        }
      }
      study_playlist_items: {
        Row: {
          id: string
          user_id: string
          title: string
          url: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          url: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          url?: string
        }
      }
    }
  }
}

