# Coach Sistemi — Support SOP

> Admin operasyon rehberi. Coach onboarding, link kaybı recovery, pasife alma/aktifleştirme prosedürleri.

---

## 1. Yeni Coach Onboarding

### Adımlar
1. **Admin** → admin.html → İçerik Yönetimi → Davetler tab
2. Coach'un e-posta adresini ve adını gir → "Davet Gönder"
3. Coach'a otomatik e-posta gider: `coach-studio.html?token=UUID`
4. **Coach** → e-postadaki linke tıklar → giriş yapar (veya kayıt olur)
5. Coach Studio açılır → profil bölümü otomatik açık (yeni coach)
6. Coach profil bilgilerini doldurur: görünen ad, unvan, sektör, deneyim, bio, LinkedIn, avatar
7. Coach "Yeni Yazı" ile ilk içeriğini oluşturur
8. Coach "İncelemeye Gönder" ile admin'e gönderir
9. **Admin** → İçerik Yönetimi → İçerikler tab → "Yayınla" / "Düzeltme İste" / "Reddet"
10. Coach'a moderasyon sonucu e-posta ile bildirilir

### Notlar
- Aynı e-postaya ikinci pending davet gönderilemez (unique constraint)
- Davet 30 gün geçerli
- Coach giriş yaptıktan sonra token'sız `coach-studio.html` URL'i ile tekrar erişebilir

---

## 2. Link Kaybı — Recovery

### Durum
Coach davet linkini veya coach-studio URL'ini kaybetmiş.

### Prosedür
1. Coach `support@hellotalent.ai` adresine yazar
2. **Admin** → admin.html → İçerik Yönetimi → Koçlar tab
3. İlgili coach'u listede bul (isim veya e-posta ile arama)
4. "Studio Linkini Kopyala" butonuna tıkla
5. Clipboard'a kopyalanan URL'i coach'a gönder (e-posta, WhatsApp vb.)

### Önemli
- Yeni davet üretilmez
- Token araması yapılmaz
- Coach bu URL ile session varsa direkt studio'ya girer
- Session yoksa giriş yapar → `coach-studio.html`'e döner

### Kopyalanan URL
```
https://hellotalent.ai/coach-studio.html
```

---

## 3. Pasife Alma

### Ne zaman kullanılır
- Coach artık içerik üretmeyecekse
- Coach'un içerikleri geçici olarak feed'den kaldırılacaksa
- Disiplin veya kalite nedeniyle

### Prosedür
1. **Admin** → admin.html → İçerik Yönetimi → Koçlar tab
2. İlgili coach satırında "Pasife Al" butonuna tıkla
3. Onay dialog gelir: "Bu koçun yayındaki tüm içerikleri feed'den kaldırılacak"
4. Onaylayınca `is_active = false` olur

### Sonuçlar
- Coach Studio erişimi engellenir → "Hesabınız askıya alınmıştır" gate mesajı
- Yeni post oluşturamaz (RLS INSERT guard)
- Mevcut draft/submitted post düzenleyemez (RLS UPDATE guard)
- Yayındaki postlar feed'den kaybolur (RLS SELECT guard)
- Post'ların statüsü değişmez (`published` kalır)
- Coach'un aday/işveren hesabı etkilenmez

---

## 4. Yeniden Aktifleştirme

### Prosedür
1. **Admin** → admin.html → İçerik Yönetimi → Koçlar tab
2. İlgili coach satırında "Aktif Et" butonuna tıkla
3. Onay dialog gelmez (aktifleştirme güvenli)

### Sonuçlar
- Coach Studio erişimi geri gelir
- Yeni post yazabilir
- `published` statüsündeki postlar feed'de tekrar görünür
- Yeni davet gerekMEZ

---

## 5. İçerik Moderasyonu

### Akış
1. Coach bir yazıyı "İncelemeye Gönder" ile admin'e gönderir
2. Admin → İçerik Yönetimi → İçerikler tab → "Bekleyen" filtresi
3. Post kartını inceler (önizleme, yazar bilgisi)
4. Üç aksiyon:
   - **Yayınla** → post `published` olur, feed'de görünür, coach'a e-posta gider
   - **Düzeltme İste** → admin notu girer, coach'a e-posta gider, coach düzenleyebilir
   - **Reddet** → admin notu girer, coach'a e-posta gider

### E-posta Bildirimleri
Coach'a moderasyon sonucu otomatik olarak bildirilir:
- Yayınlandı: olumlu bildirim
- Düzeltme istendi: admin notu ile birlikte
- Reddedildi: admin notu ile birlikte

---

## 6. Sık Sorulan Durumlar

### Coach aynı zamanda aday/işveren mi?
Evet olabilir. Coach, aday ve işveren yüzeyleri bağımsız çalışır. Birini etkilemeden diğeri yönetilir.

### Coach giriş yaptığında nereye gider?
Coach `giris.html` üzerinden giriş yaptığında normal aday/işveren routing'ine gider. Coach Studio'ya erişmek için `coach-studio.html` URL'ini kullanması gerekir.

### Published post pasife alındığında silinir mi?
Hayır. Post statüsü `published` kalır ama feed'de görünmez. Yeniden aktifleştirilince geri gelir.

### Coach'un hesabını tamamen silmek mümkün mü?
Şu an hard delete yok. `is_active = false` ile soft disable yapılır. Tam silme gerekirse DB seviyesinde FK zincirini takip ederek yapılmalıdır.
