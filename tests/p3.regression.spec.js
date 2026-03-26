const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function readFromRepo(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

test.describe('P3 regression guards', () => {
  let ikHtml;
  let profilInboxJs;
  let adminEmployersJs;
  let adminCandidatesJs;
  let mig035;
  let mig036;
  let mig023;

  test.beforeAll(() => {
    ikHtml = readFromRepo('ik.html');
    profilInboxJs = readFromRepo('profil-inbox.js');
    adminEmployersJs = readFromRepo('admin-employers.js');
    adminCandidatesJs = readFromRepo('admin-candidates.js');
    mig035 = readFromRepo('docs/migrations/035_profile_completion_threshold.sql');
    mig036 = readFromRepo('docs/migrations/036_profile_completion_sync.sql');
    mig023 = readFromRepo('docs/migrations/023_admin_read_policies.sql');
  });

  test('candidate cards use DOM builder without unsafe template path', () => {
    expect(ikHtml).toContain('buildCandidateCard(c)');
    expect(ikHtml).toContain('function buildCandidateCard');
    expect(ikHtml).not.toContain('candidateCardHTML');
    expect(ikHtml).not.toMatch(/innerHTML\s*=\s*candidateCardHTML\s*\(/);

    // Both candidate list and favorites should render via the same safe builder.
    const builderCalls = ikHtml.match(/appendChild\(\s*buildCandidateCard\(c\)\s*\)/g) || [];
    expect(builderCalls.length).toBeGreaterThanOrEqual(2);
  });

  test('lokasyon feedback helpers exist and are wired to errors', () => {
    expect(ikHtml).toContain('id="lokasyon-msg"');
    expect(ikHtml).toContain('role="status"');
    expect(ikHtml).toContain('aria-live="polite"');
    expect(ikHtml).toContain('function showLokasyonMessage');
    expect(ikHtml).toContain('function clearLokasyonMessage');

    const addStart = ikHtml.indexOf('async function addLokasyon');
    const removeStart = ikHtml.indexOf('async function removeLokasyon');
    const removeEnd = ikHtml.indexOf('// ── ŞİFRE GÜNCELLE', removeStart);
    const addSection = ikHtml.slice(addStart, removeStart);
    const removeSection = ikHtml.slice(removeStart, removeEnd);

    expect(addSection).toMatch(/showLokasyonMessage\([\s\S]*'error'/);
    expect(removeSection).toMatch(/showLokasyonMessage\([\s\S]*'error'/);
    expect(addSection).toContain('Lokasyon eklenirken bir hata oluştu');
    expect(removeSection).toContain('Lokasyon silinirken bir hata oluştu');
  });

  test('profil inbox keeps employer message query + mark read rpc', () => {
    expect(profilInboxJs).toContain(".from('employer_messages')");
    expect(profilInboxJs).toContain(".rpc('mark_message_read'");
  });

  test('admin employers premium count remains null-safe', () => {
    expect(adminEmployersJs).toContain("var premiumCount = (queries[9] && queries[9].count) || 0;");
  });

  test('followers and live candidates use >=45 threshold instead of hard profile_completed filter', () => {
    expect(ikHtml).not.toContain(".eq('profile_completed', true);");
    expect(ikHtml.indexOf('profile_completion_pct.gte.45') !== -1).toBe(true);
  });

  test('profile completion migrations define threshold + sync function and triggers', () => {
    expect(mig035).toContain('profile_completion_pct int NOT NULL DEFAULT 0');
    expect(mig035).toContain('candidates_profile_completion_pct_check');
    expect(mig036).toContain('compute_candidate_profile_completion');
    expect(mig036).toContain('refresh_candidate_profile_completion');
    expect(mig036).toContain('TRIGGER trg_candidates_profile_completion');
  });

  test('036 candidates trigger is recursion-safe and score uses normalized location', () => {
    expect(mig036).toContain('pg_trigger_depth');
    expect(mig036).toContain('candidate_location_preferences');
    expect(mig036.indexOf('candidate_location_preferences') < mig036.indexOf('RETURN score')).toBe(true);
    expect(mig036).not.toContain('p_tercih_sehirler');
  });

  test('036 includes one-shot full re-sync for existing candidates', () => {
    expect(mig036).toContain('FOR r IN SELECT id FROM candidates LOOP');
    expect(mig036).toContain('refresh_candidate_profile_completion(r.id)');
  });

  test('admin read policies are enforced idempotently for analytics', () => {
    expect(mig023).toContain('CREATE POLICY hr_admin_read ON hr_profiles');
    expect(mig023).toContain('CREATE POLICY candidates_admin_read ON candidates');
    expect(mig023).toContain('CREATE POLICY companies_admin_read ON companies');
    expect(mig036).toContain('DROP POLICY IF EXISTS hr_admin_read ON hr_profiles');
    expect(mig036).toContain('DROP POLICY IF EXISTS candidates_admin_read ON candidates');
  });
});

test.describe('P3 visibility & analytics regression', () => {
  let ikHtml;
  let adminCandidatesJs;

  test.beforeAll(() => {
    ikHtml = readFromRepo('ik.html');
    adminCandidatesJs = readFromRepo('admin-candidates.js');
  });

  test('IK panel uses >=45 threshold for canlı adaylar', () => {
    expect(ikHtml).toContain('async function loadLiveCandidates');
    expect(ikHtml.indexOf('profile_completion_pct.gte.45') !== -1).toBe(true);
    expect(ikHtml).toContain('async function loadDashboardStats');
  });

  test('admin candidates splits completed vs incomplete clearly', () => {
    expect(adminCandidatesJs).toContain("Profili Tamamlananlar");
    expect(adminCandidatesJs).toContain("Profili Yarım Kalanlar");
    expect(adminCandidatesJs).toContain("Önerilebilir (≥%45)");
    expect(adminCandidatesJs).toContain("Önerilebilir ama Tamamlanmamış");
  });
});

// ═══════════════════════════════════════════════════════════════
// Sprint 4: Copy quality, typography & accessibility regression
// ═══════════════════════════════════════════════════════════════
test.describe('Sprint 4 — copy quality & accessibility', () => {
  let profilHtml;
  let profilCss;
  let profilUiJs;
  let profilSettingsJs;

  test.beforeAll(() => {
    profilHtml = readFromRepo('profil.html');
    profilCss = readFromRepo('profil.css');
    profilUiJs = readFromRepo('profil-ui.js');
    profilSettingsJs = readFromRepo('profil-settings.js');
  });

  test('no ASCII-only Turkish text in user-facing strings', () => {
    // These broken forms must never appear in HTML labels/text
    expect(profilHtml).not.toContain('Sec...');
    expect(profilHtml).not.toContain('Bastan Basla');
    expect(profilHtml).not.toContain('>Musaitlik<');
    expect(profilHtml).not.toContain('>Ilgilendigin');
    expect(profilHtml).not.toContain('Il sec...');
    expect(profilHtml).not.toContain('Once il secin');
    expect(profilHtml).not.toContain('>Yeni Sifre<');
    expect(profilHtml).not.toContain('Sifreyi tekrarlayin');
    // JS files
    expect(profilUiJs).not.toContain("'Ilce sec...'");
    expect(profilUiJs).not.toContain("'Guncellendi!'");
    expect(profilSettingsJs).not.toContain('Sifre en az');
    expect(profilSettingsJs).not.toContain('Sifreler eslesmedi');
    expect(profilSettingsJs).not.toContain('basariyla guncellendi');
    expect(profilSettingsJs).not.toContain('Oturum bulunamadi');
    expect(profilSettingsJs).not.toContain('Kayit guncellenemedi');
  });

  test('no English UI labels (Dashboard, Menu, retail)', () => {
    // Bottom nav and sidebar should use Turkish
    expect(profilHtml).not.toMatch(/>\s*Dashboard\s*</);
    expect(profilHtml).not.toMatch(/>\s*Menu\s*</);
    expect(profilHtml).not.toContain('retail markaları');
  });

  test('no duplicate class attributes in HTML', () => {
    // Duplicate class= on same element is invalid HTML
    var duplicateClassPattern = /class="[^"]*"[^>]*class="/;
    var violations = [];
    profilHtml.split('\n').forEach(function(line, i) {
      if (duplicateClassPattern.test(line)) violations.push(i + 1);
    });
    expect(violations).toEqual([]);
  });

  test('no inline onclick handlers', () => {
    expect(profilHtml).not.toMatch(/onclick="/);
  });

  test('command palette modal has role=dialog', () => {
    expect(profilHtml).toMatch(/id="modal-cmdk"[^>]*role="dialog"/);
  });

  test('header icons are semantic buttons', () => {
    expect(profilHtml).toMatch(/<button[^>]*class="header-msg"/);
    expect(profilHtml).toMatch(/<button[^>]*class="header-notif"/);
  });

  test('mk-cards are semantic buttons with data-step', () => {
    var mkButtons = profilHtml.match(/<button[^>]*class="mk-card[^"]*"[^>]*data-step="/g) || [];
    expect(mkButtons.length).toBe(4);
    // No inline onclick on mk-cards
    var mkOnclick = profilHtml.match(/mk-card[^>]*onclick=/g) || [];
    expect(mkOnclick.length).toBe(0);
  });

  test('CSS has no font-size below 10px', () => {
    var subTenMatches = profilCss.match(/font-size:\s*[0-9]px/g) || [];
    expect(subTenMatches).toEqual([]);
  });

  test('bento grid and locked-card styling exist (locked class optional in HTML)', () => {
    expect(profilHtml).toContain('class="mk-bento-grid"');
    // .locked may be used for future/disabled tiles; rule must stay for when markup uses it
    expect(profilCss).toContain('.bento-card.locked');
  });
});

// ═══════════════════════════════════════════════════════════════
// Support Center (Destek Merkezi) structural guards
// ═══════════════════════════════════════════════════════════════
test.describe('Support Center — structural guards', () => {
  let profilDeskJs;
  let profilHtml;

  test.beforeAll(() => {
    profilDeskJs = readFromRepo('profil-destek.js');
    profilHtml = readFromRepo('profil.html');
  });

  test('support center uses IIFE pattern with lazy loader', () => {
    expect(profilDeskJs).toMatch(/^\(function\(\)\s*\{/m);
    expect(profilDeskJs).toContain('window._htLoadDestek');
    expect(profilDeskJs).toContain("var _loaded = false");
  });

  test('profil.html has panel-destek shell and script tag', () => {
    expect(profilHtml).toContain('id="panel-destek"');
    expect(profilHtml).toContain('profil-destek.js');
  });

  test('no merged Mesajlar ve Teklifler category — must be separate UI categories', () => {
    // The merged label must not appear anywhere as a UI category
    expect(profilDeskJs).not.toContain("'Mesajlar ve Teklifler'");
    expect(profilDeskJs).not.toContain("'Mesajlar ve Kampanyalar'");
    // Separate UI categories must exist
    expect(profilDeskJs).toMatch(/mesajlar:\s*'/);
    expect(profilDeskJs).toMatch(/teklifler:\s*'/);
  });

  test('getUiCategory helper exists and routes articles by slug', () => {
    expect(profilDeskJs).toContain('function getUiCategory(');
    expect(profilDeskJs).toContain('SLUG_TO_UI_CAT');
    expect(profilDeskJs).toContain("'mesajlarim-nasil-calisir'");
  });

  test('uiCatToDbCat maps UI keys back to DB category for ticket submit', () => {
    expect(profilDeskJs).toContain('function uiCatToDbCat(');
    expect(profilDeskJs).toContain("'mesajlar_teklifler'");
    // submitTicket must call uiCatToDbCat before RPC
    expect(profilDeskJs).toContain('uiCatToDbCat(catUiVal)');
  });

  test('ticket form iterates UI_CATEGORIES not merged CATEGORIES', () => {
    expect(profilDeskJs).toContain('Object.keys(UI_CATEGORIES)');
    // Must not iterate a merged CATEGORIES for dropdown
    expect(profilDeskJs).not.toMatch(/Object\.keys\(CATEGORIES\)/);
  });

  test('article detail has breadcrumb bar for return navigation', () => {
    expect(profilDeskJs).toContain('da-breadcrumb-bar');
    expect(profilDeskJs).toContain('da-breadcrumb-back');
    expect(profilDeskJs).toContain("Makalelere D");
  });

  test('article list uses bento-style category grid', () => {
    expect(profilDeskJs).toContain('da-cat-grid');
    expect(profilDeskJs).toContain('da-cat-card');
    expect(profilDeskJs).toContain('CATEGORY_DESCRIPTIONS');
  });

  test('no console.log in support center code', () => {
    // Only console.error allowed
    expect(profilDeskJs).not.toMatch(/console\.log\(/);
  });

  test('hero follows bento spec with 24px radius', () => {
    expect(profilDeskJs).toContain('border-radius:24px');
    expect(profilDeskJs).toContain("font-weight:800");
    expect(profilDeskJs).toContain("font-size:20px");
  });

  test('ticket creation uses RPC not direct insert', () => {
    expect(profilDeskJs).toContain(".rpc('create_support_ticket'");
    expect(profilDeskJs).not.toContain(".from('support_tickets').insert");
  });

  test('responsive breakpoint at 600px exists', () => {
    expect(profilDeskJs).toContain('@media (max-width:600px)');
    // iOS zoom prevention: 16px font-size on inputs
    expect(profilDeskJs).toContain('font-size:16px');
  });

  test('article CTA prefill updates subject placeholder after setting category', () => {
    // CTA sets UI category on dt-category, then refreshes subject hint
    expect(profilDeskJs).toContain("catSel.value = artUiCat");
    expect(profilDeskJs).toContain("SUBJECT_HINTS[artUiCat]");
    expect(profilDeskJs).toContain("document.getElementById('dt-subject')");
  });

  test('no unsupported markdown table syntax in article migration', () => {
    var migrationSql = readFromRepo('supabase/migrations/20260326103000_support_articles_content_polish.sql');
    // Pipe-delimited table rows are not supported by renderSimpleMarkdown
    var tableRowPattern = /\|\s*\w+.*\|\s*\w+.*\|/;
    var lines = migrationSql.split('\n');
    var tableLines = lines.filter(function(line) {
      // Skip SQL comments and separator lines
      if (line.trim().startsWith('--')) return false;
      if (/^\s*\|[-:]+\|/.test(line)) return false;
      return tableRowPattern.test(line);
    });
    expect(tableLines).toEqual([]);
  });

  test('article copy uses real UI labels (Teklifler/Özel Teklifler, not Kampanyalar panel)', () => {
    var migrationSql = readFromRepo('supabase/migrations/20260326103000_support_articles_content_polish.sql');
    expect(migrationSql).toContain('\u00D6zel Teklifler');
    expect(migrationSql).toContain('Teklifler panel');
    expect(migrationSql).not.toContain('Kampanyalar paneli');
    expect(migrationSql).not.toMatch(/Kampanyalar.*paneline/);
  });

  test('separate subject hints for mesajlar and teklifler', () => {
    // SUBJECT_HINTS must have distinct keys, not a merged key
    expect(profilDeskJs).toMatch(/mesajlar:\s*'/);
    expect(profilDeskJs).toMatch(/teklifler:\s*'/);
    expect(profilDeskJs).not.toMatch(/mesajlar_teklifler:\s*'.*\u00D6r/);
  });

  test('ui_topic migration adds nullable column and updated RPC', () => {
    var migSql = readFromRepo('supabase/migrations/20260326113000_support_ticket_ui_topic.sql');
    // Column
    expect(migSql).toContain('ADD COLUMN IF NOT EXISTS ui_topic text');
    expect(migSql).toContain("ui_topic IN ('mesajlar', 'teklifler')");
    // RPC has p_ui_topic parameter
    expect(migSql).toContain('p_ui_topic text DEFAULT NULL');
    // INSERT stores ui_topic
    expect(migSql).toMatch(/INSERT INTO support_tickets[\s\S]*ui_topic/);
    expect(migSql).toMatch(/VALUES[\s\S]*p_ui_topic/);
  });

  test('frontend passes p_ui_topic in RPC call', () => {
    expect(profilDeskJs).toContain('p_ui_topic: uiTopic');
    // uiTopic is computed from catUiVal when dbCat is mesajlar_teklifler
    expect(profilDeskJs).toContain("dbCat === 'mesajlar_teklifler'");
  });

  test('ticket query selects ui_topic column', () => {
    expect(profilDeskJs).toContain('ui_topic');
    expect(profilDeskJs).toMatch(/\.select\([^)]*ui_topic/);
  });

  test('ticket display prefers ui_topic via ticketCategoryLabel', () => {
    expect(profilDeskJs).toContain('function ticketCategoryLabel(');
    expect(profilDeskJs).toContain('ticket.ui_topic');
    expect(profilDeskJs).toContain('ticketCategoryLabel(t)');
    expect(profilDeskJs).toContain('ticketCategoryLabel(ticket)');
  });

  test('ui_topic integrity migration exists with compound CHECK and sanitized RPC', () => {
    var migSql = readFromRepo('supabase/migrations/20260326120000_support_ticket_ui_topic_integrity.sql');

    // 1. Data sanitization before constraint tightening
    expect(migSql).toContain("category <> 'mesajlar_teklifler'");
    expect(migSql).toContain('SET ui_topic = NULL');

    // 2. Compound CHECK — ui_topic only valid with mesajlar_teklifler
    expect(migSql).toContain("category = 'mesajlar_teklifler'");
    expect(migSql).toContain("ui_topic IN ('mesajlar', 'teklifler')");
    // Must be a compound CHECK, not just value-only
    expect(migSql).toMatch(/CHECK\s*\(\s*\n?\s*ui_topic IS NULL\s*\n?\s*OR\s*\(\s*\n?\s*category\s*=/);

    // 3. RPC uses v_ui_topic local variable, not raw p_ui_topic in INSERT
    expect(migSql).toContain('v_ui_topic text');
    expect(migSql).toContain('v_ui_topic :=');
    // INSERT must use v_ui_topic
    expect(migSql).toMatch(/VALUES[\s\S]*v_ui_topic/);
    // INSERT must NOT use raw p_ui_topic
    var insertBlock = migSql.slice(migSql.indexOf('INSERT INTO support_tickets'));
    var returningIdx = insertBlock.indexOf('RETURNING');
    var insertValues = insertBlock.slice(0, returningIdx);
    expect(insertValues).not.toMatch(/,\s*p_ui_topic\s*\n/);

    // 4. RPC forces NULL for non-merged categories
    expect(migSql).toContain("p_category <> 'mesajlar_teklifler'");
    expect(migSql).toContain('v_ui_topic := NULL');

    // 5. RPC rejects invalid values with exception
    expect(migSql).toContain('RAISE EXCEPTION');
    expect(migSql).toContain('Gecersiz ui_topic');

    // 6. Email payload uses sanitized v_ui_topic
    expect(migSql).toContain("COALESCE(v_ui_topic, '')");
  });
});
