# profil.html display:none Audit — 23 Nisan 2026

**Kapsam:** profil.html'de `style="display:none(;)?"` inline'lari + JS toggle pattern audit.

**Baslangic:** 32 inline `display:none` (K048 sonrasi handoff'tan).

---

## OZET TABLOSU

| Kategori | Adet | Aksiyon |
|---|---|---|
| **Safe (`hidden` attribute migration)** | 3 | **FIX** (file inputs — JS sadece value reset, display dokunulmuyor) |
| **JS toggle (`el.style.display = ...` set ediliyor)** | 26 | RAPOR (koordineli JS sweep gerekli) |
| **Show-only (sadece gosterilir, bir daha gizlenmez)** | 3 | RAPOR (class-based migration mumkun) |

---

## FIX — 3 file input → `hidden` attribute (uygulandi)

Bu uc `<input type="file">` JavaScript'te SADECE click() trigger + value reset icin kullaniliyor, `style.display` dokunulmuyor. HTML5 `hidden` attribute aynisini yapar:

| Element | Line | JS uses | Karar |
|---|---|---|---|
| `#avatar-file-hidden` | 205 | (JS hic dokunmuyor) | `hidden` |
| `#cv-file-input` | 602 | profil-cv.js: `fileInput.value = ''` | `hidden` |
| `#wiz-cv-input` | 1019 | profil-bootstrap.js: `wizInput.value = ''` | `hidden` |

**Etki:** 32 → 29 inline `display:none`.

---

## RAPOR — 26 JS toggle'li display:none (DOKUNULMADI)

Bu elementlerin gosterimi/gizlenmesi JS'den `el.style.display = 'block'` veya `el.style.display = 'none'` ile yonetiliyor. Class-based refactor (`.is-hidden { display: none !important; }` + `el.classList.toggle('is-hidden')`) yapilabilir AMA tum JS toggle noktalarinin koordineli sweep'i gerekir. Yanlis yapilirsa profil sayfasi UI bozulur.

**Liste:**
- header-msg-dot, popup-messages, header-notif-dot, popup-notifications, avatar-dropdown
- badge-firsatlar, badge-inbox-unread, badge-bildirimler
- app-body, deletion-warning-banner
- merkez-role-line, merkez-city-badge, merkez-exp-badge
- cv-uploaded-state, cv-uploaded-actions, btn-generate-cv-merkez, field-askerlik
- wiz-cv-uploaded, btn-wiz-back, btn-wiz-skip, btn-wiz-complete
- email-change-section, mfa-disabled-state, mfa-enroll-state, mfa-enabled-state
- settings-hide-hint, blocked-company-dropdown, account-status-banner, account-wizard-overlay

**Onerilen pass (gelecek):**
1. CSS'e `.is-hidden { display: none !important; }` utility class
2. Inline `style="display:none;"` → `class="is-hidden"`
3. Tum `el.style.display = ''/'none'/'block'` cagrisini `el.classList.toggle('is-hidden', shouldHide)` ile degistir
4. Per-element regression test (her birinin gosterim/gizleme path'i Playwright smoke'la dogrulanmali)

Tahmini effort: 2-3 saat + dikkatli regresyon.

---

## RAPOR — Show-only (sadece gosterilir, bir daha gizlenmez)

Aslinda yukaridaki "JS toggle"in alt-kumesi ama bu elementler sadece "gosterilir" yonunde toggle alir. CSS `[hidden]` attribute + JS `el.hidden = false` daha semantik:

| Element | Pattern |
|---|---|
| `app-body` | Auth tamamlanip profil hidrate olunca `style.display = ''` |
| `deletion-warning-banner` | Account status `pending_deletion` ise `style.display = 'block'` |
| `account-status-banner` | Frozen/pending_deletion goruluyorsa `style.display = 'block'` |

**Onerilen:** `hidden` attribute (HTML5 standard) + JS `el.hidden = boolean` (daha okunabilir).

---

## SIRADAKI ADIMLAR

1. **Bu pass: 3 file input fix** ✓
2. **Sonraki pass: class-based migration** (26 toggle + 3 show-only) — koordineli JS sweep + regression
3. **Bonus:** `[hidden]` attribute + `el.hidden = boolean` semantik gelistirmesi
