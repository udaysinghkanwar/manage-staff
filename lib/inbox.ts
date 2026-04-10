'use server'

import { createClient } from '@/lib/supabase/server'

export interface Message {
  id: string
  phone: string
  worker_id: string | null
  direction: 'inbound' | 'outbound'
  body: string | null
  is_availability_message: boolean
  created_at: string
}

export interface Conversation {
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
    .select('id, phone, worker_id, direction, body, is_availability_message, created_at, workers(id, name)')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const byPhone = new Map<string, Conversation>()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  for (const row of data ?? []) {
    const worker = Array.isArray(row.workers) ? row.workers[0] : row.workers
    const msg: Message = {
      id: row.id,
      phone: row.phone,
      worker_id: row.worker_id,
      direction: row.direction as 'inbound' | 'outbound',
      body: row.body,
      is_availability_message: row.is_availability_message,
      created_at: row.created_at,
    }

    if (!byPhone.has(row.phone)) {
      byPhone.set(row.phone, {
        phone: row.phone,
        worker_id: row.worker_id,
        worker_name: (worker as { name?: string } | null)?.name ?? null,
        last_message: row.body,
        last_at: row.created_at,
        unread: false,
        messages: [],
      })
    }

    const conv = byPhone.get(row.phone)!
    conv.messages.push(msg)
    conv.last_message = row.body
    conv.last_at = row.created_at
    if (row.direction === 'inbound' && row.created_at > cutoff) {
      conv.unread = true
    }
  }

  return Array.from(byPhone.values()).sort(
    (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
  )
}

export async function sendReply(phone: string, body: string): Promise<{ error: string | null }> {
  const baseUrl = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'
    ? 'http://localhost:3000'
    : `https://${process.env.VERCEL_URL}`

  const res = await fetch(`${baseUrl}/api/whatsapp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: phone, type: 'text', text: body }),
  })

  if (!res.ok) return { error: 'Failed to send message' }
  return { error: null }
}
