# P3 Kapsamlı Test & Review Raporu

Tarih: 2026-03-16  
Kapsam: `ik.html`, `profil-inbox.js`, `admin-employers.js` + ilgili P3 davranışları

**Düzeltilen maddeler:** Aşağıdaki 3 bulgu commit **4b07a18** ile giderildi (fix date: 2026-03-16). Regresyon testleri: `tests/p3.regression.spec.js`; çalıştırma: `npm run test:p3`.

---

## Kritik Buglar

### 1. XSS riski — innerHTML ile aday verisi (ik.html) — **DÜZELTİLDİ (4b07a18)**

**Dosya:** `ik.html`  
**Satırlar:** 2277, 2409; fonksiyon `candidateCardHTML` 2282–2310

**Sorun:** Aday kartları `candidateCardHTML(c)` ile HTML string üretip `cardDiv.innerHTML = candidateCardHTML(c)` ile DOM'a yazılıyor. `c` veritabanından gelen aday verisi (ad, soyad, pozisyon, brand, tel, email vb.). Bu alanlara kötü niyetli HTML/script girerse XSS oluşur. CLAUDE.md: "innerHTML ile user data yasak".

**Önerilen düzeltme:** Kartları innerHTML yerine createElement + textContent ile kurun; kullanıcı/DB kaynaklı tüm metinleri text node veya textContent ile yazın. Örneğin `buildCandidateCard(c)` adında bir fonksiyon: card div, name div (textContent ile ad/soyad), pozisyon, tag'ler, contact ve aksiyon butonlarını createElement ile oluşturup appendChild ile birleştirin; container.appendChild(buildCandidateCard(c)) kullanın.

---

## Önemli Sorunlar

### 2. Lokasyon ekleme hatasında kullanıcıya Türkçe mesaj yok (ik.html) — **DÜZELTİLDİ (4b07a18)**

**Dosya:** `ik.html`  
**Satırlar:** 3502–3506 (`addLokasyon`)

**Sorun:** Insert hata verdiğinde sadece console.error çağrılıyor; kullanıcı arayüzde Türkçe hata mesajı görmüyor.

**Önerilen düzeltme:** Hata durumunda lokasyon panelinde görünen bir mesaj öğesine (örn. lokasyon-msg id'li) textContent ile "Lokasyon eklenirken bir hata oluştu. Lütfen tekrar deneyin." yazın; birkaç saniye sonra gizleyin.

### 3. Lokasyon silme hatasında kullanıcıya Türkçe mesaj yok (ik.html) — **DÜZELTİLDİ (4b07a18)**

**Dosya:** `ik.html`  
**Satırlar:** 3516–3518 (`removeLokasyon`)

**Sorun:** Silme hatasında sadece console.error var; kullanıcıya Türkçe geri bildirim yok.

**Önerilen düzeltme:** Aynı mesaj alanına "Lokasyon silinirken bir hata oluştu." gibi Türkçe metin gösterin.

---

## İyileştirme Önerileri

- **profil-inbox.js:** `preloadUnreadCount` employer_messages üzerinde status='sent' ile sayıyor; RLS ile sadece giriş yapan adayın mesajları sayılıyor — doğru. İleride unread tanımı read_at ile değişirse sorguyu buna göre güncellemek yeterli.
- **ik.html:** Mesaj modalındaki template/pozisyon option'ları ilk satırda sabit string ile dolduruluyor; asıl option metinleri createElement + textContent ile ekleniyor. Risk düşük; tamamını createElement ile yapmak tutarlılık açısından iyi olur.
- **loadFollowers / loadLiveCandidates:** list.innerHTML = '' sadece temizleme; içerik createElement ile dolduruluyor — XSS yok.

---

## Geçen Kontroller

### Employer–Candidate Messaging (P3-D)

- openMesajModal() ve sendMesaj() mevcut; demo/pro gating uyumlu.
- applyMesajTemplate() içinde {{sirket}} ve {{pozisyon}} yer tutucuları doğru değiştiriliyor.
- sendMesaj() hata yönetimi ve try/catch var.
- profil-inbox.js employer_messages tablosunu kullanıyor; mark_message_read RPC ve filtreler (Tümü, İşveren Mesajları, Okunmamış) doğru.
- Mesaj modalı .show class ile açılıp kapanıyor.

### Visibility Enforcement (P3-D+)

- loadFollowers(): candidate_blocked_companies ve hide_from_current_employer var; brands/companies ile company_id bazlı isim karşılaştırması yapılıyor.
- loadLiveCandidates(): hrProfile.company_id, brands, companies kullanılıyor; try/catch ile graceful fallback var.
- Pozisyon sorgularında .eq('durum', 'active'); ik.html'de positions için .eq('status' yok.

### Premium Subscription (P3-E)

- _employerPlan var ile tanımlı.
- get_employer_plan RPC .catch() ile korunuyor.
- openDrawer async; demo limit aşımında upgrade prompt; openMesajModal/sendMesaj demo'da engelliyor.
- admin-employers.js queries[9] null-safe.

### Company Locations CRUD (P3-C)

- renderLokasyonlar() createElement + textContent kullanıyor.
- addLokasyon .maybeSingle() kullanıyor.
- Hata durumunda kullanıcıya Türkçe mesaj: 4b07a18 ile eklendi (lokasyon-msg + showLokasyonMessage).

### Genel Code Quality

- İncelenen dosyalarda sadece var; const/let yok.
- console.log yok; console.error/warn kullanılıyor.
- Bu üç dosyada .single() yok; .maybeSingle() kullanılmış.
- Türkçe UI ve "röportaj" yok.

---

## Özet

| Kategori           | Adet |
|--------------------|------|
| Kritik (XSS)       | 1    |
| Önemli (lokasyon)  | 2    |
| İyileştirme        | 3    |
| Geçen kontroller   | Tüm P3-D/D+/E ve lokasyon CRUD maddeleri |

Öncelik: Önce aday kartlarındaki XSS (createElement + textContent) düzeltilmeli; ardından lokasyon add/remove için Türkçe hata mesajları eklenmeli.

---

## Düzeltme geçmişi

| Commit   | Tarih       | Düzeltilen maddeler |
|----------|-------------|----------------------|
| 4b07a18  | 2026-03-16  | #1 XSS (buildCandidateCard), #2 addLokasyon hata mesajı, #3 removeLokasyon hata mesajı. Regresyon: `npm run test:p3`. |
| 39ffcad  | 2026-03-16  | Admin aday istatistiklerinde tamamlanmış / yarım ayrımı ve IK tarafında ≥%45 görünürlük eşiği. |

---

## Post-fix hardening (profil tamamlama modeli)

- `profile_completion_pct` artık sadece ilk backfill ile değil, `036_profile_completion_sync` migrasyonu sayesinde **sürekli olarak** güncelleniyor:
  - candidates, candidate_work_preferences, candidate_experiences, candidate_education, candidate_languages ve candidate_location_preferences tablolarındaki tetikleyiciler ile.
- IK tarafında görünürlük eşiği tutarlı:
  - `loadDashboardStats`, `loadLiveCandidates` ve `loadFollowers` fonksiyonları aktif adaylar için `profile_completed = true OR profile_completion_pct >= 45` kuralını kullanıyor.
- Admin görünürlüğü sertleştirildi:
  - `hr_profiles`, `candidates` ve `companies` tablolarında `*_admin_read` RLS policy'leri idempotent olarak uygulanıyor; admin panelleri her zaman tam veriyi görebiliyor.
- Bu bölüm için son güncelleme tarihi: **2026-03-16**, commit: **39ffcad** (gerekirse bir sonraki hardening commit'i burada listelenebilir).

### Hardening patch (trigger + location scoring)

- **Recursion-safe trigger:** `trg_candidates_profile_completion_fn` artık `pg_trigger_depth() > 1` ile korunuyor; `refresh_candidate_profile_completion()` içindeki UPDATE aynı tetikleyiciyi tekrar ateşlese bile yeniden hesaplama atlanıyor, döngü oluşmuyor.
- **Normalized location scoring:** Tamamlama puanındaki lokasyon (+10) artık `candidates.tercih_sehirler` yerine `candidate_location_preferences` tablosuna göre hesaplanıyor; `compute_candidate_profile_completion` imzasından `p_tercih_sehirler` kaldırıldı.
- Tarih: **2026-03-16**, commit: **9ce0498**.
