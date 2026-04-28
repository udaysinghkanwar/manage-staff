'use client'

import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getConversations, sendReply } from '@/lib/inbox'
import type { Conversation, Message } from '@/lib/inbox'
import { Button } from '@/components/ui/button'
import { MessageSquare, ChevronLeft, Send, ExternalLink, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPhone } from '@/lib/phone'
import { toast } from 'sonner'

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  return isToday
    ? d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm'
  return (
    <div className={cn('rounded-full bg-primary/20 text-primary font-semibold flex items-center justify-center shrink-0', s)}>
      {getInitials(name)}
    </div>
  )
}

function ConversationItem({
  conv, active, onClick,
}: { conv: Conversation; active: boolean; onClick: () => void }) {
  const displayName = conv.worker_name ?? formatPhone(conv.phone)
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-border transition-colors',
        active ? 'bg-muted' : 'hover:bg-muted/50'
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={conv.worker_name ?? conv.phone} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground shrink-0">{formatTime(conv.last_at)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{formatPhone(conv.phone)}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {conv.unread && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            )}
            <p className="text-xs text-muted-foreground truncate">
              {conv.last_message ?? '—'}
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}

function MessageThread({
  conv, onBack, onOptimisticSend, onOptimisticFail,
}: { conv: Conversation; onBack: () => void; onOptimisticSend: (text: string) => string; onOptimisticFail: (id: string) => void }) {
  const [replyText, setReplyText] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv.messages.length])

  function handleSend() {
    const text = replyText.trim()
    if (!text) return
    setReplyText('')
    const optimisticId = onOptimisticSend(text)
    startTransition(async () => {
      const result = await sendReply(conv.phone, text)
      if (result.error) {
        onOptimisticFail(optimisticId)
        toast.error(result.error)
      }
    })
  }

  const displayName = conv.worker_name ?? formatPhone(conv.phone)

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-1 -ml-1 rounded-md hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <Avatar name={displayName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm truncate">{displayName}</p>
            {conv.worker_id && (
              <Link href={`/dashboard/workers/${conv.worker_id}`} className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{formatPhone(conv.phone)}</p>
        </div>
        {conv.worker_id && (
          <span className="shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full border border-emerald-600/60 text-emerald-400">
            Available
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {conv.messages.map((msg) => {
          const isOptimistic = msg.id.startsWith('optimistic-')
          const isFailed = msg.id.startsWith('failed-')
          return (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col',
                msg.direction === 'outbound' ? 'items-end' : 'items-start'
              )}
            >
              {msg.is_availability_message && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-1">
                  <Check className="h-3 w-3" />
                  auto-parsed
                </span>
              )}
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm',
                  msg.direction === 'outbound'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm',
                  isOptimistic && 'opacity-60',
                  isFailed && 'bg-destructive text-destructive-foreground'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{msg.body ?? ''}</p>
                <p className={cn(
                  'text-xs mt-1.5',
                  msg.direction === 'outbound' ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground',
                  isFailed && 'text-destructive-foreground/70 text-right'
                )}>
                  {isFailed ? 'Failed to send' : isOptimistic ? 'Sending…' : formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="shrink-0 border-t border-border px-4 pt-3 pb-2">
        <div className="flex gap-2 items-end">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type a reply…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] max-h-32"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <Button
            onClick={handleSend}
            disabled={isPending || !replyText.trim()}
            size="icon"
            className="shrink-0 min-h-[44px] min-w-[44px] rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 mb-1">Enter to send &middot; Shift+Enter for new line</p>
      </div>
    </div>
  )
}

export function InboxView({ initialConversations }: { initialConversations: Conversation[] }) {
  const [conversations, setConversations] = useState(initialConversations)
  const [selected, setSelected] = useState<string | null>(null)

  const selectedConv = conversations.find((c) => c.phone === selected) ?? null

  const refetch = useCallback(async () => {
    const fresh = await getConversations()
    setConversations(fresh)
  }, [])

  function handleOptimisticSend(text: string): string {
    const id = `optimistic-${Date.now()}`
    if (!selected) return id
    setConversations((prev) => prev.map((c) => {
      if (c.phone !== selected) return c
      const optimistic: Message = {
        id,
        phone: c.phone,
        worker_id: c.worker_id,
        direction: 'outbound',
        body: text,
        created_at: new Date().toISOString(),
        is_availability_message: false,
      }
      return { ...c, messages: [...c.messages, optimistic], last_message: text, last_at: optimistic.created_at }
    }))
    return id
  }

  function handleOptimisticFail(id: string) {
    setConversations((prev) => prev.map((c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === id ? { ...m, id: `failed-${Date.now()}` } : m
      ),
    })))
  }

  // Realtime — listen for new rows in `messages`. Channel setup is synchronous
  // so the cleanup always captures the reference, and the channel name uses a
  // UUID to stay unique under React Strict Mode's double-invocation in dev.
  useEffect(() => {
    const supabase = createClient()
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const channel = supabase
      .channel(`inbox-messages-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as {
            id: string
            phone: string
            worker_id: string | null
            direction: 'inbound' | 'outbound'
            body: string | null
            is_availability_message: boolean
            created_at: string
          }

          setConversations((prev) => {
            const existing = prev.find((c) => c.phone === row.phone)

            const newMsg: Message = {
              id: row.id,
              phone: row.phone,
              worker_id: row.worker_id,
              direction: row.direction,
              body: row.body,
              is_availability_message: row.is_availability_message,
              created_at: row.created_at,
            }

            if (existing) {
              const filtered = existing.messages.filter(
                (m) => !(m.id.startsWith('optimistic-') && m.body === row.body && m.direction === row.direction)
              )
              const updated: Conversation = {
                ...existing,
                messages: [...filtered, newMsg],
                last_message: row.body,
                last_at: row.created_at,
                unread: existing.unread || (row.direction === 'inbound' && row.created_at > cutoff),
              }
              const rest = prev.filter((c) => c.phone !== row.phone)
              return [updated, ...rest]
            }

            // New phone number — fall back to refetch to get worker name
            refetch()
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch])

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center p-4">
        <MessageSquare className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No messages yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Messages from workers will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen overflow-hidden">
      {/* Conversation list */}
      <div className={cn(
        'w-full md:w-80 md:border-r md:border-border flex-col overflow-y-auto shrink-0',
        selected ? 'hidden md:flex' : 'flex'
      )}>
        <div className="px-4 py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Inbox</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        </div>
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.phone}
            conv={conv}
            active={conv.phone === selected}
            onClick={() => setSelected(conv.phone)}
          />
        ))}
      </div>

      {/* Thread view */}
      <div className={cn(
        'flex-1 flex-col min-h-0',
        selected ? 'flex' : 'hidden md:flex'
      )}>
        {selectedConv ? (
          <MessageThread conv={selectedConv} onBack={() => setSelected(null)} onOptimisticSend={handleOptimisticSend} onOptimisticFail={handleOptimisticFail} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  )
}
