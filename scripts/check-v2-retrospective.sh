#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# check-v2-retrospective.sh — post-commit hook
# Reform 11 May 2026
#
# Commit message'da v2-v9, round-2+, redesign, revize regex match
# bulursa otomatik docs/retrospectives/<date>.md entry ekler. Bu commit
# 1. turda neden olmadı analizini zorlar — agentic dispatch atlandı mı,
# spec yok muydu, data contract uydurma mı vs.
#
# Çağrı: .husky/post-commit içinden
# ════════════════════════════════════════════════════════════════════

set -e

last_commit=$(git log -1 --format="%H %s")
sha=$(echo "$last_commit" | cut -d' ' -f1)
short_sha=$(echo "$sha" | cut -c1-7)
msg=$(echo "$last_commit" | cut -d' ' -f2-)

# Regex: v2-v9, round-2+, redesign, revize, tekrar
if ! echo "$msg" | grep -qiE '\bv[2-9]\b|round-?[2-9]|redesign|revize|tekrar|geri al'; then
  exit 0
fi

date_today=$(date +%Y-%m-%d)
retro_dir="docs/retrospectives"
retro_file="$retro_dir/$date_today.md"

mkdir -p "$retro_dir"

# Dosya yoksa header ile başlat
if [ ! -f "$retro_file" ]; then
  cat > "$retro_file" <<EOF
# Retrospective — $date_today

> Otomatik tetiklenen revize/redesign commit'leri. Reform 11 May 2026 KPI hedefi: v2+ commit ≤ 5/ay.
> Her entry için: niye 1. turda olmadı? Hangi disiplin atlandı?

EOF
fi

# Entry ekle
cat >> "$retro_file" <<EOF

## Commit \`$short_sha\` — $(date +%H:%M)

**Message:** $msg

**Sorulacak:**
- [ ] Designer spec (\`docs/specs/<feature>.md\`) önceden vardı mı?
- [ ] Visual mockup üretildi mi?
- [ ] Tuna onayı vardı mı?
- [ ] data contract grep yapıldı mı?
- [ ] darkmode-auditor dispatch edildi mi?
- [ ] reviewer dispatch edildi mi?

**Root cause (Claude doldur):**
{Niye 1. turda olmadı? Hangi adım atlandı?}

**Önleyici aksiyon:**
{Pre-commit hook eklenir mi? Rule update mi? Agent prompt fix mi?}

---
EOF

echo "[v2-retro] Retrospective entry eklendi: $retro_file"
exit 0
