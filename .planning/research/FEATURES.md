# Feature Landscape

**Domain:** Sports / fitness venue discovery (Finnish market, Tampere-first)
**Researched:** 2026-05-19
**Confidence:** HIGH for table stakes (validated against Wolt, ClassPass, Mindbody, Google Maps, Foursquare patterns); MEDIUM for differentiators (requires live user validation)

---

## Reference Apps Analyzed

| App | Category | Lesson |
|-----|----------|--------|
| Wolt | Local discovery + delivery | Premium card UX, GPS "nearby", estimated time/cost upfront, filter chips, skeleton loading |
| Google Maps | Map-first discovery | Search-over-browse for known intent, place photos, hours at a glance, "open now" toggle |
| ClassPass | Fitness booking marketplace | Credit-pack friction, curated category browse, schedule integration, cancellation pain |
| Mindbody | Fitness venue platform | Heavy booking flows, class schedules, teacher profiles — too much for a directory |
| Glofox | Studio management / booking | Studio-side tool, not a consumer discovery app — wrong reference |
| Foursquare / Yelp | Venue discovery + reviews | Review volume drives trust, tips system, check-ins — social graph required |

---

## Table Stakes

Features users expect from any venue discovery app. Absence causes "feels broken" reactions.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| GPS "Near Me" — distance on card | Every map app (Google, Wolt) shows distance from user. Users orient by proximity first. | Medium | Requires `navigator.geolocation`, Haversine distance calc client-side. Already partially in architecture (Etusivu map), needs to surface on cards. |
| Opening hours visible without clicking | Google Maps trained users: hours on the list card, "open now" badge. Not having this means clicking every card. | Medium | Data must exist in Supabase. Hours can be structured (JSON per weekday) or a freetext string for v1. |
| Drop-in / single-visit price prominent | Core use case #1 is tourist finding drop-in price. Price hidden behind click = user leaves. | Low (UI) / High (data) | UI change is trivial; getting accurate kertakäyntihinta for 50+ venues is the real work. |
| Sport-type filter | Already built. Users cannot browse without category filtering in a multi-sport directory. | Done | Existing. Maintain and expand `lajiKonfig` as data grows. |
| Free-text search | Users with a specific place name in mind (e.g., "Hakametsä") expect search. | Low | Already exists in `LiikuntapaikatLista`. Ensure it is discoverable on mobile. |
| Venue detail page | Every directory app has this. Card → detail is the fundamental UX contract. | Done | Existing. Needs price + hours + photos added. |
| Map view with markers | GPS-native users (and tourists navigating a city) expect map. | Done | Existing `Kartta.tsx`. Needs GPS user location pin. |
| "Open now" filter | Trained by Google Maps and Wolt. High-intent signal — user is ready to go right now. | Low | Derived from hours data once hours are in Supabase. |
| Mobile-first layout | 80%+ of local discovery traffic is mobile. Thumb-reachable nav, large tap targets. | Done (partial) | BottomNav exists. Detail page needs audit for mobile. |
| Venue phone number / website link | User wants to call ahead or visit official site. Without this, directory is a dead end. | Low | `puhelin` and `varauslinkki` already in schema. Ensure visible on detail page. |

---

## Differentiators

Features that create a competitive edge. Not expected, but meaningfully improve the experience. These are what make liikuntahakemisto feel like Wolt-quality, not like a city council webpage.

| Feature | Value Proposition | Complexity | Dependency | Notes |
|---------|-------------------|------------|------------|-------|
| Weather-aware AI recommendation widget | "It is raining, here are 5 indoor options near you." Context-aware, feels like a smart assistant, not a database. Uniquely Finnish (weather affects outdoor sports heavily). | Medium | Open-Meteo (done), Claude API, GPS location | Already planned. Must feel fast — render in < 1s with graceful skeleton. Key design risk: widget must not feel gimmicky. |
| Scroll-driven expanding map on homepage | Map as entry point, not an afterthought. Wolt does this on scroll — map fills screen, venue cards float above. Feels premium, spatially grounded. | Medium | Framer Motion `useScroll` (already implemented) | Partially implemented. Polish is the remaining work. |
| Drop-in pricing transparency as editorial hook | ClassPass hides pricing behind signup. We show it upfront. "No account, no surprise fees" is a trust signal that drives first visit. | Low (UI) / High (data) | Accurate price data per venue | Simple to implement once data is in. Position it as a brand promise, not just a field. |
| Sport-type inspiration mode ("I don't know what I want") | Users browsing for a new sport (use case #2) need editorial framing, not just a list. A curated "Try something new" section or sport-type landing with description. | Medium | `lajiKonfig` expansion | Differentiates from Google Maps (which is intent-driven). Low implementation cost if built on existing filter system. |
| Venue badge: "Tourist-friendly" / "Drop-in welcome" | Explicit signal for use case #1. Some gyms require membership even for a single visit — surfacing which ones do not saves tourists frustration. | Low | Manual data curation | Boolean field in Supabase. Prominent badge on card. High value, low cost. |
| Accurate Finnish sport taxonomy | Google Places categorizes venues generically (gym, sports complex). Local taxonomy (padel, uinti, jääkiekko, kiipeily) is far more useful in Finland. | Low | `lajiKonfig` | Already started. Extend to 15-20 Finnish sport types. This is a moat — hard to replicate without local knowledge. |
| Ad placements as "featured venues" (not banners) | Revenue model that does not degrade UX. Featured venues appear as elevated cards in context — same card design, just with a "Sponsoroitu" badge. Wolt does this for restaurants. | Medium | Supabase `is_featured` flag, sorting logic | Placeholder first, monetize later. Design must not feel like a banner ad. |
| Multilingual support (Finnish + English) | Tourists (use case #1) may not speak Finnish. English fallback for venue names/descriptions dramatically expands reach. | High | i18n library, translated content | Do NOT build in v1. Note as v2 priority. |

---

## Anti-Features

Features to deliberately NOT build in v1. Each has a specific reason and a better alternative.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| User accounts / login | Adds friction before first value delivery. Anonymous browsing is the core promise. No account = no GDPR email flows to manage. | Keep fully anonymous. Revisit after proving retention. |
| Favorites / saved venues (requires login) | Without accounts, favorites must be localStorage-based — technically possible but creates false expectation of sync across devices. | LocalStorage favorites as v1.5 feature — simple, no backend, but explicitly labeled "saved on this device." |
| Booking / reservation flow | Full booking requires deep integration with each venue's own system (Timma, Varaa.fi, proprietary). This is a 6-month project alone. | Link out to venue's own booking URL (`varauslinkki`). We are a directory, not a booking engine. |
| User reviews and ratings | Review systems require review volume to be credible, moderation to prevent spam, and user accounts to prevent fake reviews. Empty stars are worse than no stars. | Curate quality over quantity. Use "Drop-in welcome" badges instead of ratings as trust signals. |
| Real-time availability | Showing "3 spots left in the 18:00 class" requires live API access to each venue's booking system. No standardized API exists across Finnish gyms. | Link to venue's own booking page which shows real availability. |
| Class schedule / timetable | Same problem as availability — requires per-venue integration. Mindbody's value is aggregating schedules; replicating that is a multi-year project. | Show hours of operation (static). Link to venue website for schedule. |
| Social sharing (share a venue) | Low usage feature that adds complexity (og:image generation, share meta). Not core to either use case. | Native browser share API costs near zero — add only if explicitly requested. |
| Venue claims / owner portal | Venue owners editing their own data requires auth, moderation, and admin tooling. | Manual data enrichment from venues via email/phone. Build owner portal in v2. |
| Push notifications | Requires service worker, user permission prompt, notification backend. Opt-in rate for discovery apps is < 10%. | Not applicable without accounts. Revisit with PWA in v2. |
| Price comparison chart | Comparing gym membership prices across venues is a different product (price comparison). Kertakäyntihinta is the only price signal we need. | Show single drop-in price per venue clearly. Do not build comparison tables. |

---

## Feature Dependencies

```
GPS location
  └── "Near me" distance on cards
  └── Map user location pin
  └── Weather widget (location → weather → recommendation)

Opening hours data in Supabase
  └── Hours display on card
  └── Hours display on detail page
  └── "Open now" filter
  └── "Open now" badge on card

Drop-in price data in Supabase
  └── Price on card (already schema-ready: hinta_min / hinta_max)
  └── Price on detail page
  └── Price filter (already in LiikuntapaikatLista)
  └── "Drop-in welcome" badge

`lajiKonfig` sport taxonomy
  └── Sport filter pills
  └── Sport badges on cards
  └── Sport inspiration mode
  └── Accurate categorization in data ingestion

Featured venue flag (Supabase is_featured)
  └── Promoted card placement
  └── Ad revenue model
```

---

## MVP Recommendation

The v1 milestone should close the gap between "works" and "feels Wolt-quality." Prioritize in this order:

**Must ship (close the table stakes gap):**
1. GPS distance + user location pin on map (high-intent users orient by proximity)
2. Opening hours in Supabase schema + visible on card and detail page
3. Drop-in price prominent on card (data enrichment is the bottleneck, not UI)
4. "Open now" filter (derived from hours, low cost once hours are in)

**Ship as differentiators:**
5. Weather-aware AI widget — finalize and polish (already partially built)
6. "Drop-in welcome" boolean badge — trivial to add, high signal for use case #1
7. Expand `lajiKonfig` to 15-20 Finnish sport types with accurate taxonomy
8. Featured venue card styling (placeholder — no monetization logic needed yet)

**Defer to v1.5 or v2:**
- LocalStorage favorites (simple but sets account expectation)
- Multilingual Finnish/English
- Venue owner data portal
- PWA / offline support

---

## Complexity Reference

| Label | Meaning |
|-------|---------|
| Low | < 1 day implementation, no new dependencies |
| Medium | 2-5 days, may add a dependency or require new Supabase columns |
| High | > 1 week, architectural change or external system integration |

---

## Sources

- Wolt app UX patterns: direct product analysis (HIGH confidence — widely documented)
- ClassPass feature set: direct product analysis (HIGH confidence)
- Mindbody / Glofox: training knowledge of platform capabilities (MEDIUM confidence — verify specific API capabilities before integrating)
- Google Maps "open now" / distance UX: direct product analysis (HIGH confidence)
- Finnish fitness market specifics (drop-in culture, sport taxonomy): training knowledge + PROJECT.md context (MEDIUM confidence — validate with Tampere venue data)
- Feature complexity estimates: derived from existing codebase architecture in `.planning/codebase/ARCHITECTURE.md` (HIGH confidence for this codebase)
