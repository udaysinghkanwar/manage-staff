'use server'

import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp/send'

// Both lists are keyset-paginated: a page is fetched by passing the sort key
// of the last row already shown, so each read is an index seek that costs the
// same however deep it goes, and rows arriving meanwhile can't shift a page.
const CONVERSATION_PAGE = 30
const MESSAGE_PAGE = 50

export interface Message {
  id: string
  conversation_id: string
  direction: 'inbound' | 'outbound'
  body: string | null
  is_availability_message: boolean
  created_at: string
}

export interface Conversation {
  id: string
  phone: string | null
  bsuid: string | null
  worker_id: string | null
  worker_name: string | null
  last_message: string | null
  last_message_at: string
  last_inbound_at: string | null
  /** An inbound message in the last 24h, as of when this was fetched. */
  unread: boolean
}

/** Position in a list: the sort key of the last row shown. */
export interface Cursor {
  at: string
  id: string
}

export interface Page<T> {
  items: T[]
  /** Pass back to get the next page; null when there are no more rows. */
  next: Cursor | null
}

const CONVERSATION_COLUMNS =
  'id, phone, bsuid, worker_id, last_message, last_message_at, last_inbound_at, workers(name)'

const UNREAD_WINDOW_MS = 24 * 60 * 60 * 1000

type ConversationRow = Omit<Conversation, 'worker_name' | 'unread'> & {
  workers: { name: string } | { name: string }[] | null
}

function toConversation(row: ConversationRow): Conversation {
  const { workers, ...rest } = row
  const worker = Array.isArray(workers) ? workers[0] : workers
  const unread =
    !!rest.last_inbound_at && Date.now() - Date.parse(rest.last_inbound_at) < UNREAD_WINDOW_MS
  return { ...rest, worker_name: worker?.name ?? null, unread }
}

/** Newest-active conversations first. */
export async function getConversations(cursor?: Cursor): Promise<Page<Conversation>> {
  const supabase = await createClient()

  let query = supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .order('last_message_at', { ascending: false })
    .order('id', { ascending: false })
    // One extra row answers "is there another page?" without a second query.
    .limit(CONVERSATION_PAGE + 1)

  // Row-value comparison (last_message_at, id) < (cursor.at, cursor.id),
  // written out because PostgREST has no tuple operator.
  if (cursor) {
    query = query.or(
      `last_message_at.lt.${cursor.at},and(last_message_at.eq.${cursor.at},id.lt.${cursor.id})`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as ConversationRow[]
  const items = rows.slice(0, CONVERSATION_PAGE).map(toConversation)
  const last = items.at(-1)
  return {
    items,
    next: rows.length > CONVERSATION_PAGE && last ? { at: last.last_message_at, id: last.id } : null,
  }
}

/** One conversation, e.g. when a message arrives for one not yet loaded. */
export async function getConversation(id: string): Promise<Conversation | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toConversation(data as ConversationRow) : null
}

export async function getConversationCount(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
  if (error) throw new Error(error.message)
  return count ?? 0
}

/**
 * A page of one conversation's messages, ending at `cursor` (or the newest),
 * returned oldest-first so it renders top-to-bottom.
 */
export async function getMessages(conversationId: string, cursor?: Cursor): Promise<Page<Message>> {
  const supabase = await createClient()

  let query = supabase
    .from('messages')
    .select('id, conversation_id, direction, body, is_availability_message, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(MESSAGE_PAGE + 1)

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.at},and(created_at.eq.${cursor.at},id.lt.${cursor.id})`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Message[]
  const page = rows.slice(0, MESSAGE_PAGE)
  const oldest = page.at(-1)
  return {
    items: page.reverse(),
    next: rows.length > MESSAGE_PAGE && oldest ? { at: oldest.created_at, id: oldest.id } : null,
  }
}

export async function sendReply(conversationId: string, body: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  // Resolve the recipient here rather than trusting an address from the browser.
  const { data: conv, error } = await supabase
    .from('conversations')
    .select('phone, bsuid')
    .eq('id', conversationId)
    .maybeSingle()
  if (error || !conv) return { error: 'Conversation not found' }

  const result = await sendWhatsAppMessage({ to: conv.phone, recipient: conv.bsuid, type: 'text', text: body })
  if (!result.success) return { error: 'Failed to send message' }
  return { error: null }
}
