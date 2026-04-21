#!/usr/bin/env node
// Pass 10 #7 — index hash landing: footer nav click must scroll to top (hero)
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');

let failed = 0;
const log = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failed++; };

// Pass 10 #9 — hash-state logic moved from IIFE into applyHashState function.
const fnMatch = html.match(/function applyHashState\s*\(\)\s*\{[\s\S]*?\n\}/);
log(!!fnMatch, 'index.html: applyHashState function present');
const fn = fnMatch ? fnMatch[0] : '';

log(/if \(h === ['"]adaylar['"] \|\| h === ['"]kurumsal['"]\)[\s\S]*?window\.scrollTo\(0, 0\)/.test(fn),
    'applyHashState: segment-hash landing triggers window.scrollTo(0, 0)');

log(/switchSeg\(['"]kurumsal['"], true\)/.test(fn), 'switchSeg kurumsal skipScroll preserved');
log(/switchSeg\(['"]adaylar['"], true\)/.test(fn), 'switchSeg adaylar skipScroll preserved');

const footerNav = html.match(/<nav class="foot-nav"[\s\S]*?<\/nav>/);
log(!!footerNav, 'footer nav present');
log(!!footerNav && footerNav[0].includes('index.html#adaylar'), 'footer Aday → #adaylar');
log(!!footerNav && footerNav[0].includes('index.html#kurumsal'), 'footer Kurumsal → #kurumsal');

process.exit(failed ? 1 : 0);
