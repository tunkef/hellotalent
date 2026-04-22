# Tuna Manuel Aksiyon Takvimi — Studio v3

> "Ne zaman, nasıl" sorusunun cevabı. Studio v3 implementation'ı kodda hazır. Senin manuel yapman gereken adımlar (3 gün içinde tamamlanmalı). Her adımın **süresi + önceliği + ne olur yapmazsan** açıklandı.

## BUGÜN (22 Nisan 2026, ~20 dakika)

### 1. Agent Teams Env Kalıcı Et — 30 saniye

```bash
echo 'export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1' >> ~/.zshrc
source ~/.zshrc
```

**Neden:** Agent Teams peer chat bu env olmadan çalışmaz.
**Yapmazsan:** Chief-of-staff tek yönlü Task dispatch'e düşer (Katman 2 fallback). Çalışır ama peer chat yok.
**Öncelik:** P0 (şart)

### 2. self-improving-agent Plugin — 2 dakika

Claude Code session aç, şu komutları çalıştır:
```
/plugin marketplace add alirezarezvani/claude-skills
/plugin install self-improving-agent@claude-code-skills
```

Test:
```
/si:status
```
Beklenti: MEMORY.md health dashboard görünür.

**Neden:** `self-improving-agent` kuralları otomatik graduate eder. Bizim yazdığımız `## Learned Rules` protocol'ünü yönetir.
**Yapmazsan:** Self-improve manuel olur (pending-rules.md → Tuna approve → sen ilgili agent.md'ye manual append). Çalışır ama zaman alır.
**Öncelik:** P1 (önerilen)

### 3. lackeyjb/playwright-skill — 3 dakika

Claude Code session'da:
```
/plugin marketplace add lackeyjb/playwright-skill
/plugin install playwright-skill@playwright-skill
```

Test: HelloTalent'ta `Task(uat-tester, "giris.html mobile login smoke")` — otomatik browser açılır, test yazar+çalıştırır.

**Neden:** uat-tester için ana skill. Model-invoked, durable selector (getByRole/getByTestId), universal executor module hatalarını sıfırlar.
**Yapmazsan:** uat-tester kendi .class bazlı selector üretir, UI değişikliğinde testler kırılır.
**Öncelik:** P0 (şart)

### 4. AccessLint — 2 dakika

```
/plugin marketplace add accesslint/claude-marketplace
/plugin install accesslint@claude-marketplace
```

**Neden:** darkmode-auditor için WCAG contrast MCP.
**Yapmazsan:** darkmode-auditor contrast math manuel yapmaya çalışır, az doğruluk.
**Öncelik:** P1 (önerilen)

### 5. Launchd Cron Install — 1 dakika

```bash
bash ~/Downloads/Hellotalent/scripts/install-launchd.sh install
bash ~/Downloads/Hellotalent/scripts/install-launchd.sh status
```

Beklenti: 2 plist LOADED.

**Neden:** Haftalık (Pazar 09:00 maintenance + 10:00 rules review) otomatik scan.
**Yapmazsan:** Manuel scan gerekir: `bash scripts/weekly-maintenance.sh` her Pazar.
**Öncelik:** P2 (otomasyon)

### 6. İlk Studio Test — 5 dakika

```bash
cd ~/Downloads/Hellotalent
claude
```

Session içinde:
```
/cook hellotalent
```

**Beklenti:**
- briefer dispatch olur
- Current state özeti çıkar
- Pending approvals check
- Team health (16 agent aktif)
- "Hazır. Ne yapıyoruz?" sorusu

**Başarısızsa:** `docs/EMERGENCY.md` Section 1 (Agent Teams Stall) oku.
**Öncelik:** P0 (validation şart)

---

## YARIN (23 Nisan 2026, ~30 dakika)

### 7. qaskills Page Object Model — 5 dakika

```bash
cd ~/Downloads/Hellotalent
npx @qaskills/cli add playwright-e2e

# Opsiyonel: E2E + API + Visual + A11y hepsi
npx @qaskills/cli add complete-playwright-suite
```

**Neden:** uat-tester Page Object Model zorlanır, sürdürülebilir test üretir.
**Yapmazsan:** Atomic test discipline olmaz, spec karışır.
**Öncelik:** P1

### 8. Codex API Setup — 10 dakika

**Option A — Codex CLI (önerilen):**
```bash
npm install -g @openai/codex-cli
# API key setup:
codex login
# veya
echo 'export OPENAI_API_KEY=sk-...' >> ~/.zshrc
source ~/.zshrc
```

**Option B — codex-rescue plugin:**
```
/plugin install codex-rescue@claude-plugins-official
```

Sonra `scripts/codex-review.sh`'yi düzenle (şu an placeholder):
```bash
# Dosya: scripts/codex-review.sh
# "PLACEHOLDER" bölümünü gerçek çağrıyla değiştir:
codex review --files "$FILES" --output "$OUTPUT"
```

**Neden:** T3/T4 tier commit'lerinde otomatik Codex ikinci göz.
**Yapmazsan:** Placeholder her zaman exit 0 döner — gerçek review yok, sadece fake yeşil işareti.
**Öncelik:** P0 (T3/T4 iş yapacaksan şart)

### 9. Cloudflare Token — 5 dakika

Cloudflare dashboard → `My Profile` → `API Tokens` → `Create Token` → `Edit zone DNS` (purge cache permission).

```bash
cd ~/Downloads/Hellotalent
echo "CF_ZONE_ID=xxx" >> .env.local
echo "CF_API_TOKEN=xxx" >> .env.local
```

Test:
```bash
bash scripts/cf-purge.sh
```

**Neden:** infra-ops post-deploy otomatik cache purge.
**Yapmazsan:** Manuel purge gerekir, deploy sonrası 40s + cache stale riski.
**Öncelik:** P1

### 10. GitHub MCP — 3 dakika

HelloTalent GitHub'da. Code-reviewer + infra-ops için:

```bash
claude mcp add github stdio npx @modelcontextprotocol/server-github
```

veya plugin:
```
/plugin install github-mcp@claude-plugins-official
```

GitHub PAT (Personal Access Token) gerekir:
```bash
echo "GITHUB_PAT=ghp_xxx" >> .env.local
```

**Neden:** Code-reviewer PR review, infra-ops branch push.
**Yapmazsan:** Manuel `gh` CLI fallback.
**Öncelik:** P1

---

## BU HAFTA (24-28 Nisan 2026)

### 11. İlk Dogfood (T2 UI) — 30 dakika

Kolay bir UI işini Studio'dan geçir:
- `/cook hellotalent`
- "designer + ui-agent + code-reviewer + uat-tester ile X component'ini güncelle"
- `docs/dogfood-template.md` doldur, `.claude/agent-memory/dogfood-reports/`'a kaydet

**Neden:** Studio'nun gerçek iş üzerinde kalitesini ölç.
**Öncelik:** P1

### 12. İlk Dogfood (T3 Security) — 45 dakika

Gerçek bir security/RLS check:
- Bir migration seç (eski veya yeni)
- auditor + code-reviewer + Codex paralel dispatch
- Native vs Codex agreement ölç
- Shell script baseline (scripts/archive-20260422/deepseek-review.sh) ile karşılaştır

**Neden:** Codex hybrid gate'in gerçek etkisini gör.
**Öncelik:** P1

### 13. Matthew Stephens Contrast Skill Araştır — 15 dakika

Blog post: https://matthewlarn.medium.com/i-built-33-claude-skills-to-fix-the-vibe-design-accessibility-gap-a0f7f3ff1d1c

Repo URL blog'da belirtilmiş olmalı. Kurulum:
```
/plugin marketplace add matthewlarn/<repo-adı>
/plugin install contrast-checker@<marketplace>
```

**Neden:** darkmode-auditor için APCA secondary contrast reference.
**Alternatif:** AccessLint zaten kurulu, bu olmasa da WCAG çalışır.
**Öncelik:** P2 (nice-to-have)

### 14. yusuftayman/playwright-cli-agents (Türk geliştirici) — 10 dakika

```
/plugin marketplace add yusuftayman/playwright-cli-agents
/plugin install playwright-cli-agents@<marketplace>
```

**Neden:** Türkçe dokümantasyon, Page Object Model ile otomatik E2E üretim.
**Öncelik:** P3 (deneme amaçlı)

---

## HAFTA 2 (29 Nisan - 5 Mayıs)

### 15. legal-reviewer Aktive — 20 dakika

Agent yazıldı, KVKK avukat görüşmesi için brief hazırlayacak.

`Task(legal-reviewer, "LB3/LB4 için avukat brief hazırla — aydınlatma metni ve kullanım şartları")` çağır, çıktıyı avukatla paylaş.

**Neden:** LB3/LB4 hâlâ açık (MVP 1 blocker).
**Öncelik:** P0 (MVP 1 ship için şart)

### 16. data-analyst İlk Raporu — 30 dakika

PostHog funnel baseline:
`Task(data-analyst, "son 7 gün signup funnel raporu — cohort + segment breakdown")`

**Neden:** MVP 2'ye geçiş kararı için aktivasyon rakamı lazım (50+ tamamlanmış profil her segmentte).
**Öncelik:** P1

### 17. Haftalık Rules Review — 5 dakika

Launchd otomatik çalışır (Pazar 10:00). Sen sadece çıktıyı oku:
```bash
cat ~/Downloads/Hellotalent/.claude/agent-memory/weekly-rules-review-$(date +%Y%m%d).md
```

Pending rules varsa approve/reddet, `self-improving-agent` ile graduate.

---

## HAFTA 3 (6-12 Mayıs)

### 18. watchdog Aktive — 10 dakika

Karmaşık multi-agent task'lardan önce:
`Task(watchdog, "current Teams session monitor et")` (background)

**Neden:** Peer chat stall/loop/drift erken yakala.
**Öncelik:** P2

### 19. Dogfood Sonuç Raporu — 1 saat

Hafta 2 dogfood'ları karşılaştır:
- `docs/studio-migration-report.md` yaz
- Shell script baseline vs native Studio
- Token, wall-clock, bulgu kalitesi
- Codex agreement rate

Karar: Hangi archive script tamamen silinir, hangisi yedek tutulur.

### 20. Archive Cleanup — 5 dakika

Hafta 3 sonu, 2 hafta geçti:
```bash
rm -rf ~/Downloads/Hellotalent/scripts/archive-20260422/
```

(Sadece Studio başarılıysa!)

---

## Aylık Rutin

### Secret Rotation (90 gün)
```bash
# scripts/secret-rotation-check.sh (yazılacak)
# Hangi secret rotate lazım listesini gösterir
```

Supabase service_role, GitHub PAT, Cloudflare token, Sentry DSN — 90 günde bir rotate.

### Monthly Product Report
`Task(data-analyst, "aylık KPI raporu")` — executive summary.

---

## Öncelik Sırası (TL;DR)

**P0 — Bugün yap:**
1. Agent Teams env
2. lackeyjb/playwright-skill
3. İlk Studio test (`/cook hellotalent`)
4. Codex API key (T3/T4 iş varsa)

**P1 — Yarın yap:**
5. self-improving-agent
6. AccessLint
7. qaskills
8. Launchd cron
9. Cloudflare token
10. GitHub MCP
11. İlk dogfood

**P2 — Bu hafta:**
12. T3 dogfood
13. Matthew Stephens araştır
14. legal-reviewer aktive (Hafta 2)
15. data-analyst rapor (Hafta 2)

**P3 — Deneme:**
16. yusuftayman playwright
17. agentmantis test-skills
18. watchdog aktive

## Başarısızlık Durumu

Herhangi bir adım fail ederse:
1. `docs/EMERGENCY.md` ilgili bölüm
2. Tuna manuel fix veya rollback
3. Studio başarısızsa: `docs/STUDIO-SETUP.md` Section 10 (Rollback Emergency)

## Zaman Tahmini

- Bugün: ~20 dakika
- Yarın: ~30 dakika
- Bu hafta: ~2 saat (dogfood dahil)
- Toplam (Hafta 1): ~3 saat manuel

Sonrası otomatik.
