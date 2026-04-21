#!/usr/bin/env node
// Pass 10 #2 — auth image swap (giris + uye-ol) regression spec
import { spawnSync } from 'node:child_process';
import { statSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = [
  { path: 'assets/v2/auth-aday.webp', label: 'aday' },
  { path: 'assets/v2/auth-kurumsal.webp', label: 'kurumsal' },
];
const SPEC = { width: 800, height: 1000, maxBytes: 100_000 };
const CACHE_BUST = 'v=20260421p10b';
const HTML_FILES = ['giris.html', 'uye-ol.html'];

let failed = 0;
const log = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failed++;
};

function dims(path) {
  const res = spawnSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', resolve(ROOT, path)], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`sips: ${res.stderr}`);
  const w = parseInt(res.stdout.match(/pixelWidth:\s*(\d+)/)?.[1] || '0');
  const h = parseInt(res.stdout.match(/pixelHeight:\s*(\d+)/)?.[1] || '0');
  return { w, h };
}

for (const img of IMAGES) {
  let d;
  try { d = dims(img.path); }
  catch (e) { log(false, `${img.label}: probe error ${e.message}`); continue; }
  log(d.w === SPEC.width && d.h === SPEC.height,
      `${img.label}: ${d.w}x${d.h} (want ${SPEC.width}x${SPEC.height})`);
  const size = statSync(resolve(ROOT, img.path)).size;
  log(size < SPEC.maxBytes,
      `${img.label}: size ${(size/1024).toFixed(0)}KB (want <${SPEC.maxBytes/1024}KB)`);
}

for (const html of HTML_FILES) {
  const body = readFileSync(resolve(ROOT, html), 'utf8');
  log(body.includes(`auth-aday.webp?${CACHE_BUST}`),
      `${html}: aday cache-bust ${CACHE_BUST}`);
  log(body.includes(`auth-kurumsal.webp?${CACHE_BUST}`),
      `${html}: kurumsal cache-bust ${CACHE_BUST}`);
  log((body.match(/auth-aday\.webp/g) || []).length === 1,
      `${html}: single aday ref`);
  log((body.match(/auth-kurumsal\.webp/g) || []).length === 1,
      `${html}: single kurumsal ref`);
}

process.exit(failed ? 1 : 0);
