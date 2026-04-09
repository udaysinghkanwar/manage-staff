export type WorkerStatus = 'active' | 'inactive'
export type WorkerGender = 'male' | 'female'
export type ShiftType = 'day' | 'afternoon' | 'night'
export type AvailabilityType = 'full-time' | 'part-time'
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type JobStatus = 'open' | 'filled' | 'cancelled'

export type BroadcastResponse = 'pending' | 'yes' | 'no'

export type MessageDirection = 'inbound' | 'outbound'

export interface Worker {
  id: string
  name: string
  phone: string
  address: string | null
  gender: WorkerGender | null
  shift: ShiftType | null
  availability_type: AvailabilityType | null
  available_days: DayOfWeek[] | null
  status: WorkerStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  title: string
  location: string
  shift: ShiftType | null
  description: string | null
  safety_shoes_required: boolean
  status: JobStatus
  created_at: string
  updated_at: string
}

export interface JobAssignment {
  id: string
  job_id: string
  worker_id: string
  assigned_at: string
}

export interface JobBroadcast {
  id: string
  job_id: string
  worker_id: string
  response: BroadcastResponse
  sent_at: string
  responded_at: string | null
}

export interface Message {
  id: string
  worker_id: string | null
  phone: string
  direction: MessageDirection
  body: string | null
  is_availability_message: boolean
  created_at: string
}
