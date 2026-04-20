'use client'

import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getConversations, sendReply } from '@/lib/inbox'
import type { Conversation, Message } from '@/lib/inbox'
import { Button } from '@/components/ui/button'
import { MessageSquare, ChevronLeft, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  return isToday
    ? d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function ConversationItem({
  conv, active, onClick,
}: { conv: Conversation; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-border transition-colors',
        active ? 'bg-muted' : 'hover:bg-muted/50'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate">
          {conv.worker_name ?? conv.phone}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {conv.unread && (
            <span className="w-2 h-2 rounded-full bg-primary" />
          )}
          <span className="text-xs text-muted-foreground">{formatTime(conv.last_at)}</span>
        </div>
      </div>
      {conv.worker_name && (
        <p className="text-xs text-muted-foreground mt-0.5">{conv.phone}</p>
      )}
      <p className="text-xs text-muted-foreground mt-1 truncate">
        {conv.last_message ?? '—'}
      </p>
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

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-1 -ml-1 rounded-md hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="font-medium text-sm">{conv.worker_name ?? conv.phone}</p>
          {conv.worker_name && (
            <p className="text-xs text-muted-foreground">{conv.phone}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
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
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                  msg.direction === 'outbound'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm',
                  isOptimistic && 'opacity-60',
                  isFailed && 'bg-destructive text-destructive-foreground'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{msg.body ?? ''}</p>
                <p className={cn(
                  'text-xs mt-1',
                  msg.direction === 'outbound' ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground',
                  isFailed && 'text-destructive-foreground/70 text-right'
                )}>
                  {isFailed ? 'Failed to send' : isOptimistic ? 'Sending…' : formatTime(msg.created_at)}
                </p>
              </div>
              {msg.is_availability_message && (
                <span className="text-xs text-muted-foreground mt-0.5 px-1">
                  ✦ auto-parsed
                </span>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="shrink-0 border-t border-border p-3 flex gap-2 items-end">
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
          className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] max-h-32"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
        <Button
          onClick={handleSend}
          disabled={isPending || !replyText.trim()}
          size="icon"
          className="shrink-0 min-h-[44px] min-w-[44px]"
        >
          <Send className="h-4 w-4" />
        </Button>
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

  // Realtime — wait for session, then listen to postgres_changes on messages table
  useEffect(() => {
    const supabase = createClient()
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    let channel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getSession().then(() => {
      channel = supabase
        .channel('inbox-messages')
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
    })

    return () => { if (channel) supabase.removeChannel(channel) }
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
        'w-full md:w-72 md:border-r md:border-border flex-col overflow-y-auto shrink-0',
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
