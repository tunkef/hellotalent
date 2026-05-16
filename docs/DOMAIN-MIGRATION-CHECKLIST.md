# Domain Migration Checklist — Tuna Manuel Adımlar

> **Pencere:** Cumartesi gece 22:00 → Pazar 04:00 (kullanıcı uyurken)
> **Plan referansı:** `~/.claude/plans/melodic-dreaming-marshmallow.md`
> **Rehber:** `docs/DOMAIN-MIGRATION.md`

---

## ⚠ CUMA'YA KADAR (Aşama 0 — Pre-migration)

### [ ] 1. Resend domain verify

- [ ] https://resend.com/domains → "Add Domain"
- [ ] Domain: `peoplein.com.tr`
- [ ] Verilen DNS records (TXT/MX/DKIM/SPF) Cloudflare DNS'e ekle:
  - peoplein.com.tr zone → DNS → Add Record (TXT) → ... (Resend'in verdiği)
- [ ] Bekle (15dk-2sa)
- [ ] Resend dashboard'ta status: **Verified** ✅

### [ ] 2. Email mailbox setup

Tercih: **Cloudflare Email Routing** (ücretsiz, kolay):

- [ ] CF Dashboard → peoplein.com.tr → Email → Email Routing → **Enable**
- [ ] Catch-all veya specific routes:
  - `noreply@peoplein.com.tr` → discard veya bir Gmail forwarding
  - `bulten@peoplein.com.tr` → Tuna Gmail
  - `support@peoplein.com.tr` → Tuna Gmail (inbound mesaj alacak)
  - `admin@peoplein.com.tr` → Tuna Gmail

**Test:** `echo "test" | mail -s "Test" support@peoplein.com.tr` → Gmail'e gelmeli

---

## 🌙 CUMARTESİ GECE 22:00 (Migration Start)

### [ ] Aşama 1 — DNS subdomain

- [ ] CF Dashboard → peoplein.com.tr → DNS → Add Record:
  - Type: **CNAME**
  - Name: `talent`
  - Target: `tunkef.github.io`
  - Proxy: 🟠 Orange cloud ON
  - TTL: Auto

**Verify (terminal):**
```bash
dig talent.peoplein.com.tr +short
# Beklenen: 188.114.x.x (Cloudflare IPs)
```

### [ ] Aşama 2 — GitHub Pages CNAME

**Bu adımı Claude yapar (commit + push) — sen sadece GH Pages settings güncelleyeceksin.**

Claude'a "Aşama 2 başlat" de — sed replace + CNAME commit + push yapar.

Push sonrası **sen yap:**

- [ ] https://github.com/tunkef/hellotalent/settings/pages
- [ ] Custom domain: `hellotalent.ai` → **Remove**
- [ ] Custom domain: `talent.peoplein.com.tr` → **Save**
- [ ] **Enforce HTTPS:** enable (yeni cert için ACME tetikler)
- [ ] Bekle (5-30 dk SSL cert provisioning)

**Verify:**
```bash
curl -I https://talent.peoplein.com.tr
# Beklenen: 200 OK + SSL valid
```

### [ ] Aşama 3 — Supabase Auth URL Config (KRİTİK)

- [ ] https://supabase.com/dashboard/project/cpwibefquojehjehtrog/auth/url-configuration
- [ ] **Site URL:** `https://talent.peoplein.com.tr`
- [ ] **Redirect URLs (whitelist):**
  - `https://talent.peoplein.com.tr/**` (YENİ — ekle)
  - `https://hellotalent.ai/**` (ESKİ — 30 gün kalsın)
- [ ] Save

**Verify:** Aşağıdaki Aşama 9'da test edilecek.

### [ ] Aşama 4 — OAuth Provider callbacks

**Google:**
- [ ] https://console.cloud.google.com/apis/credentials
- [ ] OAuth 2.0 Client → Authorized redirect URIs ekle:
  - `https://talent.peoplein.com.tr/profil.html`
- [ ] Authorized JavaScript origins ekle:
  - `https://talent.peoplein.com.tr`
- [ ] Save

**LinkedIn:**
- [ ] https://www.linkedin.com/developers/apps → app seç → Auth tab
- [ ] Authorized redirect URLs ekle:
  - `https://talent.peoplein.com.tr/profil.html`
- [ ] Save

**Not:** Provider cache 5-60 dakika.

### [ ] Aşama 5 — Supabase Edge Function ENV

- [ ] https://supabase.com/dashboard/project/cpwibefquojehjehtrog/functions
- [ ] Edge Functions → Secrets → 3 değişken güncelle:

| Variable | Yeni değer |
|----------|------------|
| `EMAIL_FROM` | `HelloTalent <noreply@peoplein.com.tr>` |
| `NEWSLETTER_FROM` | `HelloTalent Bülten <bulten@peoplein.com.tr>` |
| `REPLY_TO` | `support@peoplein.com.tr` |

(HelloTalent ismi sender display'de kalır — hibrit brand kararı)

### [ ] Aşama 6 + 7 — Sed replace + Meta

**Claude yapar.** "Aşama 6 başlat" de.

Beklenen: 61 dosya değişir, sadece domain replace, brand text dokunmaz.

**Verify:**
```bash
cd ~/Downloads/Hellotalent
grep -rln "hellotalent\.ai" --include="*.html" --include="*.js" | grep -v _archive
# Beklenen: 0 line
```

### [ ] Aşama 8 — CF Page Rule 301

- [ ] CF Dashboard → hellotalent.ai zone → Rules → Redirect Rules
- [ ] **Create Rule:**
  - Name: "Migration to talent.peoplein.com.tr"
  - Match: Hostname equals `hellotalent.ai` OR Hostname equals `www.hellotalent.ai`
  - Action: Static
  - Type: **301 (Permanent)**
  - URL: `https://talent.peoplein.com.tr$1` veya `concat("https://talent.peoplein.com.tr", http.request.uri.path)`
  - Preserve query string: ON

**Verify:**
```bash
curl -I https://hellotalent.ai/profil.html
# Beklenen: HTTP/2 301 + Location: https://talent.peoplein.com.tr/profil.html
```

---

## ☀ PAZAR SABAHI — Smoke Test (Aşama 9)

13 senaryo, hepsi `talent.peoplein.com.tr` üzerinde:

- [ ] 1. **Anasayfa açılıyor** — https://talent.peoplein.com.tr
- [ ] 2. **Aday kayıt** (email/password) — uye-ol.html
- [ ] 3. **Aday login** — giris.html aday tab
- [ ] 4. **Aday profil** — profil.html düzenleme
- [ ] 5. **CV upload** — Supabase Storage'a upload + display (cpwibefquojehjehtrog.supabase.co URL'i çalışmalı)
- [ ] 6. **İK login** — giris.html işveren tab
- [ ] 7. **İK dashboard** — ik.html açılıyor
- [ ] 8. **İsveren onboarding 9 step wizard** — isveren-onboarding.html
- [ ] 9. **Magic link email** — Tuna kendine magic link gönder → inbox'a `noreply@peoplein.com.tr` adresinden gelmeli
- [ ] 10. **Password reset** — sifre-yenile.html çalışıyor
- [ ] 11. **Google OAuth** — uye-ol.html → Google ile devam → profil.html'e döner
- [ ] 12. **LinkedIn OAuth** — uye-ol.html → LinkedIn ile devam → profil.html'e döner
- [ ] 13. **Eski URL 301** — `curl -I https://hellotalent.ai/profil.html` → 301 + Location header doğru

**13/13 PASS → Pazartesi sabahı live, kullanıcılara hazır.**

**Herhangi bir FAIL → Plan'daki Rollback tablosuna bak.**

---

## 📋 PAZARTESİ SABAHI — Post-deploy

- [ ] **Google Search Console** → Change of Address tool (hellotalent.ai → talent.peoplein.com.tr)
- [ ] **Cloudflare cache purge** — her iki zone için "Purge Everything"
- [ ] **Ana sayfaya bilgilendirme banner** (1-2 hafta): "Yeni adres: talent.peoplein.com.tr"
- [ ] **Claude'a "Aşama 10 başlat"** → docs commit + PR + Codex review

---

## 🚨 ACİL ROLLBACK (her şey kırılırsa)

```bash
# Worst case 30 dk:
# 1. CF Dashboard → talent CNAME delete
# 2. CF Dashboard → 301 Page Rule disable
# 3. git revert <migration-commit> + push
# 4. GH Pages settings → custom domain "hellotalent.ai" geri
# 5. Supabase Auth → Site URL eski geri
# 6. Supabase Edge Fn Secrets → eski değerler
# 7. Google/LinkedIn OAuth → yeni callback URL sil
```

Detay: `docs/DOMAIN-MIGRATION.md` Rollback section.

---

## Hazırlık Durumu

Migration başlamadan önce kontrol:

- [ ] Resend `peoplein.com.tr` **Verified** ✅
- [ ] 4 email mailbox çalışıyor (test mail gönderildi)
- [ ] Cumartesi gece 22:00 — 2 saat ayır
- [ ] Browser sekmelerini hazırla: Cloudflare, Supabase, Google Cloud, LinkedIn, GitHub
- [ ] Bu checklist dosyasını yan ekranda aç
