#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
# Clatu Master Layout Guard — pre-commit
# Asama 84.2 — 2026-04-25 (Clatu HR v2 ROLLBACK + index pattern align)
#
# Hedef: HR/auth sayfaları index.html'in master pattern'ine uyuyor mu?
#
#   Header: <header class="lp-hdr"> + <a class="lp-logo">
#   Footer: <footer class="ht-foot">
#   Font:   shared-v2.css (içinde Bricolage + Plus Jakarta + DM Mono)
#   YASAK:  hr-page-header / hr-page-footer / clatu-hr-* CSS import
#   HARD-BLOCK: "Kurumsal başvuru" subtitle pseudo isveren-onboarding'de
#
# WARN seviyesinde (commit'i ENGEL ETMEZ) — sadece "Kurumsal başvuru"
# regression hard-block (exit 1).
#
# EXCEPTIONS:
#   - index.html (master pattern source)
#   - admin.html (Tuna internal panel, ayrı sistem)
#   - ik.html sidebar pattern (FAZ B'de tam migration)
#   - mockups/*, /assets/*, /docs/*, .claude/*
#   - profil.html (aday tarafı, ayrı pattern)
#   - kvkk.html, gizlilik.html, kullanim-sartlari.html, iletisim.html (legal — minimal)
#   - aday.html, isveren.html, hakkimizda.html, kariyer.html (public marketing)
#   - newsletter-* (kampanya landing)
#   - sifre-yenile.html (password reset — minimal)
#   - markalar-flip-v2.html, mk-card-redesign-playground.html, demo-* (playground)
#   - coach-studio.html (FAZ B revize bekliyor)
#   - gate.html (sessionStorage gate — minimal)
#   - isveren-demo-yakinda.html (placeholder)
# ════════════════════════════════════════════════════════════════

set -u

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
  exit 0
fi
cd "$REPO_ROOT" || exit 0

STAGED_HTML="$(git diff --cached --name-only --diff-filter=AM | grep -E '\.html$' || true)"
STAGED_CSS="$(git diff --cached --name-only --diff-filter=AM | grep -E '^css/(ik-|panels/ik-)' || true)"
STAGED_JS="$(git diff --cached --name-only --diff-filter=AM | grep -E '^js/ik-' || true)"

if [ -z "$STAGED_HTML" ] && [ -z "$STAGED_CSS" ] && [ -z "$STAGED_JS" ]; then
  exit 0
fi

# ════════════════════════════════════════════════════════════════
# Asama 86 Sprint E — IK JS legacy namespace guard
#   - HARD-BLOCK: js/ik-*.js icinde 'ht_hr_' eski namespace
# ════════════════════════════════════════════════════════════════
if [ -n "$STAGED_JS" ]; then
  LEGACY_NS_ERR=0
  LEGACY_NS_FILES=""
  for f in $STAGED_JS; do
    HITS="$(grep -nE "ht_hr_[a-z_]+" "$f" 2>/dev/null | grep -v '^\s*//\|^\s*\*' || true)"
    if [ -n "$HITS" ]; then
      HIT_COUNT="$(echo "$HITS" | wc -l | tr -d ' ')"
      LEGACY_NS_ERR=$((LEGACY_NS_ERR + 1))
      LEGACY_NS_FILES="${LEGACY_NS_FILES}\n  - ${f} (${HIT_COUNT} eski namespace 'ht_hr_*')"
    fi
  done
  if [ "$LEGACY_NS_ERR" -gt 0 ]; then
    printf "\n\033[31m[Asama 86 Sprint E — HATA]\033[0m %d dosyada eski 'ht_hr_*' namespace:" "$LEGACY_NS_ERR"
    printf "%b\n" "$LEGACY_NS_FILES"
    printf "\n  Yeni namespace: 'ht_ik_*' kullan (Sprint A-D parite).\n"
    printf "  Comment satirlarinda dokumante etmek icin '//' veya '/*' kullan.\n\n"
    exit 1
  fi
fi

# ════════════════════════════════════════════════════════════════
# Asama 86 Sprint A — IK shell guard
#   - HARD-BLOCK: ik.html veya hr-*.html'de eski hr-shell.css / hr-polish.css import
#   - HARD-BLOCK: ik-*.css veya css/panels/ik-*.css'te hardcoded hex
#   - WARN: IK sayfasinda tokens.css import yok
#   - WARN: IK sayfasinda lp-hdr-ik markup yok
# ════════════════════════════════════════════════════════════════

ASAMA86_ERR=0
ASAMA86_FILES=""

is_ik_html() {
  local f="$1"
  case "$f" in
    ik.html|hr-pipeline.html|hr-pool.html|hr-candidate.html|hr-messages.html|hr-company.html|hr-team.html|hr-campaigns.html|hr-settings.html)
      return 0 ;;
  esac
  return 1
}

# IK HTML kontrolleri
for f in $STAGED_HTML; do
  if ! is_ik_html "$f"; then
    continue
  fi

  # HARD-BLOCK: eski hr-shell.css / hr-polish.css import
  HAS_OLD_HR_CSS="$(grep -lE '<link[^>]*href=[^>]*(hr-shell|hr-polish|clatu-hr-)\.css' "$f" 2>/dev/null || true)"
  if [ -n "$HAS_OLD_HR_CSS" ]; then
    ASAMA86_ERR=$((ASAMA86_ERR + 1))
    ASAMA86_FILES="${ASAMA86_FILES}\n  - ${f} (yasak: hr-shell.css / hr-polish.css import — Asama 86 ROLLBACK)"
  fi

  # WARN: tokens.css import yok
  if ! grep -qE 'href=["'\''][^"'\'']*tokens\.css' "$f" 2>/dev/null; then
    printf "\033[33m[Asama 86 — UYARI]\033[0m %s: tokens.css import eksik\n" "$f"
  fi

  # WARN: lp-hdr-ik markup yok (ik.html ve hr-* için zorunlu)
  if ! grep -q 'class="lp-hdr-ik"' "$f" 2>/dev/null; then
    printf "\033[33m[Asama 86 — UYARI]\033[0m %s: lp-hdr-ik header markup eksik\n" "$f"
  fi
done

# IK CSS hardcoded hex kontrol (token-strict)
if [ -n "$STAGED_CSS" ]; then
  for f in $STAGED_CSS; do
    # comment satirlari + media queries dışında hardcoded hex regex
    HEX_LINES="$(grep -nE '#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?\b' "$f" 2>/dev/null | grep -vE '^\s*\*|^\s*//|^\s*/\*|^.*\*/$' || true)"
    if [ -n "$HEX_LINES" ]; then
      HEX_COUNT="$(echo "$HEX_LINES" | wc -l | tr -d ' ')"
      ASAMA86_ERR=$((ASAMA86_ERR + 1))
      ASAMA86_FILES="${ASAMA86_FILES}\n  - ${f} (token-strict ihlali: ${HEX_COUNT} hardcoded hex)"
    fi
  done
fi

if [ "$ASAMA86_ERR" -gt 0 ]; then
  printf "\n\033[31m[Asama 86 Sprint A — HATA]\033[0m %d dosyada IK shell ihlali:" "$ASAMA86_ERR"
  printf "%b\n" "$ASAMA86_FILES"
  printf "\n  Plan: ~/.claude/plans/imdi-senle-daha-nce-hashed-papert.md\n"
  printf "  Token-strict: var(--*) zorunlu, hardcoded hex YASAK.\n"
  printf "  Eski override CSS (hr-shell/hr-polish) silindi, yeniden import etme.\n\n"
  exit 1
fi


# Clatu master pattern zorunlu sayfa listesi (Asama 84.2)
REQUIRES_CLATU_LAYOUT=(
  "giris.html"
  "uye-ol.html"
  "isveren-onboarding.html"
)

SKIP_FILES=(
  "index.html"
  "admin.html"
  "aday.html"
  "isveren.html"
  "hakkimizda.html"
  "kariyer.html"
  "kvkk.html"
  "gizlilik.html"
  "kullanim-sartlari.html"
  "cerez-politikasi.html"
  "iletisim.html"
  "yasal.html"
  "sifre-yenile.html"
  "newsletter-onay.html"
  "newsletter-tercih.html"
  "markalar-flip-v2.html"
  "mk-card-redesign-playground.html"
  "demo-dashboard-ik.html"
  "coach-studio.html"
  "profil.html"
  "gate.html"
  "isveren-demo-yakinda.html"
)

is_skip() {
  local f="$1"
  case "$f" in
    mockups/*|assets/*|docs/*|.claude/*|partials/*) return 0 ;;
  esac
  for s in "${SKIP_FILES[@]}"; do
    if [ "$f" = "$s" ]; then
      return 0
    fi
  done
  return 1
}

is_required() {
  local f="$1"
  for r in "${REQUIRES_CLATU_LAYOUT[@]}"; do
    if [ "$f" = "$r" ]; then
      return 0
    fi
  done
  return 1
}

WARN_COUNT=0
WARN_FILES=""
ERR_COUNT=0
ERR_FILES=""

for f in $STAGED_HTML; do
  if is_skip "$f"; then
    continue
  fi

  HAS_HEADER="$(grep -l 'class="lp-hdr"' "$f" 2>/dev/null || true)"
  HAS_LOGO="$(grep -l 'class="lp-logo"' "$f" 2>/dev/null || true)"
  HAS_FOOTER="$(grep -l 'class="ht-foot"' "$f" 2>/dev/null || true)"
  HAS_SHARED_V2="$(grep -l 'shared-v2.css' "$f" 2>/dev/null || true)"

  # YASAK pattern checks (any file)
  HAS_OLD_HEADER="$(grep -l 'hr-page-header' "$f" 2>/dev/null || true)"
  HAS_OLD_FOOTER="$(grep -l 'hr-page-footer' "$f" 2>/dev/null || true)"
  # Sadece <link rel="stylesheet" href="...clatu-hr-...css"> import aranır (yorum satırı değil)
  HAS_OLD_CSS="$(grep -lE '<link[^>]*href=[^>]*clatu-hr-(tokens|components)\.css' "$f" 2>/dev/null || true)"

  if [ -n "$HAS_OLD_HEADER" ] || [ -n "$HAS_OLD_FOOTER" ] || [ -n "$HAS_OLD_CSS" ]; then
    ERR_COUNT=$((ERR_COUNT + 1))
    BAD=""
    [ -n "$HAS_OLD_HEADER" ] && BAD="${BAD}hr-page-header "
    [ -n "$HAS_OLD_FOOTER" ] && BAD="${BAD}hr-page-footer "
    [ -n "$HAS_OLD_CSS" ] && BAD="${BAD}clatu-hr-*.css"
    ERR_FILES="${ERR_FILES}\n  - ${f} (yasak: ${BAD})"
  fi

  if is_required "$f"; then
    # Auth sayfalari: lp-hdr + lp-logo zorunlu, footer opsiyonel
    # (endustri standardi: Stripe/Linear/Notion auth sayfalarinda footer YOK)
    if [ -z "$HAS_HEADER" ] || [ -z "$HAS_LOGO" ]; then
      WARN_COUNT=$((WARN_COUNT + 1))
      MISSING=""
      [ -z "$HAS_HEADER" ] && MISSING="${MISSING}lp-hdr "
      [ -z "$HAS_LOGO" ] && MISSING="${MISSING}lp-logo "
      WARN_FILES="${WARN_FILES}\n  - ${f} (eksik: ${MISSING})"
    fi
    if [ -z "$HAS_SHARED_V2" ]; then
      WARN_COUNT=$((WARN_COUNT + 1))
      WARN_FILES="${WARN_FILES}\n  - ${f} (shared-v2.css import eksik — master pattern fontları + tokenları)"
    fi
  fi

  # HARD-BLOCK: isveren-onboarding "Kurumsal başvuru" subtitle pseudo
  if [ "$f" = "isveren-onboarding.html" ]; then
    BAD_SUBTITLE="$(grep -E 'content:\s*"\s*·?\s*Kurumsal' "$f" 2>/dev/null || true)"
    if [ -n "$BAD_SUBTITLE" ]; then
      printf "\n\033[31m[CLATU LAYOUT GUARD — HATA]\033[0m\n"
      printf "  isveren-onboarding.html içinde 'Kurumsal başvuru' subtitle pseudo geri gelmiş.\n"
      printf "  Bu Tuna feedback (2026-04-25) ile kaldırıldı, geri eklemeyin.\n"
      printf "  Bulunan: %s\n\n" "$BAD_SUBTITLE"
      exit 1
    fi
  fi
done

# YASAK pattern bulundu → ERROR
if [ "$ERR_COUNT" -gt 0 ]; then
  printf "\n\033[31m[CLATU LAYOUT GUARD — HATA]\033[0m %d dosyada yasak v2 markup/CSS kullanımı:" "$ERR_COUNT"
  printf "%b\n" "$ERR_FILES"
  printf "\n  Spec: .claude/agent-memory/design-specs/clatu-master-pattern-extract.md\n"
  printf "  Master kanon: index.html (lp-hdr / ht-foot / shared-v2.css)\n"
  printf "  Asama 84.2 ROLLBACK: clatu-hr-* tasarım sistemi silindi.\n\n"
  exit 1
fi

# Eksik sayfa marker → WARN
if [ "$WARN_COUNT" -gt 0 ]; then
  printf "\n\033[33m[CLATU LAYOUT GUARD — UYARI]\033[0m %d dosyada master pattern eksik:" "$WARN_COUNT"
  printf "%b\n" "$WARN_FILES"
  printf "\n  Spec: .claude/agent-memory/design-specs/clatu-master-pattern-extract.md\n"
  printf "  Snippet: partials/header.html + partials/footer.html\n"
  printf "  (Engel değil, commit devam eder.)\n\n"
fi

exit 0
