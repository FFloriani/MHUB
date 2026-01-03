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
      revenues: {
        Row: {
          id: string
          user_id: string
          category: string
          amount: number
          month: number
          year: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          amount: number
          month: number
          year: number
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          amount?: number
          month?: number
          year?: number
        }
      }
      investments: {
        Row: {
          id: string
          user_id: string
          category: string
          amount: number
          month: number
          year: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          amount: number
          month: number
          year: number
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          amount?: number
          month?: number
          year?: number
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          type: string
          category: string
          item: string
          amount: number
          month: number
          year: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          category: string
          item: string
          amount: number
          month: number
          year: number
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          category?: string
          item?: string
          amount?: number
          month?: number
          year?: number
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

