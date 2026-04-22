# HelloTalent Studio — Emergency Playbook

> Panik anında değil, **sakin kafayla önceden oku**. Her scenario için: detect + immediate action + rollback + postmortem path.

## Scenarios

### 1. Agent Teams Stall (Peer Chat Cevap Gelmiyor)

**Detect:**
- `chief-of-staff` SendMessage sonrası 90s+ cevap yok
- Terminal'de agent "thinking" indicator takılı kalmış
- `.claude/projects/.../subagents/agent-*.jsonl` son güncelleme eski

**Immediate Action:**
```bash
# 1. Agent Teams'i geçici kapat
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=0

# 2. Task tool ile sync dispatch (Katman 2 fallback)
# Main session'da: Task(auditor, "...") çağır

# 3. Session resume problemi ise:
# claude --resume {session-id}
```

**Rollback:**
- `.claude/settings.json`'da env değişikliğini persist et (gerekirse)
- Stall pattern 2+ kez yaşanırsa: Agent Teams ertele, sadece Katman 2 kullan

**Postmortem:**
- maintenance-agent → `postmortem` skill
- `/si:promote` ile pattern rule'a graduate

---

### 2. service_role Key Sızıntısı

**Detect:**
- `settings.local.json` committed (git status)
- Git history'de key string grep hit
- Sentry log'unda key görünüyor
- Tuna "key leak oldu" diyor

**Immediate Action:**
```bash
# 1. HEMEN Supabase dashboard'dan key rotate
# https://supabase.com/dashboard/project/cpwibefquojehjehtrog/settings/api
# → "Generate new service_role JWT"

# 2. Eski key kullanıma kapat (dashboard'da disable)

# 3. .env.local ve settings.local.json yeni key ile update

# 4. GitHub secrets (repo settings) rotate

# 5. Git history temizle (eğer commit'e düştüyse)
git filter-branch --index-filter \
  "git rm --cached --ignore-unmatch settings.local.json" \
  --prune-empty --tag-name-filter cat -- --all
# veya BFG Repo-Cleaner
```

**Rollback:**
- Force push main (Tuna explicit approval)
- Tüm kolaboratörlere bildirim (tek kişi şu an, ama gelecekte)

**Postmortem:**
- Zorunlu. infra-ops + auditor + Tuna
- Learning: secrets never in tracked files, always .gitignore

---

### 3. Migration Rollback

**Detect:**
- Production migration sonrası Sentry error spike
- `supabase db status` fail
- Query timeout, connection pool exhausted
- RLS "permission denied" yaygın

**Immediate Action:**
```bash
# 1. Son migration ID'sini bul
cd ~/Downloads/Hellotalent
ls supabase/migrations/ | tail -3

# 2. Rollback migration yaz (yeni dosya)
# Örnek: 20260422143000_rollback_066.sql
# DROP TABLE / DROP POLICY / ALTER TABLE reverse

# 3. supabase-agent + auditor paralel review

# 4. Local dry-run
supabase db reset
npm run db:push  # local

# 5. Production apply (Tuna approval)
npm run db:push --linked

# 6. Verify Sentry / PostHog recover
```

**Rollback (eğer kritik):**
- Supabase dashboard → restore backup (Point-in-Time Recovery, Pro plan)
- Tuna explicit approval zorunlu

**Postmortem:**
- maintenance-agent → postmortem
- Learning: dry-run her migration için zorunlu, skip edilmesin

---

### 4. Codex Timeout (T3/T4 Gate Kilitli)

**Detect:**
- Pre-commit hook `codex-review.sh` 3+ dakika dönmedi
- Codex API rate limit / down
- `.claude/agent-memory/codex-reviews/` son dosya eski

**Immediate Action:**
```bash
# 1. Codex'i bypass et (tek commit için)
git commit -m "..." --no-verify

# NOT: --no-verify YASAK. Sadece Codex DOWN durumunda override.
# Tuna explicit approval + log:
echo "$(date) | Codex bypass | commit $(git rev-parse HEAD) | reason: Codex API down" \
  >> .claude/agent-memory/codex-bypass.log
```

**Rollback:**
- Codex geri geldiğinde: `codex-review.sh` manuel çalıştır, bypass'lanan commit'i review et
- Çelişki varsa hotfix PR + Codex review

**Postmortem:**
- Bypass 2+ kez hafta içinde → Codex'e alternatif araştır
- Manuel review fallback protokolü oluştur

---

### 5. Cloudflare Cache Stuck (Deploy Sonrası Eski İçerik)

**Detect:**
- Deploy sonrası hard refresh hâlâ eski içerik
- Curl etag karşılaştırma: cache date > commit time

**Immediate Action:**
```bash
# 1. Full cache purge
bash ~/Downloads/Hellotalent/scripts/cf-purge.sh --purge-everything

# 2. Tarayıcı test (hard refresh + incognito)
# Cmd+Shift+R

# 3. Specific URL'de hâlâ sorun → DNS TTL kontrol
dig hellotalent.ai +short
```

**Rollback:**
- Yok (cache purge destructive değil)

---

### 6. DB Connection Pool Exhausted

**Detect:**
- Supabase "too many connections"
- Query timeout yaygın
- HR dashboard 500 error

**Immediate Action:**
```bash
# 1. Active connection say
# Supabase dashboard → Database → Connection pooling

# 2. Pooler port kullanılıyor mu kontrol (6543 instead of 5432)

# 3. Leaked connection bul
# supabase-agent + maintenance-agent peer chat

# 4. Geçici: Supabase dashboard → "Reset connections"
```

**Postmortem:**
- N+1 query audit (code-reviewer)
- Connection leak pattern (supabase-agent)

---

### 7. Production Error Spike (Sentry)

**Detect:**
- Sentry "new issue" rate >5x baseline
- PostHog funnel drop-off ani

**Immediate Action:**
```bash
# 1. Son deploy ne zamandı?
git log --oneline -5

# 2. Spike deploy ile korelasyon var mı?

# 3. Evet → rollback:
# infra-ops agent → git revert + force push

# 4. Hayır → maintenance-agent postmortem
```

---

### 8. GitHub Pages Down (hellotalent.ai 502)

**Detect:**
- Site erişilmez
- Status page: githubstatus.com

**Immediate Action:**
```bash
# 1. GitHub Pages durum check
curl -s https://www.githubstatus.com/api/v2/status.json

# 2. DNS resolve check
dig hellotalent.ai

# 3. Kısa geçici alternatif:
# Netlify/Vercel'e hızlı mirror (infra-ops)
```

---

## Priority Contacts (Escalation)

| Sorun Tipi | Önce |
|------------|------|
| Security leak | Tuna + auditor |
| DB corruption | Tuna + supabase-agent |
| Auth down | Tuna + auditor + supabase-agent |
| KVKK breach | Tuna + legal-reviewer (Hafta 2) |
| Payment | Tuna + supabase-agent + auditor |
| Design crisis | designer + ui-agent |

## Rule of Thumb

- **Sakin kal.** Panik karar hatası üretir.
- **Document everything.** Her emergency action'ı log'la.
- **Blameless postmortem** zorunlu.
- **2 göz** destructive action'da (Tuna + chief-of-staff veya uzman ajan).
- **Rollback first, fix second.** Önce kanamayı durdur, sonra nedeni çöz.
