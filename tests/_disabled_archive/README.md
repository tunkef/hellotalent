# Disabled Tests Archive — HelloTalent

> Reform v3.4 FIX-7 (11 May 2026). Reform öncesi 14 disabled test `tests/`'ten buraya taşındı. Re-write veya silinme aday.

## Kategoriler

### `disabled-asama86` (11 dosya) — HR Hub multi-page refactor
Eski monolith `ik.html` (4903 satır) → HR Hub 8-panel split. Eski testler legacy struct'a göre yazılmıştı, yeni surface'lere uyumsuz.

- hr-campaigns
- hr-candidate
- hr-faz-b-e2e
- hr-hub-skeleton
- hr-messages
- hr-pipeline
- hr-pool
- hr-sprint6
- hr-sprint7-backend
- hr-sprint8-integration
- hr-sprint8-polish

**Karar:** yeni surface'lere göre uat-tester ile yeniden yaz. 11 surface var, her biri için spec dosyası gerek (Reform v3.4 PCV).

### `disabled-asama84` (1) — Lead form refactor
Eski lead form pattern, yeni signup flow ile değiştirildi.

### `disabled-faz-b-sprint-0` (1) — Regression
Çok eski, P3 regression. Şu an Asama 86 sonrası geçersiz.

### `disabled-20260507-accordion` (1) — T3 paradigm shift
Pipeline 3-stage modal → accordion + drawer rewrite. Eski test modal'a bağlıydı.

## Re-enable

Test güncellense → `mv tests/_disabled_archive/<name>.spec.js.disabled-* tests/<name>.spec.js`

## Cleanup

30 gün boyunca dokunulmazsa silinebilir. `weekly-maintenance.sh` Pazar Pazar bunu raporlayacak.
