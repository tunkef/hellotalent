# UI Commit Discipline — Görsel Verify ZORUNLU

> **Kanıtlı kural** — pre-commit hook ile enforced, bypass auditable.
> 5 May 2026 — Tuna direktifi: dashboard CSS/JS commit'lerinde görsel
> verify atlandığı için layout sorunları (pill radius cache, kart
> boyut farkları, align-items çelişkisi) merge edildi.

## Kural

`css/panels/ik-*`, `css/ik-shell.css`, `css/tokens.css`, `js/ik-genel.js`,
`js/ik-shell.js`, ya da `ik.html` / `hr-*.html` dosyalarına dokunan her
commit, browser görsel verify ile doğrulanmadan ETMEK YASAK.

## Enforce — pre-commit hook

`scripts/check-ui-verify.sh` (`.husky/pre-commit` chain'inde):

```
./scripts/check-truth-sync.sh
&& ./scripts/check-html-tags.sh
&& ./scripts/check-clatu-layout.sh
&& ./scripts/check-ui-verify.sh   # ← yeni
&& npx lint-staged --no-stash
```

Hook UI değişikliği gördüğünde `UI_VERIFIED=1` env var olmadan commit
BLOCK eder, exit 1.

## Verify protokolü

UI commit etmeden önce:

1. **Local server up:** `python3 -m http.server 3000` (veya 8765)
2. **Browser'da test sayfası:** `http://localhost:3000/ik.html`
3. **Hard refresh:** `Cmd+Shift+R` (cache bypass)
4. **Gözle tarama checklist:**
   - [ ] Radius tutarlı: pill 999 sadece seg-toggle, button/badge 10px (CLATU 6.2)
   - [ ] Bento kartlar **aynı yükseklikte** (stretch default, body flex:1)
   - [ ] Title overflow yok (tek-word başlık + ellipsis)
   - [ ] Button içinde simge YOK (Tuna mutlak kural — emoji/ok/icon yasak)
   - [ ] Footer pattern tutarlı (text-only veya split + pill)
   - [ ] Dark mode geçiş test (OS preference değiştir, kontrast ok)
5. **Verify pass → commit:** `UI_VERIFIED=1 git commit -m "..."`
6. **Push sonrası tekrar verify:** GH Pages propagate ~40s, hard refresh

## Bypass — auditable

Hızlı geçici fix için bypass mümkün:
```
UI_VERIFIED=1 git commit -m "fix: ..."
```

Bypass kullanıldığında commit message'a açık not düşülür:
```
fix(ui): ...

[ui-verified-bypass] hızlı fix, sonra Tuna manuel verify yapacak
```

## Önceki ihlaller (case study)

5 May 2026 dashboard refactor:
- `align-items: start` (boş alan fix) → sonraki commit `stretch` çelişki bilinmiyordu
- Action-pill `border-radius: var(--radius)` doğru yazıldı ama cache propagate test edilmedi → Tuna SS'te eski state gördü
- Cache-bust `?v=cards2` aktif kullanıcı browser'ında force reload tetiklemedi
- "tek bir buton değiştirmişsin" — kart pattern tutarlılığı tam scan edilmemişti

Bu ihlaller `UI_VERIFIED=1` enforce ile önlenir.

## CLAUDE.md ek

Mühendislik Standardı bölümüne:
- "UI commit'lerde browser hard-refresh + gözle scan zorunlu, `UI_VERIFIED=1` ile bypass auditable"

## Source

- Hook: `scripts/check-ui-verify.sh`
- Husky: `.husky/pre-commit`
- Bu kural: `.claude/rules/ui-commit-discipline.md`
- Origin: Tuna 5 May 2026 SS feedback ("kanıtlı bir kural")
