/* K-067 Pillar A UAT — PDF Türkçe karakter fix doğrulaması.
   jsPDF v2.5.1 instance save/text instance-level (prototype değil).
   Constructor wrap ile doc.save'i intercept eder, output() dataURI yakalar.
   pdftotext ile text extract → Türkçe regex match. */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const here = path.resolve('.');
const vfs = fs.readFileSync(path.join(here, 'eb-garamond-vfs.js'), 'utf8');
const cvJs = fs.readFileSync(path.join(here, 'profil-cv.js'), 'utf8');

const HTML = `<!doctype html>
<html><head><meta charset="utf-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head><body>
<script>${vfs}</script>
<script>
window._loadedDBData = { profile: {
  full_name: 'İrem Şahin',
  telefon: '+90 532 123 4567',
  linkedin: 'linkedin.com/in/iremsahin',
  adres_il: 'İstanbul',
  avatar_url: ''
}};
window.currentUser = { email: 'irem.sahin@hellotalent.ai' };
window.ROLE_SKILLS_MAP = {
  'Mağaza Operasyon': ['P&L Takibi', 'Stok Kontrolü', 'Vardiya Planlama', 'KPI Takibi', 'Shrinkage Yönetimi'],
  'Satış': ['Hedef Takibi', 'Üst Segment Müşteri Yönetimi', 'Ürün Bilgisi']
};
window.LEADERSHIP_SKILLS = ['Büyük Ekip Yönetimi', 'Performans Koçluğu'];
window.val = function(id) {
  var inputs = { 'f-adsoyad': 'İrem Şahin', 'f-telefon': '+90 532 123 4567',
    'f-linkedin': 'linkedin.com/in/iremsahin', 'f-adresil': 'İstanbul' };
  return inputs[id] || '';
};
document.body.insertAdjacentHTML('beforeend', '<div id="target-roles-container"><select id="role-1-unvan"><option value="Üst Düzey Mağaza Müdürü" selected></option></select></div>');

window.collectExperiences = function() {
  return [{
    pozisyon: 'Mağaza Müdürü', marka: 'Şişecam Paşabahçe',
    rol_ailesi: 'Mağaza Operasyon', segment: 'Premium',
    sehir: 'İstanbul',
    baslangic_yil: 2022, baslangic_ay: 3, devam_ediyor: true,
    basari_ozeti: 'Haftalık satış hedeflerini %22 üzerinde gerçekleştirdim. İşletme giderlerini %8 azalttım. Ekip motivasyon skorlarını +18 puan yükselttim.'
  }, {
    pozisyon: 'Asistan Müdür', sirket: 'Boyner Büyük Mağazacılık',
    rol_ailesi: 'Mağaza Operasyon', segment: 'Orta Segment',
    sehir: 'İzmir',
    baslangic_yil: 2019, baslangic_ay: 1, bitis_yil: 2022, bitis_ay: 2,
    devam_ediyor: false,
    basari_ozeti: 'Günlük ciro hedeflerinin tutmasından ve vardiya planlamasından sorumluydum.'
  }];
};
window.collectEducation = function() {
  return [{ okul: 'Boğaziçi Üniversitesi', bolum: 'İşletme', egitim_seviye: 'Lisans', mezun_yil: 2017 }];
};
window.collectLanguages = function() {
  return [{ dil: 'Türkçe', seviye: 'Anadil' }, { dil: 'İngilizce', seviye: 'İleri' }];
};
window.collectCertificates = function() {
  return [{ egitim_adi: 'Perakende Yönetim Sertifikası', kurum: 'Koç Üniversitesi', yil: 2023 }];
};
window.selectedBrandInterests = ['Zara', 'Mango', 'H&M'];
var tr = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
window.monthIndexToName = function(m) { return m >= 1 && m <= 12 ? tr[m-1] : ''; };
window.showToast = function() {};
window.ht_track = function() {};
window.STORAGE = { BUCKET: 'cvs', cvPath: function() { return ''; } };
window.supabase = {
  storage: { from: function() { return { remove: function() { return Promise.resolve({}); }, upload: function() { return Promise.resolve({}); }, createSignedUrl: function() { return Promise.resolve({ data: { signedUrl: '' } }); } }; } },
  from: function() { return { update: function() { return { eq: function() { return Promise.resolve({}); } }; }, eq: function() { return Promise.resolve({}); } }; }
};

// K-067 test hook: wrap jsPDF constructor to capture save() output
(function() {
  var OrigJ = window.jspdf.jsPDF;
  window.__capturedPdfDataUri = null;
  window.jspdf.jsPDF = function() {
    var args = Array.prototype.slice.call(arguments);
    var inst = OrigJ.apply(this instanceof OrigJ ? this : Object.create(OrigJ.prototype), args);
    if (!(inst instanceof OrigJ)) inst = new OrigJ(args[0]); // fallback
    var origSave = inst.save;
    inst.save = function() {
      try { window.__capturedPdfDataUri = inst.output('datauristring'); } catch (e) {}
      return inst;
    };
    return inst;
  };
  // preserve static props
  for (var k in OrigJ) if (OrigJ.hasOwnProperty(k)) window.jspdf.jsPDF[k] = OrigJ[k];
  window.jspdf.jsPDF.prototype = OrigJ.prototype;
})();
</script>
<script>${cvJs}</script>
</body></html>`;

const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();
p.on('pageerror', (e) => console.error('[pageerror]', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.error('[console.error]', m.text()); });

await p.setContent(HTML);
await p.waitForTimeout(300);

const datauri = await p.evaluate(async () => {
  try {
    await generateCV();
  } catch (e) {
    return { __err: e.message };
  }
  return window.__capturedPdfDataUri;
});

await b.close();

if (!datauri || typeof datauri !== 'string') {
  console.error('PDF not captured:', datauri);
  process.exit(1);
}
const b64 = datauri.split(',')[1];
const buf = Buffer.from(b64, 'base64');
const outPath = 'k067-turkish-test.pdf';
fs.writeFileSync(outPath, buf);
console.log('PDF written:', outPath, buf.length, 'bytes');

const r = spawnSync('pdftotext', [outPath, '-'], { encoding: 'utf8' });
if (r.status !== 0) {
  console.error('pdftotext failed:', r.stderr);
  process.exit(1);
}
const text = r.stdout;

console.log('\n══ PDF text content ══\n');
console.log(text);
console.log('\n══ Critical Turkish chars assertion ══');

// Case-insensitive — name/section labels uppercase'lenir, gövde mixed case kalır
const required = [
  { label: 'İstanbul', re: /İSTANBUL|İstanbul/i },
  { label: 'Mağaza', re: /MAĞAZA|Mağaza/i },
  { label: 'Şahin/ŞAHİN', re: /ŞAHİN|Şahin/ },
  { label: 'İrem/İREM', re: /İREM|İrem/ },
  { label: 'Şişecam/ŞİŞECAM', re: /ŞİŞECAM|Şişecam/ },
  { label: 'Büyük', re: /BÜYÜK|Büyük/ },
  { label: 'İngilizce', re: /İngilizce/ },
  { label: 'Türkçe', re: /Türkçe/ },
  { label: 'Eğitim/EĞİTİM', re: /EĞİTİM|Eğitim/ },
  { label: 'Boğaziçi/BOĞAZİÇİ', re: /BOĞAZİÇİ|Boğaziçi/ },
  { label: 'üzerinde', re: /üzerinde/ },
  { label: 'YETKİNLİKLER', re: /YETKİNLİKLER/ },
  { label: 'DENEYİM', re: /DENEYİM/ },
  { label: 'ÜNİVERSİTESİ', re: /ÜNİVERSİTESİ/ }
];

let pass = 0, fail = 0;
for (const a of required) {
  const ok = a.re.test(text);
  console.log((ok ? '✓' : '✗') + '  ' + a.label);
  ok ? pass++ : fail++;
}
console.log(`\nPass: ${pass}/${required.length}`);
if (fail > 0) { console.error('FAIL'); process.exit(1); }
console.log('ALL PASSED — Türkçe karakterler doğru render edildi.');
