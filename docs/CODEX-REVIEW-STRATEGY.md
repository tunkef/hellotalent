# Codex Review Strategy — HelloTalent Studio (Reform v3.4 D8)

> **12 May 2026.** Tuna direktifi: "Codex review çok iyi bir kalite, onu olabildiğince iyi yerlerde organize etmeni istiyorum."
>
> Mevcut Codex auto-trigger sadece T3/T4 commit (security/migration/architecture). Bu doküman Codex'i optimal yerlerde nasıl kullanacağımızı tanımlar.

## Mevcut durum

✅ **Çalışan:** `scripts/codex-review-real.sh`
- T3/T4 commit-msg hook auto-trigger
- Modern Codex CLI v0.130.0 `codex review --uncommitted`
- BLOCKER/CRITICAL pattern detect → commit BLOK + pending-approvals.md auto-append
- Bypass: `[codex-bypass]` marker
- Output: `.claude/agent-memory/codex-reviews/<timestamp>-<sha>.md`

🟢 **D5 test başarılı:** Codex 60-180s sürede review üretti (M1 migration için 904 satır rapor).

## Optimal kullanım katmanları

### Katman 1: Otomatik tier-gated (mevcut)

| Trigger | Komut | Mevcut |
|---|---|---|
| T3 commit | `tier-detect.sh` → `codex-review-real.sh` | ✅ |
| T4 commit | `tier-detect.sh` → `codex-review-real.sh` | ✅ |

### Katman 2: Manuel slash command (mevcut)

```
/codex-gate
```

`.claude/commands/codex-gate.md` — manuel T3/T4 review çağrısı. Tuna istediğinde tetikler.

### Katman 3: PR review (yeni — önerilen)

GitHub Actions workflow ile PR açıldığında otomatik Codex review:

`.github/workflows/codex-pr-review.yml`:
- PR `main` branch'e açıldığında trigger
- `codex review --commit <sha>` ile PR diff'i review et
- BLOCKER → PR'a comment + label "blocker"
- MERGE_OK → "approved-by-codex" label

### Katman 4: Pre-deploy gate (yeni — önerilen)

Production deploy öncesi son güvenlik kontrolü:

```bash
# scripts/codex-pre-deploy.sh (yeni)
codex review --base main --title "Pre-deploy: $(git rev-parse --short HEAD)"
```

Son N commit'in toplu review'i. CI'da deploy step'inden önce çağrılır. Fail → deploy reject.

### Katman 5: Weekly comprehensive review (yeni)

Haftalık Pazar (launchd cron) tüm hafta diff'i Codex review:

```bash
# scripts/codex-weekly-review.sh (yeni)
codex review --commit $(git log --since="7 days ago" --format=%H | tail -1)..HEAD
```

Output `.claude/agent-memory/codex-reviews/weekly-<date>.md`. chief-of-staff Pazar review'da bunu okur, %50+ tekrar pattern → graduate aday.

### Katman 6: On-demand learning (yeni)

Bir dosya/feature için derin Codex insight isterseniz:

```bash
codex review --commit HEAD~5..HEAD --title "Profil yetkinlik flow audit"
```

Tuna istediğinde manuel. Doc generation, refactor planning için faydalı.

## Önerilen yeni file/script'ler

### 1. `scripts/codex-pre-deploy.sh` (Katman 4)

```bash
#!/usr/bin/env bash
# Codex pre-deploy gate — production push öncesi
set -e
TIMEOUT="${CODEX_TIMEOUT:-300}"

REVIEW_FILE=".claude/agent-memory/codex-reviews/pre-deploy-$(date +%Y%m%d-%H%M%S).md"
mkdir -p "$(dirname "$REVIEW_FILE")"

gtimeout "$TIMEOUT" codex review --base main --title "Pre-deploy gate" > "$REVIEW_FILE" 2>&1

if grep -qE "🛑|BLOCK_MERGE|BLOCKER|CRITICAL|\[P0\]" "$REVIEW_FILE"; then
  echo "[codex-pre-deploy] BLOCKER tespit, deploy reject"
  cat "$REVIEW_FILE"
  exit 1
fi
echo "[codex-pre-deploy] ✓ MERGE_OK, deploy proceeds"
```

### 2. `scripts/codex-weekly-review.sh` (Katman 5)

Cron Pazar 06:00 — haftalık review.

### 3. `.github/workflows/codex-pr-review.yml` (Katman 3)

GitHub Action — PR otomatik Codex.

## Codex pattern enhancement

`codex-review-real.sh` BLOCKER pattern regex:
```
🛑|BLOCK_MERGE|BLOCKER|CRITICAL
```

Genişletme: Codex sıklıkla `[P0]`, `[P1]` priority tag kullanıyor (D5 test'inde gördük):

```bash
# Yeni pattern
if grep -qE "🛑|BLOCK_MERGE|BLOCKER|CRITICAL|\[P0\]" "$REVIEW_FILE"; then
```

P1 warning yapar ama block etmez. P2/P3 sadece info.

## Optimize: Codex prompt context

Codex review'unda `hellotalent-dev` skill'i auto-load oluyor (D5 test'te gördük — 904 satır rapor ilk 500 satırı SKILL.md). Bu çok büyük context.

İyileştirme: Custom `.codex/instructions.md` veya `AGENTS.md` ile review focus prompt'u kısalt — sadece kritik talimatlar (security, RLS, KVKK). Token tasarrufu + odak.

## Apply çıkarımı

**Şimdi yapılacak (bu commit):**
- `scripts/codex-review-real.sh` pattern güncelle (`[P0]` BLOCKER)
- `scripts/codex-pre-deploy.sh` yaz
- `docs/CODEX-REVIEW-STRATEGY.md` (bu dosya)

**Spec olarak yazılacak (Tuna onay):**
- `.github/workflows/codex-pr-review.yml`
- `scripts/codex-weekly-review.sh` + launchd plist
- `.codex/instructions.md` (Codex context trim)

## Approved? (Tuna)

- [ ] Onayla → bu commit'te pattern + pre-deploy script eklenir
- [ ] PR review workflow eklensin mi? (Tuna karar)
- [ ] Weekly cron eklensin mi? (Tuna karar)
