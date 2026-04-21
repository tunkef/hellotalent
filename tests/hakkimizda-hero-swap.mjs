#!/usr/bin/env node
// Pass 10 #3 — hakkimizda hero: video → image swap regression spec
import { spawnSync } from 'node:child_process';
import { statSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NEW_IMG = 'assets/v2/hero-hakkimizda.webp';
const OLD_VIDEO = 'assets/v2/hero-hakkimizda.mp4';
const OLD_POSTER = 'assets/v2/hero-hakkimizda-poster.jpg';
const HTML = 'hakkimizda.html';
const SPEC = { width: 1000, height: 1250, maxBytes: 200_000 };
const CACHE_BUST = 'v=20260421p10c';

let failed = 0;
const log = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failed++;
};

function dims(path) {
  const res = spawnSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', resolve(ROOT, path)], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(res.stderr);
  return {
    w: parseInt(res.stdout.match(/pixelWidth:\s*(\d+)/)?.[1] || '0'),
    h: parseInt(res.stdout.match(/pixelHeight:\s*(\d+)/)?.[1] || '0'),
  };
}

try {
  const d = dims(NEW_IMG);
  log(d.w === SPEC.width && d.h === SPEC.height, `hakkimizda img: ${d.w}x${d.h} (want ${SPEC.width}x${SPEC.height})`);
  const size = statSync(resolve(ROOT, NEW_IMG)).size;
  log(size < SPEC.maxBytes, `hakkimizda img size: ${(size/1024).toFixed(0)}KB (want <${SPEC.maxBytes/1024}KB)`);
} catch (e) {
  log(false, `hakkimizda img: ${e.message}`);
}

log(!existsSync(resolve(ROOT, OLD_VIDEO)), `old video removed (${OLD_VIDEO})`);
log(!existsSync(resolve(ROOT, OLD_POSTER)), `old poster removed (${OLD_POSTER})`);

const html = readFileSync(resolve(ROOT, HTML), 'utf8');
log(!html.includes('<video'), `${HTML}: no <video> tag`);
log(!html.includes('hero-vid'), `${HTML}: no hero-vid class`);
log(!html.includes('hero-hakkimizda.mp4'), `${HTML}: no mp4 ref`);
log(!html.includes('hero-hakkimizda-poster'), `${HTML}: no poster ref`);
log(!html.includes('prefers-reduced-motion'), `${HTML}: K-041 script removed`);
log(html.includes(`hero-hakkimizda.webp?${CACHE_BUST}`), `${HTML}: new img cache-bust ${CACHE_BUST}`);
log((html.match(/hero-hakkimizda\.webp/g) || []).length === 1, `${HTML}: single webp ref`);

process.exit(failed ? 1 : 0);
