// Server-only admin client — bypasses RLS. NEVER import in client components.
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (no NEXT_PUBLIC_ prefix).
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
