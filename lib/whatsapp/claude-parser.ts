import Anthropic from '@anthropic-ai/sdk'
import type { DayOfWeek, ShiftType, AvailabilityType, WorkerGender } from '@/lib/types'

export interface ParsedWorkerData {
  name: string | null
  address: string | null
  gender: WorkerGender | null
  shift: ShiftType | null
  availability_type: AvailabilityType | null
  available_days: DayOfWeek[] | null
  notes: string | null
}

const EMPTY: ParsedWorkerData = {
  name: null,
  address: null,
  gender: null,
  shift: null,
  availability_type: null,
  available_days: null,
  notes: null,
}

const SYSTEM_PROMPT = `You are a parser for a staffing agency. Extract worker information from WhatsApp messages.
Return ONLY a JSON object with these fields (use null for anything not mentioned):
{
  "name": string | null,
  "address": string | null,
  "gender": "male" | "female" | null,
  "shift": "day" | "afternoon" | "night" | null,
  "availability_type": "full-time" | "part-time" | null,
  "available_days": string[] | null,
  "notes": string | null
}
For available_days, values must be from: mon, tue, wed, thu, fri, sat, sun.
Do not include any explanation. Return only the JSON object.`

const client = new Anthropic()

export async function parseAvailabilityMessage(
  _phone: string,
  messageBody: string
): Promise<ParsedWorkerData> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: messageBody }],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    // Strip markdown code fences if present
    const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(json)

    return {
      name: parsed.name ?? null,
      address: parsed.address ?? null,
      gender: parsed.gender ?? null,
      shift: parsed.shift ?? null,
      availability_type: parsed.availability_type ?? null,
      available_days: Array.isArray(parsed.available_days) ? parsed.available_days : null,
      notes: parsed.notes ?? null,
    }
  } catch (err) {
    console.error('[claude-parser] failed:', err instanceof Error ? err.message : err)
    return EMPTY
  }
}
