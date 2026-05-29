import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import NavPill from '@/app/components/NavPill'

export default function TietosuojaPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavPill />
      <div className="max-w-2xl mx-auto px-4 pt-10 pb-16">

        {/* Takaisin-linkki */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
        >
          <ChevronLeft className="w-4 h-4" />
          Takaisin hakemistoon
        </Link>

        {/* Otsikko */}
        <h1 className="font-serif text-3xl font-bold text-[#111111] mt-6">
          Tietosuojaseloste
        </h1>
        <p className="text-sm text-[rgba(17,17,17,0.45)] mt-1">
          Päivitetty 22.5.2026
        </p>

        {/* 1. Rekisterinpitäjä */}
        <section>
          <h2 className="font-serif text-xl font-bold text-[#111111] mt-8 mb-3">
            Rekisterinpitäjä
          </h2>
          <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed mb-4">
            Tämän palvelun rekisterinpitäjä on AKTIIVI. Rekisterinpitäjä vastaa
            henkilötietojen käsittelystä tässä palvelussa EU:n yleisen tietosuoja-asetuksen
            (GDPR) mukaisesti.
          </p>
        </section>

        {/* 2. Mitä tietoja kerätään */}
        <section>
          <h2 className="font-serif text-xl font-bold text-[#111111] mt-8 mb-3">
            Mitä tietoja kerätään
          </h2>
          <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed mb-4">
            Palvelu ei tällä hetkellä kerää henkilötietoja. Käyttäjätunnistautuminen ei ole
            käytössä, eikä palvelu tallenna tietoja käyttäjistä palvelimelle.
          </p>
          <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed mb-4">
            Selainistunnon aikana käytetään sessionStorage-välimuistia tekoälypohjaisen
            sääsuosituksen tilapäiseen tallentamiseen. Tämä tieto poistuu automaattisesti, kun
            selaimen välilehti suljetaan.
          </p>
        </section>

        {/* 3. Evästeet ja selaintallennus */}
        <section>
          <h2 className="font-serif text-xl font-bold text-[#111111] mt-8 mb-3">
            Evästeet ja selaintallennus
          </h2>
          <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed mb-4">
            Palvelu ei käytä evästeitä eikä muita pysyviä selaintallennuksia.
          </p>
          <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed mb-4">
            Tekoälywidget käyttää selaimen sessionStorage-tallennusta välimuistina. Avain on
            sidottu kalenteripäivään (muodossa YYYY-MM-DD), joten suositus haetaan uudelleen
            vain kerran päivässä. Tieto ei välity kolmansille osapuolille eikä säily
            selainsession päättymisen jälkeen.
          </p>
        </section>

        {/* 4. Käyttäjän oikeudet */}
        <section>
          <h2 className="font-serif text-xl font-bold text-[#111111] mt-8 mb-3">
            Käyttäjän oikeudet
          </h2>
          <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed mb-4">
            GDPR:n nojalla jokaisella henkilöllä on oikeus pyytää pääsyä itseään koskeviin
            henkilötietoihin, oikeus vaatia niiden oikaisemista tai poistamista sekä oikeus
            rajoittaa tai vastustaa tietojen käsittelyä.
          </p>
          <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed mb-4">
            Koska palvelu ei tällä hetkellä tallenna henkilötietoja, näitä oikeuksia ei
            toistaiseksi voida kohdistaa palvelun rekisteriin. Tilanne päivittyy, kun
            käyttäjätilit otetaan käyttöön (ks. Muutokset-osio).
          </p>
        </section>

        {/* 5. Yhteydenotot */}
        <section>
          <h2 className="font-serif text-xl font-bold text-[#111111] mt-8 mb-3">
            Yhteydenotot
          </h2>
          <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed mb-4">
            Tietosuojaan liittyvissä kysymyksissä voit ottaa yhteyttä sähköpostitse:
            joona.orava@gmail.com
          </p>
        </section>

        {/* 6. Muutokset */}
        <section>
          <h2 className="font-serif text-xl font-bold text-[#111111] mt-8 mb-3">
            Muutokset
          </h2>
          <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed mb-4">
            Tätä tietosuojaselostetta päivitetään, kun palveluun lisätään käyttäjätilit.
            Tulevassa päivityksessä seloste laajenee kattamaan kirjautumistiedot, suosikit
            ja muut käyttäjään liittyvät tiedot. Päivitys tehdään ennen käyttäjätilien
            julkaisua.
          </p>
          <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed mb-4">
            Muutokset julkaistaan tällä sivulla. Voimassa olevan version päiväys näkyy sivun
            yläosassa.
          </p>
        </section>

      </div>
    </div>
  )
}
