# HelloTalent — Ürün Beyni (Vault)

> Bu klasör HelloTalent'ın ürün vizyonu, stratejisi ve karar hafızasıdır.
> Obsidian ile açılabilir. Tüm dokümanlar birbiriyle `[[wikilink]]` ile bağlıdır.

---

## Klasör Yapısı

```
vault/
├── 00-vizyon/
│   └── vizyon-ve-misyon.md        — Neden varız, neyi çözüyoruz
│
├── 01-kullanicilar/
│   ├── aday-persona.md            — Aday segmentleri, üyelik tipleri, gizlilik
│   ├── isveren-persona.md         — İşveren segmentleri, onboarding, ekip rolleri
│   ├── admin-persona.md           — 3 kişilik ekip, mini CRM, dashboard ihtiyaçları
│   └── coach-persona.md           — Coach sistemi, gelir modeli yok (şimdilik)
│
├── 02-urun/
│   ├── feature-map.md             — Tüm feature'lar: aday, işveren, admin
│   ├── kullanici-yolculugu-aday.md   — Keşif → Kayıt → Profil → Gelişim → Eşleşme
│   ├── kullanici-yolculugu-isveren.md — Lead → Demo → Onay → Pozisyon → Aday → İletişim
│   ├── veri-modeli-analiz.md      — Perakende İK perspektifli veri gap analizi + KVKK
│   ├── apple-benchmark.md        — Apple Kariyer profili benchmark (6 aksiyon)
│   └── yapilacaklar.md            — Tüm implementasyon backlog (MVP 1 → MVP 2)
│
├── 03-mimari/
│   └── sistem-mimarisi.md         — Tech stack, veri akışları, eşleştirme motoru
│
├── 04-roadmap/
│   └── mvp-roadmap.md             — MVP 1 (aday toplama) → MVP 2 (işveren) → MVP 3 (ödeme)
│
├── 05-is-modeli/
│   └── is-modeli.md               — Marketplace model, fiyatlandırma önerisi, KPI'lar
│
└── 06-kararlar/
    └── karar-defteri.md           — 12 alınmış karar (K001-K012) + şablon
```

---

## Nasıl Kullanılır

1. **Yeni özellik planlarken** → `02-urun/feature-map.md` kontrol et
2. **Neden böyle yaptık?** → `06-kararlar/karar-defteri.md` oku
3. **Bir sonraki adım ne?** → `04-roadmap/mvp-roadmap.md` takip et
4. **Kullanıcı kim?** → `01-kullanicilar/` altındaki persona'ları oku
5. **Teknik mimari** → `03-mimari/sistem-mimarisi.md`

---

## Güncelleme Kuralı

- Her önemli ürün kararı `karar-defteri.md`'ye eklenir
- Roadmap her MVP fazı tamamlandığında güncellenir
- Persona'lar gerçek kullanıcı verisi geldikçe rafine edilir
- Feature map her yeni özellik eklendikçe güncellenir

---

*Oluşturulma: 3 Nisan 2026*
*Kurucu: Tuna Kefeli | Head of Product analizi: Claude*
