#!/usr/bin/env node
// Pass 10 #5 — footer links (Aday/Kurumsal → index segments, Hakkimizda/Iletisim/Yasal)
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HTML_FILES = ['index.html', 'hakkimizda.html', 'iletisim.html', 'yasal.html'];

let failed = 0;
const log = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failed++;
};

for (const f of HTML_FILES) {
  const body = readFileSync(resolve(ROOT, f), 'utf8');
  const footerMatch = body.match(/<nav class="foot-nav"[\s\S]*?<\/nav>/);
  if (!footerMatch) { log(false, `${f}: foot-nav not found`); continue; }
  const footer = footerMatch[0];
  log(/href="index\.html#adaylar"[^>]*>\s*Aday\s*</.test(footer), `${f}: Aday -> index.html#adaylar`);
  log(/href="index\.html#kurumsal"[^>]*>\s*Kurumsal\s*</.test(footer), `${f}: Kurumsal -> index.html#kurumsal`);
  log(/href="hakkimizda\.html"[^>]*>\s*Hakkımızda\s*</.test(footer), `${f}: Hakkımızda -> hakkimizda.html`);
  log(/href="iletisim\.html"[^>]*>\s*İletişim\s*</.test(footer), `${f}: İletişim -> iletisim.html`);
  log(/href="yasal\.html"[^>]*>\s*Yasal Bilgiler\s*</.test(footer), `${f}: Yasal Bilgiler -> yasal.html`);
  log(!/giris\.html\?tab=aday/.test(footer), `${f}: no stale giris?tab=aday in footer`);
  log(!/giris\.html\?tab=ik/.test(footer), `${f}: no stale giris?tab=ik in footer`);
}

process.exit(failed ? 1 : 0);
