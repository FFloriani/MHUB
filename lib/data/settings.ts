import { supabase } from '../supabase'
import type { Database } from '../supabase'

function generateApiToken(): string {
  const a = new Uint8Array(32)
  crypto.getRandomValues(a)
  const hex = Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `mhub_${hex}`
}

export async function getApiToken(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('user_settings')
    .select('api_token')
    .eq('user_id', userId)
    .single()
  return data?.api_token ?? null
}

export async function regenerateApiToken(userId: string): Promise<string> {
  const token = generateApiToken()
  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('user_settings')
      .update({ api_token: token })
      .eq('user_id', userId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('user_settings')
      .insert({ user_id: userId, api_token: token })
    if (error) throw error
  }
  return token
}

type UserSettings = Database['public']['Tables']['user_settings']['Row']
type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert']
type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'] & {
  telegram_chat_id?: string | null
  allow_multiple_notifications?: boolean
}

export interface UserSettingsData {
  notifications_enabled: boolean
  notification_minutes_before: number
  telegram_chat_id?: string | null
  allow_multiple_notifications?: boolean
}

const DEFAULT_SETTINGS: UserSettingsData = {
  notifications_enabled: false,
  notification_minutes_before: 15,
  telegram_chat_id: null,
  allow_multiple_notifications: true
}

export async function getUserSettings(userId: string): Promise<UserSettingsData> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return DEFAULT_SETTINGS
      throw error
    }

    return {
      notifications_enabled: data.notifications_enabled ?? DEFAULT_SETTINGS.notifications_enabled,
      notification_minutes_before: data.notification_minutes_before ?? DEFAULT_SETTINGS.notification_minutes_before,
      telegram_chat_id: data.telegram_chat_id,
      allow_multiple_notifications: (data as any).allow_multiple_notifications ?? DEFAULT_SETTINGS.allow_multiple_notifications
    }
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return DEFAULT_SETTINGS
  }
}

export async function updateUserSettings(
  userId: string,
  settings: Partial<UserSettingsData>
): Promise<UserSettingsData> {
  try {
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .single()

    const payload: UserSettingsUpdate = {
      notifications_enabled: settings.notifications_enabled,
      notification_minutes_before: settings.notification_minutes_before,
      telegram_chat_id: settings.telegram_chat_id,
      allow_multiple_notifications: settings.allow_multiple_notifications
    }

    // Remove undefined keys
    Object.keys(payload).forEach(key => payload[key as keyof UserSettingsUpdate] === undefined && delete payload[key as keyof UserSettingsUpdate])

    if (existing) {
      const { data, error } = await supabase
        .from('user_settings')
        .update(payload)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return {
        notifications_enabled: data.notifications_enabled,
        notification_minutes_before: data.notification_minutes_before,
        telegram_chat_id: data.telegram_chat_id,
        allow_multiple_notifications: (data as any).allow_multiple_notifications
      }
    } else {
      const { data, error } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          ...payload,
          notifications_enabled: payload.notifications_enabled ?? DEFAULT_SETTINGS.notifications_enabled,
          notification_minutes_before: payload.notification_minutes_before ?? DEFAULT_SETTINGS.notification_minutes_before
        } as UserSettingsInsert)
        .select()
        .single()

      if (error) throw error
      return {
        notifications_enabled: data.notifications_enabled,
        notification_minutes_before: data.notification_minutes_before,
        telegram_chat_id: data.telegram_chat_id
      }
    }
  } catch (error) {
    console.error('Error updating user settings:', error)
    throw error
  }
}
