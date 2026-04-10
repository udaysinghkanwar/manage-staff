import { getConversations } from '@/lib/inbox'
import { InboxView } from '@/components/inbox/inbox-view'

export default async function InboxPage() {
  const conversations = await getConversations()
  return <InboxView initialConversations={conversations} />
}
