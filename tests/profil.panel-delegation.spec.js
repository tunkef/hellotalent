const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Ayarlar / Merkez toggler: document-level [data-panel] delegation was matching
 * <main class="panel" data-panel="…"> on inner clicks, re-running switchPanel and
 * resetting checkboxes from _loadedDBData. Guard must sit before panelName/switchPanel.
 */
test.describe('profil.html — panel [data-panel] delegation', () => {
  let html;

  test.beforeAll(() => {
    html = fs.readFileSync(path.join(__dirname, '..', 'profil.html'), 'utf8');
  });

  test('closest [data-panel] handler ignores main.panel roots', () => {
    const marker = "e.target.closest('[data-panel]')";
    const i = html.indexOf(marker);
    expect(i, 'document click delegation block present').toBeGreaterThan(-1);
    const block = html.slice(i, i + 900);
    expect(block).toContain("el.tagName === 'MAIN'");
    const guardIdx = block.indexOf("contains('panel')) return");
    const panelNameIdx = block.indexOf("var panelName");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(panelNameIdx).toBeGreaterThan(-1);
    expect(panelNameIdx).toBeGreaterThan(guardIdx);
  });
});
