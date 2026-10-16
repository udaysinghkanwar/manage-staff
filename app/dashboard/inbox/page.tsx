import { getConversations, getConversationCount } from '@/lib/inbox'
import { InboxView } from '@/components/inbox/inbox-view'

export default async function InboxPage() {
  const [page, total] = await Promise.all([getConversations(), getConversationCount()])
  return <InboxView initialPage={page} initialTotal={total} />
}
