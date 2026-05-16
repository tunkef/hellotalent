# Plugin Inventory — HelloTalent Marketplace (159 plugin)

> Reform v3.4 D3 — 12 May 2026. 8 marketplace'ten 159 plugin yüklü, sadece 2 aktif. Bu envanter projeye gerçek değer katanları işaretler.
>
> Aktif kalan: `enabledPlugins` settings.json'da `true` set olanlar. Kalan 157 marketplace cache'de.

## Aktif olanlar (2)

| Plugin | Marketplace | Niçin aktif |
|---|---|---|
| `playwright-skill` | playwright-skill | E2E browser automation, smoke + UI testing |
| `self-improving-agent` | claude-code-skills (engineering-team) | Memory health, `/si:*` komutları, NEG capture |

## ÖNER — Aktive et (yüksek değer)

| Plugin | Marketplace | Niçin | Status |
|---|---|---|---|
| `a11y-audit` | claude-code-skills | WCAG 2.2 sistematik audit + auto-fix. P3 audit'te aradığımız tam bu | 📝 ENABLE |
| `claude-md-management` | claude-plugins-official | CLAUDE.md audit + improve + revise. Reform v3 sade yaptığımız iş, sürekli kullanışlı | 📝 ENABLE |
| `claude-code-setup` | claude-plugins-official | Codebase audit + automation recommend (hooks/agents/skills). Reform'da elle yaptık, plugin var | 📝 ENABLE |
| `codex` | claude-plugins-official | Codex CLI integration (`codex:rescue`, `codex:setup`) — zaten kullandığımız iş | 📝 ENABLE |
| `accesslint` | accesslint | WCAG color contrast + accessibility audit. P3 için. Önceden settings'te referans vardı | 📝 ENABLE |
| `coderabbit` | claude-plugins-official | External code review (Codex alternatifi). T2 ek göz | 📝 düşün |
| `commit-commands` | claude-code-plugins | `/commit`, `/commit-push-pr` slash commands | 📝 düşün |
| `claude-mem` | (standalone) | Persistent memory across sessions. Şu an memory'miz `~/.claude/projects/.../memory/`'de, claude-mem otomatize edebilir | 📝 düşün |

## DÜŞÜK ÖNCELİK (proje uyumsuz ama yararlı olabilir)

| Plugin | Niçin uyumsuz |
|---|---|
| Vercel pack (vercel-storage, ai-sdk, nextjs, runtime-cache, ...) | Vanilla static HTML projesi, Vercel kullanmıyoruz (DISABLED) |
| AWS serverless, deploy-on-aws, terraform-patterns | GitHub Pages deploy, AWS yok |
| docker-development, helm-chart-builder | Container yok |
| Next.js / React / TypeScript skill paketleri | Vanilla JS |
| Atlassian / Asana / Notion / Slack integrations | İş süreci yok bu tooller |
| Astronomer / Airflow / data-engineering | Data pipeline yok |

## ARAÇLAR (içerik / marketing)

| Plugin | Değerlendirme |
|---|---|
| `content-creator` | SEO content + brand voice — marketing-writer (writer agent) ile overlap |
| `demand-gen` | Multi-channel marketing, P4 için ileride |
| `brand-voice` | Already in marketplace, sales transcripts analiz |
| `marketing-skills` | 43 skill, gerek olunca tek tek invoke |

## Reform önerisi — kademeli enable

**Adım 1 (şimdi):**
- `a11y-audit` enable → P3 WCAG audit
- `claude-md-management` enable → CLAUDE.md kalitesi sürdürülebilir
- `accesslint` enable (re-install) → contrast + a11y skills

**Adım 2 (hafta sonu):**
- `claude-code-setup` enable → Reform sonrası otomasyon önerilerini takip et
- `codex` enable (zaten CLI çalışıyor, plugin sadece slash command + skills)

**Adım 3 (1 hafta sonra deneme):**
- `coderabbit` enable + 1 PR test → T2 review için ek göz
- `claude-mem` enable + memory göç planı → mevcut feedback memory + claude-mem cross-sync

## Marketplace temizliği

159 plugin disk kullanımı: yaklaşık 500MB-1GB cache. Aktif kullanılmayan marketplace'ler:
- `astronomer-data-agents` (data engineering) — disable aday
- `aws-*` paketleri — disable aday
- `nextjs/vercel` paketleri — Vercel disable edildi, cleanup gerek
- `docker-development`, `helm-chart-builder` — disable aday

Plugin uninstall command (Claude Code):
```
/plugin uninstall <plugin@marketplace>
```

Veya marketplace.json'dan plugin entry sil (yedek alarak — `scripts/disable-vercel-injection.sh` pattern).

## Maintenance

- Aylık plugin audit (chief-of-staff weekly review)
- Yeni plugin enable etmek için: önce description + use-case değerlendir, sonra `enabledPlugins: { "<plugin>@<marketplace>": true }`
- 30 gün invoke edilmeyen plugin disable aday
