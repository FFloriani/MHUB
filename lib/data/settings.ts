import { supabase } from '../supabase'
import type { Database } from '../supabase'

type UserSettings = Database['public']['Tables']['user_settings']['Row']
type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert']
type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update']

export interface UserSettingsData {
  notifications_enabled: boolean
  notification_minutes_before: number
}

const DEFAULT_SETTINGS: UserSettingsData = {
  notifications_enabled: false,
  notification_minutes_before: 15,
}

export async function getUserSettings(userId: string): Promise<UserSettingsData> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      // Se não encontrar configurações, retorna padrão
      if (error.code === 'PGRST116') {
        return DEFAULT_SETTINGS
      }
      throw error
    }

    return {
      notifications_enabled: data.notifications_enabled ?? DEFAULT_SETTINGS.notifications_enabled,
      notification_minutes_before: data.notification_minutes_before ?? DEFAULT_SETTINGS.notification_minutes_before,
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
    // Verifica se já existe configuração
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      // Atualiza configuração existente
      const { data, error } = await supabase
        .from('user_settings')
        .update({
          notifications_enabled: settings.notifications_enabled,
          notification_minutes_before: settings.notification_minutes_before,
        } as UserSettingsUpdate)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return {
        notifications_enabled: data.notifications_enabled ?? DEFAULT_SETTINGS.notifications_enabled,
        notification_minutes_before: data.notification_minutes_before ?? DEFAULT_SETTINGS.notification_minutes_before,
      }
    } else {
      // Cria nova configuração
      const { data, error } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          notifications_enabled: settings.notifications_enabled ?? DEFAULT_SETTINGS.notifications_enabled,
          notification_minutes_before: settings.notification_minutes_before ?? DEFAULT_SETTINGS.notification_minutes_before,
        } as UserSettingsInsert)
        .select()
        .single()

      if (error) throw error
      return {
        notifications_enabled: data.notifications_enabled ?? DEFAULT_SETTINGS.notifications_enabled,
        notification_minutes_before: data.notification_minutes_before ?? DEFAULT_SETTINGS.notification_minutes_before,
      }
    }
  } catch (error) {
    console.error('Error updating user settings:', error)
    throw error
  }
}

