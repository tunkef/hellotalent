'use strict';

/**
 * seed-test-candidates.js
 * Phase H.B — HelloTalent test aday seed sistemi
 *
 * Kullanım:
 *   npm run seed:test              # 200 aday seed (default)
 *   npm run seed:test -- 50        # custom count
 *   npm run seed:purge             # batch_id ile tüm seed sil (interaktif)
 *   npm run seed:purge -- phase-h-1746123456789  # doğrudan purge
 *
 * Auth: SUPABASE_SERVICE_ROLE_KEY (.env.local)
 * Batch ID: phase-h-{timestamp}
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// ═══════════════════════════════════════════════════════════════
// ENV DOĞRULAMA
// ═══════════════════════════════════════════════════════════════
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('[seed] HATA: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ═══════════════════════════════════════════════════════════════
// TÜRKÇE FAKE DATA HAVUZLARI
// ═══════════════════════════════════════════════════════════════
const TR_ADLAR = [
  'Ahmet', 'Ayşe', 'Mehmet', 'Fatma', 'Mustafa', 'Ali', 'Hatice', 'Hüseyin',
  'Emine', 'Hasan', 'Esra', 'Murat', 'Zeynep', 'Selin', 'Burak', 'Özge',
  'Emre', 'Elif', 'Onur', 'Merve', 'Cem', 'Gülşen', 'Kemal', 'Sevgi',
  'Tarık', 'Neslihan', 'Volkan', 'Derya', 'Serkan', 'Pınar', 'Tolga',
  'Büşra', 'İbrahim', 'Gamze', 'Yusuf', 'Rabia', 'Koray', 'Dilara',
  'Okan', 'Sibel', 'Gökhan', 'Melek', 'Berk', 'Tuğçe', 'Ercan', 'Rüya'
];

const TR_SOYISIMLER = [
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Öztürk', 'Arslan', 'Doğan',
  'Aydın', 'Kılıç', 'Özdemir', 'Aslan', 'Çetin', 'Koç', 'Kurt', 'Yıldız',
  'Polat', 'Tekin', 'Güneş', 'Aktaş', 'Özkan', 'Bulut', 'Yavuz', 'Ateş',
  'Erdoğan', 'Karaca', 'Şimşek', 'Güler', 'Çakır', 'Bozkurt', 'Acar', 'Taş'
];

const POZISYONLAR = [
  { ad: 'Satış Danışmanı', adet: 54 },
  { ad: 'Kıdemli Satış Danışmanı', adet: 24 },
  { ad: 'Mağaza Müdür Yardımcısı', adet: 18 },
  { ad: 'Mağaza Müdürü', adet: 16 },
  { ad: 'Kasiyer', adet: 14 },
  { ad: 'Ürün Uzmanı', adet: 10 },
  { ad: 'Görsel Satış Uzmanı', adet: 10 },
  { ad: 'Stok Sorumlusu', adet: 8 },
  { ad: 'Kat Müdürü', adet: 8 },
  { ad: 'Bölge Müdürü', adet: 6 },
  { ad: 'İK Asistanı', adet: 6 },
  { ad: 'Eğitim Uzmanı', adet: 6 },
  { ad: 'VM Koordinatörü', adet: 4 },
  { ad: 'Müşteri Hizmetleri Uzmanı', adet: 4 },
  { ad: 'Satış Uzmanı', adet: 4 },
  { ad: 'Store Leader', adet: 4 },
  { ad: 'Operasyon Müdürü', adet: 4 }
];

const SEHIRLER = [
  { ad: 'İstanbul', adet: 80 },
  { ad: 'Ankara', adet: 26 },
  { ad: 'İzmir', adet: 20 },
  { ad: 'Bursa', adet: 12 },
  { ad: 'Antalya', adet: 10 },
  { ad: 'Gaziantep', adet: 8 },
  { ad: 'Kocaeli', adet: 8 },
  { ad: 'Mersin', adet: 6 },
  { ad: 'Konya', adet: 6 },
  { ad: 'Adana', adet: 6 },
  { ad: 'Eskişehir', adet: 6 },
  { ad: 'Kayseri', adet: 4 },
  { ad: 'Samsun', adet: 3 },
  { ad: 'Trabzon', adet: 3 },
  { ad: 'Diyarbakır', adet: 2 }
];

const SEGMENTLER = [
  { ad: 'Fast Fashion', adet: 52 },
  { ad: 'Orta Segment', adet: 38 },
  { ad: 'Premium', adet: 28 },
  { ad: 'Lüks', adet: 18 },
  { ad: 'Spor', adet: 16 },
  { ad: 'Kozmetik', adet: 14 },
  { ad: 'Gıda / Market', adet: 12 },
  { ad: 'Ev / Yaşam', adet: 10 },
  { ad: 'Teknoloji', adet: 8 },
  { ad: 'Diğer', adet: 4 }
];

const MUSAITLIK_DAGILIM = [
  { deger: 'Hemen', adet: 60 },
  { deger: '2 Hafta İçinde', adet: 54 },
  { deger: '1 Ay İçinde', adet: 48 },
  { deger: '2+ Ay İçinde', adet: 38 }
];

const EGITIM_DAGILIM = [
  { seviye: 'Lise', adet: 64 },
  { seviye: 'Lisans', adet: 62 },
  { seviye: 'Ön Lisans', adet: 36 },
  { seviye: 'Yüksek Lisans', adet: 20 },
  { seviye: 'Ortaokul', adet: 10 },
  { seviye: 'İlkokul', adet: 6 },
  { seviye: 'Doktora', adet: 2 }
];

// CEFR + Anadil: candidate_languages_seviye_check constraint
// 'A1 - Başlangıç', 'A2 - Temel', 'B1 - Orta Altı', 'B2 - Orta', 'C1 - İleri', 'C2 - Üst İleri', 'Anadil'
const DIL_DAGILIM = [
  { dil: 'Türkçe', adet: 200, seviye: 'Anadil' },
  { dil: 'İngilizce', adet: 110, seviye: 'C1 - İleri' },
  { dil: 'Arapça', adet: 24, seviye: 'B2 - Orta' },
  { dil: 'Almanca', adet: 14, seviye: 'B2 - Orta' },
  { dil: 'Fransızca', adet: 10, seviye: 'B1 - Orta Altı' },
  { dil: 'Rusça', adet: 10, seviye: 'A2 - Temel' },
  { dil: 'Kürtçe', adet: 8, seviye: 'Anadil' }
];

// Deneyim aralıkları (ay cinsinden)
const DENEYIM_DAGILIM = [
  { min: 0, max: 11, adet: 18 },
  { min: 12, max: 23, adet: 30 },
  { min: 24, max: 47, adet: 52 },
  { min: 48, max: 83, adet: 48 },
  { min: 84, max: 119, adet: 28 },
  { min: 120, max: 179, adet: 16 },
  { min: 180, max: 360, adet: 8 }
];

const MARKALAR_HAVUZ = [
  'Zara', 'H&M', 'Mango', 'Pull&Bear', 'Bershka', 'Massimo Dutti',
  'LC Waikiki', 'DeFacto', 'Koton', 'Boyner', 'Vakko', 'Beymen',
  'Nike', 'Adidas', 'Puma', 'Sephora', 'Mavi', 'Colin\'s',
  'Marks & Spencer', 'Decathlon', 'Carrefour', 'Migros', 'A101',
  'MediaMarkt', 'Teknosa', 'Dyson', 'İKEA', 'Kigili', 'Cacharel'
];

const OKULLAR = [
  'Boğaziçi Üniversitesi', 'Orta Doğu Teknik Üniversitesi', 'İstanbul Üniversitesi',
  'Hacettepe Üniversitesi', 'Ankara Üniversitesi', 'Ege Üniversitesi',
  'Marmara Üniversitesi', 'Dokuz Eylül Üniversitesi', 'Gazi Üniversitesi',
  'Anadolu Üniversitesi', 'İstanbul Teknik Üniversitesi', 'Sabancı Üniversitesi',
  'Bilkent Üniversitesi', 'Koç Üniversitesi', 'Yıldız Teknik Üniversitesi',
  'Uludağ Üniversitesi', 'Selçuk Üniversitesi', 'Karadeniz Teknik Üniversitesi'
];

const BOLUMLER = [
  'İşletme', 'İktisat', 'Halkla İlişkiler', 'Pazarlama',
  'İnsan Kaynakları Yönetimi', 'Tekstil ve Moda Tasarımı',
  'Endüstri Mühendisliği', 'Turizm İşletmeciliği', 'Muhasebe',
  'Uluslararası Ticaret', 'Lojistik', 'Grafik Tasarım'
];

// ═══════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════

function rastgele(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rastgeleSec(dizi) {
  return dizi[Math.floor(Math.random() * dizi.length)];
}

/**
 * Dağılım listesinden sıralı havuz oluşturur.
 * Örn: [{ad:'A', adet:3}, {ad:'B', adet:2}] → ['A','A','A','B','B']
 * Fisher-Yates karıştırır.
 */
function dagilimHavuzuOlustur(dagilim, adetAlan) {
  const havuz = [];
  for (const item of dagilim) {
    const adet = adetAlan(item);
    for (let i = 0; i < adet; i++) {
      havuz.push(item);
    }
  }
  // Fisher-Yates shuffle
  for (let i = havuz.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [havuz[i], havuz[j]] = [havuz[j], havuz[i]];
  }
  return havuz;
}

function progressBar(current, total, etiket, genislik = 20) {
  const dolu = Math.round((current / total) * genislik);
  const bos = genislik - dolu;
  const bar = '█'.repeat(dolu) + '░'.repeat(bos);
  process.stdout.write(`\r[seed] ${etiket} ${bar} ${Math.round((current / total) * 100)}% (${current}/${total})`);
  if (current === total) process.stdout.write('\n');
}

function guvenliAd(ad) {
  return ad
    .toLowerCase()
    .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/[^a-z0-9]/g, '');
}

// ═══════════════════════════════════════════════════════════════
// DAĞILIM HAVUZLARI OLUŞTUR (200 slot)
// ═══════════════════════════════════════════════════════════════

function havuzlariOlustur(toplamAdet) {
  const pozHavuz = dagilimHavuzuOlustur(POZISYONLAR, (p) => p.adet);
  const sehirHavuz = dagilimHavuzuOlustur(SEHIRLER, (s) => s.adet);
  const segHavuz = dagilimHavuzuOlustur(SEGMENTLER, (s) => s.adet);
  const musHavuz = dagilimHavuzuOlustur(MUSAITLIK_DAGILIM, (m) => m.adet);
  const egitimHavuz = dagilimHavuzuOlustur(EGITIM_DAGILIM, (e) => e.adet);

  // Deneyim havuzu (ay değerleri)
  const deneyimHavuz = dagilimHavuzuOlustur(
    DENEYIM_DAGILIM,
    (d) => d.adet
  ).map((d) => rastgele(d.min, d.max));

  // Cinsiyet: Kadın 110, Erkek 70, null 20
  const cinsiyetHavuz = dagilimHavuzuOlustur(
    [
      { cinsiyet: 'Kadın', adet: 110 },
      { cinsiyet: 'Erkek', adet: 70 },
      { cinsiyet: null, adet: 20 }
    ],
    (c) => c.adet
  ).map((c) => c.cinsiyet);

  // is_actively_looking: %40 true (80), %60 false (120)
  const aktifHavuz = dagilimHavuzuOlustur(
    [
      { deger: true, adet: 80 },
      { deger: false, adet: 120 }
    ],
    (a) => a.adet
  ).map((a) => a.deger);

  return {
    pozHavuz,
    sehirHavuz,
    segHavuz,
    musHavuz,
    egitimHavuz,
    deneyimHavuz,
    cinsiyetHavuz,
    aktifHavuz
  };
}

// ═══════════════════════════════════════════════════════════════
// DIL ATAMALARI (200 satır üretir, bazı adaylar birden fazla dil)
// ═══════════════════════════════════════════════════════════════

function dilAtamalariniHazirla(candidateIds) {
  const dilSatirlar = [];

  for (const dilDef of DIL_DAGILIM) {
    // Bu dili konuşacak aday sayısını rastgele seç (distribution'dan)
    const secilenler = new Set();
    const hedef = dilDef.adet;

    // Türkçe: hepsi (200 aday)
    if (dilDef.dil === 'Türkçe') {
      for (const cid of candidateIds) {
        dilSatirlar.push({
          candidate_id: cid,
          dil: dilDef.dil,
          seviye: dilDef.seviye,
          sira: 1
        });
      }
      continue;
    }

    // Diğer diller: hedef kadar rastgele aday seç
    const shuffled = [...candidateIds].sort(() => Math.random() - 0.5);
    const secilen = shuffled.slice(0, hedef);
    let sira = 2;

    for (const cid of secilen) {
      // Bu adayın kaçıncı yabancı dili?
      const mevcutSira = dilSatirlar.filter((d) => d.candidate_id === cid && d.sira > 1).length;
      dilSatirlar.push({
        candidate_id: cid,
        dil: dilDef.dil,
        seviye: dilDef.seviye,
        sira: 2 + mevcutSira
      });
    }
  }

  return dilSatirlar;
}

// ═══════════════════════════════════════════════════════════════
// DENEYİM SATIRI ÜRET (ortalama 2/aday)
// ═══════════════════════════════════════════════════════════════

function deneyimUret(candidateId, toplamAy, segment) {
  const deneyimler = [];
  const deneyimSayisi = toplamAy === 0 ? 0 : (toplamAy < 12 ? 1 : rastgele(1, 3));

  if (deneyimSayisi === 0) return deneyimler;

  let kalanAy = toplamAy;
  const buYil = 2026;

  for (let i = 0; i < deneyimSayisi; i++) {
    const ayBu = Math.max(1, Math.floor(kalanAy / (deneyimSayisi - i)));
    const sureyil = Math.floor(ayBu / 12);
    const sureyilKalan = ayBu % 12;
    const devamEdiyor = i === 0 && Math.random() > 0.5;

    const bitisYil = devamEdiyor ? null : buYil - i * 2;
    const bitisAy = devamEdiyor ? null : rastgele(1, 12);
    const baslangicYil = devamEdiyor
      ? buYil - rastgele(1, Math.max(1, sureyil))
      : (bitisYil - Math.max(1, sureyil));
    const baslangicAy = rastgele(1, 12);

    deneyimler.push({
      candidate_id: candidateId,
      sirket: rastgeleSec(MARKALAR_HAVUZ) + ' Turkey',
      marka: rastgeleSec(MARKALAR_HAVUZ),
      pozisyon: POZISYONLAR[rastgele(0, POZISYONLAR.length - 1)].ad,
      segment: segment,
      baslangic_yil: Math.max(1990, baslangicYil),
      baslangic_ay: baslangicAy,
      bitis_yil: bitisYil,
      bitis_ay: bitisAy,
      devam_ediyor: devamEdiyor,
      sira: i + 1
    });

    kalanAy -= ayBu;
  }

  return deneyimler;
}

// ═══════════════════════════════════════════════════════════════
// ÇALIŞMA TERCİHİ ÜRET
// R4 fix: dağılım net, overlap kasıtlı (employer 2+ chip seçince gerçekçi overlap görür)
//
// 200 aday için hedef dağılım:
//   index 0..159  → Tam Zamanlı dahil (%80, 160 aday)
//   index 0..39   → Yarı Zamanlı DA dahil (%20, 40 aday) → TZ+YZ overlap
//   index 0..19   → Sözleşmeli DE dahil (%10, 20 aday) → TZ+YZ+Söz overlap
//   index 0..11   → Sezonluk DA dahil (%6, 12 aday) → TZ+YZ+Söz+Sez overlap
//   index 160+    → Tam Zamanlı yok; Yarı Zamanlı veya Sezonluk only (%20, 40 aday)
//
// Overlap semantiği: calisma_tipleri array, employer && operator ile filtreler.
// Birden fazla tip seçen aday, employer'ın her iki chip'ine de gözükür — bu kasıtlı.
// ═══════════════════════════════════════════════════════════════

function calismaTipiUret(index, toplamAdet) {
  const tipler = [];
  // Tam Zamanlı: ilk %80
  if (index < Math.round(toplamAdet * 0.8)) {
    tipler.push('Tam Zamanlı');
  }
  // Yarı Zamanlı: ilk %20 (TZ ile overlap → TZ+YZ)
  if (index < Math.round(toplamAdet * 0.2)) {
    tipler.push('Yarı Zamanlı');
  }
  // Sözleşmeli: ilk %10 (TZ+YZ ile overlap → TZ+YZ+Söz)
  if (index < Math.round(toplamAdet * 0.1)) {
    tipler.push('Sözleşmeli');
  }
  // Sezonluk: ilk %6 (TZ+YZ+Söz ile overlap → TZ+YZ+Söz+Sez)
  if (index < Math.round(toplamAdet * 0.06)) {
    tipler.push('Sezonluk');
  }
  // index 160+: TZ yok → Yarı Zamanlı only fallback
  if (tipler.length === 0) tipler.push('Yarı Zamanlı');
  return tipler;
}

// ═══════════════════════════════════════════════════════════════
// SEED MODE
// ═══════════════════════════════════════════════════════════════

async function seed(toplamAdet, batchId) {
  console.log(`[seed] Batch ID: ${batchId}`);
  console.log(`[seed] Toplam aday: ${toplamAdet}`);
  console.log('');

  // Idempotency: aynı batch_id zaten var mı?
  const { count: mevcutSayi } = await supabase
    .from('candidates')
    .select('id', { count: 'exact', head: true })
    .eq('test_seed_batch', batchId);

  if (mevcutSayi && mevcutSayi > 0) {
    console.error(`[seed] HATA: Batch ID '${batchId}' zaten mevcut (${mevcutSayi} aday). Farklı batch ID kullanın.`);
    process.exit(1);
  }

  const havuzlar = havuzlariOlustur(toplamAdet);

  // ── 1. CANDIDATES INSERT ──────────────────────────────────────
  const candidateRows = [];
  const kullanilanEmailler = new Set();

  for (let i = 0; i < toplamAdet; i++) {
    const ad = rastgeleSec(TR_ADLAR);
    const soyad = rastgeleSec(TR_SOYISIMLER);
    const adGuvenli = guvenliAd(ad);
    const soyadGuvenli = guvenliAd(soyad);

    // L1 fix: .invalid RFC 2606 — gerçek SMTP sunucusuna hiçbir zaman ulaşmaz
    let email = `${adGuvenli}.${soyadGuvenli}.${i}@hellotest.invalid`;
    // Çakışma guard
    if (kullanilanEmailler.has(email)) {
      email = `${adGuvenli}.${soyadGuvenli}.${i}.${rastgele(100, 999)}@hellotest.invalid`;
    }
    kullanilanEmailler.add(email);

    // H1 fix: +90 599 serisi — Türkiye'de tahsis edilmemiş (ITU E.164), gerçek collision riski sıfır
    const telefon = `+90 599 0${rastgele(0, 9)}${rastgele(0, 9)} ${rastgele(0, 9)}${rastgele(0, 9)}${rastgele(0, 9)} ${rastgele(0, 9)}${rastgele(0, 9)}`;
    const dogumYili = String(rastgele(1975, 2003));
    const poz = havuzlar.pozHavuz[i] || rastgeleSec(POZISYONLAR);
    const sehir = havuzlar.sehirHavuz[i] || rastgeleSec(SEHIRLER);
    const deneyimAy = havuzlar.deneyimHavuz[i] !== undefined ? havuzlar.deneyimHavuz[i] : rastgele(0, 120);
    const cinsiyet = havuzlar.cinsiyetHavuz[i];
    const aktif = havuzlar.aktifHavuz[i] !== undefined ? havuzlar.aktifHavuz[i] : false;
    const tamamlamaPct = rastgele(60, 95);

    // R1 fix: user_id YOK — NULL kalır. CHECK constraint (Wave 2 migration) guard eder.
    // test_seed_batch IS NOT NULL → user_id NULL kabul edilir (auth.users FK ihlali yok).
    candidateRows.push({
      full_name: `${ad} ${soyad}`,
      email: email,
      telefon: telefon,
      cinsiyet: cinsiyet,
      dogum_yili: dogumYili,
      // Modern shape (RPC + UI): son_pozisyon + adres_il
      // Live'da hem deprecated (pozisyon, sehir) hem modern (son_pozisyon, adres_il)
      // exposed; modern field'ları doldur (5/6 real aday modern field'da).
      son_pozisyon: poz.ad,
      adres_il: sehir.ad,
      toplam_deneyim_ay: deneyimAy,
      is_active: true,
      is_actively_looking: aktif,
      profile_completed: true,
      profile_completion_pct: tamamlamaPct,
      account_status: 'active',
      hide_from_current_employer: false,
      notify_email_messages: true,
      notify_email_jobs: true,
      notify_sms_enabled: false,
      notify_push_enabled: false,
      notify_email_newsletter: false,
      contact_pref_email: true,
      contact_pref_phone: false,
      contact_pref_whatsapp: false,
      phone_verified: false,
      test_seed_batch: batchId,
      created_at: new Date().toISOString()
    });

    progressBar(i + 1, toplamAdet, 'Adaylar hazırlanıyor...');
  }

  // ── Batch insert (50'şer) ─────────────────────────────────────
  console.log(`[seed] Inserting ${toplamAdet} candidates...`);
  const insertedIds = [];
  const BATCH_SIZE = 50;

  for (let b = 0; b < candidateRows.length; b += BATCH_SIZE) {
    const dilim = candidateRows.slice(b, b + BATCH_SIZE);
    const { data, error } = await supabase
      .from('candidates')
      .insert(dilim)
      .select('id');  // M2 fix: sadece id çek, test_seed_batch gereksiz

    if (error) {
      console.error(`\n[seed] HATA (candidates insert, batch ${b / BATCH_SIZE + 1}):`, error.message);
      process.exit(1);
    }
    insertedIds.push(...data.map((r) => r.id));
    progressBar(Math.min(b + BATCH_SIZE, toplamAdet), toplamAdet, 'Inserting candidates...');
  }

  // ── 2. WORK PREFERENCES ───────────────────────────────────────
  console.log(`[seed] Inserting work_preferences...`);
  const wpRows = [];

  for (let i = 0; i < insertedIds.length; i++) {
    const candidateId = insertedIds[i];
    const mus = havuzlar.musHavuz[i] || rastgeleSec(MUSAITLIK_DAGILIM);
    const seg = havuzlar.segHavuz[i] || rastgeleSec(SEGMENTLER);
    const tipler = calismaTipiUret(i, toplamAdet);

    wpRows.push({
      candidate_id: candidateId,
      musaitlik: mus.deger,
      calisma_tipleri: tipler,
      segmentler: [seg.ad]
    });
    progressBar(i + 1, insertedIds.length, 'Work prefs...');
  }

  for (let b = 0; b < wpRows.length; b += BATCH_SIZE) {
    const { error } = await supabase
      .from('candidate_work_preferences')
      .insert(wpRows.slice(b, b + BATCH_SIZE));
    if (error) {
      // R3 fix: child insert error → FATAL + rollback talimatı + exit(1)
      console.error(`\n[seed] FATAL: work_preferences insert error:`, error.message);
      console.error(`[seed] Partial seed warning. Run: npm run seed:purge -- ${batchId}`);
      process.exit(1);
    }
  }
  console.log(`[seed] Inserting work_preferences... 100% (${wpRows.length}/${wpRows.length})`);

  // ── 3. EXPERIENCES ────────────────────────────────────────────
  console.log(`[seed] Inserting experiences...`);
  const expRows = [];

  for (let i = 0; i < insertedIds.length; i++) {
    const candidateId = insertedIds[i];
    const deneyimAy = havuzlar.deneyimHavuz[i] !== undefined ? havuzlar.deneyimHavuz[i] : 24;
    const seg = havuzlar.segHavuz[i] || rastgeleSec(SEGMENTLER);
    const satirlar = deneyimUret(candidateId, deneyimAy, seg.ad);
    expRows.push(...satirlar);
  }

  for (let b = 0; b < expRows.length; b += BATCH_SIZE) {
    const { error } = await supabase
      .from('candidate_experiences')
      .insert(expRows.slice(b, b + BATCH_SIZE));
    if (error) {
      // R3 fix: child insert error → FATAL + rollback talimatı + exit(1)
      console.error(`\n[seed] FATAL: experiences insert error:`, error.message);
      console.error(`[seed] Partial seed warning. Run: npm run seed:purge -- ${batchId}`);
      process.exit(1);
    }
  }
  console.log(`[seed] Inserting experiences (avg ${(expRows.length / insertedIds.length).toFixed(1)}/aday)... 100% (${expRows.length}/${expRows.length})`);

  // ── 4. EDUCATION ──────────────────────────────────────────────
  console.log(`[seed] Inserting education...`);
  const eduRows = [];

  for (let i = 0; i < insertedIds.length; i++) {
    const candidateId = insertedIds[i];
    const egitim = havuzlar.egitimHavuz[i] || rastgeleSec(EGITIM_DAGILIM);
    const mezunYil = rastgele(1995, 2024);

    eduRows.push({
      candidate_id: candidateId,
      egitim_seviye: egitim.seviye,
      okul: rastgeleSec(OKULLAR),
      bolum: rastgeleSec(BOLUMLER),
      mezun_yil: mezunYil,
      sira: 1
    });
    progressBar(i + 1, insertedIds.length, 'Education...');
  }

  for (let b = 0; b < eduRows.length; b += BATCH_SIZE) {
    const { error } = await supabase
      .from('candidate_education')
      .insert(eduRows.slice(b, b + BATCH_SIZE));
    if (error) {
      // R3 fix: child insert error → FATAL + rollback talimatı + exit(1)
      console.error(`\n[seed] FATAL: education insert error:`, error.message);
      console.error(`[seed] Partial seed warning. Run: npm run seed:purge -- ${batchId}`);
      process.exit(1);
    }
  }
  console.log(`[seed] Inserting education... 100% (${eduRows.length}/${eduRows.length})`);

  // ── 5. LANGUAGES ──────────────────────────────────────────────
  console.log(`[seed] Inserting languages...`);
  const dilRows = dilAtamalariniHazirla(insertedIds);

  for (let b = 0; b < dilRows.length; b += BATCH_SIZE) {
    const { error } = await supabase
      .from('candidate_languages')
      .insert(dilRows.slice(b, b + BATCH_SIZE));
    if (error) {
      // R3 fix: child insert error → FATAL + rollback talimatı + exit(1)
      console.error(`\n[seed] FATAL: languages insert error:`, error.message);
      console.error(`[seed] Partial seed warning. Run: npm run seed:purge -- ${batchId}`);
      process.exit(1);
    }
  }
  console.log(`[seed] Inserting languages... 100% (${dilRows.length}/${dilRows.length})`);

  // ── ÖZET ──────────────────────────────────────────────────────
  console.log('');
  console.log(`[seed] DONE. Batch ID: ${batchId}`);
  console.log(`[seed] Toplam eklenen aday: ${insertedIds.length}`);
  console.log(`[seed] Deneyim satırı: ${expRows.length}`);
  console.log(`[seed] Dil satırı: ${dilRows.length}`);
  console.log('');
  console.log(`[seed] Purge komutu: npm run seed:purge -- ${batchId}`);
}

// ═══════════════════════════════════════════════════════════════
// PURGE MODE
// ═══════════════════════════════════════════════════════════════

async function purge(batchId) {
  if (!batchId) {
    console.error('[seed] HATA: Batch ID gerekli. Kullanım: npm run seed:purge -- phase-h-XXXXX');
    process.exit(1);
  }
  // L3 fix: batch_id format validation (purge'de de zorunlu — yanlış argümana karşı guard)
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(batchId)) {
    console.error('[seed] HATA: Geçersiz batch_id formatı. Alfanümerik + tire/alt çizgi, 8-64 karakter olmalı.');
    console.error(`[seed] Geçersiz değer: "${batchId}"`);
    process.exit(1);
  }

  // Kaç aday var?
  const { count, error: countErr } = await supabase
    .from('candidates')
    .select('id', { count: 'exact', head: true })
    .eq('test_seed_batch', batchId);

  if (countErr) {
    console.error('[seed] HATA (count):', countErr.message);
    process.exit(1);
  }

  if (!count || count === 0) {
    console.error(`[seed] Batch ID '${batchId}' bulunamadı. Hiç aday yok.`);
    process.exit(1);
  }

  console.log(`[seed] Batch '${batchId}' — ${count} aday silinecek.`);
  console.log('[seed] Alt tablolar ON DELETE CASCADE ile otomatik silinir.');
  console.log('[seed] Siliniyor...');

  // ON DELETE CASCADE: tek DELETE yeterli
  const { error } = await supabase
    .from('candidates')
    .delete()
    .eq('test_seed_batch', batchId);

  if (error) {
    console.error('[seed] HATA (purge):', error.message);
    process.exit(1);
  }

  console.log(`[seed] PURGE TAMAMLANDI. ${count} aday + alt tablo kayıtları silindi.`);
  console.log(`[seed] Batch: ${batchId}`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  const cmd = process.argv[2];

  if (cmd === 'purge') {
    const batchId = process.argv[3];
    await purge(batchId);
    return;
  }

  if (cmd === 'seed' || !cmd) {
    const adet = parseInt(process.argv[3], 10) || 200;
    if (adet < 1 || adet > 1000) {
      console.error('[seed] HATA: Adet 1-1000 arası olmalı.');
      process.exit(1);
    }
    const batchId = process.argv[4] || `phase-h-${Date.now()}`;
    // L3 fix: batch_id format validation — alphanumeric + dash/underscore, 8-64 karakter
    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(batchId)) {
      console.error('[seed] HATA: Geçersiz batch_id formatı. Alfanümerik + tire/alt çizgi, 8-64 karakter olmalı.');
      console.error(`[seed] Geçersiz değer: "${batchId}"`);
      process.exit(1);
    }
    await seed(adet, batchId);
    return;
  }

  console.error('[seed] Bilinmeyen komut. Kullanım: seed [adet] | purge [batch_id]');
  process.exit(1);
}

main().catch((err) => {
  console.error('[seed] Beklenmeyen hata:', err);
  process.exit(1);
});
