#!/usr/bin/env node
// Pass 10 #8 — aday story 3 card swap (Selin / Kerem / Zeynep) regression
import { spawnSync } from 'node:child_process';
import { statSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = { width: 1000, height: 800, maxBytes: 180_000 };
const CACHE_BUST = 'v=20260421p10e';
const STORIES = [
  {
    asset: 'assets/v2/story-selin.webp',
    who: 'Selin A.',
    where: 'Mağaza Müdürü',
    quoteContains: ['Mağaza müdür yardımcısı olarak 4 yıl', 'Hello Talent aracılığıyla teklif aldım', 'mağaza müdürü olarak devam ediyorum'],
    altContains: 'Mağaza müdürlüğüne geçen Selin A.',
  },
  {
    asset: 'assets/v2/story-kerem.webp',
    who: 'Kerem T.',
    where: 'Mağaza Müdür Yardımcısı',
    quoteContains: ['Hızlı moda markalarında uzun süre satış danışmanlığı', 'rol arayışına başladım', 'müdür yardımcısı pozisyon eşleşmesi aldım'],
    altContains: 'Mağaza müdür yardımcılığına geçen Kerem T.',
  },
  {
    asset: 'assets/v2/story-zeynep.webp',
    who: 'Zeynep Y.',
    where: 'Görsel Uzmanı',
    quoteContains: ['Mağaza sektöründe en çok istediğim ekip görsel ekibiydi', 'görsel uzman pozisyonu ile eşleşti', 'görsel düzenleme ekibinde devam ediyorum'],
    altContains: 'Görsel uzmanlığına geçen Zeynep Y.',
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
  for (const q of s.quoteContains) {
    log(html.includes(q), `${s.who}: quote contains "${q.slice(0,30)}…"`);
  }
}

log(!html.includes('story-selin.webp?v=20260421p"'), 'no stale selin cache-bust');
log(!html.includes('story-kerem.webp?v=20260421p"'), 'no stale kerem cache-bust');
log(!html.includes('story-zeynep.webp?v=20260421p"'), 'no stale zeynep cache-bust');

process.exit(failed ? 1 : 0);
