# Offline App: Download All Files Spec

## Status
- Version: 1.0 (approved input)
- Last updated: 2026-02-21
- Owner: Miha Pahor
- Related: `ALUK_PORTAL_PROJECT_SCOPE.md`

## 1. Goal
Omogočiti gumb `Prenesi vse` v offline app načinu, ki pripravi celoten portal za delo brez interneta (OneDrive-style): datoteke ostanejo v portalu in so lokalno sinhronizirane, ne pa prenešene v sistemski `Downloads`.

## 2. Confirmed Decisions
- Scope prenosa: celoten portal
- Gumb (label): `Prenesi vse`
- Warning threshold: če je ocena prenosa > 2 GB, prikaži opozorilo + potrditev
- Start behavior:
  - <= 2 GB: začni takoj
  - > 2 GB: začni po potrditvi
- Sync mode: avtomatski ob zagonu app (app start), po prvem prenosu
- Deletions: če je datoteka izbrisana na strežniku, se izbriše tudi lokalno
- Access: funkcija na voljo vsem prijavljenim uporabnikom, samo v offline app načinu
- Progress UI: prikaz napredka v procentih
- UI placement: gumb za `Prenesi vse` ob `Online` badge
- Existing 3-dot menu: ostane za posamezno mapo/datoteko
- Delivery strategy: po fazah (MVP -> nadgradnje)
- Sync errors: prikaži konkreten razlog napake (npr. premalo prostora, brez povezave)
- `Pocisti offline podatke`: vkljuceno ze v MVP

## 3. UX Flow
1. Uporabnik v offline app vidi status `Online` in gumb `Prenesi vse`.
2. Ob kliku:
- sistem izračuna ocenjeno velikost in število datotek
- če je > 2 GB: prikaže modal z opozorilom in gumbom `Nadaljuj`
- če je <= 2 GB: prenos se začne takoj
3. Med prenosom:
- status ob badge: `Sinhronizacija: XX%`
- gumb je začasno disabled ali preklopljen v `Sinhroniziram...`
4. Po uspehu:
- status: `Offline pripravljeno`
- prikaz `Zadnja sinhronizacija: čas`
5. Ob spremembah na strežniku:
- avtomatski background sync prenese le razliko (delta)
6. Če je datoteka izbrisana na strežniku:
- ob syncu se odstrani tudi lokalna kopija

## 4. Technical Model
### 4.1 Storage model
- Uporabi Service Worker + Cache Storage za datoteke + lahek IndexedDB metadata indeks
- Lokalni manifest vsebuje:
  - `fileId`
  - `path`
  - `version/hash`
  - `lastModified`
  - `size`
  - `cachedAt`

### 4.2 Sync algorithm
- Initial sync: prenesi vse datoteke iz celotnega indeksa
- Delta sync: periodično ali ob online reconnect preveri spremembe po `hash/version/lastModified`
- Apply rules:
  - new -> download + cache
  - changed -> replace cache
  - deleted -> remove local cache

### 4.3 Triggerji
- Ročno: klik `Prenesi vse`
- Avtomatsko:
  - app start (ce online)

### 4.4 Error handling
- Retry z backoff
- Če zmanjka prostora: jasno obvestilo, sync pause
- Če povezava pade: resume ob reconnect

## 5. UI States (ob `Online` badge)
- `Online` + `Prenesi vse`
- `Sinhronizacija: XX%`
- `Offline pripravljeno`
- `Posodobitev na voljo` (če je delta zaznana, še ni aplicirana)
- `Napaka pri sinhronizaciji` (s CTA: `Poskusi znova`)

## 6. Phased Delivery Plan
## Phase 1 (MVP)
- Gumb `Prenesi vse` ob badge
- Celoten initial download
- Progress v %
- >2 GB warning modal
- Status `Offline pripravljeno`
- Gumb `Pocisti offline podatke`
- Prikaz konkretnega razloga napake pri syncu

## Phase 2
- Avtomatski delta sync (new/changed/deleted)
- `Zadnja sinhronizacija` timestamp
- Bolj robusten retry/resume

## Phase 3
- Bolj napreden status (`Posodobitev na voljo`, podrobnejša diagnostika)
- Telemetry za uspešnost synca
- Optimizacije performance za velike knjižnice

## 7. Acceptance Criteria
- Uporabnik lahko z enim klikom pripravi celoten portal za offline
- Pri >2 GB se sync ne začne brez potrditve
- Pri <=2 GB se sync začne takoj
- Med syncom je viden % napredek
- Po koncu je vsebina dostopna brez interneta
- Spremenjene datoteke se avtomatsko posodobijo
- Izbrisane datoteke se odstranijo tudi lokalno
- Funkcija deluje za vse prijavljene uporabnike v offline app načinu

## 8. Test Scenarios
- Full sync na hitri in počasni povezavi
- Prekinitev interneta med syncom
- Reconnect in resume
- >2 GB flow z zavrnitvijo in potrditvijo
- Brisanje datoteke na strežniku -> lokalni delete
- Update obstoječe datoteke -> lokalna zamenjava
- Čist zagon app brez interneta po uspešnem syncu

## 9. Implementation Checklist
- [ ] Dodaj UI control ob `Online` badge (`Prenesi vse`)
- [ ] Dodaj size-estimation endpoint/izračun
- [ ] Dodaj confirmation modal za >2 GB
- [ ] Implementiraj full-library sync flow
- [ ] Implementiraj progress %
- [ ] Implementiraj local manifest (version/hash/mtime)
- [ ] Dodaj gumb `Pocisti offline podatke`
- [ ] Prikazi specificen razlog napake (premalo prostora, povezava, timeout)
- [ ] Implementiraj auto delta sync
- [ ] Implementiraj delete propagation (remote delete -> local delete)
- [ ] Implementiraj error/retry/resume
- [ ] Dodaj QA scenarije in smoke test

## 10. Non-negotiables (from scope)
- Primarna optimizacija: Windows desktop (Chrome, nato Edge)
- Sekundarno: mobile Apple
- Delovanje mora ostati funkcionalno na vseh glavnih platformah
- Osnovna izkušnja portala (hiter dostop do dokumentacije) ne sme biti degradirana
