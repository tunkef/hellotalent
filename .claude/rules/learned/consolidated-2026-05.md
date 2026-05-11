# Consolidated Learned Rules — Reform 11 May 2026

> 12 memory dosyası bu dosyada graduate edildi. Orijinaller: `~/.claude/projects/-Users-peopleintk-Downloads-Hellotalent/memory/archive/`.
> Bu dosya `.claude/rules/` zincirinde — pre-commit + agent dispatch sırasında okunur.

---

## L1 — Agent dispatch ZORUNLU (T2+)

**Origin:** 2026-05-07 Tuna direktifi (10. ihlal). Solo Edit/Write 12+ commit yaptım, kalite çöktü.

**Kural:** Her T2+ prompt'ta chief-of-staff dispatch zorunlu. Solo iş YASAK. T1 tek satır typo dahil chief-of-staff onayı.

**How to apply:**
- Prompt geldiğinde ilk eylem = `Task(chief-of-staff, "<özet>")`
- UserPromptSubmit hook `.claude/hooks/dispatch-chief-of-staff.sh` tier-detect reminder
- Bypass: commit msg `[agent-bypass]` (auditable)

---

## L2 — Design system gate ZORUNLU (UI öncesi spec)

**Origin:** 2026-05-08 Tuna direktifi (12. ihlal). Ring 3 versiyon yeniden yazıldı, design uygunsuz.

**Kural:** Yeni UI element/kart/preview/ring/badge implement edilmeden ÖNCE:
1. frontend agent **spec mode** — `docs/specs/<feature>.md` + visual mockup
2. Tuna chat onay ("ok/yap")
3. frontend agent **impl mode** — spec'ten sapma yasak
4. darkmode-auditor → reviewer → commit

**How to apply:**
- Pre-commit hook `scripts/tier-detect.sh` T2 commit msg `design-spec: docs/specs/<feature>.md` arar, yoksa BLOK
- Token-strict: hardcoded hex/px yasak
- Radius: pill (999) sadece avatar/seg-toggle, button/badge radius (10px)
- Dark mode parity: her CSS property `html[data-theme="dark"]` override

---

## L3 — Pattern reuse ZORUNLU (SaaS-tarzı yeni primitive YASAK)

**Origin:** 2026-05-06 Tuna direktifi (PR-7 CLATU rework). "SaaS design ı yapıyorsun ben onu istemiyorum."

**Kural:** Yeni UI feature dispatch ÖNCESİ mevcut sayfa pattern'i incele. Yeni component yaratmadan reuse zorunlu.

**How to apply:**
- `ik.html` hero card + bento-grid pattern incele
- `profil.html` kart + form pattern incele
- `index.html` editorial layout reference
- `css/panels/ik-genel.css` mevcut class isimleri grep
- **Buton içinde simge/+/→/ikon/emoji 100% YASAK** — pure text only
  - "+ Yeni Pozisyon" YANLIŞ ("+ " karakter de simge)
  - "Yeni Pozisyon" DOĞRU
  - "Görüntüle →" YANLIŞ
  - "Görüntüle" DOĞRU

---

## L4 — Data contract grep ZORUNLU (uydurma YASAK)

**Origin:** 2026-05-07 Tuna direktifi. UI label/KPI uydurma → Tuna düzeltti.

**Kural:** UI render kodu yazmadan önce RPC/DB shape grep zorunlu. Sample data'dan türetme YASAK.

**How to apply:**
- `docs/RPC-CONTRACT.md` (yeni) grep — yoksa frontend → supabase-agent RPC contract sorgu
- IK_DATA, summary objesi gibi shape gerçek kod oku
- Label/KPI/status field uydurma — kaynak grep şart

---

## L5 — Edit requires Read (silent fail prevention)

**Origin:** 3 vaka boyunca tekrar etti (en son 2026-05-08).

**Kural:** Edit/Write öncesi dosya bu session'da Read edilmiş olmalı.

**How to apply:**
- Edit tool zaten enforce ediyor (file_path Read olmadan Edit fail)
- Write existing file için Read şart, yeni file için değil

---

## L6 — Codex full agreement T4 (>= %70 yetmez)

**Origin:** 2026-05-XX Tuna direktifi.

**Kural:** T4 PR'larda Codex %100 agreement zorunlu. %70 yetmez → iterate fix → re-review.

**How to apply:**
- T3 için %70 OK
- T4 (architecture/API contract) için %100 — yoksa `.claude/agent-memory/pending-approvals.md`'ye düşür
- Commit msg `codex-reviewed: 100%`

---

## L7 — Continuous autonomous mode (multi-PR pipeline)

**Origin:** 2026-04-XX Tuna direktifi.

**Kural:** Çok-PR pipeline'larında Tuna onay beklemez. Hata bul → fix → devam. Context dolana kadar continuous.

**How to apply:**
- Tuna "auto mode" / "continuous" / "yap" derse durmadan devam
- Ama agent dispatch zinciri korunur (L1 ihlal değil)
- Her commit pre-commit hook'undan geçer (BLOK olursa root cause fix sonra devam)

---

## L8 — Full access autonomy (SQL/DB solo OK)

**Origin:** 2026-04-XX Tuna direktifi.

**Kural:** Tuna SQL/DB için "şunu çalıştır" istemez. service_role + supabase MCP full access aktif → solo çalıştır.

**How to apply:**
- Migration apply solo OK (supabase-agent)
- Edge function deploy solo OK (infra-ops)
- T3 audit zinciri (reviewer audit mode + Codex) ATLAMA — sadece manuel approval atlanır

---

## L9 — Bento grid default + border consistency

**Origin:** 2026-04-XX Tuna direktifi.

**Kural:** Yeni UI default bento-grid layout. Tüm kartlar 1px border + radius (10px) + token-strict.

**How to apply:**
- `index.html` master pattern referans
- Card pattern: `div.card > div.card-title + content`
- Border `var(--editorial-hairline-strong)`
- Radius `var(--radius)`

---

## L10 — No Figma (design pipeline)

**Origin:** Tuna direktifi.

**Kural:** Figma MCP kullanma. Design pipeline = Stitch + Recraft + 21st-magic + AccessLint.

**How to apply:**
- Mockup üretim: Stitch / Recraft / 21st-magic MCP
- Accessibility verify: AccessLint MCP
- Figma referans bile YASAK

---

## L11 — MCP zorunlu design pipeline

**Origin:** 2026-04-XX Tuna direktifi (MCP-bazlı tasarım).

**Kural:** Tasarım iş için MCP-bazlı pipeline zorunlu (Stitch design system, Recraft PNG mockup, 21st-magic component variant, AccessLint contrast).

---

## L12 — UI commit görsel verify (UI_VERIFIED=1)

**Origin:** 2026-05-05 Tuna direktifi ("kanıtlı bir kural").

**Kural:** Dashboard/shell CSS+JS commit'lerinde browser hard-refresh + bento gözle tarama zorunlu. Pre-commit hook `scripts/check-ui-verify.sh` `UI_VERIFIED=1` env yoksa BLOK.

**How to apply:**
- Local server: `python3 -m http.server 3000`
- Hard refresh: Cmd+Shift+R
- Checklist: radius / kart yükseklik / title overflow / buton simge / footer pattern / dark mode
- Commit: `UI_VERIFIED=1 git commit ...`
- Bypass: commit msg `[ui-verified-bypass]`

---

## L13 — Cache-bust merkezi (Reform 11 May yeni kural)

**Kural:** Manuel `?v=tarih` YASAK. `scripts/cachebust.sh` pre-commit otomatik git short SHA enjeksiyon.

**How to apply:**
- 26 farklı manuel versiyon proliferasyonu → 1 otomatik
- Manuel cache-bust commit'i pre-commit hook reject (TODO: hook ekle)

---

## L14 — v2/redesign yasak (Reform 11 May yeni KPI)

**Kural:** Commit msg'da `v[2-9]|round-[2-9]|redesign` regex match → otomatik retrospective entry. 4 hafta hedef: ≤ 5/ay.

**How to apply:**
- Post-commit hook `scripts/check-v2-retrospective.sh` otomatik
- Entry: niye 1. turda olmadı? Hangi disiplin atlandı?
- chief-of-staff haftalık Pazar review

---

## Meta

- Bu dosya `.claude/rules/learned/` zincirinde — pre-commit + agent dispatch sırasında okunur
- Yeni kural eklendiğinde format: `## L<N> — <başlık>` + Origin + Kural + How to apply
- Eski memory dosyaları: `~/.claude/projects/-Users-peopleintk-Downloads-Hellotalent/memory/archive/`
- Append-only: silme YASAK, sadece `SUPERSEDED by L<X>` etiketle
