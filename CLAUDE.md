# hellotalent.ai — Project Context

## Tech Stack
- Frontend: Static HTML/CSS/JS (vanilla, no framework)
- Backend: Supabase (PostgreSQL + Auth + Storage + RLS)
- Hosting: GitHub Pages (custom domain: hellotalent.ai)
- Repo: github.com/tunkef/hellotalent

## Design System
- Fonts: Bricolage Grotesque (headings), Plus Jakarta Sans (body), DM Mono (data)
- Colors: Vermillion #C94E28, Navy #1E2D5E, Background #F7F6F4
- Forbidden: Inter, Roboto, purple gradients, röportaj
- Always use mulakat or is gorusmesi for interviews

## Key Rules
- Homepage = index.html (never index_new.html)
- No console.log in production (only console.error/warn)
- candidates.id = bigint, companies.id = bigint (NOT uuid)
- hr_profiles.id = uuid (FK to auth.users)
- Always use .maybeSingle() not .single() for new user queries
- UI language: Turkish throughout

## Current State — Katmanlı Handoff Sistemi
Her session başında SADECE `docs/CURRENT-STATE.md` oku (~3K token).
- `docs/CURRENT-STATE.md` → Mevcut durum, dosya haritası, backlog, son 3 session
- `docs/ARCHITECTURE.md` → Mimari, data contracts, pipeline'lar (feature yazarken oku)
- `docs/SESSION-LOG.md` → Tüm session tarihçesi (~70K, sadece gerektiğinde grep/search)
- `docs/handoff.md` → Legacy alias (SESSION-LOG ile aynı içerik)

## Codex x Claude Çalışma Protokolü
Bu projede çalışma modeli iki katmanlıdır:
- Kullanıcı nihai karar vericidir.
- Codex product, architecture, QA ve teknik strateji sahibidir.
- Claude implementation team olarak çalışır.

### SOLID Architecture Enforcement
Kod yazarken şu kuralları uygula:
- SRP: Her fonksiyon/modül tek iş yapsın. 50+ satır fonksiyon → parçala.
- OCP: Yeni özellik eklerken mevcut fonksiyonu değiştirmek yerine genişlet.
- LSP: Model/sağlayıcı değişiminde config dışında kod değişmesin.
- ISP: Agent'lar sadece kendi tool'larını görsün, gereksiz bağımlılık ekleme.
- DIP: Somut API yerine soyut kontrat kullan (ör: `create_ticket` vs `jira.api.post`).

### Source of Truth Sırası
Her session başında şu sırayla oku:
1. `docs/CURRENT-STATE.md`
2. `docs/AI-COLLAB.md`
3. `docs/ARCHITECTURE.md` (feature veya data contract etkiliyorsa)
4. `docs/SESSION-LOG.md` sadece gerektiğinde

`docs/handoff.md` legacy kaynaktır; primary truth değildir.

### İş Bölümü
- Codex analiz eder, scope belirler, riskleri bulur, açıkları kapatır, test stratejisini yönlendirir.
- Claude kodu uygular, gerekli migration/refactor/test işini yapar, sonuçları raporlar.
- Kullanıcıdan gelen yeni yön varsa önce onu esas al, sonra Codex notlarıyla hizala.

### AI-COLLAB Disiplini
`docs/AI-COLLAB.md` canlı çalışma defteridir.
Claude her turda:
- “Amaç / aktif hedef” bölümünü okur
- “Claude için görev” dışına çıkmaz
- İş bitince şu alanları günceller:
  - Yapılan iş
  - Değişen dosyalar
  - Test durumu
  - Riskler / blocker'lar
  - Bir sonraki net adım

### Token Verimliliği
- Tokenlar değerlidir; uzun geçmişi aynı dosyada taşımayın.
- `docs/AI-COLLAB.md` sadece aktif iş, son kararlar, açık riskler ve bir sonraki net adımı taşımalıdır.
- Eğer `docs/AI-COLLAB.md` büyürse, kapatılmış fazları ve detaylı çalışma notlarını `docs/ai-collab/` altında ayrı dosyalara taşı.
- `docs/AI-COLLAB.md` ince bir kontrol paneli olarak kalmalı; arşiv dosyalarına link vermek tercih edilir.
- `docs/CURRENT-STATE.md` her zaman güncel truth olarak tutulmalıdır; milestone sonrası drift bırakma.
- Aynı context'i tekrar tekrar taşımak yerine özet + link yaklaşımı kullan.

### Mühendislik Standardı
- Geçici workaround'lardan kaçın
- Teknik borcu büyüten çözümler üretme
- Scale hedefini bozacak kısa yollar alma
- Supabase/RLS/auth/data contract tarafında kalıcı çözüm üret
- Scope dışı değişiklik yapma
- Test etmeden tamamlandı deme
- Gerekli durumda regression guard ekle

## Context7
Always use context7 when working with Supabase API, CSS, or any library docs.

## Model Routing — Token Tasarrufu
Subagent (Agent tool) çağırırken iş tipine göre model seç:

| İş Tipi | Model | Neden |
|----------|-------|-------|
| Explore (dosya arama, codebase keşif) | `sonnet` | Arama/okuma Opus gerektirmez |
| Code review, PR review | `sonnet` | Pattern matching yeterli |
| Basit grep/glob araştırma | `haiku` | En hızlı, en ucuz |
| Docs araştırma (context7, web) | `sonnet` | Dökümantasyon okuma |
| Plan yazma, mimari karar | `opus` | Karmaşık reasoning gerekli |
| Feature implementation | `opus` | Doğru kod üretimi kritik |
| Debugging, root cause analiz | `opus` | Derin analiz gerekli |

**Kural:** Default subagent modeli `sonnet`. Sadece plan/mimari/implementation/debug için `opus` kullan.
**c-level-skills:** Sadece kullanıcı strateji/iş modeli/yatırım konusunda açıkça sorduğunda invoke et.

## 🚨 CRITICAL AI DIRECTIVE (READ THIS FIRST)
Before you write ANY HTML, CSS, or JS for a new feature, you MUST forcefully read and load these two files into your context:
1. `.agents/skills/bento-grid-design/SKILL.md` -> Contains the EXACT HTML/CSS templates for Bento grids and cards. 
2. `.agents/skills/hellotalent-dev/SKILL.md` -> Contains architecture and component rules.
**DO NOT generate any UI code from scratch without reading the Bento Grid SKILL.md file first.**
