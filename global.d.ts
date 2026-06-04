import messages from './messages/fi.json'

declare module 'next-intl' {
  interface AppConfig {
    Locale: 'fi' | 'en'
    Messages: typeof messages
  }
}

import type enMessages from './messages/en.json'
// Ensures en.json has no missing keys relative to fi.json at compile time
type _AssertEnComplete = keyof typeof enMessages extends keyof typeof messages ? true : never
