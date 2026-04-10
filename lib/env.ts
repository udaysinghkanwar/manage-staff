const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

// WhatsApp and Anthropic vars are only required in production
const PRODUCTION_VARS = [
  'ANTHROPIC_API_KEY',
  'META_WEBHOOK_VERIFY_TOKEN',
  'META_WEBHOOK_SECRET',
  'META_PHONE_NUMBER_ID',
  'META_ACCESS_TOKEN',
] as const

export function validateEnv() {
  const missing: string[] = []

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) missing.push(key)
  }

  if (process.env.NODE_ENV === 'production') {
    for (const key of PRODUCTION_VARS) {
      if (!process.env[key]) missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nSee .env.local.example for reference.`
    )
  }
}
