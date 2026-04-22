# Newsletter DNS + Deliverability Runbook

> Audience: infra-ops, Tuna (Cloudflare DNS erişimi)
> Son güncelleme: 23 Nisan 2026
> Hedef: `bulten@hellotalent.ai` sender'dan Gmail, Outlook, Yahoo + TR ISP'lere %95+ inbox placement.

---

## 1. DNS kayıtları (Cloudflare)

Cloudflare Dashboard → `hellotalent.ai` → DNS → Records.

### SPF (mevcut kaydı extend et — iki SPF kaydı YASAK)

Mevcut TXT `@` kaydı varsa içine Resend include ekle:

```
v=spf1 include:_spf.resend.com include:<mevcut_include> ~all
```

Yoksa yeni kayıt:

```
Type: TXT
Name: @
Content: v=spf1 include:_spf.resend.com ~all
TTL: Auto
Proxy: off
```

**Doğrulama:** `dig TXT hellotalent.ai +short` → SPF görünmeli.

### DKIM (Resend dashboard'dan 2 adet CNAME)

Resend dashboard → Domains → `hellotalent.ai` → Add → iki adet CNAME record göstersin:

```
Type: CNAME
Name: resend._domainkey
Content: resend._domainkey.resend.com
TTL: Auto
Proxy: off (zorunlu — Cloudflare proxy DKIM'i kırar)

Type: CNAME
Name: resend2._domainkey (veya Resend'in verdiği ikinci isim)
Content: resend2._domainkey.resend.com
TTL: Auto
Proxy: off
```

**Doğrulama:** Resend dashboard'ında "Verified" yeşil yanar. Test: `dig CNAME resend._domainkey.hellotalent.ai +short`.

### DMARC

İlk 30 gün `p=none` (monitoring only), sonra aşamalı sıkılaştırma.

```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=none; rua=mailto:dmarc-reports@hellotalent.ai; fo=1
TTL: Auto
Proxy: off
```

**30 gün sonra (bounce/spam report yoksa):** `p=quarantine`
**60 gün sonra (temiz):** `p=reject`

Aggregate report için `dmarc-reports@hellotalent.ai` alias kur (Google Workspace veya basit forward).

### Sender subdomain (opsiyonel, ileri seviye)

Transactional (`noreply@`) ile marketing (`bulten@`) sender reputation ayırmak için ileride `mail.hellotalent.ai` subdomain eklenebilir. Şimdilik aynı domain'de iki farklı from adresi yeter.

---

## 2. Resend konfigürasyonu

### Sender verify

Resend dashboard → Domains → `hellotalent.ai` mevcut.
- Transactional: `HelloTalent <noreply@hellotalent.ai>` (email-send email_outbox default)
- Marketing: `HelloTalent Bülten <bulten@hellotalent.ai>` (email-send newsletter_* template'lerde)

### Webhook (open/click/bounce tracking)

Resend Webhook URL → `https://cpwibefquojehjehtrog.supabase.co/functions/v1/newsletter-webhook-resend` (Faz 2'de oluşturulacak, Faz 1 yok).

### Env var (Supabase Edge Functions)

```bash
# Zaten set:
RESEND_API_KEY=...
EMAIL_FROM=HelloTalent <noreply@hellotalent.ai>
REPLY_TO=support@hellotalent.ai

# Newsletter için yeni:
NEWSLETTER_FROM=HelloTalent Bülten <bulten@hellotalent.ai>
```

Supabase Dashboard → Project → Settings → Edge Functions → Secrets.

---

## 3. İYS (İleti Yönetim Sistemi) entegrasyonu

### Başvuru (Tuna)

1. [iys.org.tr](https://iys.org.tr) → kurumsal hesap
2. Vergi no + MERSIS + ticari unvan ile başvuru
3. 1-2 hafta içinde API key + Marka Kodu atanır
4. Dashboard'dan API key kopyala

### Env var ekle

```bash
IYS_API_KEY=<Bearer token>
IYS_BRAND_CODE=<Marka kodu>
IYS_API_BASE=https://api.iys.org.tr/sps/
```

### pg_cron schedule (Supabase dashboard → Database → Cron)

```sql
SELECT cron.schedule(
  'iys-sync-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cpwibefquojehjehtrog.supabase.co/functions/v1/iys-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.service_role_key', true))
  );
  $$
);
```

### Key eksikken (şimdi)

`iys-sync` fonksiyonu env yokken sessizce skip eder (return `{ skipped: true }`). `iys_sync_queue` birikir. Key geldiğinde ilk cron tick'inde drain başlar.

**3 iş günü kuralı (ETK 6563):** Onay `confirmed_at`'ten 3 iş günü içinde İYS'ye push. Key gecikmesi durumunda queue'daki kayıtlar `synced_at` olmadığı için İYS retroactive timestamp kullanmaz — push anındaki `new Date()` ile syncleyeceğiz (yasal savunulur: onay capture edildi, sistemsel gecikme).

---

## 4. Deliverability warmup plan

İlk İYS-onaylı kampanya gönderimi için:

| Gün | Max email/gün | Not |
|-----|---------------|-----|
| 1-3 | 100 | İç ekip test + soft launch |
| 4-7 | 250 | Organik subscriber'lara ilk kampanya |
| 8-14 | 500 | Full aday listesi (pilot segment) |
| 15-21 | 1000 | Full kurumsal + aday |
| 22+ | Scale | Bounce/spam <%2 ise serbest |

**Red flag thresholds:**
- Bounce rate >%3 → durdur, list hygiene cron'u çalıştır
- Spam complaint >%0.1 → content audit (marketing-writer + legal-reviewer peer review)
- Open rate <%12 → subject line + send time A/B test (Faz 2)

---

## 5. Ön-launch kontrol listesi

- [ ] SPF record live (`dig TXT hellotalent.ai`)
- [ ] DKIM verified Resend dashboard'ında
- [ ] DMARC `p=none` live, rua alias forward çalışıyor
- [ ] `bulten@hellotalent.ai` sender Resend'de verified
- [ ] `NEWSLETTER_FROM` env var Supabase Edge Functions'ta set
- [ ] Test mail: kendi Gmail'ine + iş Outlook'una + Turkcell superonline e-mail'ine gönder
- [ ] [mail-tester.com](https://www.mail-tester.com) → 10/10 score
- [ ] [mxtoolbox.com](https://mxtoolbox.com/SuperTool.aspx?action=mx:hellotalent.ai) → MX/SPF/DKIM/DMARC hepsi yeşil
- [ ] İYS başvuru başlatıldı (Tuna)
- [ ] KVKK avukat onayı (K016) metin taslağı gönderildi

---

## 6. Troubleshooting

**"DKIM alignment failed"**
- Cloudflare proxy DKIM CNAME'ini geçiriyor → Proxy off et.

**"SPF softfail"**
- İkinci SPF record varsa sil. Sadece bir TXT `@` SPF olmalı, Resend include'u mevcut kayda ekle.

**"DMARC fail"**
- DKIM veya SPF alignment yok. Resend "HelloTalent &lt;bulten@hellotalent.ai&gt;" kullanıyor mu (envelope domain match) kontrol et.

**"Gmail bulk sender warning"**
- 2024 Gmail rules: 5K+/gün volume için p=none DMARC yetersiz, p=quarantine gerekli. Warmup sonrası geçiş zorunlu.

---

## 7. Runbook sahibi

infra-ops agent (plus: secret rotation 90 gün cron). Tuna escalation için: telegram + email.
