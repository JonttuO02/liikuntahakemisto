---
phase: 21-todo-lista
reviewed: 2026-05-31T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - app/components/BookmarkButton.tsx
  - app/components/PaikkaSheet.tsx
  - app/components/Etusivu.tsx
  - app/paikat/[id]/page.tsx
  - app/suosikit/SuosikitClient.tsx
  - app/components/NavPill.tsx
  - app/components/NavBar.tsx
  - app/components/BottomNav.tsx
  - app/components/PaikkaKortti.tsx
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-05-31
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 21 kattaa Heart→Bookmark/BookmarkCheck -ikonivaihdon, tilamuuttujien uudelleennimeämisen (`suosikitIds→todoIds`, `toggleSuosikki→toggleTodo`) sekä SuosikitClient-komponentin täydellisen korvaamisen DiagonaalKortti-pohjaisella TO DO -listalla. Ydinmuutokset on toteutettu oikein: kaikki Heart-importit on poistettu, TypeScript-tyypit on päivitetty atomisesti, BookmarkCheck käyttää molempia `fill-[#111111] text-[#111111]` -luokkia (Pitfall 5 noudatettu), optimistinen poisto toimii RLS-suojattujen Supabase-kutsujen kanssa ja auth-guardi on NavPilissä paikoillaan.

Löytyi kolme varoitustason ongelmaa: yksi saavutettavuuspuute PaikkaSheetissä, yksi rollback-virhe rinnakkaispoistoskenaariossa SuosikitClientissa ja yksi NavBar/NavPill-epäjohdonmukaisuus `/suosikit`-linkin auth-guarding-logiikassa. Lisäksi kaksi tiedollista havaintoa: nimeämisrikos Etusivu.tsx:ssä ja `font-semibold` BottomNav.tsx:ssä.

## Warnings

### WR-01: PaikkaSheet toggle-napilta puuttuu aria-label

**File:** `app/components/PaikkaSheet.tsx:89-98`
**Issue:** `<motion.button>` joka kutsuu `onToggleTodo(paikka.id)` ei sisällä `aria-label`-attribuuttia. Nappi tunnistuu ruudunlukijalla vain sisällöstä (Bookmark/BookmarkCheck SVG-ikoni), jolla ei ole tekstiä. Kaikki muut samantyyliset napit projektissa (BookmarkButton, PaikkaKortti) sisältävät aria-labelin. Puute rikkoo WCAG 2.1 SC 4.1.2 (Name, Role, Value).
**Fix:**
```tsx
<motion.button
  whileTap={{ scale: 0.85, transition: { duration: 0.12 } }}
  onClick={() => onToggleTodo(paikka.id)}
  className="glass-btn w-8 h-8 rounded-full flex items-center justify-center"
  aria-label={todo ? 'Poista TO DO -listalta' : 'Lisää TO DO -listalle'}
>
```

---

### WR-02: SuosikitClient.removeTodo — optimistisen rollbackin stale closure -virhe rinnakkaisissa poistoissa

**File:** `app/suosikit/SuosikitClient.tsx:63`
**Issue:** `const previous = paikat` tallentaa `paikat`-taulukon referenssin funktion kutsuhetkellä. Jos käyttäjä poistaa kohteen A ja sitten nopeasti kohteen B ennen kuin A:n Supabase-kutsu on valmis, ja A:n kutsu epäonnistuu, rollback palauttaa `previous`-arvon joka sisältää sekä A:n että B:n — optimistinen poisto B:stä peruutetaan virheellisesti. Virhetilanteessa käyttöliittymä palautuu väärin.
**Fix:** Käytä funktionaalista `setPaikat`-kutsua rollbackissa, joka lisää takaisin vain epäonnistuneen kohteen:
```typescript
async function removeTodo(paikkaId: number) {
  if (!userId) return
  setPaikat(prev => prev.filter(p => p.id !== paikkaId))

  const supabase = createBrowserSupabase()
  const { error } = await supabase
    .from('suosikit')
    .delete()
    .eq('user_id', userId)
    .eq('paikka_id', paikkaId)

  if (error) {
    console.error('[SuosikitClient] delete error:', error)
    // Restore only the failed item by re-fetching or inserting it back
    // Simplest safe approach: restore from a re-fetch
    const { data } = await supabase
      .from('suosikit')
      .select('paikka_id, liikuntapaikat(*)')
      .eq('user_id', userId)
      .eq('paikka_id', paikkaId)
      .single()
    if (data) {
      const place = (data as unknown as SuosikkiRow).liikuntapaikat
      if (place) setPaikat(prev => [...prev, place])
    }
  }
}
```
Vaihtoehtoinen minimaalinen korjaus: lisää palautuva kohde taulukkoon funktionaalisessa päivityksessä eikä korvaa koko taulukkoa.

---

### WR-03: NavBar näyttää "TO DO" -linkin kirjautumattomille — ristiriita NavPilin auth-guardin kanssa

**File:** `app/components/NavBar.tsx:89-96`
**Issue:** `NavBar`:n `/suosikit`-linkki (`<Bookmark>` + "TO DO") rendataan ilman `clientEmail`-ehtoa — se näkyy kaikille käyttäjille riippumatta kirjautumistilasta. `NavPill.tsx` taas käärii vastaavan linkin `{user && (...)}` -ehtoon (rivit 64-75), joten kirjautumaton käyttäjä ei näe NavPilissä "TO DO" -linkkiä. Etusivu.tsx:n sivupaneelissa `/suosikit`-linkki on myös ilman auth-guardia. Epäjohdonmukaisuus luo ristiriitaisen käyttäjäkokemuksen: osassa navigaatiota linkki näkyy, osassa ei. SuosikitClient kyllä käsittelee kirjautumattoman tilan gracefully, joten tämä ei kaada sovellusta, mutta UX on epäkoherentti.
**Fix:** Lisää `clientEmail`-ehto NavBariin samoin kuin NavPilissä:
```tsx
{clientEmail && (
  <Link
    href="/suosikit"
    onClick={() => setOpen(false)}
    className="flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
  >
    <Bookmark className="w-3.5 h-3.5" />
    TO DO
  </Link>
)}
```

## Info

### IN-01: Etusivu.tsx — `suosikitSizeAndIds`-muuttujaa ei nimetty uudelleen

**File:** `app/components/Etusivu.tsx:379,387,410,413`
**Issue:** `useMemo`-muuttuja on yhä nimeltään `suosikitSizeAndIds` eikä `todoSizeAndIds` (tai vastaava). Muuttuja on rivistä 379 (`const suosikitSizeAndIds = useMemo(...)`) ja sitä käytetään riveillä 387, 410 ja 413. Kommentti rivillä 410 viittaa myös `suosikitSizeAndIds`-nimeen. Kaikki muut tilamuuttujat (`suosikitIds→todoIds`, `suosikkiNimet→todoNimet`, `setSuosikitIds→setTodoIds`) nimettiin uudelleen suunnitelman mukaisesti, mutta tämä jäi. Ei riko toiminnallisuutta, mutta rikkoo nimeämiskoherenssin.
**Fix:**
```typescript
const todoSizeAndIds = useMemo(
  () => Array.from(todoIds).sort((a, b) => a - b).join(','),
  [todoIds]
)
// Käytä todoSizeAndIds riveillä 387 ja 413
```

---

### IN-02: BottomNav.tsx — `font-semibold` rikkoo projektin typografiaohjesäännön

**File:** `app/components/BottomNav.tsx:28,36,44`
**Issue:** BottomNav käyttää `font-semibold` (paino 600) kaikkien kolmen nav-kohteen tekstissä ("Koti", "Lista", "TO DO"). CLAUDE.md:n typografiasäännöt sallivat vain painot 400 (normal) ja 700 (bold) — "Never use 600 (semibold)." Tämä on pre-existing ongelma joka ei poistu tässä vaiheessa, vaikka tiedostoa muutettiin. BottomNav on dead file (ei importteja), joten vaikutus nollaan aktiiviseen käyttäjään, mutta rikkomus on silti koodikannassa.
**Fix:**
```tsx
<span className="text-[10px] font-bold">TO DO</span>
```
(samoin "Koti" ja "Lista")

---

_Reviewed: 2026-05-31_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
