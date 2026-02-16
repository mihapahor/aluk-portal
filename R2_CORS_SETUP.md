# Cloudflare R2 CORS Setup (portal.aluk.si)

Ta navodila odpravijo napako:
- `No 'Access-Control-Allow-Origin' header is present`
- `Failed to fetch` za datoteke z `pub-...r2.dev`

## 1) Vnesi CORS policy v R2

1. Odpri **Cloudflare Dashboard**.
2. Pojdi na **R2 Object Storage**.
3. Odpri bucket, ki ga portal uporablja (v navodilih je `portal-aluk`).
4. Odpri **Settings**.
5. Pri **CORS policy** klikni **Edit / Add policy**.
6. Izberi JSON način in prilepi vsebino iz datoteke `R2_CORS_POLICY.json`.
7. Klikni **Save**.

## 2) Po spremembi očisti cache

Če uporabljaš custom domain ali Cloudflare cache pred R2:
1. V Cloudflare pojdi na **Caching** -> **Configuration**.
2. Klikni **Purge Cache** -> **Purge Everything** (ali vsaj za R2/public hostname).

## 3) Hard refresh v browserju

- `Cmd + Shift + R` (macOS) ali `Ctrl + F5` (Windows)
- Če uporabljaš Service Worker, po potrebi v DevTools -> Application -> Service Workers -> **Unregister**, nato refresh.

## 4) Preveri CORS (lokalni test)

Primer (zamenjaj URL datoteke):

```bash
curl -I -H "Origin: http://localhost:3000" \
  "https://pub-28724a107246493c93629c81b8105cff.r2.dev/Okenski%20sistemi/Okenski%20sistem%20C67K/Opis%20sistema%20C67K.pdf"
```

V odgovoru moraš videti:

- `Access-Control-Allow-Origin: http://localhost:3000` (ali `*`)
- po potrebi tudi `Vary: Origin`

## 5) Pomembno

- CORS ni mogoče popraviti samo v `script.js`.
- Če R2 ne vrne pravilnih CORS headerjev, browser blokira request še preden app lahko kaj naredi.
