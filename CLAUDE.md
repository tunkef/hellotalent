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

### Token Verimliliği — Caveman Mode (Otomatik)
- Bu projede caveman skill otomatik aktiftir. Her session caveman full modunda başlar.
- Kısa, öz, teknik doğruluğu koruyan cevaplar ver. Filler/hedging/pleasantries yok.
- Açıklama yerine aksiyon. "Dosyayı okudum ve şunu gördüm..." yerine direkt bulguyu yaz.
- Insight blokları, uzun tablolar, eğitici açıklamalar YAPMA — sadece Tuna isterse.
- Kod blokları ve güvenlik uyarıları normal kalır.
- Tuna "detaylı anlat" veya "normal mode" derse caveman'i kapat.
- Tokenlar değerlidir; uzun geçmişi aynı dosyada taşımayın.
- `docs/AI-COLLAB.md` sadece aktif iş, son kararlar, açık riskler ve bir sonraki net adımı taşımalıdır.
- `docs/AI-COLLAB.md` **5000 satır limitine** ulaşınca arşivle:
  1. Mevcut dosyayı `docs/ai-collab/AI-COLLAB-archive-asama{X}-{Y}.md` olarak kopyala
  2. Yeni temiz `AI-COLLAB.md` oluştur (sadece aktif durum + son blok özeti + açık riskler + sonraki adım)
  3. Arşiv dosyasına link ver
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

## Ultraplan Hatirlatma

Kullanici asagidaki kosullardan birini karsilayan bir is istediginde `/ultraplan` onerisi yap:

- 5+ dosyayi etkileyen yeni bir faz veya feature baslangici
- Mimari karar gerektiren is (yeni tablo, yeni RLS politikasi, yeni Edge Function, yeni API kontrati)
- Backlog'daki "Yuksek Oncelik" maddelerinden birine baslanacaksa (Iyzico, Isveren P3, Kampanya Wizardi)
- Kullanici "planla", "nasil yapalim", "nereden baslayalim" gibi planlama sinyali verdiyse

Hatirlatma formati:
```
Bu is buyuk gorunuyor ([sebep]). `/ultraplan` ile bulutta detayli plan olusturabilirsin — terminalin serbest kalir.
```

Kullanici "gerek yok" veya "normal plan yeter" derse ISRAR ETME.
Kucuk isler icin (bug fix, CSS duzeltme, tek dosya degisiklik) ONERME.

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

## Public-Site Design Truth
Public-site work is no longer anchored to legacy bento-grid/dashboard language.

Before writing new public-site HTML, CSS, or JS, read and align with:
1. `docs/design-illustration-brief.md`
2. `.agents/skills/hellotalent-dev/SKILL.md`
3. `.agents/skills/ai-seo/SKILL.md` when content is part of the task

Rules:
- Preserve business logic, not the old homepage structure.
- Public-site direction is Clatu-first: minimal, editorial, premium, illustration-aware.
- `index.html` should default to a minimal aday/isveren decision gate with strong visual separation and no unnecessary explanatory clutter.
- No emoji in public-site UI or supporting copy.
- Do not use bento-grid as a required public-site design system.
- Legacy dashboard/studio patterns may remain in their own surfaces, but they must not constrain homepage or public-site redesign.
