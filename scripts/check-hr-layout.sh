#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
# Clatu HR Layout Guard — pre-commit
# Asama 84.1 — 2026-04-25
#
# Staged HTML dosyalarda hr-page-header/hr-page-footer var mı kontrol.
# WARN seviyesinde (commit'i ENGEL ETMEZ), uyarı verir.
#
# EXCEPTIONS (skip edilenler):
#   - index.html (public landing — Clatu editorial pattern)
#   - mockups/*, /assets/*, /docs/*
#   - kvkk.html, gizlilik.html, kullanim-sartlari.html, iletisim.html (legal — minimal)
#   - aday.html, isveren.html, hakkimizda.html, kariyer.html (public marketing)
#   - newsletter-* (kampanya landing)
#   - sifre-yenile.html (password reset — minimal email-link target)
#   - markalar-flip-v2.html, mk-card-redesign-playground.html, demo-* (playground)
#   - coach-studio.html (FAZ B revize bekliyor)
#   - profil.html (aday tarafı, ayrı pattern)
#   - gate.html (sessionStorage gate — minimal)
#   - isveren-demo-yakinda.html (placeholder)
# ════════════════════════════════════════════════════════════════

set -u

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
  exit 0
fi
cd "$REPO_ROOT" || exit 0

# Staged HTML dosyalarını topla (sadece A/M, deletion değil)
STAGED_HTML="$(git diff --cached --name-only --diff-filter=AM | grep -E '\.html$' || true)"

if [ -z "$STAGED_HTML" ]; then
  exit 0
fi

# HR layout zorunlu sayfa listesi (canon — Asama 84.1)
# admin.html DAHIL DEGIL — Tuna'nin internal panel, ayri sistem (Tuna onayi 25 Nisan 2026)
# ik.html sidebar-based, FAZ B'de tam migration olacak.
REQUIRES_HR_LAYOUT=(
  "giris.html"
  "uye-ol.html"
  "isveren-onboarding.html"
)

# Sidebar-based sayfalar — sadece component library import zorunlu (CSS link kontrol)
# admin.html bu listeden CIKARILDI — internal Tuna panel, ayri sistem.
SIDEBAR_PAGES=(
  "ik.html"
)

# Skip edilen dosyalar
SKIP_FILES=(
  "index.html"
  "aday.html"
  "isveren.html"
  "hakkimizda.html"
  "kariyer.html"
  "kvkk.html"
  "gizlilik.html"
  "kullanim-sartlari.html"
  "cerez-politikasi.html"
  "iletisim.html"
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
  # Path prefix skip (mockups/, assets/, docs/)
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
  for r in "${REQUIRES_HR_LAYOUT[@]}"; do
    if [ "$f" = "$r" ]; then
      return 0
    fi
  done
  return 1
}

is_sidebar() {
  local f="$1"
  for s in "${SIDEBAR_PAGES[@]}"; do
    if [ "$f" = "$s" ]; then
      return 0
    fi
  done
  return 1
}

WARN_COUNT=0
WARN_FILES=""

for f in $STAGED_HTML; do
  if is_skip "$f"; then
    continue
  fi

  HAS_HEADER="$(grep -l "hr-page-header" "$f" 2>/dev/null || true)"
  HAS_FOOTER="$(grep -l "hr-page-footer" "$f" 2>/dev/null || true)"

  if is_required "$f"; then
    if [ -z "$HAS_HEADER" ] || [ -z "$HAS_FOOTER" ]; then
      WARN_COUNT=$((WARN_COUNT + 1))
      MISSING=""
      [ -z "$HAS_HEADER" ] && MISSING="${MISSING}header "
      [ -z "$HAS_FOOTER" ] && MISSING="${MISSING}footer"
      WARN_FILES="${WARN_FILES}\n  - ${f} (eksik: ${MISSING})"
    fi
  elif is_sidebar "$f"; then
    # Sidebar-based: sadece clatu-hr-components.css import kontrol
    HAS_LIB="$(grep -l "clatu-hr-components.css" "$f" 2>/dev/null || true)"
    if [ -z "$HAS_LIB" ]; then
      WARN_COUNT=$((WARN_COUNT + 1))
      WARN_FILES="${WARN_FILES}\n  - ${f} (sidebar-based: clatu-hr-components.css import eksik)"
    fi
  else
    # Bilinmeyen yeni HTML → opsiyonel uyarı
    if [ -z "$HAS_HEADER" ] && [ -z "$HAS_FOOTER" ]; then
      WARN_COUNT=$((WARN_COUNT + 1))
      WARN_FILES="${WARN_FILES}\n  - ${f} (yeni dosya: hr-layout düşünüldü mü?)"
    fi
  fi

  # REGRESSION GUARD: isveren-onboarding'de "Kurumsal başvuru" subtitle geri gelmesin
  if [ "$f" = "isveren-onboarding.html" ]; then
    BAD_SUBTITLE="$(grep -E 'content:\s*"\s*·\s*Kurumsal' "$f" 2>/dev/null || true)"
    if [ -n "$BAD_SUBTITLE" ]; then
      printf "\n\033[31m[HR LAYOUT GUARD — HATA]\033[0m\n"
      printf "  isveren-onboarding.html içinde 'Kurumsal başvuru' subtitle pseudo geri gelmiş.\n"
      printf "  Bu Tuna feedback (2026-04-25) ile kaldırıldı, geri eklemeyin.\n"
      printf "  Bulunan: %s\n\n" "$BAD_SUBTITLE"
      exit 1
    fi
  fi
done

if [ "$WARN_COUNT" -gt 0 ]; then
  printf "\n\033[33m[HR LAYOUT GUARD — UYARI]\033[0m %d dosyada hr-page-header/footer eksik:" "$WARN_COUNT"
  printf "%b\n" "$WARN_FILES"
  printf "\n  Spec: .claude/agent-memory/design-specs/clatu-hr-layout-system.md\n"
  printf "  Snippet: partials/hr-header.html + partials/hr-footer.html\n"
  printf "  (Engel değil, commit devam eder.)\n\n"
fi

exit 0
