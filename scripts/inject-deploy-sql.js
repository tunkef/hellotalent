#!/usr/bin/env node
/**
 * Reads docs/migrations/deploy_032_036_combined.sql and outputs a single line
 * to paste in Supabase SQL Editor page → DevTools Console:
 *   window.monaco?.editor?.getEditors?.()?.[0]?.setValue(<json>);
 */
var fs = require('fs');
var path = require('path');
var sqlPath = path.join(__dirname, '..', 'docs', 'migrations', 'deploy_032_036_combined.sql');
var sql = fs.readFileSync(sqlPath, 'utf8');
var oneLiner = 'window.monaco?.editor?.getEditors?.()?.[0]?.setValue(' + JSON.stringify(sql) + ');';
console.log(oneLiner);
