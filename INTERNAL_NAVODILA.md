# Interna Navodila: AluK Portal (upravljanje in delovanje)

Ta dokument je namenjen tebi (interno), da se čez čas hitro spomniš:
- kako portal deluje (Cloudflare R2 + Supabase + GitHub Pages),
- kako pravilno nalagati/brisati datoteke,
- kako delujejo predogledi (preview slike) in “NOVO/posodobitve”,
- katere skripte imaš za sinhronizacije.

Repo/korenski folder: `AluK_Portal/`

## 1) Arhitektura na kratko

### Frontend (portal)
- Portal je statična aplikacija: `index.html`, `style.css`, `script.js`.
- Hostanje: GitHub Pages (custom domain `portal.aluk.si` prek `CNAME`).
- Avtentikacija: Supabase Magic Link (OTP) v `script.js` prek `@supabase/supabase-js` (anon key v JS).
- Datoteke: dejansko so shranjene v Cloudflare R2 (public base URL je v `script.js` kot `R2_BASE_URL`).
- Metapodatki/indeks:
  - tabela `files` v Supabase (seznam datotek, poti, velikosti, `updated_at` ...),
  - tabela `catalog_index` v Supabase (indeks “šifranta” po straneh PDF: `pdf_filename`, `page_number`, `page_title`, `code`).

### Storage (Cloudflare R2)
- Bucket: `portal-aluk` (nastavljeno v `.env`).
- Struktura “map” v R2 je samo del ključa (path), npr:
  - `Okenski sistemi/Okenski sistem C67K/Opis sistema C67K.pdf`
- Portal linka datoteke prek `R2_BASE_URL/<path>`.

### Backend/logika (Supabase)
- Auth (Magic Link): Supabase Authentication.
- Podatki:
  - `files` tabela: uporablja se za prikaz map/datotek, velikost, “Datum posodobitve” in logiko “NOVO”.
  - `catalog_index` tabela: uporablja se za iskanje po šifri (globoko iskanje znotraj katalogov).
- “Zahtevek za dostop”: tabela `access_requests` (INSERT iz clienta).

## 2) Lokalni razvoj / test

### Zagon lokalno
V repotu:
```bash
npm run dev
```
To zažene `serve` in odpre portal lokalno (tipično `http://localhost:3000`).

### Supabase redirect URL-ji (Magic Link)
Poglej `SUPABASE_REDIRECTS.md`.
Če se Magic Link ne vrne nazaj v portal, je skoraj vedno problem v “Redirect URLs” ali “Site URL”.

## 3) Delo z datotekami (R2): nalaganje, brisanje, preimenovanje

### Nalaganje datotek/map
1. V Cloudflare Dashboard (R2 bucket `portal-aluk`) naloži datoteke v pravo “mapo” (prefix).
2. Priporočilo: imena datotek naj bodo stabilna (preimenovanja povzročajo, da stari linki/favoriti ne ustrezajo).

### Brisanje / preimenovanje
- Če brišeš ali preimenuješ, se spremeni ključ (path).
- Portal ima “favorite” v localStorage; ob zagonu poskuša počistiti neveljavne (če mapa ne obstaja).
- Po večjih spremembah v R2 vedno naredi “sync” v Supabase (glej točko 4).

## 4) Sync R2 -> Supabase `files` (metapodatki)

Skripta: `sync_r2_to_supabase_files.js`

Kaj naredi:
- prebere vse objekte iz R2,
- zapiše/posodobi vrstice v Supabase tabeli `files` (ime, `r2_path`, `filename`, `size_bytes`, `updated_at` ...).

Poganjanje:
```bash
node sync_r2_to_supabase_files.js
```

`.env`:
- skripta sama prebere `.env` (ni treba ročno `export`).
- kritične spremenljivke: `R2_*`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_TABLE`.

Pomembno:
- `SUPABASE_SERVICE_ROLE_KEY` je admin ključ; naj bo samo v `.env` (ne commitaj).

## 5) Predogledi (preview slike za PDF)

Portal zna prikazati sliko kot preview namesto ikone, če v isti mapi obstaja slika z istim “base name”.
Primer:
- `Opis sistema SG50.pdf`
- `Opis sistema SG50.png` (ali `.jpg/.jpeg/.webp`)

Portal logika:
- ob nalaganju mape si zgradi `imageMap` iz slik (`.jpg/.jpeg/.png/.webp`),
- pri prikazu PDF v grid view (ne list view) uporabi sliko, če obstaja.

### Ročno dodan preview (tvoja slika)
- Če sam dodaš sliko v R2 (npr. `ime.png`), bo portal to uporabil.
- To je “ročno” (manual) in je prioriteta pred avtomatskimi thumbnaili.

### Avtomatski preview za PDF (prva stran)
Skripta: `sync_pdf_thumbnails_to_r2.js`

Kaj naredi:
- najde PDF-je v R2,
- za PDF brez manual preview-ja ustvari `ime.png` iz prve strani in ga upload-a nazaj v isto mapo,
- ob ponovnem zagonu generira samo, če se je PDF spremenil (primerja PDF `ETag` z metadata `src-etag` na thumbnailu).

Zagon za vse:
```bash
node sync_pdf_thumbnails_to_r2.js --summary
```

Zagon za mapo/prefix:
```bash
node sync_pdf_thumbnails_to_r2.js --prefix "Okenski sistemi/"
node sync_pdf_thumbnails_to_r2.js --prefix "Ostala dokumentacija/"
```

Dry-run (nič ne uploada):
```bash
node sync_pdf_thumbnails_to_r2.js --prefix "Okenski sistemi/" --dry-run
```

Opombe:
- Skripta na macOS uporablja `qlmanage` (Quick Look) za render PDF->PNG.
- Če v mapi že imaš `ime.jpg/.jpeg/.webp` ali `ime.png` brez metadata `src-etag`, skripta PDF preskoči (da ne povozi ročnega preview-ja).

## 6) “NOVO” in “Zadnje posodobitve”

“NOVO” in banner “Zadnje posodobitve” sta vezana na enoten “since” datum:
- `localStorage` ključ: `aluk_updates_since`
- “reset za vse uporabnike” se dela z verzijo v `script.js`:
  - `UPDATES_RESET_VERSION` (spremeniš datum -> vsem uporabnikom se enkrat resetira na “od danes”).

Logika:
- `isAfterUpdatesSince(created_at)` določa, ali je datoteka “nova”.
- Banner “Zadnje posodobitve” je rekurzivno iskanje novih datotek po tabeli `files` (in cache v `sessionStorage`).

Če želiš, da od določenega dne naprej vse šteje kot “novo”:
- spremeni `UPDATES_RESET_VERSION` v `script.js` (npr. `2026-03-01`) in deployaj.

## 7) Iskanje po šifri (catalog_index)

Ko uporabnik vpiše šifro:
- portal naredi query na Supabase tabelo `catalog_index` z `ilike("code", "%...%")`,
- rezultate združi po `pdf_filename` in prikaže zadetke po straneh.

Opomba:
- polnjenje/posodabljanje `catalog_index` ni avtomatizirano v teh JS skriptah; to je ločen proces (zunaj portala).

## 8) Sidebar: “Ostala dokumentacija”

V sidebaru je tab:
- “Domov” (`data-path=""`)
- “Ostala dokumentacija” (`data-path="Ostala dokumentacija"`)

Kako deluje:
- To je navadna root mapa v R2: `Ostala dokumentacija/`
- Portal je nastavljen, da se mapa `Ostala dokumentacija` NE prikaže med mapami na Domov (root) seznamu.
  - Dostop je “samo prek taba”.

## 9) Deploy (GitHub)

Tipičen flow:
1. Delaš na branchu.
2. Ko si zadovoljen: merge v `main`.
3. Push `main` na GitHub.
4. GitHub Pages objavi statično stran (domain ureja `CNAME`).

Skripte:
- ni build pipeline; to je statični portal (HTML/CSS/JS).

## 10) GA4 (Analytics)

GA4 gtag je v `index.html` v `<head>` (na vrhu), ID: `G-KY4YRV76JC`.
Preverjanje: GA4 “Realtime”.

## 11) Varnost in “ne pozabi”

- `.env` vsebuje občutljive ključe (R2 in Supabase service-role). Ne commitaš.
- Če bi kdaj ušel “service role key”, ga rotiraš v Supabase in posodobiš `.env`.

## 12) Hiter checklist (ko nekaj ne dela)

1. Portal se ne prijavi (Magic Link):
   - preveri `SUPABASE_REDIRECTS.md` in Supabase Redirect URLs/Site URL.
2. Datotek ni ali so napačne velikosti/datumi:
   - požen `node sync_r2_to_supabase_files.js`
3. PDFji nimajo preview slik:
   - ročno dodaj `ime.png` ali požen `node sync_pdf_thumbnails_to_r2.js --prefix ".../"`
4. “NOVO” ne deluje “od danes”:
   - preveri `aluk_updates_since` v localStorage (in `UPDATES_RESET_VERSION` v `script.js`).

