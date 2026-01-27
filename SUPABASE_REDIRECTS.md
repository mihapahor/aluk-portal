# Supabase Redirect URL-je za AluK Portal

## Kje nastaviti v Supabase Dashboard

1. Odpri [Supabase Dashboard](https://app.supabase.com)
2. Izberi projekt: `ugwchsznxsuxbxdvigsu`
3. Pojdi na: **Authentication** → **URL Configuration**
4. V sekciji **Redirect URLs** dodaj vse spodaj navedene URL-je

## Potrebni Redirect URL-ji

### Production URL (GitHub Pages)
**Glavni URL (dodaj VSE tri variante):**
```
https://mihapahor.github.io/aluk-portal/
https://mihapahor.github.io/aluk-portal
https://mihapahor.github.io/aluk-portal/*
```

**Če imaš custom domain, dodaj tudi:**
```
https://portal.aluk.si/
https://portal.aluk.si
https://portal.aluk.si/*
https://www.portal.aluk.si/
https://www.portal.aluk.si
https://www.portal.aluk.si/*
```

### Localhost za razvoj (opcijsko)
```
http://localhost:3000/
http://localhost:3000
http://localhost:3000/*
http://127.0.0.1:3000/
http://127.0.0.1:3000
http://127.0.0.1:3000/*
```

### Site URL (v isti sekciji nastavi)
**Site URL** mora biti nastavljen na glavni production URL:
```
https://mihapahor.github.io/aluk-portal/
```

**OPOMBA:** Če imaš custom domain (npr. portal.aluk.si), dodaj tudi te URL-je v Redirect URLs in nastavi Site URL na custom domain.

## Kako deluje

Portal uporablja:
- **Magic Link Authentication** - uporabnik klikne na link v emailu
- **emailRedirectTo: window.location.origin** - redirect na trenutni origin
- Supabase avtomatsko obdela URL parametre (`code=` ali `access_token=`)

## Preverjanje

Po nastavitvi preveri:
1. Odpri portal
2. Vpiši email in klikni "Pošlji povezavo za prijavo"
3. Preveri email in klikni na magic link
4. Portal bi te moral avtomatsko prijaviti

## Troubleshooting

Če magic link ne deluje:
- Preveri, ali je URL v emailu enak enemu od nastavljenih redirect URL-jev
- Preveri, ali je Site URL pravilno nastavljen
- Preveri konzolo brskalnika (F12) za napake
