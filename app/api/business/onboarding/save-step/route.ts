import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'

// Allowed fields that can be stored per wizard step in onboarding_draft.
// These match the JSONB columns defined in the migration (20260606000000_onboarding.sql).
const ALLOWED_FIELDS = ['media_urls', 'hinnasto', 'aukioloajat', 'yhteystiedot'] as const
type AllowedField = (typeof ALLOWED_FIELDS)[number]

export async function POST(request: Request) {
  // Security: verify JWT from Authorization header before accepting any wizard data.
  // This prevents T-34-05-02 (Tampering): attacker cannot spoof business_account_id
  // because supabaseAdmin bypasses RLS. Verified user.id is used for UPSERT — not body.business_account_id.
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse and validate request body
  let paikkaId: number
  let field: AllowedField
  let step: number
  let value: unknown
  try {
    const body = await request.json()

    // Validate paikka_id
    const parsed = parseInt(body.paikka_id, 10)
    if (isNaN(parsed)) {
      return NextResponse.json({ error: 'Missing or invalid paikka_id' }, { status: 400 })
    }
    paikkaId = parsed

    // Validate field — must be one of the allowed onboarding_draft columns
    if (!ALLOWED_FIELDS.includes(body.field as AllowedField)) {
      return NextResponse.json(
        { error: 'Invalid field', allowed: ALLOWED_FIELDS },
        { status: 400 }
      )
    }
    field = body.field as AllowedField

    // Validate step — must be 1–6
    const parsedStep = parseInt(body.step, 10)
    if (isNaN(parsedStep) || parsedStep < 1 || parsedStep > 6) {
      return NextResponse.json({ error: 'Invalid step (must be 1–6)' }, { status: 400 })
    }
    step = parsedStep

    // value is the JSONB data for the field — no further server-side validation;
    // Supabase enforces 8KB row limit (T-34-05-04 accepted).
    value = body.value
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // UPSERT into onboarding_draft.
  // business_account_id is always set to user.id from the verified JWT — never from the request body.
  // Conflict target (business_account_id, paikka_id) ensures one draft row per business per venue.
  const { error } = await supabaseAdmin
    .from('onboarding_draft')
    .upsert(
      {
        business_account_id: user.id, // Security: from verified JWT, not body
        paikka_id: paikkaId,
        [field]: value,
        current_step: step,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_account_id,paikka_id' }
    )

  if (error) {
    return NextResponse.json(
      { error: 'Upsert failed', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
