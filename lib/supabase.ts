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
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          start_time: string
          end_time?: string | null
          description?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          start_time?: string
          end_time?: string | null
          description?: string | null
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
    }
  }
}

