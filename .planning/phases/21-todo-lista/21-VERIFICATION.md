---
phase: 21-todo-lista
verified: 2026-05-31T10:00:00Z
status: human_needed
score: 11/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Kirjautuneena käyttäjänä avaa /suosikit kun listalla on ainakin yksi paikka"
    expected: "DiagonaalKortti-kortit näkyvät allekkain; jokaisen kortin oikealla puolella on BookmarkCheck-poistonappi; pin-nappi kortissa navigoi /?id=<paikka_id>-osoitteeseen"
    why_human: "Supabase-autentikointia ja dynaamista dataa ei voi testata staattisella kooditarkastuksella"
  - test: "Kirjautuneena käyttäjänä paina poistonappia yhdeltä TO DO -listakortilta"
    expected: "Kortti häviää listalta välittömästi (optimistinen päivitys); ei virheilmoitusta normaalitapauksessa"
    why_human: "Supabase-delete-kutsua ja sen virhekäsittelyä ei voi simuloida staattisesti"
  - test: "Kirjautumattomana käyttäjänä avaa /suosikit"
    expected: "Näkyy Bookmark-ikoni, otsikko 'TO DO -lista vaatii kirjautumisen', 'Kirjaudu sisään' -nappi"
    why_human: "Auth-tilakoneen käyttäytyminen vaatii todellisen selainistunnon"
  - test: "Avaa NavBar tai NavPill (karttanäkymä tai lista) kirjautuneena"
    expected: "Navigaatiossa näkyy Bookmark-ikoni ja teksti 'TO DO' (ei 'Suosikit' eikä sydän)"
    why_human: "UI-elementtien visuaalinen tarkistus vaatii selaimessa ajamisen"
---

# Phase 21: TO DO -lista — Verification Report

**Phase Goal:** The favorites system is fully replaced by a TO DO list — bookmark icon system-wide, and the /suosikit page functions as a "places I want to visit" list
**Verified:** 2026-05-31T10:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Heart icon replaced by bookmark icon in HeartButton and on all pages; UI labels read "TO DO" | ✓ VERIFIED | BookmarkButton.tsx: imports `{ Bookmark, BookmarkCheck }`, no Heart; PaikkaSheet.tsx: same; NavBar.tsx: `<Bookmark>` + "TO DO"; NavPill.tsx: `<Bookmark>` + "TO DO"; HeartButton.tsx ei ole levyllä |
| 2 | A logged-in user can view saved venues on /suosikit as a TO DO list | ✓ VERIFIED (koodissa) | SuosikitClient.tsx: DiagonaalKortti-lista, removeTodo-funktio, router.push — datavuo Supabasesta on kytketty; lopullinen toiminta vaatii manuaalisen tarkistuksen |
| 3 | A logged-out user visiting /suosikit is prompted to log in | ✓ VERIFIED (koodissa) | SuosikitClient.tsx rivit 84–113: `authState === 'unauthenticated'` -haara, h1 "TO DO -lista vaatii kirjautumisen", "Kirjaudu sisään" -nappi, AuthModal |

**Score:** 3/3 ROADMAP success criteria verified (kooditasolla)

---

### Plan 21-01 Must-Haves

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | BookmarkButton.tsx on olemassa ja exporttaa BookmarkButton (ei HeartButton) | ✓ VERIFIED | Tiedosto olemassa; `export default function BookmarkButton` rivi 14 |
| 2 | HeartButton.tsx ei ole levyllä | ✓ VERIFIED | Glob-haku: "No files found" |
| 3 | BookmarkButton renderöi Bookmark-ikonin kun ei tallennettu, BookmarkCheck kun tallennettu | ✓ VERIFIED | Rivit 73–76: `isTodo ? <BookmarkCheck ...> : <Bookmark ...>` |
| 4 | PaikkaSheet hyväksyy `todo` ja `onToggleTodo` -propsit (ei suosikki/onToggleSuosikki) | ✓ VERIFIED | Props interface rivit 17–23: `todo: boolean`, `onToggleTodo: (id: number) => void` |
| 5 | Etusivu välittää `todo={todoIds.has(...)}` ja `onToggleTodo={toggleTodo}` PaikkaSheetille | ✓ VERIFIED | Etusivu.tsx rivit 1126, 1129: `todo={todoIds.has(valittu.id)}`, `onToggleTodo={toggleTodo}` |
| 6 | paikat/[id]/page.tsx importtaa BookmarkButton (ei HeartButton) | ✓ VERIFIED | Rivi 11: `import BookmarkButton from '@/app/components/BookmarkButton'` |
| 7 | Heart-importtia ei ole missään neljässä muokatussa tiedostossa | ✓ VERIFIED | Grep: ei tuloksia BookmarkButton.tsx:ssä, PaikkaSheet.tsx:ssä, Etusivu.tsx:ssä eikä paikat/[id]-hakemistossa |
| 8 | TypeScript kompiloi ilman virheitä | ✓ VERIFIED | `npx tsc --noEmit` — ei tulostusta (exit 0) |

---

### Plan 21-02 Must-Haves

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SuosikitClient näyttää DiagonaalKortti-pohjaisen TO DO -listan kirjautuneelle käyttäjälle, jolla on kohteita | ✓ VERIFIED | Rivit 148–165: `<ul>` + `{paikat.map(...)}` + `<DiagonaalKortti paikka={p} onShowMap=...>` |
| 2 | SuosikitClient näyttää Bookmark-tyhjän tilan kirjautuneelle käyttäjälle jolla ei ole kohteita | ✓ VERIFIED | Rivit 121–141: `paikat.length === 0` -haara, `<Bookmark className="w-7 h-7...">`, h1 "Ei vielä TO DO -paikkoja" |
| 3 | SuosikitClient näyttää Bookmark-kirjautumattoman tilan kirjautumattomalle käyttäjälle | ✓ VERIFIED | Rivit 84–113: `authState === 'unauthenticated'` -haara, Bookmark-ikoni, "TO DO -lista vaatii kirjautumisen" |
| 4 | Poistonappi suorittaa optimistisen poiston rollbackilla virhetilanteessa | ✓ VERIFIED | removeTodo (rivit 61–77): `setPaikat(prev => prev.filter(...))` optimistisesti, sitten Supabase-delete, `if (error) ... setPaikat(prev => ... [...prev, removed])` rollback |
| 5 | Pin-nappi TO DO -sivulla navigoi `/?id=<paikka_id>` (router.push) | ✓ VERIFIED | Rivi 154: `onShowMap={(place) => router.push('/?id=' + place.id)}` |
| 6 | NavPill näyttää Bookmark-ikonin ja labelin 'TO DO' | ✓ VERIFIED | NavPill.tsx rivi 7: `import { Bookmark, ... }`, rivi 71: `<Bookmark className="w-3.5 h-3.5" />`, rivi 72: "TO DO" |
| 7 | NavBar näyttää Bookmark-ikonin ja labelin 'TO DO'; Haku-linkki ennallaan | ✓ VERIFIED | NavBar.tsx rivi 5: `import { ..., Bookmark, ... }`, rivit 95–97: `<Bookmark>` + "TO DO"; Haku-linkki rivit 81–88 koskematon: `<Search>` + `href="/?nakyma=lista"` + "Haku" |
| 8 | Heart-importtia ei ole missään viidessä muokatussa tiedostossa | ✓ VERIFIED | Grep: ei osumia SuosikitClient.tsx:ssä, NavPill.tsx:ssä, NavBar.tsx:ssä, BottomNav.tsx:ssä eikä PaikkaKortti.tsx:ssä |

---

### Required Artifacts

| Artefakti | Tarkoitus | Status | Yksityiskohdat |
|-----------|-----------|--------|----------------|
| `app/components/BookmarkButton.tsx` | Bookmark-vaihtonappi (korvaa HeartButton) | ✓ VERIFIED | 94 riviä; sisältää `BookmarkButtonProps`, `isTodo`-tila, Supabase-integraatio |
| `app/components/PaikkaSheet.tsx` | Sheet-paneeli uudelleennimetyillä propseilla | ✓ VERIFIED | Sisältää `onToggleTodo`; ei Heart-importtia |
| `app/components/Etusivu.tsx` | Karttanäkymä uudelleennimetyllä tilalla | ✓ VERIFIED | Sisältää `todoIds`; `toggleTodo`; wire-avain `suosikit` muuttumaton |
| `app/paikat/[id]/page.tsx` | Paikan yksityiskohtasivu importtaamassa BookmarkButton | ✓ VERIFIED | Importtaa `BookmarkButton`; käyttää `<BookmarkButton paikkaId={paikka.id} />` |
| `app/suosikit/SuosikitClient.tsx` | TO DO -lista client-komponentti | ✓ VERIFIED | 177 riviä; DiagonaalKortti, removeTodo, kaikki kolme auth-tilaa |
| `app/components/NavPill.tsx` | Navigaatiovaisto TO DO -linkillä | ✓ VERIFIED | Bookmark-ikoni + "TO DO" |
| `app/components/NavBar.tsx` | Globaali navigaatio TO DO -linkillä | ✓ VERIFIED | Bookmark-ikoni + "TO DO"; Haku koskematon |

### Key Link Verification

| From | To | Via | Status | Yksityiskohdat |
|------|----|-----|--------|----------------|
| `Etusivu.tsx` | `PaikkaSheet.tsx` | JSX-propsit | ✓ VERIFIED | `onToggleTodo={toggleTodo}` rivi 1129 |
| `paikat/[id]/page.tsx` | `BookmarkButton.tsx` | import | ✓ VERIFIED | `import BookmarkButton from '@/app/components/BookmarkButton'` rivi 11 |
| `SuosikitClient.tsx` | `DiagonaalKortti.tsx` | import + JSX | ✓ VERIFIED | Import rivi 8; `<DiagonaalKortti paikka={p} onShowMap=...>` rivi 152 |
| `SuosikitClient.tsx` | Supabase `suosikit`-taulu | supabase.from('suosikit').delete() | ✓ VERIFIED | Rivit 67–71 removeTodo-funktiossa |

### Data-Flow Trace (Level 4)

| Artefakti | Data-muuttuja | Lähde | Tuottaa oikeaa dataa | Status |
|-----------|---------------|-------|----------------------|--------|
| `SuosikitClient.tsx` | `paikat: Liikuntapaikka[]` | `supabase.from('suosikit').select('paikka_id, liikuntapaikat(*)')` rivit 31–44 | Kyllä — oikea Supabase-kysely autentikoituneella user_id:llä | ✓ FLOWING |
| `BookmarkButton.tsx` | `isTodo: boolean` | `supabase.from('suosikit').select('id').eq('user_id',...).eq('paikka_id',...)` rivi 24 | Kyllä — oikea Supabase-kysely | ✓ FLOWING |
| `PaikkaSheet.tsx` | `todo: boolean` | Välitetään Etusivu.tsx:stä `todoIds.has(valittu.id)` | Kyllä — suoraan Etusivun tilasta | ✓ FLOWING |

### Behavioral Spot-Checks

TypeScript-tarkistus on ainoa ajettavissa oleva testi tässä vaiheessa (komponentit vaativat selainympäristön).

| Käyttäytyminen | Komento | Tulos | Status |
|----------------|---------|-------|--------|
| TypeScript kompiloi | `npx tsc --noEmit` | Ei tulostusta (exit 0) | ✓ PASS |
| HeartButton poistettu levyltä | `Glob app/components/HeartButton.tsx` | "No files found" | ✓ PASS |
| Heart-importteja ei jäljellä app/components- tai app/paikat-hakemistoissa | `Grep "HeartButton" app/` | Ei tuloksia | ✓ PASS |
| suosikitIds/toggleSuosikki poistettu | `Grep "suosikitIds\|toggleSuosikki\|..." Etusivu.tsx PaikkaSheet.tsx` | Ei tuloksia | ✓ PASS |

### Requirements Coverage

| Vaatimus | Suunnitelma | Kuvaus | Status | Näyttö |
|----------|-------------|--------|--------|--------|
| TODO-01 | 21-01, 21-02 | Heart → Bookmark -uudelleennimeäminen koko sovelluksessa | ✓ SATISFIED | BookmarkButton olemassa; HeartButton poistettu; NavPill/NavBar/BottomNav/PaikkaKortti päivitetty |
| TODO-02 | 21-02 | /suosikit toimii TO DO -listana DiagonaalKortti-korttien kanssa | ✓ SATISFIED | SuosikitClient sisältää DiagonaalKortti-listan, optimistisen poiston, kolme auth-tilaa |

### Anti-Patterns Found

| Tiedosto | Rivi | Pattern | Vakavuus | Vaikutus |
|----------|------|---------|----------|----------|
| `Etusivu.tsx` | 379 | `const suosikitSizeAndIds = useMemo(...)` — muuttujanimi viittaa vanhaan "suosikit"-termistöön | ℹ️ Info | Toiminnallisesti OK; muuttujan käyttö on `todoIds`:n pohjalta (rivi 380); vanhentuneen nimen jättäminen ei aiheuta toimintavirheitä |

**Huomio `suosikitSizeAndIds`-muuttujanimestä:** Etusivu.tsx:ssä on `const suosikitSizeAndIds = useMemo(...)` (rivi 379), joka on ainoa jäljelle jäänyt "suosikit"-niminen muuttuja. Tämä on cosmeettiinen ongelma — muuttuja laskee `todoIds`:n perusteella (rivi 380: `Array.from(todoIds)...`) ja se on käytössä ainoastaan AI-fetch-välityksessä. Se ei ole käyttäjälle näkyvä label eikä Supabase-query. Ei BLOCKER.

Ei TBD-, FIXME- eikä XXX-merkintöjä muokatuissa tiedostoissa.

---

### Human Verification Required

#### 1. TO DO -lista kirjautuneella käyttäjällä (kohteita listalla)

**Test:** Kirjaudu sisään, lisää ainakin yksi paikka TO DO -listalle BookmarkButton-napilla (karttanäkymästä tai paikkasivulta), sitten avaa /suosikit
**Expected:** DiagonaalKortti-kortit näkyvät allekkain; jokaisen oikealla on BookmarkCheck-poistonappi; pin-nappi kortissa navigoi karttanäkymään kohdistettuna kyseiseen paikkaan (/?id=<paikka_id>)
**Why human:** Supabase-autentikointia ja dynaamista dataa ei voi testata staattisella kooditarkastuksella

#### 2. Optimistinen poisto ja rollback

**Test:** Kirjautuneena käyttäjänä paina BookmarkCheck-poistopainikketta TO DO -listan kortilta
**Expected:** Kortti katoaa listalta välittömästi; Supabase-delete onnistuu taustalla; verkkovirhetilanteessa kortti ilmestyy takaisin
**Why human:** Supabase-operaatioiden käyttäytymistä ei voi simuloida staattisesti

#### 3. Kirjautumaton tila /suosikit-sivulla

**Test:** Kirjaudu ulos ja avaa /suosikit
**Expected:** Näkyy Bookmark-ikoni, otsikko "TO DO -lista vaatii kirjautumisen", nappi "Kirjaudu sisään" joka avaa auth-modaalin
**Why human:** Auth-tilakoneen käyttäytyminen vaatii todellisen selainistunnon

#### 4. NavBar ja NavPill -navigaatio

**Test:** Avaa sovellus kirjautuneena; tarkista NavBar (Desktop) ja NavPill (mobiili) -valikot
**Expected:** Suosikit-linkki näyttää Bookmark-ikonin ja tekstin "TO DO" — ei sydäntä eikä "Suosikit"-tekstiä
**Why human:** UI-elementtien visuaalinen tarkistus vaatii selaimessa ajamisen

---

### Gaps Summary

Ei toiminnallisia puutteita löydetty. Kaikki 11 must-have-kohtaa ovat koodissa vahvistettu. TypeScript kompiloi puhtaasti. Ainoa löydetty asia on cosmeettiinen: `suosikitSizeAndIds`-muuttujanimi Etusivu.tsx:ssä (ℹ️ Info-taso, ei BLOCKER).

Status on `human_needed` koska Supabase-integraatio, auth-tilakone ja UI:n visuaalinen ulkoasu vaativat manuaalisen tarkistuksen selainympäristössä.

---

_Verified: 2026-05-31T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
