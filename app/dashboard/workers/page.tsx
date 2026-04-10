import { getWorkers } from '@/lib/workers'
import { WorkerList } from '@/components/workers/worker-list'

export default async function WorkersPage() {
  const workers = await getWorkers()
  return <WorkerList workers={workers} />
}
