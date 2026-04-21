#!/usr/bin/env node
// Pass 10 #6 — iletisim hero video swap regression
import { spawnSync } from 'node:child_process';
import { statSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO = 'assets/v2/hero-iletisim.mp4';
const POSTER = 'assets/v2/hero-iletisim-poster.jpg';
const HTML = 'iletisim.html';
const SPEC = { width: 480, height: 600, durMin: 5.9, durMax: 6.1, maxBytes: 1_048_576, posterMaxBytes: 60_000, codec: 'h264', pixFmt: 'yuv420p' };
const CACHE_BUST = 'v=20260421p10d';

let failed = 0;
const log = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failed++; };

function probe(path) {
  const res = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,duration,codec_name,pix_fmt', '-of', 'json', resolve(ROOT, path)], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(res.stderr);
  const s = JSON.parse(res.stdout).streams[0];
  return { ...s, duration: parseFloat(s.duration), size: statSync(resolve(ROOT, path)).size };
}

let p;
try { p = probe(VIDEO); } catch (e) { log(false, `probe: ${e.message}`); process.exit(1); }
log(p.width === SPEC.width && p.height === SPEC.height, `video: ${p.width}x${p.height} (want ${SPEC.width}x${SPEC.height})`);
log(p.duration >= SPEC.durMin && p.duration <= SPEC.durMax, `duration ${p.duration}s`);
log(p.size < SPEC.maxBytes, `size ${(p.size/1024).toFixed(0)}KB`);
log(p.codec_name === SPEC.codec, `codec ${p.codec_name}`);
log(p.pix_fmt === SPEC.pixFmt, `pix_fmt ${p.pix_fmt}`);

const posterSize = statSync(resolve(ROOT, POSTER)).size;
log(posterSize < SPEC.posterMaxBytes, `poster ${(posterSize/1024).toFixed(0)}KB`);

const html = readFileSync(resolve(ROOT, HTML), 'utf8');
log(html.includes(`hero-iletisim.mp4?${CACHE_BUST}`), `${HTML}: video cache-bust ${CACHE_BUST}`);
log(html.includes(`hero-iletisim-poster.jpg?${CACHE_BUST}`), `${HTML}: poster cache-bust ${CACHE_BUST}`);
log((html.match(/hero-iletisim\.mp4/g) || []).length === 1, `${HTML}: single video ref`);
log((html.match(/hero-iletisim-poster/g) || []).length === 1, `${HTML}: single poster ref`);

process.exit(failed ? 1 : 0);
