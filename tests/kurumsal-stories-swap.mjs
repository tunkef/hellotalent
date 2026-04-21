#!/usr/bin/env node
// Pass 10 #11 — kurumsal story 3 card swap (Defne / Burak / Orkun) regression
import { spawnSync } from 'node:child_process';
import { statSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = { width: 1000, height: 800, maxBytes: 180_000 };
const CACHE_BUST = 'v=20260421p10h';
const STORIES = [
  {
    asset: 'assets/v2/story-defne.webp',
    who: 'Defne K.',
    where: 'İşe Alım Uzmanı',
    quoteContains: [
      'İşe alım ekibine çok yeni katıldım',
      'Hello Talent\'i deneyimleme',
      'Açık pozisyonlarımız hızlı bir şekilde adaylarla eşleşiyor',
      'işe alım için ilan çıkmak zorunda kalmıyoruz',
      'İşe alım yapmak çok daha keyifli hale geldi',
    ],
    altContains: 'İşe Alım Uzmanı Defne K.',
  },
  {
    asset: 'assets/v2/story-burak.webp',
    who: 'Burak M.',
    where: 'Talent Lead',
    quoteContains: [
      'Flagship mağazamız için müdür ihtiyacımız vardı',
      'Hello Talent sayesinde 40 aday bizimle eşleşti',
      '6\'sıyla görüştük ve 1\'ine teklif verdik',
      'Rolü kapamak sadece 10 iş günümüzü aldı',
    ],
    altContains: 'Talent Lead Burak M.',
  },
  {
    asset: 'assets/v2/story-orkun.webp',
    who: 'Orkun',
    where: 'CHRO',
    quoteContains: [
      'Yönettiğimiz markalara Hello Talent profili açtık',
      'işe alım döngümüzün süresini kısalttık',
      'Artık ekibimiz çok daha verimli çalışıyor',
      'markalarımızda çalışma motivasyonu yüksek kişileri işe alıyorlar',
    ],
    altContains: 'CHRO Orkun portresi',
  },
];

let failed = 0;
const log = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failed++; };

function dims(path) {
  const res = spawnSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', resolve(ROOT, path)], { encoding: 'utf8' });
  return {
    w: parseInt(res.stdout.match(/pixelWidth:\s*(\d+)/)?.[1] || '0'),
    h: parseInt(res.stdout.match(/pixelHeight:\s*(\d+)/)?.[1] || '0'),
  };
}

const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');

for (const s of STORIES) {
  const d = dims(s.asset);
  log(d.w === SPEC.width && d.h === SPEC.height, `${s.who}: ${d.w}x${d.h}`);
  const size = statSync(resolve(ROOT, s.asset)).size;
  log(size < SPEC.maxBytes, `${s.who}: size ${(size/1024).toFixed(0)}KB`);

  const assetBase = s.asset.split('/').pop();
  log(html.includes(`${assetBase}?${CACHE_BUST}`), `${s.who}: cache-bust ${CACHE_BUST}`);
  log(html.includes(`alt="${s.altContains}`), `${s.who}: alt updated`);
  log(html.includes(`<span class="where">${s.where}</span>`), `${s.who}: where → "${s.where}"`);
  log(html.includes(`<span class="who">${s.who}</span>`), `${s.who}: who → "${s.who}"`);
  for (const q of s.quoteContains) {
    log(html.includes(q), `${s.who}: quote contains "${q.slice(0,30)}…"`);
  }
}

// Cleanup checks: old merve asset and old brand/quote strings must be gone
log(!existsSync(resolve(ROOT, 'assets/v2/story-merve.webp')), 'story-merve.webp removed');
log(!html.includes('story-merve.webp'), 'no stale merve reference in index.html');
log(!html.includes('Sephora · İK Direktörü'), 'old Defne brand removed');
log(!html.includes('Zara TR · Talent Lead'), 'old Burak brand removed');
log(!html.includes('Koton · İnsan Kaynakları'), 'old Merve brand removed');
log(!html.includes('Kategori planlama ekibimizi 9 günde kurduk'), 'old Defne quote removed');
log(!html.includes('Brand experience rolü için filtreleyip'), 'old Burak quote removed');
log(!html.includes('görünmez pozisyon modu ile sessizce'), 'old Merve quote removed');
log(!html.includes('Merve S.'), 'old Merve name removed');

process.exit(failed ? 1 : 0);
