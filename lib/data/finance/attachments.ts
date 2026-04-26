import { supabase } from '../../supabase'
import type { Attachment } from './types'

const BUCKET = 'finance-attachments'

export async function listAttachments(transactionId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('finance_attachments')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function uploadAttachment(
  userId: string,
  transactionId: string,
  file: File,
): Promise<Attachment> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${transactionId}/${Date.now()}-${safeName}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) throw upErr

  const { data, error } = await supabase
    .from('finance_attachments')
    .insert({
      transaction_id: transactionId,
      user_id: userId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    })
    .select()
    .single()

  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  return data
}

export async function getAttachmentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60)
  if (error) return null
  return data?.signedUrl ?? null
}

export async function deleteAttachment(att: Attachment): Promise<void> {
  await supabase.storage.from(BUCKET).remove([att.storage_path])
  const { error } = await supabase.from('finance_attachments').delete().eq('id', att.id)
  if (error) throw error
}
