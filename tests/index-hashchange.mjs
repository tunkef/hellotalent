#!/usr/bin/env node
// Pass 10 #9 — index.html in-page hash switch: hashchange listener + same-hash click
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');

let failed = 0;
const log = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failed++; };

// Structural assertions on the refactored IIFE + applyHashState.
log(/function applyHashState\s*\(\)/.test(html), 'applyHashState function extracted');
log(/window\.addEventListener\(['"]hashchange['"],\s*applyHashState\)/.test(html),
    'hashchange listener registered');
log(/document\.addEventListener\(['"]click['"]/.test(html), 'click interceptor present');
log(/#\(adaylar\|kurumsal\)/.test(html), 'click matcher covers adaylar|kurumsal hashes');
log(/applyHashState\(\);\s*\/\/\s*same hash/.test(html),
    'same-hash branch calls applyHashState (force re-apply)');
log(/location\.hash\s*=\s*seg/.test(html), 'different-hash branch sets location.hash');

// Preserve existing load-time + scroll-to-top behavior
log(/applyHashState\(\);\s*\n\s*\/\/ Pass 10 #9 — hashchange/.test(html),
    'applyHashState invoked on initial load');
log(/switchSeg\(['"]kurumsal['"], true\)/.test(html), 'switchSeg kurumsal skipScroll preserved');
log(/switchSeg\(['"]adaylar['"], true\)/.test(html), 'switchSeg adaylar skipScroll preserved');
log(/window\.scrollTo\(0, 0\)/.test(html), 'scrollTo(0,0) preserved');

// No leftover old IIFE-scope var h
log(!/\(function \(\) \{\s*var h = \(window\.location\.hash/.test(html),
    'old hash-parsing IIFE removed (refactored into applyHashState)');

process.exit(failed ? 1 : 0);
