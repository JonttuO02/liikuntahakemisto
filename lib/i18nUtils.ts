/**
 * resolveLocale — validoi ja normalisoi raa'an cookie-arvon tuetuksi lokaaliksi.
 *
 * Palauttaa raw-arvon sellaisenaan jos se kuuluu SUPPORTED_LOCALES-listaan.
 * Kaikki muut arvot (undefined, tyhjä merkkijono, tuntemattomat lokaaliarvot,
 * polkutraversaaliyritykset) normalisoidaan fallback-lokaaliksi 'fi'.
 *
 * Käytetään i18n/request.ts:ssä NEXT_LOCALE-cookien validointiin
 * ennen dynaamista import-polun rakennusta (T-30-01 path traversal -suojaus).
 */

const SUPPORTED_LOCALES = ['fi', 'en'] as const
export type Locale = typeof SUPPORTED_LOCALES[number]

export function resolveLocale(raw: string | undefined): Locale {
  return SUPPORTED_LOCALES.includes(raw as Locale) ? (raw as Locale) : 'fi'
}
