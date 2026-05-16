# Domain Migration Checklist — Tuna Manuel Adımlar

> **Pencere:** Cumartesi gece 22:00 → Pazar 04:00 (kullanıcı uyurken)
> **Plan referansı:** `~/.claude/plans/melodic-dreaming-marshmallow.md`
> **Rehber:** `docs/DOMAIN-MIGRATION.md`

---

## ⚠ CUMA'YA KADAR (Aşama 0 — Pre-migration)

### [x] 1. Resend peoplein.com.tr verified ✅ (Yol C — PeopleIn account)

- [x] PeopleIn Resend account'unda `peoplein.com.tr` zaten verified (US-East-1, ~1 ay önce)
- [x] DKIM record (`resend._domainkey.peoplein.com.tr`) DNS'te mevcut
- [x] "HelloTalent App" API key oluşturuldu (Sending access, sadece peoplein.com.tr)
- [x] Key `.env.local` `RESEND_PEOPLEIN_API_KEY=re_QoyqAc1w...` (gitignored)
- **Status:** ✅ Cumartesi gece Supabase Edge Fn ENV update için hazır

### [ ] 2. SPF/DKIM/DMARC düzeltme (Cuma akşam — Chrome MCP ile)

**Mevcut peoplein.com.tr SPF YANLIŞ:**
```
v=spf1 include:spf.protection.outlook.com -all
```

Microsoft 365 dahil ama Tuna **Google Workspace** kullanıyor. Resend için de SPF eksik.

**Doğru SPF (yeni TXT record):**
```
v=spf1 include:_spf.google.com include:amazonses.com ~all
```

- `_spf.google.com` → Google Workspace email gönderimi
- `amazonses.com` → Resend backend (AWS SES) — `noreply@peoplein.com.tr` gönderimi
- `~all` → soft fail (deliverability dostu)

**Aksiyonlar (Chrome MCP ile Cuma akşam):**
- [ ] CF Dashboard → peoplein.com.tr → DNS → TXT record `v=spf1 include:spf.protection.outlook.com -all` → **DELETE**
- [ ] Yeni TXT: `v=spf1 include:_spf.google.com include:amazonses.com ~all`
- [ ] DMARC ekle (opsiyonel ama önerilen): TXT `_dmarc.peoplein.com.tr` → `v=DMARC1; p=none; rua=mailto:admin@peoplein.com.tr; aspf=r; adkim=r`
- [ ] Legacy temizlik: `MS=ms43204587` (Microsoft 365 verification) — kullanılmıyorsa sil
- [ ] Verify: `dig TXT peoplein.com.tr +short` → yeni SPF görünmeli

**Risk if not done:** Resend'den gönderilen `noreply@peoplein.com.tr` Gmail/Outlook'ta SPAM folder'a düşer. Magic link/password reset email'leri kullanıcıya gitmez.

### [ ] 3. Email mailbox setup (Cumartesi'ye kadar)

Tercih: **Cloudflare Email Routing** (ücretsiz, kolay):

- [ ] CF Dashboard → peoplein.com.tr → Email → Email Routing → **Enable**
- [ ] **NOT:** peoplein.com.tr MX zaten Google Workspace'e işaret ediyor (`smtp.google.com`). CF Email Routing **MX'i değiştirir** → Google Workspace email bozulur.
- [ ] **Alternatif:** Google Workspace'te (admin.google.com) bu adresleri **alias** olarak ekle, mevcut Tuna inbox'una forward
- [ ] Specific routes:
  - `noreply@peoplein.com.tr` → alias → discard veya admin
  - `bulten@peoplein.com.tr` → alias → Tuna inbox
  - `support@peoplein.com.tr` → alias → Tuna inbox
  - `admin@peoplein.com.tr` → alias → Tuna inbox

**Test:** `echo "test" | mail -s "Test" support@peoplein.com.tr` → Tuna Gmail'e gelmeli

### [ ] 4. Google Workspace email migration (Pazartesi — Tuna)

- Tuna admin.google.com'da hellotalent.ai alias'larını kaldır
- peoplein.com.tr-only setup (alias değil, ana adres)
- Detay: Tuna Pazartesi yapacak (post-migration)

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

### [ ] Aşama 5 — Supabase Edge Function ENV + Redeploy

**5a — Secrets update (Chrome MCP ile Claude yapar):**

- [ ] https://supabase.com/dashboard/project/cpwibefquojehjehtrog/functions
- [ ] Edge Functions → Secrets → 4 değişken güncelle:

| Variable | Yeni değer | Kaynak |
|----------|------------|--------|
| `EMAIL_FROM` | `HelloTalent <noreply@peoplein.com.tr>` | Hibrit brand |
| `NEWSLETTER_FROM` | `HelloTalent Bülten <bulten@peoplein.com.tr>` | Hibrit brand |
| `REPLY_TO` | `support@peoplein.com.tr` | |
| `RESEND_API_KEY` | `re_QoyqAc1w...` (Tuna .env.local'dan kopyalanır) | **PeopleIn account "HelloTalent App" key** — eski HelloTalent Resend key DEĞİL |

(HelloTalent ismi sender display'de kalır — hibrit brand kararı)

**5b — Edge function redeploy (newsletter-confirm hardcoded URL fix):**

Hardcoded URL'ler `supabase/functions/newsletter-confirm/index.ts`:
- `LANDING_OK = 'https://hellotalent.ai/newsletter-onay.html?ok=1'`
- `LANDING_ERR = 'https://hellotalent.ai/newsletter-onay.html?err='`
- `prefUrl = 'https://hellotalent.ai/newsletter-tercih.html?token=...'`

Aşama 6 sed bu URL'leri yakalar (`.ts` dahil). Sonra redeploy:

```bash
cd ~/Downloads/Hellotalent
supabase functions deploy newsletter-confirm --no-verify-jwt
# Veya tüm fonksiyonları redeploy:
supabase functions deploy --no-verify-jwt
```

**Risk if not done:** Newsletter confirm tıklayan kullanıcı hellotalent.ai'a redirect olur. 301 redirect ile düzelir ama suboptimal — direct yeni domain'e gitsin.

### [ ] Aşama 6 + 7 — Sed replace + Meta + Edge Fn URLs

**Claude yapar.** "Aşama 6 başlat" de.

Beklenen: ~65 dosya değişir (61 HTML/JS/MD + edge function .ts + CI workflows + playwright config), sadece domain replace, brand text dokunmaz.

**Verify:**
```bash
cd ~/Downloads/Hellotalent
grep -rln "hellotalent\.ai" --include="*.html" --include="*.js" --include="*.ts" --include="*.yml" | grep -v _archive
# Beklenen: 0 line
```

Ek kapsanan dosyalar:
- `.github/workflows/uptime-check.yml` (hellotalent.ai HTTP GET)
- `.github/workflows/lighthouse-ci.yml` (3 URL audit)
- `playwright.config.js` (PW_TARGET_URL default — optional)
- `sitemap.xml` (7 URL)
- `supabase/functions/newsletter-confirm/index.ts` (3 hardcoded URL)
- Diğer edge fn dosyaları (mevcut sed kapsamında)

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

17 senaryo, hepsi `talent.peoplein.com.tr` üzerinde:

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
- [ ] 14. **Newsletter confirm** — bülten kaydı + confirm email tıkla → talent.peoplein.com.tr/newsletter-onay.html?ok=1 (edge fn redeploy doğrulanır)
- [ ] 15. **Email SPF/DKIM check** — Test email Gmail'de aç → Headers → "SPF: pass" ve "DKIM: pass" görmeli (spam folder'a düşmemeli)
- [ ] 16. **GA4 cross-domain tracking** — talent.peoplein.com.tr → peoplein.com.tr arası tıklama → GA4 Realtime'da aynı session
- [ ] 17. **Uptime workflow** — GitHub Actions `uptime-check` yeşil (yeni URL)

**17/17 PASS → Pazartesi sabahı live, kullanıcılara hazır.**

**Herhangi bir FAIL → Plan'daki Rollback tablosuna bak.**

---

## 📋 PAZARTESİ SABAHI — Post-deploy

- [ ] **Google Search Console** → Change of Address tool (hellotalent.ai → talent.peoplein.com.tr)
  - https://search.google.com/search-console → hellotalent.ai property → Settings → Change of address
  - Yeni domain seç (talent.peoplein.com.tr olarak verify edilmiş olmalı önce)
- [ ] **Google Search Console** → Yeni property ekle (talent.peoplein.com.tr) + sitemap.xml submit
- [ ] **GA4 hostname whitelist** — Property settings → Data Streams → talent.peoplein.com.tr ekle
- [ ] **Cloudflare cache purge** — her iki zone için "Purge Everything"
- [ ] **Ana sayfaya bilgilendirme banner** (1-2 hafta): "Yeni adres: talent.peoplein.com.tr"
- [ ] **Google Workspace email migration** (Tuna):
  - admin.google.com → Domains → hellotalent.ai alias kaldır
  - peoplein.com.tr-only setup
- [ ] **Claude'a "Aşama 10 başlat"** → docs commit + PR + Codex review

---

## 🧹 POST-MIGRATION CLEANUP (1 hafta sonra)

- [ ] **auth.hellotalent.ai Resend domain unverify** — eski/stale, gereksiz
- [ ] **Microsoft 365 SPF + MS verification record** — eski legacy, peoplein.com.tr DNS'ten temizle (sadece Google Workspace kalır)
- [ ] **HelloTalent Resend account inceleme** — kullanılmayan key'ler revoke et (peoplein hesabı ana account oldu)
- [ ] **HelloTalent.ai expire monitoring** — domain bitince Cloudflare zone'unu da kaldır (1.5 ay sonra)

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
