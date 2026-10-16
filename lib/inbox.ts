'use server'

import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp/send'
import { conversationKey, parseConversationKey } from '@/lib/phone'

export interface Message {
  id: string
  phone: string | null
  bsuid: string | null
  worker_id: string | null
  direction: 'inbound' | 'outbound'
  body: string | null
  is_availability_message: boolean
  created_at: string
}

export interface Conversation {
  /** Conversation key from conversationKey(): the phone number, or a prefixed BSUID. */
  phone: string
  worker_id: string | null
  worker_name: string | null
  last_message: string | null
  last_at: string
  unread: boolean   // inbound message in last 24h
  messages: Message[]
}

export async function getConversations(): Promise<Conversation[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('id, phone, bsuid, worker_id, direction, body, is_availability_message, created_at, workers(id, name)')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const byPhone = new Map<string, Conversation>()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  for (const row of data ?? []) {
    const worker = Array.isArray(row.workers) ? row.workers[0] : row.workers
    const msg: Message = {
      id: row.id,
      phone: row.phone,
      bsuid: row.bsuid,
      worker_id: row.worker_id,
      direction: row.direction as 'inbound' | 'outbound',
      body: row.body,
      is_availability_message: row.is_availability_message,
      created_at: row.created_at,
    }

    const key = conversationKey(row.phone, row.bsuid)
    if (!byPhone.has(key)) {
      byPhone.set(key, {
        phone: key,
        worker_id: row.worker_id,
        worker_name: (worker as { name?: string } | null)?.name ?? null,
        last_message: row.body,
        last_at: row.created_at,
        unread: false,
        messages: [],
      })
    }

    const conv = byPhone.get(key)!
    conv.messages.push(msg)
    conv.last_message = row.body
    conv.last_at = row.created_at
    if (!conv.worker_name && (worker as { name?: string } | null)?.name) {
      conv.worker_name = (worker as { name?: string }).name ?? null
      conv.worker_id = row.worker_id
    }
    if (row.direction === 'inbound' && row.created_at > cutoff) {
      conv.unread = true
    }
  }

  return Array.from(byPhone.values()).sort(
    (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
  )
}

export async function sendReply(key: string, body: string): Promise<{ error: string | null }> {
  const { phone, bsuid } = parseConversationKey(key)
  const result = await sendWhatsAppMessage({ to: phone, recipient: bsuid, type: 'text', text: body })
  if (!result.success) return { error: 'Failed to send message' }
  return { error: null }
}
