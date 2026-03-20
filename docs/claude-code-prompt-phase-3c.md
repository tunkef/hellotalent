# Claude Code — Phase 3C: Position-aware recommendation scoring

Aşağıdaki metni yeni bir Claude Code oturumunda yapıştır. Önce `docs/handoff.md` ve bu repodaki mevcut `ik.html` / arama RPC’lerini oku; tahmin etme, şemayı doğrula.

---

## Bağlam

- **Proje:** hellotalent.ai — vanilla HTML/CSS/JS + Supabase (GitHub Pages).
- **Tasarım:** Türkçe UI, renkler Vermillion / Navy / bg `#F7F6F4`, `candidates.id` bigint.
- **Handoff:** `docs/handoff.md` — Phase 3C maddesi: *Position-aware recommendation scoring (migration 050 + ik.html UI)*. Görünürlük toggle’ları tamamlandı; bu iş artık blocker değil.

## Hedef

İşveren aday aramasında / öneri listesinde **pozisyon (rol / hedef rol / deneyim unvanı)** eşleşmesini skora yansıt:

1. **SQL (migration 050):** Mevcut employer candidate search RPC’sini (ör. `045_employer_candidate_search_rpc.sql` ve sonrası) incele. Aday–işveren eşleşmesine **pozisyon benzerliği veya hiyerarşi** katmanı ekle (ör. `candidate_target_roles`, `candidate_experiences.pozisyon`, kampanya/ilan alanları varsa onlar). Performans için gerektiğinde indeks veya materialized yardımcı yapı öner; RLS ve güvenlik kurallarını bozma.
2. **ik.html:** Arama / öneri UI’sında skor veya sıralama gerekçesini **Türkçe**, kısa ve işe yarar şekilde göster (ör. “Rol eşleşmesi: yüksek”). Mevcut `shared.css` / `shared.js` desenlerine uy.
3. **Test:** Mümkünse Playwright smoke veya en azından manuel test checklist’i `docs/handoff.md` veya PR açıklamasına ekle.

## Kısıtlar

- Yeni kullanıcı sorgularında `.maybeSingle()` kullan (proje kuralı).
- Production’da `console.log` yok; sadece `console.error` / `console.warn`.
- Migration dosyasını `docs/migrations/050_*.sql` olarak ekle; mevcut numaralandırmayı çakışma yoksa kullan.
- Scope’u Phase 3C ile sınırla; görünürlük toggle koduna dokunma (ayrı iş).

## Teslim

- Tek veya birkaç net commit; `docs/handoff.md` içinde Phase 3C satırını güncelle (tamamlandı / kısmi / blokaj).
- Deploy notu: Supabase SQL Editor sırası + `ik.html` cache bust (`?v=`) gerekiyorsa belirt.

---

*Bu dosya repo içi handoff içindir; API anahtarlarını commitleme.*
