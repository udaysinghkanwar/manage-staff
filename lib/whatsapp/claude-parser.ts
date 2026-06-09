import Anthropic from '@anthropic-ai/sdk'
import type { DayOfWeek, ShiftType, AvailabilityType, WorkerGender } from '@/lib/types'

export interface ParsedWorkerData {
  name: string | null
  city: string | null
  main_intersection: string | null
  age: number | null
  gender: WorkerGender | null
  shifts: ShiftType[] | null
  availability_type: AvailabilityType | null
  available_days: DayOfWeek[] | null
  notes: string | null
}

const EMPTY: ParsedWorkerData = {
  name: null,
  city: null,
  main_intersection: null,
  age: null,
  gender: null,
  shifts: null,
  availability_type: null,
  available_days: null,
  notes: null,
}

const SYSTEM_PROMPT = `You are a parser for a staffing agency in Ontario, Canada. Extract worker information from WhatsApp messages.
Return ONLY a JSON object with these fields (use null for anything not mentioned):
{
  "name": string | null,
  "city": string | null,
  "main_intersection": string | null,
  "age": integer | null,
  "gender": "male" | "female" | null,
  "shifts": ("day" | "afternoon" | "night")[] | null,
  "availability_type": "full-time" | "part-time" | null,
  "available_days": string[] | null,
  "notes": string | null
}

city rules:
- Always return the city in the format "City, XX" where XX is the 2-letter province code (e.g. "Toronto, ON", "Mississauga, ON", "Montreal, QC").
- The city name must be Title Case ("Toronto", not "toronto" or "TORONTO").
- If the sender provides a full street address (e.g. "123 Main St, Scarborough, Toronto, ON M1B 2K3"), extract only the city and province — never include the street, unit, or postal code.
- If only a neighbourhood is given (e.g. "Scarborough", "North York", "Etobicoke"), return the parent city it belongs to ("Toronto, ON" for those examples).
- If only a city is given without a province, assume "ON" (this is an Ontario-based agency).
- If no location is mentioned at all, return null.

main_intersection rules:
- Free-form string naming the nearest major intersection (e.g. "Bramalea and Queen St", "Bathurst & Lawrence").
- Only populate this when the sender explicitly mentions an intersection, cross-streets, or major nearby roads — never infer from a city or postal code.
- Use "and" or "&" between the two roads exactly as the sender wrote them; do not invent or normalize road names.
- Return null when not mentioned.

age rules:
- Return an integer between 18 and 119, or null if not mentioned or out of range.

shifts rules:
- Return an array of shifts the worker is available for. Workers can list multiple (e.g. "day and afternoon" → ["day", "afternoon"]).
- Allowed values: "day", "afternoon", "night". Use lowercase exactly as listed.
- Map common synonyms: "morning" → "day", "evening" → "afternoon", "graveyard"/"overnight" → "night".
- Return null if no shift preference is mentioned.

available_days rules:
- Values must be from: mon, tue, wed, thu, fri, sat, sun.

Do not include any explanation. Return only the JSON object.`

const client = new Anthropic()

export async function parseAvailabilityMessage(
  phone: string,
  messageBody: string
): Promise<ParsedWorkerData> {
  console.log(`[claude-parser] calling Claude for ${phone} — "${messageBody.slice(0, 80)}${messageBody.length > 80 ? '…' : ''}"`)

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

    const ageNum = typeof parsed.age === 'number' && Number.isInteger(parsed.age) && parsed.age >= 18 && parsed.age < 120
      ? parsed.age
      : null

    const result: ParsedWorkerData = {
      name: parsed.name ?? null,
      city: typeof parsed.city === 'string' ? parsed.city.trim() || null : null,
      main_intersection:
        typeof parsed.main_intersection === 'string'
          ? parsed.main_intersection.trim() || null
          : null,
      age: ageNum,
      gender: parsed.gender ?? null,
      shifts: (() => {
        if (!Array.isArray(parsed.shifts)) return null
        const valid = parsed.shifts.filter(
          (s: unknown) => s === 'day' || s === 'afternoon' || s === 'night',
        ) as ShiftType[]
        return valid.length > 0 ? valid : null
      })(),
      availability_type: parsed.availability_type ?? null,
      available_days: Array.isArray(parsed.available_days) ? parsed.available_days : null,
      notes: parsed.notes ?? null,
    }

    console.log(`[claude-parser] result for ${phone}:`, JSON.stringify(result))
    return result
  } catch (err) {
    console.error('[claude-parser] failed for', phone, '—', err instanceof Error ? err.message : err)
    return EMPTY
  }
}
