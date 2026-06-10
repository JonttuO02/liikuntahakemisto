// i18n/request.ts
// Source: https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing
// Reads NEXT_LOCALE cookie on every request and loads the appropriate message file.
// Uses resolveLocale from lib/i18nUtils for path-traversal-safe locale validation (T-30-01).
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { resolveLocale } from '../lib/i18nUtils'

export default getRequestConfig(async () => {
  const store = await cookies()
  const raw = store.get('NEXT_LOCALE')?.value
  const locale = resolveLocale(raw)

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
