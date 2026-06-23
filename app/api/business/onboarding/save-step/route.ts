import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'

// Allowed fields that can be stored per wizard step in onboarding_draft.
// These match the JSONB columns defined in the migration (20260606000000_onboarding.sql).
const ALLOWED_FIELDS = ['media_urls', 'hinnasto', 'aukioloajat', 'yhteystiedot', 'laji'] as const
type AllowedField = (typeof ALLOWED_FIELDS)[number]

// Validate aukioloajat shape: object with valid day keys and HH:MM time strings.
// Prevents arbitrary JSONB content from reaching the database.
function isValidAukioloajat(v: unknown): boolean {
  const VALID_DAYS = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  for (const [k, slot] of Object.entries(v as Record<string, unknown>)) {
    if (!VALID_DAYS.has(k)) return false
    if (typeof slot !== 'object' || slot === null) return false
    const { open, close } = slot as Record<string, unknown>
    if (!TIME_RE.test(String(open)) || !TIME_RE.test(String(close))) return false
  }
  return true
}

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
    if (isNaN(parsed) || parsed < 1) {
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

    // Validate step — accepted input range is 0–5 (Phase 50, D-07 + D-04 reconciliation).
    // Lower bound 0 exists for handleConfirm's quick-accept media_urls pre-save (D-04), which
    // sends step: 0 so current_step becomes 1 (new Step 1/StepMediat). current_step = step + 1
    // maps this input range to a stored range of 1-5 for wizard callers, but 1-6 for the
    // short-lived AnalysoiSivusto quick-accept case (which sends step: 5 -> current_step: 6).
    // That value 6 is transient — `submit` deletes the draft row on success — but if it
    // survives (e.g. a failed quick-accept), callers downstream of this route (WizardInner)
    // must clamp current_step to 5 before using it for step-range math (see CR-01).
    const parsedStep = parseInt(body.step, 10)
    if (isNaN(parsedStep) || parsedStep < 0 || parsedStep > 5) {
      return NextResponse.json({ error: 'Invalid step (must be 0–5)' }, { status: 400 })
    }
    step = parsedStep

    // value is the JSONB data for the field.
    value = body.value
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Field-specific validation (WR-01, WR-02)
  if (field === 'aukioloajat' && !isValidAukioloajat(value)) {
    return NextResponse.json({ error: 'aukioloajat: invalid shape or time format' }, { status: 400 })
  }
  if (field === 'hinnasto') {
    const rows = value as unknown[]
    if (!Array.isArray(rows) || rows.length > 20) {
      return NextResponse.json({ error: 'hinnasto: max 20 rows' }, { status: 400 })
    }
  }
  if (field === 'laji') {
    if (typeof value !== 'string' || value.trim().length === 0 || value.length > 100) {
      return NextResponse.json({ error: 'laji: invalid value' }, { status: 400 })
    }
    value = value.trim()
  }

  // Security: verify the authenticated user actually owns this venue before accepting data.
  // Without this check, any authenticated business user could overwrite another venue's draft
  // by supplying an arbitrary paikka_id in the request body (T-34-05-02 mitigation).
  const { data: link } = await supabaseAdmin
    .from('business_paikka_links')
    .select('id')
    .eq('business_account_id', user.id)
    .eq('paikka_id', paikkaId)
    .maybeSingle()

  if (!link) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
        current_step: step + 1,
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
