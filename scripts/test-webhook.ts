/**
 * Test script for the WhatsApp inbound webhook.
 *
 * Usage (with dev server running on localhost:3000):
 *   npx tsx scripts/test-webhook.ts
 *
 * Install tsx if needed:
 *   npm install --save-dev tsx
 */

const BASE_URL = 'http://localhost:3000/api/whatsapp/incoming'

const TEST_CASES = [
  {
    description: 'Should trigger parser — Sarah, full-time, day shift',
    phone: '14165550001',
    message: 'Hi my name is Sarah, I live in Mississauga, available full time, day shift',
    expectParsed: true,
  },
  {
    description: 'Should trigger parser — James, part-time, Mon/Wed/Fri',
    phone: '14165550002',
    message: 'monday wednesday friday available, part time, James from Brampton',
    expectParsed: true,
  },
  {
    description: 'Should NOT trigger parser — generic message',
    phone: '14165550003',
    message: 'hey whats up',
    expectParsed: false,
  },
]

function buildPayload(phone: string, message: string) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'ENTRY_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              messages: [
                {
                  from: phone,
                  id: `msg_${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: message },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  }
}

async function runTests() {
  console.log('Running webhook tests against', BASE_URL, '\n')

  for (const tc of TEST_CASES) {
    process.stdout.write(`[${tc.expectParsed ? 'AVAIL' : 'SKIP '}] ${tc.description}\n`)
    process.stdout.write(`       Phone: ${tc.phone}\n`)
    process.stdout.write(`       Body:  "${tc.message}"\n`)

    try {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(tc.phone, tc.message)),
      })

      process.stdout.write(`       Status: ${res.status} ${res.status === 200 ? '✓' : '✗'}\n\n`)
    } catch (err) {
      process.stdout.write(`       Error: ${err}\n\n`)
    }
  }

  console.log('Done. Check your Supabase messages table for logged entries.')
  console.log('Workers created from availability messages will appear in /dashboard/workers.')
}

runTests()
