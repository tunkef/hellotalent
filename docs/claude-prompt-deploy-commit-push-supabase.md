# Claude prompt — Kalan her şeyi `main`’e commit + push + Supabase migration

Aşağıdaki bloğu yeni bir Claude oturumuna yapıştırın. Amaç: çalışma kopyasındaki **commitlenmemiş** değişiklikleri güvenli şekilde sınıflandırıp **`origin/main`’e hiçbir şey kalmayacak** şekilde push etmek; ardından **Supabase MCP** ile veritabanında henüz uygulanmamış migration’ları sırayla uygulamak.

---

## Bağlam (insan notu)

- GitHub Pages yalnızca `main` push’undan deploy alır; yerel dosyalar canlıya gitmez.
- Toggle / `data-testid` tarafı manuel doğrulandı, çalışıyor; acil CI müdahalesi yok.
- Bu prompt, “kalan tüm işi kapat” içindir; ürün kararı gerektiren dosyaları (büyük mockup HTML’ler, kişisel workspace) **zorla commit etmeyin**.

---

## Görevin

### 0) Ön koşullar

- Repo kökü: `hellotalent` (GitHub: `tunkef/hellotalent`).
- **Asla commit etme:** `playwright/.auth/*.json`, `.env`, API anahtarları, `firebase-debug.log` (`.gitignore`’da olmalı; değiştiyse `git restore firebase-debug.log` veya sil).
- **Varsayılan olarak commit etme:** `.cursor/`, `.playwright-mcp/`, `.superpowers/`, `Hellotalent.code-workspace`, geçici `mockup-*.html` / `mk-card-*playground*` — bunlar kişisel veya gürültü; kullanıcı açıkça isterse ayrı PR.

### 1) Durum taraması

```bash
cd /path/to/hellotalent
git fetch origin
git status -sb
git diff --stat
git log -1 --oneline origin/main
```

`main...origin/main` için `[ahead N]` var mı bak; önce yerel commit’leri netleştir.

### 2) Dosya sınıflandırması (öneri)

| Kova | Örnek yollar | Aksiyon |
|------|----------------|---------|
| **A — Ürün + test infra** | `package.json`, `playwright.config.js`, `tests/auth.setup.js`, `tests/profil.ayarlar-toggles.e2e.spec.js`, `.gitignore` (gerekliyse) | Tek veya iki anlamlı commit; `npm ci` + ilgili `npm run test:*` ile doğrula |
| **B — Sayfa** | `ik.html` | Diff’i oku; kasıtlı değişiklikse aynı veya ayrı commit |
| **C — Dokümantasyon / SQL** | `docs/migrations/*.sql`, `docs/audit-phase2-queries.sql`, `scripts/inject-deploy-sql.js`, `docs/handoff.md` (güncelse) | Migration dosyalarını **sıra numarasına göre** repoda tutarlı hale getir; gereksiz `INJECT_DEPLOY` metinleri ürün kararı |
| **D — Opsiyonel** | `AGENTS.md`, `.agents/skills/**`, `docs/superpowers/specs/` | Sadece takım bunları repoda istiyorsa; değilse `.gitignore` veya commit dışı bırak |
| **E — Çıkarma** | `firebase-debug.log`, büyük geçici HTML raporları | Commit dışı |

### 3) Commit ve push

- Anlamlı mesajlar: `test(e2e): auth setup + ayarlar toggles spec`, `chore: playwright config`, `fix(ik): …`, `docs(migrations): add 041–049 + 050 if missing`.
- Push: `git push origin main`.
- Son kontrol: `git status` temiz; `main...origin/main` ahead 0.

### 4) Supabase (MCP)

1. `mcp_supabase_list_projects` → doğru `project_id`.
2. `mcp_supabase_list_migrations` — uzaktaki uygulanmış migration listesi.
3. Repodaki `docs/migrations/` ile karşılaştır; **özellikle** `050_position_aware_scoring.sql` (ve 041–049) uzakta yoksa:
   - Her dosya için içeriği oku; tek seferde güvenli bloklar halinde `mcp_supabase_apply_migration` kullan (isim: snake_case, DDL uyumlu).
   - Birleşik / enjeksiyon metinleri (`deploy_032_036_combined.sql`, `INJECT_DEPLOY_*.txt`) yerine **numaralı migration** dosyalarını tercih et; çakışma varsa kullanıcıya sor.
4. Sonrasında `mcp_supabase_get_advisors` (security + performance) — RLS / exposed view uyarılarını özetle.

### 5) CI

- `gh run list --branch main --limit 5` veya GitHub Actions UI: Playwright workflow yeşil mi bak.
- Kullanıcı notu: Smoke’ta Cloudflare Access / `--text` gibi **önceden bilinen** kırmalar varsa yeni regresyon iddiasında bulunma; sadece bu push’tan kaynaklı yeni hata var mı kontrol et.

### 6) Çıktı formatı

Bittiğinde özet ver:

- Push edilen commit SHA’ları (kısa).
- `origin/main` ile yerel eşit mi.
- Supabase’te hangi migration’lar uygulandı (isim listesi).
- Commit **edilmeyen** kasıtlı dosyalar (varsa) ve nedeni.

---

## Kısıtlar

- hellotalent kuralları: `candidates.id` / `companies.id` bigint; prod’da `console.log` yok.
- Migration’da veri silme / yıkıcı DROP varsa uygulamadan önce kullanıcı onayı iste.

---

*Bu dosya yönlendirme amaçlıdır; çalıştıran agent ortamında Git + Supabase MCP + gerekirse `gh` erişimi olmalıdır.*
