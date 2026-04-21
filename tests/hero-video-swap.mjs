#!/usr/bin/env node
// Pass 10 — hero video swap regression spec
// Verifies: new aday + isveren hero videos meet CLATU §4 spec + card size preserved
import { spawnSync } from 'node:child_process';
import { statSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VIDEOS = [
  { path: 'assets/v2/hero-aday.mp4', poster: 'assets/v2/hero-aday-poster.jpg', label: 'aday' },
  { path: 'assets/v2/hero-isveren.mp4', poster: 'assets/v2/hero-isveren-poster.jpg', label: 'kurumsal' },
];

const SPEC = {
  width: 448,
  height: 672,
  durMin: 5.9,
  durMax: 6.1,
  maxBytes: 1_048_576,
  posterMaxBytes: 60_000,
  codec: 'h264',
  pixFmt: 'yuv420p',
};

const CACHE_BUST = 'v=20260421p10';

let failed = 0;
const log = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failed++;
};

function probe(path) {
  const full = resolve(ROOT, path);
  const res = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=width,height,duration,codec_name,pix_fmt',
    '-of', 'json',
    full,
  ], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`ffprobe failed: ${res.stderr}`);
  const stream = JSON.parse(res.stdout).streams[0];
  return { ...stream, duration: parseFloat(stream.duration), size: statSync(full).size };
}

for (const v of VIDEOS) {
  let p;
  try { p = probe(v.path); }
  catch (e) { log(false, `${v.label}: ffprobe error — ${e.message}`); continue; }
  log(p.width === SPEC.width && p.height === SPEC.height,
      `${v.label}: ${p.width}x${p.height} (want ${SPEC.width}x${SPEC.height})`);
  log(p.duration >= SPEC.durMin && p.duration <= SPEC.durMax,
      `${v.label}: duration ${p.duration}s (want ${SPEC.durMin}-${SPEC.durMax})`);
  log(p.size < SPEC.maxBytes,
      `${v.label}: size ${(p.size/1024).toFixed(0)}KB (want <${SPEC.maxBytes/1024}KB)`);
  log(p.codec_name === SPEC.codec, `${v.label}: codec ${p.codec_name}`);
  log(p.pix_fmt === SPEC.pixFmt, `${v.label}: pix_fmt ${p.pix_fmt}`);

  try {
    const posterSize = statSync(resolve(ROOT, v.poster)).size;
    log(posterSize < SPEC.posterMaxBytes,
        `${v.label} poster: ${(posterSize/1024).toFixed(0)}KB`);
  } catch (e) {
    log(false, `${v.label} poster: missing`);
  }
}

const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
log(html.includes(`hero-aday.mp4?${CACHE_BUST}`), `index.html: aday video cache-bust ${CACHE_BUST}`);
log(html.includes(`hero-isveren.mp4?${CACHE_BUST}`), `index.html: kurumsal video cache-bust ${CACHE_BUST}`);
log(!html.includes('hero-aday.mp4?v=20260421p9') && !html.includes('hero-aday.mp4?v=20260421p8'),
    'index.html: no stale cache-bust for aday');
log((html.match(/hero-aday\.mp4/g) || []).length === 1, 'index.html: single aday video ref');
log((html.match(/hero-isveren\.mp4/g) || []).length === 1, 'index.html: single kurumsal video ref');

process.exit(failed ? 1 : 0);
