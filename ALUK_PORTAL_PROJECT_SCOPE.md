# AluK Portal Project Scope

## Document Status
- Version: 0.2 (draft)
- Last updated: 2026-02-21
- Owner: Miha Pahor
- Contributors: Projektna ekipa AluK Portal
- Purpose: Enoten referenčni dokument za scope, uporabnike, cilje, prioritete in razvojne odločitve.
- Live link: portal.aluk.si

## 1. Project Snapshot
- Project name: AluK Portal
- One-sentence description: Centralni portal za hiter, enostaven in vedno ažuren dostop do tehnične dokumentacije (katalogi, slike, datoteke) za Alu izvajalce, arhitekte in interno ekipo.
- Project stage: Skoraj zaključen (stabilizacija in dopolnitve)
- Why this exists now: Ker uporabniki potrebujejo enotno mesto za dokumentacijo z rednimi posodobitvami in brez odvisnosti od podpore.

## 2. Vision and Focus
### Vision
AluK Portal je enostaven, pregleden in hiter “single source” za projektno dokumentacijo, ki ga lahko samostojno uporablja tudi manj digitalno vešč uporabnik.

### Product focus (what we optimize for)
- Hitrost dostopa do dokumentacije
- Jasna, intuitivna struktura
- Vsa relevantna dokumentacija na enem mestu
- Redne in zanesljive posodobitve vsebin
- Samostojna uporaba brez dodatnega razlaganja in podpore
- Primarna optimizacija: Windows desktop
- Prioritetni browser support: Chrome (1), Edge (2), nato ostali
- Sekundarno: mobile uporaba (posebej Apple naprave)
- Offline app izkušnja mora delovati zanesljivo

### Out of scope (what we intentionally do not optimize for)
- Portal ne sme postati kompleksen “all-in-one” sistem
- Nove funkcionalnosti ne smejo obremeniti osnovnega toka: iskanje/prikaz dokumentacije
- Napredne funkcije so lahko dodane le diskretno (npr. v sidebar), brez vpliva na osnovno uporabniško izkušnjo

## 3. Users and Roles
### Primary users
- Role: Alu izvajalci (končne stranke)
- Context of use: Pogosto starejši uporabniki, manj vešči uporabe računalnika
- Main jobs-to-be-done:
  - Najti zadnje verzije katalogov
  - Hitro dostopati do dokumentacije za delo na projektih
- Success criteria:
  - Do informacij pridejo hitro
  - Portal uporabljajo samostojno, brez pomoči

### Secondary users
- Role: Arhitekti (posredne stranke)
- Context of use: Potrebujejo zanesljiv dostop do aktualne tehnične dokumentacije
- Main jobs-to-be-done:
  - Pregledati in prenesti pravilne dokumente
  - Delati na podlagi ažurnih podatkov
- Success criteria:
  - Vedno najdejo aktualne dokumente
  - Struktura je jasna brez dodatnih navodil

### Internal/admin users
- Role: Zaposleni v podjetju
- Responsibilities:
  - Uporaba portala za interno delo
  - (V prihodnje) upravljanje vsebine in posodobitev
- Pain points:
  - Trenutno manjka enostavna admin stran za dodajanje/urejanje vsebine brez dostopa do kode

## 4. Core Problems We Solve
- Problem 1: Počasno iskanje dokumentacije po različnih kanalih/lokacijah
- Problem 2: Razpršena dokumentacija namesto enotnega centralnega vira
- Problem 3: Neenotne ali neredne posodobitve dokumentov

## 5. Current Feature Inventory
### Live core features
- Feature: Centralni dostop do dokumentacije
  - Purpose: Vse ključne datoteke na enem mestu
  - Target users: Izvajalci, arhitekti, zaposleni
  - Status: Live
- Feature: Jasna informacijska struktura
  - Purpose: Enostavna orientacija za manj digitalno vešče uporabnike
  - Target users: Primarno izvajalci
  - Status: Live
- Feature: Visoka hitrost delovanja
  - Purpose: Kratek čas do želene informacije
  - Target users: Vsi uporabniki
  - Status: Live

### Supporting features
- Feature: Redne vsebinske posodobitve
  - Purpose: Zagotoviti aktualnost dokumentacije
  - Status: Delno odvisno od trenutnega ročnega procesa

### Nice-to-have / backlog
- Feature: Admin page / CMS sloj za urejanje vsebin brez kode
  - Value: Dolgoročna vzdržnost in manjša operativna odvisnost od razvijalca
  - Priority: High

## 6. Key Workflows
- Workflow 1: Iskanje aktualnega kataloga
  - Trigger: Uporabnik potrebuje zadnjo verzijo kataloga
  - Steps: Vstop v portal -> navigacija po jasni strukturi -> odpiranje/prenos dokumenta
  - Outcome: Uporabnik hitro dobi pravilen dokument
- Workflow 2: Vsebinski update dokumentacije
  - Trigger: Nova ali posodobljena dokumentacija
  - Steps: (Trenutno) ročna objava/update -> preverjanje prikaza v portalu
  - Outcome: Uporabniki vidijo aktualno dokumentacijo

## 7. Goals and Metrics
### Business goals
- Povečati redno uporabo portala med strankami
- Zmanjšati potrebo po individualni podpori in razlaganju

### User outcomes
- Uporabnik samostojno najde dokumentacijo
- Uporabnik zaupa, da je dokumentacija aktualna

### Product/operational metrics
- Metric: Delež uporabnikov, ki samostojno zaključijo iskanje dokumenta
- Current baseline: TBD
- Target: Visok delež (npr. >85%)
- Metric: Pogostost uporabe portala pri obstoječih strankah
- Current baseline: TBD
- Target: Redna tedenska uporaba
- Metric: Čas do najdbe dokumenta
- Current baseline: TBD
- Target: Minimalen (npr. <60 sekund v tipičnem primeru)

## 8. Constraints and Risks
### Constraints
- Technical: Enostavnost UI mora ostati prioriteta
- Platform/browser: Najbolj optimalno delovanje na Windows desktop brskalnikih in offline app; hkrati obvezna funkcionalnost na vseh glavnih platformah
- Team: Operativna odvisnost od tehnične osebe pri update-ih
- Time: Projekt je v zaključni fazi, spremembe morajo biti ciljane
- Legal/compliance: Ni posebnih dodatnih zahtev izven standardnih pravil za spletne portale; vključena mora biti izjava o omejitvi odgovornosti za morebitne napake v dokumentaciji ali na portalu.

### Risks
- Risk: Portal postane preveč kompleksen zaradi novih funkcionalnosti
- Impact: Slabša uporabnost za primarnega uporabnika
- Mitigation: “Documentation-first” pravilo in skrita umestitev sekundarnih funkcij
- Risk: Brez admin strani je dolgoročno vzdrževanje počasno
- Impact: Zastarele vsebine, več ročnega dela
- Mitigation: Prioritetna uvedba enostavnega admin vmesnika

## 9. Integrations and Dependencies
- Integration: Supabase (verjetno storage/auth/plast podatkov)
- Why needed: Gostovanje in dostopnost vsebin/infrastrukture
- Owner: Interna ekipa
- Criticality: High
- Integration: Cloudflare R2 (verjetno storage datotek)
- Why needed: Shranjevanje in dostava dokumentacije
- Owner: Interna ekipa
- Criticality: High

## 10. Open Decisions
- Decision: Kako implementirati admin page za ne-tehnične uporabnike
- Options: Minimal custom admin, preprost CMS sloj, hibridni pristop
- Recommended direction: Minimal admin focused samo na upload/update dokumentacije
- Due date: TBD
- Decision: Katere metrike spremljati operativno od prvega dne
- Options: Manual tracking, analytics dashboard, kombinirano
- Recommended direction: Začetno enostavne metrike + kasnejša avtomatizacija
- Due date: TBD

## 11. Release and Maintenance Model
- Release approach: Iterativne, majhne spremembe brez rušenja obstoječe strukture
- Environments: Branch-based workflow (razvoj na ločenih branchih), `main` predstavlja produkcijo.
- Monitoring/support: Fokus na zmanjšanju potrebe po direktni podpori uporabnikom
- Change control: Vsaka nova funkcija mora dokazati, da ne moti osnovnega toka dokumentacije

## 12. Short Roadmap
- Now (0-1 month): Zaključna stabilizacija + definicija metrik + specifikacija admin strani
- Next (1-3 months): Implementacija enostavne admin strani za vsebinski update brez kode
- Later (3+ months): Dodajanje sekundarnih funkcionalnosti samo, če ostanejo neinvazivne

## 13. Reference Notes for Agents
- If uncertain, prioritize: Hitrost, jasnost, enostavnost, aktualnost dokumentacije
- Communication tone with users: Jasno, praktično, brez tehničnega žargona
- Critical non-negotiables:
  - Primarni namen je prikaz dokumentacije
  - UI mora ostati enostaven za manj digitalno vešče uporabnike
  - Nove funkcije ne smejo slabšati osnovne uporabniške poti
  - Primarna optimizacija je Windows desktop + browserji (najprej Chrome, potem Edge)
  - Sekundarna optimizacija je mobile (Apple), vendar mora portal delovati povsod
  - Offline app mora ostati podprt in stabilen
