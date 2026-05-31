# Phase 21: TO DO -lista - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 21-todo-lista
**Areas discussed:** Sivun URL, Suomenkielinen nimi, HeartButton-uudelleennimeäminen, TO DO -listan näkymä

---

## Sivun URL

| Option | Description | Selected |
|--------|-------------|----------|
| Pidä /suosikit | Taulu on 'suosikit', koodimuutokset minimaalisia, ei rikota kirjanmerkkejä. NavPillin teksti muuttuu silti. | ✓ |
| Nimetä /todo:ksi | Koherentimpi brändi, mutta vaatii hakemiston uudelleennimeämistä + redirectin. Supabase-taulu pysyy suosikit-nimellä. | |

**User's choice:** Pidä /suosikit
**Notes:** Käytännöllinen valinta — URL on implementaatiodetalji, brändäys tapahtuu UI-tekstillä.

---

## Suomenkielinen nimi

| Option | Description | Selected |
|--------|-------------|----------|
| TO DO | Roadmap käyttää tätä. Lyhyt, tuttu käsite. | ✓ |
| Vierailulista | 100 % suomea, kuvaa hyötyä selkeästi. | |
| Haluaisin käydä | Conversational, mutta liian pitkä NavPilliin. | |

**User's choice:** TO DO
**Notes:** Suoraan roadmapin mukaisesti.

---

## HeartButton-uudelleennimeäminen

| Option | Description | Selected |
|--------|-------------|----------|
| Kyllä, nimetään BookmarkButton:ksi | Puhtaampi koodi — tiedostonimi vastaa toimintaa. Vaikuttaa ~5 import-kohtaan. | ✓ |
| Ei, pidetään HeartButton.tsx | Vähemmän muutoksia, mutta tiedostonimi jää harhaanjohtavaksi. | |

**User's choice:** Kyllä, nimetään BookmarkButton:ksi
**Notes:** Koodikannan konsistenssi on tärkeää.

---

## TO DO -listan näkymä

| Option | Description | Selected |
|--------|-------------|----------|
| Pelkästään rebrand | Vaihdetaan ikoni, teksti, aria-labelit. Listan rakenne sama. | |
| Poista-nappi jokaiselle riville | Supabase.delete() + optimistinen päivitys. | |
| Kuva + poista (täysin päivitetty kortti) | image_url + poistomahdollisuus. | |
| Rebrand + DiagonaalKortti + poistonappi | DiagonaalKortti-komponentti + kirjanmerkki-poistonappi kortin ulkopuolella. | ✓ |

**User's choice:** Rebrand ja muutetaan lista siten että se sisältää samoja diagonaalkortteja kuin listassa, niiden viereen lisätään poista-nappi (kirjanmerkki-ikoni kortin oikealla puolella, samalla rivillä).
**Notes:** SuosikitClient korvataan DiagonaalKortti-pohjaisella listalla. Poistonappi on `flex-row`-rivin ulkopuolella DiagonaalKortin oikealla puolella. Optimistinen poisto. `onShowMap` ei välitetä (ei karttaa TO DO -sivulla).

---

## Claude's Discretion

- Tarkka Bookmark vs BookmarkCheck ikoni eri tiloille
- Poistonapin koko ja tarkka sijainti
- API payload key `/api/saasuositus`:ssa (`suosikit` vs `todoNimet`)
- Tyhjiö-tilojen kopioksti

## Deferred Ideas

- "Merkitse vierailtu" -toiminto — ei v1.4 scope
- TO DO -listan jako muille käyttäjille — ei v1.4 scope
- NavBar:n `/?nakyma=lista` Haku-linkin siivous — ei tämän vaiheen scope
