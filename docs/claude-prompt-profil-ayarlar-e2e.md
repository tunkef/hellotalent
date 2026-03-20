# Claude prompt — `profil.html` Ayarlar toggler gerçek E2E (Playwright + storageState)

Aşağıdaki metni başka bir Claude oturumuna yapıştırın. Amaç: guard testinin (`tests/profil.panel-delegation.spec.js`) ötesinde, **giriş yapmış** bir adayla tarayıcıda Gizlilik / bildirim toggler’larının state’inin kalıcı olduğunu doğrulayan Playwright E2E eklemek.

---

**Bağlam**

- Repo: `github.com/tunkef/hellotalent` — statik HTML/JS, Supabase Auth, GitHub Pages (`hellotalent.ai`).
- `profil.html` içinde Ayarlar panelinde Gizlilik ve bildirim için checkbox toggler’lar var. Geçmişte document-level `[data-panel]` delegasyonu `<main class="panel" data-panel="…">` köküne kadar `closest` ile çıkıp `switchPanel` tetikliyor, checkbox’lar DB snapshot’tan yeniden yazılıyordu; **fix**: delegasyon içinde `MAIN` + `.panel` için erken `return` (ve Premium CTA’lar `data-premium-cta` + tek delegasyon).
- Şu an `tests/profil.panel-delegation.spec.js` sadece kaynak metinde guard sırasını doğrular; **gerçek tarayıcı + oturum** yok.

**İstenen**

1. Playwright’ta **ayrı bir spec** (ör. `tests/profil.ayarlar-toggles.e2e.spec.js`) yazın:
   - `storageState` ile kayıtlı bir test kullanıcısı (aday) — env veya CI secret: `HT_TEST_EMAIL` / `HT_TEST_PASSWORD` (veya proje standardına uygun isimler). Yerelde bir kez `npx playwright codegen` veya küçük bir `globalSetup` ile `playwright/.auth/candidate.json` üretin; bu dosyayı **asla** repoya commit etmeyin; `.gitignore`’a ekleyin.
2. Test akışı:
   - `baseURL`: yerel `http://127.0.0.1:8080` (veya mevcut static server script’i) veya staging; tercih: `playwright.config`’te `webServer` ile repo kökünde `npx serve` / `python -m http.server` açılsın.
   - `profil.html` (veya `/profil.html`) açın; zaten oturum varsa doğrudan Ayarlar’a gidin (`switchPanel('ayarlar')` hash veya UI ile — mevcut URL hash davranışını kullanın: `#ayarlar` vb.).
   - Bir toggler’ı tıklayın (ör. “Beni Öner” veya bildirim checkbox’ı); **kısa bekleme** sonra aynı elementin `checked` state’inin beklendiği gibi olduğunu assert edin.
   - İsteğe bağlı: sayfayı soft reload edip state’in Supabase’ten geri geldiğini doğrulayın (daha kırılgan; önce sadece UI toggle’ı yeter).
3. `package.json`’a `test:profil-ayarlar-e2e` script’i ekleyin; CI’da sadece secret varsa çalıştırın veya `if: secrets.HT_TEST_EMAIL` ile ayrı job — secret yoksa job skip veya dokümante “manuel çalıştır”.
4. `docs/handoff.md` veya kısa `docs/testing.md` notu: test kullanıcısı nasıl oluşturulur, hangi env’ler gerekir.

**Kısıtlar**

- Üretimde `console.log` yok (sadece `console.error` / `warn`).
- Türkçe UI; test seçicileri mümkünse `id=` veya `data-testid` (gerekirse minimal HTML’e `data-testid` ekleyin, tek seferde).
- Mevcut guard spec’i kırmayın; E2E **ek** dosya olarak gelsin.

**Başarı**

- Yerelde env doluyken `npm run test:profil-ayarlar-e2e` yeşil.
- Gizlilik/bildirim toggler’ına tıklayınca önceki “geri zıplama” (anında eski state’e dönme) oluşmuyor.

---

*Bu dosya insan tarafından oluşturulmuştur; migration 050 ve diğer backlog maddeleri bu promptun kapsamı dışındadır.*
