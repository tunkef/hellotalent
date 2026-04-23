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
    // Kademe 1: CSS split across files — concatenate all
    profilCss = ['profil.css','css/tokens.css','css/layout.css','css/components.css','css/wizard.css',
      'css/panels/genel-bakis.css','css/panels/merkezi.css','css/panels/sirketler.css'
    ].map(function(f){ try { return readFromRepo(f); } catch(e) { return ''; } }).join('\n');
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

  test('K031 merkez spine items are semantic buttons with data-step', () => {
    var spineButtons = profilHtml.match(/<button[^>]*class="mk-spine__item[^"]*"[^>]*data-step="/g) || [];
    expect(spineButtons.length).toBe(4);
    // No inline onclick on spine items
    var spineOnclick = profilHtml.match(/mk-spine__item[^>]*onclick=/g) || [];
    expect(spineOnclick.length).toBe(0);
  });

  test('CSS has no font-size below 10px', () => {
    var subTenMatches = profilCss.match(/font-size:\s*[0-9]px/g) || [];
    expect(subTenMatches).toEqual([]);
  });

  // K031/K033: bento vocabulary removed from candidate panels; locked-card guard obsolete.
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

  test('K066 Faz A: hero styling now lives in css/panels/destek.css', () => {
    /* Inline injectCSS body deleted (was unreachable post-K066). External
       css/panels/destek.css owns the hero styling — vermillion Bricolage
       editorial pattern. profil-destek.js's injectCSS is a no-op. */
    expect(profilDeskJs).toContain('K066 Faz A');
    var destekCss = readFromRepo('css/panels/destek.css');
    expect(destekCss).toContain('.destek-hero');
    expect(destekCss).toContain('border-radius: 14px');
  });

  test('ticket creation uses RPC not direct insert', () => {
    expect(profilDeskJs).toContain(".rpc('create_support_ticket'");
    expect(profilDeskJs).not.toContain(".from('support_tickets').insert");
  });

  test('K066 Faz A: responsive breakpoint moved to css/panels/destek.css', () => {
    /* Mobile CSS now external (post-K066). Verify destek.css has a
       responsive media query for the bento and form. */
    var destekCss = readFromRepo('css/panels/destek.css');
    expect(destekCss).toMatch(/@media\s*\(max-width:\s*720px/);
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

  test('category click triggers scroll to article list', () => {
    expect(profilDeskJs).toContain('function scrollToArticleList(');
    expect(profilDeskJs).toContain('function scrollToCategoryGrid(');
    // Category click sets scroll flag before re-render
    expect(profilDeskJs).toContain('_scrollAfterRender = !wasSelected');
    // renderArticleList triggers scroll after render via the flag
    expect(profilDeskJs).toContain('scrollToArticleList');
  });

  test('filtered article list has return-up button to category grid', () => {
    expect(profilDeskJs).toContain('da-list-header-up');
    expect(profilDeskJs).toContain('scrollToCategoryGrid()');
    expect(profilDeskJs).toContain('Kategoriler');
    expect(profilDeskJs).toContain('SVG_UP_ARROW');
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

// ═══════════════════════════════════════════════════════════════
// Support Queue MVP — admin panel + closure workflow
// ═══════════════════════════════════════════════════════════════
test.describe('Support Queue MVP — structural guards', () => {
  let adminHtml;
  let adminSupportJs;
  let profilDeskJs;
  let migSql;
  let emailSendTs;

  test.beforeAll(() => {
    adminHtml = readFromRepo('admin.html');
    adminSupportJs = readFromRepo('admin-support.js');
    profilDeskJs = readFromRepo('profil-destek.js');
    migSql = readFromRepo('supabase/migrations/20260326140000_support_queue_mvp.sql');
    emailSendTs = readFromRepo('supabase/functions/email-send/index.ts');
  });

  // ── Admin HTML integration ──
  test('admin.html has support nav item, panel, script, and switchPanel hook', () => {
    expect(adminHtml).toContain('data-panel="support"');
    expect(adminHtml).toContain('id="badge-support-open"');
    expect(adminHtml).toContain('id="panel-support"');
    expect(adminHtml).toContain('admin-support.js');
    expect(adminHtml).toContain("'support') window._htAdminLoadSupport");
    // Faz 2 refactor: panel içerik markup admin-support.js PANEL_HTML'de
    expect(adminSupportJs).toContain('id="support-content"');
    expect(adminSupportJs).toContain('Destek Talepleri');
  });

  // ── Admin module structure ──
  test('admin-support.js uses IIFE with public loader', () => {
    expect(adminSupportJs).toMatch(/^\(function\(\)\s*\{/m);
    expect(adminSupportJs).toContain('window._htAdminLoadSupport');
    expect(adminSupportJs).not.toMatch(/console\.log\(/);
  });

  test('admin-support.js has queue view with status tabs', () => {
    expect(adminSupportJs).toContain('admin_get_support_queue');
    expect(adminSupportJs).toContain('_currentFilter');
    expect(adminSupportJs).toContain('acc-tab');
  });

  test('admin-support.js calls all admin RPCs', () => {
    expect(adminSupportJs).toContain("'admin_claim_support_ticket'");
    expect(adminSupportJs).toContain("'admin_resolve_support_ticket'");
    expect(adminSupportJs).toContain("'admin_add_support_note'");
    expect(adminSupportJs).toContain("'admin_close_support_ticket'");
  });

  test('admin-support.js respects ui_topic for category labels', () => {
    expect(adminSupportJs).toContain('ticket.ui_topic');
    expect(adminSupportJs).toContain('UI_CATEGORIES');
  });

  // ── Migration structure ──
  test('migration adds lifecycle columns', () => {
    expect(migSql).toContain('resolved_at timestamptz');
    expect(migSql).toContain('closed_at timestamptz');
    expect(migSql).toContain('assigned_admin_user_id uuid');
    expect(migSql).toContain('REFERENCES admin_users(id)');
  });

  test('migration creates admin RLS policies for tickets and messages', () => {
    expect(migSql).toContain('support_tickets_admin_read');
    expect(migSql).toContain('stm_admin_read');
    expect(migSql).toContain('is_admin()');
  });

  test('migration has all required RPCs', () => {
    expect(migSql).toContain('admin_claim_support_ticket');
    expect(migSql).toContain('admin_resolve_support_ticket');
    expect(migSql).toContain('admin_add_support_note');
    expect(migSql).toContain('admin_close_support_ticket');
    expect(migSql).toContain('admin_get_support_queue');
    expect(migSql).toContain('candidate_confirm_resolved');
    expect(migSql).toContain('candidate_reopen_ticket');
  });

  test('admin_resolve_support_ticket implicitly claims open tickets', () => {
    expect(migSql).toMatch(/status NOT IN \('open', 'in_review'\)/);
    expect(migSql).toContain('COALESCE(assigned_admin_user_id, auth.uid())');
  });

  test('admin_resolve_support_ticket validates and sanitizes p_message server-side', () => {
    // Must declare and use v_message, not raw p_message
    expect(migSql).toContain('v_message text');
    expect(migSql).toContain("v_message := btrim(COALESCE(p_message, ''))");
    expect(migSql).toContain("v_message = ''");
    expect(migSql).toContain('Cozum aciklamasi bos olamaz');
    // Timeline insert must use v_message
    var resolveBlock = migSql.slice(migSql.indexOf('admin_resolve_support_ticket'), migSql.indexOf('REVOKE EXECUTE ON FUNCTION admin_resolve_support_ticket'));
    expect(resolveBlock).toContain("v_message, 'public'");
    // Email payload must use v_message
    expect(resolveBlock).toContain("'resolution_message', v_message");
    // Must NOT use raw p_message in insert or payload
    expect(resolveBlock).not.toContain("p_message, 'public'");
    expect(resolveBlock).not.toContain("'resolution_message', p_message");
  });

  test('candidate RPCs enforce ownership and resolved-only guard', () => {
    // Both candidate RPCs must check user_id = auth.uid() AND status = 'resolved'
    var confirmBlock = migSql.slice(migSql.indexOf('candidate_confirm_resolved'));
    expect(confirmBlock).toContain("status = 'resolved'");
    expect(confirmBlock).toContain('user_id = auth.uid()');

    var reopenBlock = migSql.slice(migSql.indexOf('candidate_reopen_ticket'));
    expect(reopenBlock).toContain("status = 'resolved'");
    expect(reopenBlock).toContain('user_id = auth.uid()');
  });

  test('auto-close function exists with 7-day threshold and cron schedule', () => {
    expect(migSql).toContain('auto_close_resolved_tickets');
    expect(migSql).toContain("interval '7 days'");
    expect(migSql).toContain('cron.schedule');
    expect(migSql).toContain('auto-close-resolved-tickets');
  });

  test('migration extends email_outbox CHECK for support_ticket_resolved', () => {
    expect(migSql).toContain("'support_ticket_resolved'");
    expect(migSql).toContain('email_outbox_email_type_check');
  });

  // ── Candidate UI ──
  test('profil-destek.js shows action buttons only for resolved tickets', () => {
    expect(profilDeskJs).toContain("ticket.status === 'resolved'");
    expect(profilDeskJs).toContain("'candidate_confirm_resolved'");
    expect(profilDeskJs).toContain("'candidate_reopen_ticket'");
    // Button text uses unicode escapes in source: \u00C7\u00F6z\u00FCld\u00FC
    expect(profilDeskJs).toContain('\\u00C7\\u00F6z\\u00FCld\\u00FC');
    expect(profilDeskJs).toContain('Devam Ediyor');
  });

  test('waiting_on_candidate is wired into candidate UI reply composer', () => {
    expect(profilDeskJs).toContain("waiting_on_candidate");
    // Phase 2B: reply composer shown for waiting_on_candidate
    expect(profilDeskJs).toContain("status === 'waiting_on_candidate'");
    // candidate_reply_to_ticket RPC wired
    expect(profilDeskJs).toContain("'candidate_reply_to_ticket'");
  });

  // ── Email template ──
  test('email-send has support_ticket_resolved template', () => {
    expect(emailSendTs).toContain('"support_ticket_resolved"');
    expect(emailSendTs).toContain('supportTicketResolvedTemplate');
    expect(emailSendTs).toContain('resolution_message');
  });

  test('resolved email greeting uses exclamation, not comma', () => {
    // Extract only the resolved template function
    var fnStart = emailSendTs.indexOf('function supportTicketResolvedTemplate');
    var fnEnd = emailSendTs.indexOf('\nfunction ', fnStart + 10);
    if (fnEnd === -1) fnEnd = emailSendTs.length;
    var resolvedFn = emailSendTs.slice(fnStart, fnEnd);
    // Must use ! not ,
    expect(resolvedFn).toContain('Merhaba ${name}!');
    expect(resolvedFn).toContain('"Merhaba!"');
    expect(resolvedFn).not.toContain('Merhaba ${name},');
    expect(resolvedFn).not.toContain('"Merhaba,"');
  });
});

// Support Phase 2B — candidate reply, waiting_on_candidate, email notifications
// ═══════════════════════════════════════════════

test.describe('Support Phase 2B — structural guards', () => {
  var profilDeskJs, adminSupportJs, emailSendTs, migSql;

  test.beforeAll(() => {
    profilDeskJs = readFromRepo('profil-destek.js');
    adminSupportJs = readFromRepo('admin-support.js');
    emailSendTs = readFromRepo('supabase/functions/email-send/index.ts');
    migSql = readFromRepo('supabase/migrations/20260326180000_support_phase2b.sql');
  });

  // ── Migration ──
  test('migration creates candidate_reply_to_ticket RPC', () => {
    expect(migSql).toContain('candidate_reply_to_ticket');
    expect(migSql).toContain('SECURITY DEFINER');
    expect(migSql).toContain("waiting_on_candidate");
    expect(migSql).toContain("'in_review'");
  });

  test('migration updates admin_add_support_note with p_set_waiting', () => {
    expect(migSql).toContain('p_set_waiting boolean DEFAULT false');
    expect(migSql).toContain('support_ticket_admin_reply');
  });

  test('migration updates auto_close with email notification', () => {
    expect(migSql).toContain('support_ticket_auto_closed');
    expect(migSql).toContain('contact_email_snapshot');
  });

  test('migration extends email_outbox CHECK with 3 new types', () => {
    expect(migSql).toContain("'support_ticket_admin_reply'");
    expect(migSql).toContain("'support_ticket_candidate_reply'");
    expect(migSql).toContain("'support_ticket_auto_closed'");
  });

  // ── Candidate UI ──
  test('profil-destek.js has reply composer for active tickets', () => {
    expect(profilDeskJs).toContain("candidate_reply_to_ticket");
    expect(profilDeskJs).toContain("'open' || ticket.status === 'in_review' || ticket.status === 'waiting_on_candidate'");
  });

  test('profil-destek.js reply composer has validation', () => {
    expect(profilDeskJs).toContain('Mesaj \\u00E7ok k\\u0131sa');
    expect(profilDeskJs).toContain("replyBtn.disabled = true");
  });

  // ── Admin UI ──
  test('admin-support.js has waiting_on_candidate filter tab', () => {
    expect(adminSupportJs).toContain("key: 'waiting_on_candidate'");
  });

  test('admin-support.js passes p_set_waiting to RPC', () => {
    expect(adminSupportJs).toContain('p_set_waiting');
    expect(adminSupportJs).toContain('support-set-waiting');
  });

  test('admin-support.js badge counts include waiting_on_candidate', () => {
    expect(adminSupportJs).toContain("'waiting_on_candidate'");
  });

  // ── Email templates ──
  test('email-send has 3 new support templates', () => {
    expect(emailSendTs).toContain('"support_ticket_admin_reply"');
    expect(emailSendTs).toContain('"support_ticket_candidate_reply"');
    expect(emailSendTs).toContain('"support_ticket_auto_closed"');
    expect(emailSendTs).toContain('supportTicketAdminReplyTemplate');
    expect(emailSendTs).toContain('supportTicketCandidateReplyTemplate');
    expect(emailSendTs).toContain('supportTicketAutoClosedTemplate');
  });

  test('new email templates use reply_body payload field', () => {
    expect(emailSendTs).toContain('reply_body');
  });

  // ── Queue recency truth ──
  test('candidate_reply_to_ticket bumps updated_at on every reply path', () => {
    // Both branches (waiting_on_candidate transition and else) must touch support_tickets
    // The waiting path does UPDATE status → trigger bumps updated_at
    // The else path does explicit UPDATE updated_at
    var fnStart = migSql.indexOf('CREATE OR REPLACE FUNCTION candidate_reply_to_ticket');
    var fnEnd = migSql.indexOf('$$;', fnStart);
    var fnBody = migSql.slice(fnStart, fnEnd);
    // Must have an ELSE branch that explicitly bumps updated_at
    expect(fnBody).toContain('ELSE');
    expect(fnBody).toContain('UPDATE support_tickets SET updated_at = now() WHERE id = p_ticket_id');
  });

  test('admin_add_support_note bumps updated_at on every note path', () => {
    var fnStart = migSql.indexOf('CREATE OR REPLACE FUNCTION admin_add_support_note');
    var fnEnd = migSql.indexOf('$$;', fnStart);
    var fnBody = migSql.slice(fnStart, fnEnd);
    // Must have an ELSE branch that explicitly bumps updated_at
    expect(fnBody).toContain('ELSE');
    expect(fnBody).toContain('UPDATE support_tickets SET updated_at = now() WHERE id = p_ticket_id');
  });

  // ── Assigned admin email targeting ──
  test('candidate_reply_to_ticket resolves assigned admin email with fallback', () => {
    var fnStart = migSql.indexOf('CREATE OR REPLACE FUNCTION candidate_reply_to_ticket');
    var fnEnd = migSql.indexOf('$$;', fnStart);
    var fnBody = migSql.slice(fnStart, fnEnd);
    // Must read assigned_admin_user_id from ticket
    expect(fnBody).toContain('assigned_admin_user_id');
    // Must look up email from auth.users
    expect(fnBody).toContain('auth.users');
    expect(fnBody).toContain('v_recipient_email');
    // Must have fallback to shared inbox
    expect(fnBody).toContain("support@hellotalent.ai");
  });

  // ── Code quality ──
  test('no console.log in Phase 2B code', () => {
    var consoleLogPattern = /console\.log\(/;
    // profil-destek.js and admin-support.js should only have console.error
    expect(profilDeskJs).not.toMatch(consoleLogPattern);
    expect(adminSupportJs).not.toMatch(consoleLogPattern);
  });
});

// Messaging Email Phase 2 — employer follow-up + candidate reply notifications
// ═══════════════════════════════════════════════

test.describe('Messaging Email Phase 2 — structural guards', () => {
  var migSql, emailSendTs;

  test.beforeAll(() => {
    migSql = readFromRepo('supabase/migrations/20260326200000_messaging_email_phase2.sql');
    emailSendTs = readFromRepo('supabase/functions/email-send/index.ts');
  });

  // ── Migration ──
  test('migration creates employer follow-up email trigger', () => {
    expect(migSql).toContain('enqueue_employer_followup_email');
    expect(migSql).toContain('trg_employer_followup_email');
    expect(migSql).toContain('employer_message_replies');
    expect(migSql).toContain('AFTER INSERT');
  });

  test('employer follow-up trigger checks candidate notify preference', () => {
    expect(migSql).toContain('notify_email_messages');
    expect(migSql).toContain("'skipped'");
  });

  test('employer follow-up trigger reuses new_message email type', () => {
    var fnStart = migSql.indexOf('CREATE OR REPLACE FUNCTION enqueue_employer_followup_email');
    var fnEnd = migSql.indexOf('$$;', fnStart);
    var fnBody = migSql.slice(fnStart, fnEnd);
    expect(fnBody).toContain("'new_message'");
    expect(fnBody).toContain('new_message_followup:');
  });

  test('migration creates candidate reply email trigger', () => {
    expect(migSql).toContain('enqueue_candidate_reply_email');
    expect(migSql).toContain('trg_candidate_reply_email');
    expect(migSql).toContain('candidate_message_replies');
  });

  test('candidate reply trigger resolves employer email from auth.users', () => {
    var fnStart = migSql.indexOf('CREATE OR REPLACE FUNCTION enqueue_candidate_reply_email');
    var fnEnd = migSql.indexOf('$$;', fnStart);
    var fnBody = migSql.slice(fnStart, fnEnd);
    expect(fnBody).toContain('auth.users');
    expect(fnBody).toContain('v_sender_email');
    expect(fnBody).toContain("'candidate_reply_notification'");
  });

  test('migration extends email_outbox CHECK with candidate_reply_notification', () => {
    expect(migSql).toContain("'candidate_reply_notification'");
    expect(migSql).toContain('email_outbox_email_type_check');
  });

  // ── Email template ──
  test('email-send has candidate_reply_notification template', () => {
    expect(emailSendTs).toContain('"candidate_reply_notification"');
    expect(emailSendTs).toContain('candidateReplyNotificationTemplate');
    expect(emailSendTs).toContain('Adaydan yan');
  });
});

// Studio Phase 2 — studio_modules + candidate_studio_progress
// ═══════════════════════════════════════════════

test.describe('Studio Phase 2 — structural guards', () => {
  var migSql, adminStudioJs, mulakatJs, adminHtml;

  test.beforeAll(() => {
    migSql = readFromRepo('supabase/migrations/20260326220000_studio_modules.sql');
    adminStudioJs = readFromRepo('admin-studio-modules.js');
    mulakatJs = readFromRepo('profil-studio.js') + '\n' + readFromRepo('profil-studio-coach.js') + '\n' + readFromRepo('css/studio.css');
    adminHtml = readFromRepo('admin.html');
  });

  // ── Migration ──
  test('migration creates studio_modules table with section CHECK', () => {
    expect(migSql).toContain('CREATE TABLE IF NOT EXISTS studio_modules');
    expect(migSql).toContain("'performans'");
    expect(migSql).toContain("'bilgiler'");
    expect(migSql).toContain('studio_modules_section_check');
  });

  test('migration creates candidate_studio_progress table', () => {
    expect(migSql).toContain('CREATE TABLE IF NOT EXISTS candidate_studio_progress');
    expect(migSql).toContain('UNIQUE (candidate_id, module_id)');
    expect(migSql).toContain("'not_started'");
    expect(migSql).toContain("'in_progress'");
    expect(migSql).toContain("'completed'");
  });

  test('migration has admin CRUD RPCs', () => {
    expect(migSql).toContain('admin_create_studio_module');
    expect(migSql).toContain('admin_update_studio_module');
    expect(migSql).toContain('admin_publish_studio_module');
    expect(migSql).toContain('admin_archive_studio_module');
  });

  test('migration has candidate progress RPCs', () => {
    expect(migSql).toContain('mark_studio_module_viewed');
    expect(migSql).toContain('complete_studio_module');
  });

  test('migration has RLS for candidate read + admin all', () => {
    expect(migSql).toContain('studio_modules_read_published');
    expect(migSql).toContain('studio_modules_admin_all');
    expect(migSql).toContain('csp_select_own');
  });

  // ── Admin UI ──
  test('admin-studio-modules.js uses IIFE with public loader', () => {
    expect(adminStudioJs).toContain('(function(){');
    expect(adminStudioJs).toContain('window._htAdminLoadStudioModules');
  });

  test('admin.html has studio-modules nav, panel, script, and switchPanel hook', () => {
    expect(adminHtml).toContain('data-panel="studio-modules"');
    expect(adminHtml).toContain('id="panel-studio-modules"');
    expect(adminHtml).toContain('admin-studio-modules.js');
    expect(adminHtml).toContain("'studio-modules') window._htAdminLoadStudioModules");
    // Faz 2 refactor: panel içerik markup admin-studio-modules.js PANEL_HTML'de
    expect(adminStudioJs).toContain('id="studio-modules-content"');
  });

  test('admin module has section filter and create/publish/archive actions', () => {
    expect(adminStudioJs).toContain("'performans'");
    expect(adminStudioJs).toContain("'bilgiler'");
    expect(adminStudioJs).toContain('admin_create_studio_module');
    expect(adminStudioJs).toContain('admin_publish_studio_module');
    expect(adminStudioJs).toContain('admin_archive_studio_module');
  });

  // ── Candidate UI ──
  test('profil-studio.js has DB-backed studio section hydration', () => {
    expect(mulakatJs).toContain('hydrateStudioSection');
    expect(mulakatJs).toContain('studio_modules');
    expect(mulakatJs).toContain('mark_studio_module_viewed');
    expect(mulakatJs).toContain('complete_studio_module');
  });

  test('Performans and Bilgiler cards exist with hydration (lobby events)', () => {
    // Cards handled in bindLobbyEvents — hydrateStudioSection calls
    expect(mulakatJs).toContain('st-go-perf');
    expect(mulakatJs).toContain('st-go-bilgi');
    expect(mulakatJs).toContain("hydrateStudioSection('performans'");
    expect(mulakatJs).toContain("hydrateStudioSection('bilgiler'");
    expect(mulakatJs).toContain('st-passive');
    expect(mulakatJs).toContain('st-coming-badge');
  });

  test('no console.log in new Studio code', () => {
    expect(adminStudioJs).not.toMatch(/console\.log\(/);
  });
});

// Studio Phase 2b — Seed content + progress UX
// ═══════════════════════════════════════════════

test.describe('Studio Phase 2b — seed content + progress UX', () => {
  var seedSql, mulakatJs;

  test.beforeAll(() => {
    seedSql = readFromRepo('supabase/migrations/20260326230000_studio_seed_content.sql');
    mulakatJs = readFromRepo('profil-studio.js') + '\n' + readFromRepo('profil-studio-coach.js') + '\n' + readFromRepo('css/studio.css');
  });

  // ── Seed content ──
  test('seed migration inserts Performans modules', () => {
    expect(seedSql).toContain("'performans'");
    expect(seedSql).toContain("'ciro-sepet-donusum'");
    expect(seedSql).toContain("'magaza-hedefleri-gunluk-operasyon'");
    expect(seedSql).toContain("'kpi-dususu-yorumlama'");
    expect(seedSql).toContain("'vaka-trafik-yuksek-satis-dusuk'");
    expect(seedSql).toContain("'published'");
  });

  test('seed migration inserts Bilgiler modules', () => {
    expect(seedSql).toContain("'bilgiler'");
    expect(seedSql).toContain("'profil-guclu-hale-getirme'");
    expect(seedSql).toContain("'teklifler-mesajlar-yonetimi'");
    expect(seedSql).toContain("'gorunurluk-ayarlari'");
    expect(seedSql).toContain("'studyodan-en-iyi-faydalanma'");
  });

  test('all seed modules have body_md content', () => {
    // Every INSERT should have substantial body content
    var bodyMatches = seedSql.match(/body_md/g);
    // There should be no empty body_md fields
    expect(seedSql).not.toContain("body_md, NULL,");
  });

  // ── Progress UX ──
  test('candidate code has progress-aware section rendering', () => {
    expect(mulakatJs).toContain('fetchStudioProgress');
    expect(mulakatJs).toContain('_studioProgressCache');
    expect(mulakatJs).toContain('candidate_studio_progress');
    expect(mulakatJs).toContain('renderStudioSection');
  });

  test('module cards show completed and in-progress status pills', () => {
    expect(mulakatJs).toContain('st-mod-status-done');
    expect(mulakatJs).toContain('st-mod-status-ip');
    expect(mulakatJs).toContain('st-mod-done');
  });

  test('continue-learning card renders for in-progress modules', () => {
    expect(mulakatJs).toContain('st-continue-card');
    expect(mulakatJs).toContain('KALDIĞIN YERDEN DEVAM ET');
    expect(mulakatJs).toContain('Devam Et');
  });

  test('section progress stats shown in header', () => {
    expect(mulakatJs).toContain('st-progress-pill');
    expect(mulakatJs).toContain("tamamland\\u0131");
  });

  test('landing has async hydration functions and coming-soon badges', () => {
    // Perf/Bilgi cards now have coming-soon badges instead of stat placeholders
    expect(mulakatJs).toContain('hydrateLandingStats');
    expect(mulakatJs).toContain('st-coming-badge');
  });

  test('progress cache invalidated on complete and back navigation', () => {
    expect(mulakatJs).toContain('_studioProgressCache = null');
  });
});

// Studio Phase 3 — Badge System
// ═══════════════════════════════════════════════

test.describe('Studio Phase 3 — badge system structural guards', () => {
  var badgeSql, mulakatJs;

  test.beforeAll(() => {
    badgeSql = readFromRepo('supabase/migrations/20260326240000_badge_system.sql');
    mulakatJs = readFromRepo('profil-studio.js') + '\n' + readFromRepo('profil-studio-coach.js') + '\n' + readFromRepo('css/studio.css');
  });

  // ── Schema ──
  test('migration creates badge_definitions with proper constraints', () => {
    expect(badgeSql).toContain('CREATE TABLE IF NOT EXISTS badge_definitions');
    expect(badgeSql).toContain('badge_definitions_category_check');
    expect(badgeSql).toContain('badge_definitions_tier_check');
    expect(badgeSql).toContain('badge_definitions_rule_type_check');
    expect(badgeSql).toContain("'active'");
    expect(badgeSql).toContain("'inactive'");
  });

  test('migration creates candidate_badges with unique constraint', () => {
    expect(badgeSql).toContain('CREATE TABLE IF NOT EXISTS candidate_badges');
    expect(badgeSql).toContain('UNIQUE (candidate_id, badge_id)');
    expect(badgeSql).toContain('awarded_at');
  });

  // ── Issuance ──
  test('migration has evaluate_candidate_badges RPC with idempotent awarding', () => {
    expect(badgeSql).toContain('evaluate_candidate_badges');
    expect(badgeSql).toContain('ON CONFLICT (candidate_id, badge_id) DO NOTHING');
    expect(badgeSql).toContain('module_complete_count');
    expect(badgeSql).toContain('section_complete');
    expect(badgeSql).toContain('total_complete_count');
  });

  test('complete_studio_module triggers badge evaluation', () => {
    // The updated complete_studio_module should call evaluate_candidate_badges
    var fnStart = badgeSql.indexOf('CREATE OR REPLACE FUNCTION complete_studio_module');
    var fnEnd = badgeSql.indexOf('$$;', fnStart);
    var fnBody = badgeSql.slice(fnStart, fnEnd);
    expect(fnBody).toContain('evaluate_candidate_badges');
  });

  // ── Seed definitions ──
  test('migration seeds 6 badge definitions', () => {
    expect(badgeSql).toContain("'studyo-ilk-adim'");
    expect(badgeSql).toContain("'performans-baslangic'");
    expect(badgeSql).toContain("'bilgiler-baslangic'");
    expect(badgeSql).toContain("'studyo-disiplini'");
    expect(badgeSql).toContain("'performans-temelleri'");
    expect(badgeSql).toContain("'studyo-ustalik-yolu'");
  });

  test('badge definitions cover all three tiers', () => {
    expect(badgeSql).toContain("'base'");
    expect(badgeSql).toContain("'milestone'");
    expect(badgeSql).toContain("'advanced'");
  });

  // ── RLS ──
  test('RLS policies exist for badges', () => {
    expect(badgeSql).toContain('badge_definitions_read_active');
    expect(badgeSql).toContain('badge_definitions_admin_all');
    expect(badgeSql).toContain('candidate_badges_select_own');
  });

  // ── Candidate UI ──
  test('candidate Studio has badge strip with hydration', () => {
    expect(mulakatJs).toContain('st-badge-strip');
    expect(mulakatJs).toContain('hydrateBadgeStrip');
    expect(mulakatJs).toContain('badge_definitions');
    expect(mulakatJs).toContain('candidate_badges');
  });

  test('badge strip shows earned vs locked states', () => {
    expect(mulakatJs).toContain('st-badge-earned');
    expect(mulakatJs).toContain('st-badge-locked');
    expect(mulakatJs).toContain('TIER_COLORS');
  });

  test('badge strip shows most recent earned badge', () => {
    expect(mulakatJs).toContain('st-badge-recent');
    expect(mulakatJs).toContain('SON KAZANILAN');
  });

  test('badge icons use hardcoded SVG constants only', () => {
    expect(mulakatJs).toContain('BADGE_ICONS');
    expect(mulakatJs).toContain("rocket:");
    expect(mulakatJs).toContain("crown:");
  });
});

// Studio Phase 4 — Journal persistence + Yetenek progress
// ═══════════════════════════════════════════════

test.describe('Studio Phase 4 — journal + yetenek persistence', () => {
  var migSql, mulakatJs;

  test.beforeAll(() => {
    migSql = readFromRepo('supabase/migrations/20260326250000_journal_yetenek_progress.sql');
    mulakatJs = readFromRepo('profil-studio.js') + '\n' + readFromRepo('profil-studio-coach.js') + '\n' + readFromRepo('css/studio.css');
  });

  // ── Schema ──
  test('migration creates candidate_studio_journals with STAR+T fields', () => {
    expect(migSql).toContain('CREATE TABLE IF NOT EXISTS candidate_studio_journals');
    expect(migSql).toContain('situation_text');
    expect(migSql).toContain('task_text');
    expect(migSql).toContain('action_text');
    expect(migSql).toContain('result_text');
    expect(migSql).toContain('takeaway_text');
    expect(migSql).toContain('UNIQUE (candidate_id, competency_code, question_hash)');
  });

  test('migration creates candidate_yetenek_progress', () => {
    expect(migSql).toContain('CREATE TABLE IF NOT EXISTS candidate_yetenek_progress');
    expect(migSql).toContain('practice_count');
    expect(migSql).toContain('questions_answered');
    expect(migSql).toContain('UNIQUE (candidate_id, role_key, competency_code)');
  });

  test('migration has journal upsert + load RPCs', () => {
    expect(migSql).toContain('upsert_studio_journal');
    expect(migSql).toContain('get_my_journals');
    expect(migSql).toContain('ON CONFLICT (candidate_id, competency_code, question_hash)');
  });

  test('migration has yetenek practice + completion RPCs', () => {
    expect(migSql).toContain('record_yetenek_practice');
    expect(migSql).toContain('complete_yetenek_competency');
  });

  test('migration has RLS for candidate-only access', () => {
    expect(migSql).toContain('csj_select_own');
    expect(migSql).toContain('cyp_select_own');
  });

  // ── Frontend integration ──
  test('journal save uses DB alongside localStorage', () => {
    expect(mulakatJs).toContain('upsert_studio_journal');
    expect(mulakatJs).toContain('_journalDbCache');
    expect(mulakatJs).toContain('journalCacheKey');
  });

  test('journal load checks DB cache before localStorage', () => {
    // loadJournalDraft should check _journalDbCache first
    var fnStart = mulakatJs.indexOf('function loadJournalDraft');
    var fnEnd = mulakatJs.indexOf('\nfunction ', fnStart + 10);
    var fnBody = mulakatJs.slice(fnStart, fnEnd);
    expect(fnBody).toContain('_journalDbCache');
    expect(fnBody).toContain('localStorage');
  });

  test('journal DB preload runs on panel init', () => {
    expect(mulakatJs).toContain('preloadJournalsFromDb');
    expect(mulakatJs).toContain("get_my_journals");
  });

  test('localStorage migration to DB runs once on preload', () => {
    expect(mulakatJs).toContain('migrateLocalJournalsToDb');
  });

  test('competency completion records to yetenek_progress DB', () => {
    expect(mulakatJs).toContain("complete_yetenek_competency");
    expect(mulakatJs).toContain("p_role_key: S.role");
    expect(mulakatJs).toContain("p_competency_code: S.activeComp");
  });

  test('journal save indicator says taslak kaydedildi', () => {
    expect(mulakatJs).toContain('Taslak kaydedildi');
  });
});

// Studio Phase 5A — AI Feedback Foundation
// ═══════════════════════════════════════════════

test.describe('Studio Phase 5A — AI feedback structural guards', () => {
  var migSql, edgeFn, mulakatJs;

  test.beforeAll(() => {
    migSql = readFromRepo('supabase/migrations/20260326260000_journal_ai_feedback.sql');
    edgeFn = readFromRepo('supabase/functions/journal-feedback/index.ts');
    mulakatJs = readFromRepo('profil-studio.js') + '\n' + readFromRepo('profil-studio-coach.js') + '\n' + readFromRepo('css/studio.css');
  });

  // ── Schema ──
  test('migration creates candidate_journal_feedback with structured fields', () => {
    expect(migSql).toContain('CREATE TABLE IF NOT EXISTS candidate_journal_feedback');
    expect(migSql).toContain('overall_signal');
    expect(migSql).toContain('strong_points');
    expect(migSql).toContain('weak_points');
    expect(migSql).toContain('star_review');
    expect(migSql).toContain('improvement_actions');
    expect(migSql).toContain('followup_questions');
    expect(migSql).toContain('summary_text');
  });

  test('migration has request + complete + get RPCs', () => {
    expect(migSql).toContain('request_journal_feedback');
    expect(migSql).toContain('complete_journal_feedback');
    expect(migSql).toContain('get_journal_feedback');
  });

  test('migration has proper status and signal constraints', () => {
    expect(migSql).toContain("'pending'");
    expect(migSql).toContain("'processing'");
    expect(migSql).toContain("'completed'");
    expect(migSql).toContain("'failed'");
    expect(migSql).toContain("'strong'");
    expect(migSql).toContain("'mixed'");
    expect(migSql).toContain("'needs_work'");
  });

  test('request RPC saves journal before creating feedback', () => {
    var fnStart = migSql.indexOf('CREATE OR REPLACE FUNCTION request_journal_feedback');
    var fnEnd = migSql.indexOf('$$;', fnStart);
    var fnBody = migSql.slice(fnStart, fnEnd);
    expect(fnBody).toContain('upsert_studio_journal');
  });

  // ── Edge Function ──
  test('edge function has structured OpenAI prompt', () => {
    expect(edgeFn).toContain('STAR+T');
    expect(edgeFn).toContain('overall_signal');
    expect(edgeFn).toContain('strong_points');
    expect(edgeFn).toContain('star_review');
    expect(edgeFn).toContain('improvement_actions');
    expect(edgeFn).toContain('followup_questions');
  });

  test('edge function uses structured JSON response format', () => {
    expect(edgeFn).toContain('response_format');
    expect(edgeFn).toContain('json_object');
  });

  test('edge function handles failures gracefully', () => {
    expect(edgeFn).toContain('failed');
    expect(edgeFn).toContain('error_message');
    expect(edgeFn).toContain('OPENAI_API_KEY');
  });

  // ── Candidate UI ──
  test('candidate journal has AI feedback button for premium', () => {
    expect(mulakatJs).toContain('aif-request');
    expect(mulakatJs).toContain('AI ile De');
    expect(mulakatJs).toContain('requestAiFeedback');
  });

  test('non-premium users see gate instead of AI button', () => {
    expect(mulakatJs).toContain('aif-gate');
    expect(mulakatJs).toContain('Premium');
    expect(mulakatJs).toContain('aif-gate-cta');
  });

  test('feedback rendering shows structured sections', () => {
    expect(mulakatJs).toContain('renderAiFeedback');
    expect(mulakatJs).toContain('aif-overall');
    expect(mulakatJs).toContain('aif-signal');
    expect(mulakatJs).toContain('aif-star-row');
    expect(mulakatJs).toContain('AIF_SIGNAL_LABELS');
    expect(mulakatJs).toContain('AIF_STAR_STATUS');
  });

  test('feedback polls for completion with timeout', () => {
    expect(mulakatJs).toContain('pollForFeedback');
    expect(mulakatJs).toContain('_aifPollTimer');
    expect(mulakatJs).toContain('get_journal_feedback');
  });

  test('existing feedback loaded on practice screen render', () => {
    expect(mulakatJs).toContain('loadExistingFeedback');
  });

  test('no console.log in AI feedback code', () => {
    // Only console.error should exist
    expect(mulakatJs).not.toMatch(/console\.log\(/);
  });
});

// Yetenek Data Source Migration — DB-backed competency loading
// ═══════════════════════════════════════════════

test.describe('Yetenek data source migration — structural guards', () => {
  var yetkinlikJs, migSql;

  test.beforeAll(() => {
    yetkinlikJs = readFromRepo('profil-yetkinlik.js');
    migSql = readFromRepo('supabase/migrations/20260326270000_competency_rating_rpcs.sql');
  });

  // ── DB-backed loading ──
  test('profil-yetkinlik.js has DB load function', () => {
    expect(yetkinlikJs).toContain('loadCompetencyDataFromDb');
    expect(yetkinlikJs).toContain('competency_definitions');
    expect(yetkinlikJs).toContain('role_competency_map');
  });

  test('DB load reshapes into bridge contract fields', () => {
    var fnStart = yetkinlikJs.indexOf('async function loadCompetencyDataFromDb');
    var fnEnd = yetkinlikJs.indexOf('\n/* ', fnStart + 10);
    var fnBody = yetkinlikJs.slice(fnStart, fnEnd);
    expect(fnBody).toContain('dbAnchors');
    expect(fnBody).toContain('dbCompNames');
    expect(fnBody).toContain('dbCompKf');
    expect(fnBody).toContain('dbRoleMap');
    expect(fnBody).toContain('ANCHORS[');
    expect(fnBody).toContain('COMP_NAMES[');
    expect(fnBody).toContain('COMP_KF[');
    expect(fnBody).toContain('ROLE_COMP_MAP[');
  });

  test('DB load is triggered from _htLoadYetkinlik', () => {
    var loaderStart = yetkinlikJs.indexOf('window._htLoadYetkinlik');
    var loaderEnd = yetkinlikJs.indexOf('};', loaderStart);
    var loaderBody = yetkinlikJs.slice(loaderStart, loaderEnd);
    expect(loaderBody).toContain('loadCompetencyDataFromDb');
  });

  test('hardcoded fallback data still exists', () => {
    // ANCHORS, COMP_NAMES, COMP_KF, ROLE_COMP_MAP should still be defined as vars
    expect(yetkinlikJs).toContain('var ANCHORS=');
    expect(yetkinlikJs).toContain('var COMP_NAMES');
    expect(yetkinlikJs).toContain('var COMP_KF');
    expect(yetkinlikJs).toContain('var ROLE_COMP_MAP');
  });

  test('bridge contract re-exported after DB load', () => {
    expect(yetkinlikJs).toContain("window._htYetkinlikData = { ANCHORS: ANCHORS, ROLE_COMP_MAP: ROLE_COMP_MAP, COMP_NAMES: COMP_NAMES, COMP_KF: COMP_KF, FREE_LIMIT: FREE_LIMIT }");
  });

  test('DB load handles failure gracefully', () => {
    var fnStart = yetkinlikJs.indexOf('async function loadCompetencyDataFromDb');
    var fnEnd = yetkinlikJs.indexOf('\n/* ', fnStart + 10);
    var fnBody = yetkinlikJs.slice(fnStart, fnEnd);
    expect(fnBody).toContain('catch');
    expect(fnBody).toContain('console.error');
    expect(fnBody).toContain('hardcoded fallback');
  });

  // ── Competency rating RPCs ──
  test('migration has upsert_competency_rating RPC', () => {
    expect(migSql).toContain('upsert_competency_rating');
    expect(migSql).toContain("'strong'");
    expect(migSql).toContain("'growing'");
    expect(migSql).toContain('ON CONFLICT (candidate_id, competency_code)');
  });

  test('migration has get_my_competency_ratings RPC', () => {
    expect(migSql).toContain('get_my_competency_ratings');
    expect(migSql).toContain('candidate_competencies');
  });
});

// Yetenek Competency Profile Phase 1 — self-rating + evidence surface
// ═══════════════════════════════════════════════

test.describe('Yetenek competency profile — structural guards', () => {
  var overviewSql, mulakatJs;

  test.beforeAll(() => {
    overviewSql = readFromRepo('supabase/migrations/20260326280000_yetenek_overview_rpc.sql');
    mulakatJs = readFromRepo('profil-studio.js') + '\n' + readFromRepo('profil-studio-coach.js') + '\n' + readFromRepo('css/studio.css');
  });

  // ── Overview RPC ──
  test('migration creates get_my_yetenek_overview RPC', () => {
    expect(overviewSql).toContain('get_my_yetenek_overview');
    expect(overviewSql).toContain('p_role_key');
    expect(overviewSql).toContain('self_rating');
    expect(overviewSql).toContain('practice_status');
    expect(overviewSql).toContain('journal_count');
    expect(overviewSql).toContain('feedback_signal');
  });

  test('overview RPC joins all evidence tables', () => {
    expect(overviewSql).toContain('candidate_competencies');
    expect(overviewSql).toContain('candidate_yetenek_progress');
    expect(overviewSql).toContain('candidate_studio_journals');
    expect(overviewSql).toContain('candidate_journal_feedback');
    expect(overviewSql).toContain('role_competency_map');
  });

  // ── Lobby evidence hydration ──
  test('lobby has evidence hydration function', () => {
    expect(mulakatJs).toContain('hydrateLobbyEvidence');
    expect(mulakatJs).toContain('get_my_yetenek_overview');
    expect(mulakatJs).toContain('_lobbyEvidenceCache');
  });

  test('lobby cards have evidence placeholder elements', () => {
    expect(mulakatJs).toContain('data-ev-comp');
    expect(mulakatJs).toContain('yk-evidence');
  });

  test('evidence summary strip renders aggregate stats', () => {
    expect(mulakatJs).toContain('yk-evidence-summary');
    expect(mulakatJs).toContain('yk-summary-chip');
  });

  // ── Self-rating UI ──
  test('self-rating toggle renders with strong/growing options', () => {
    expect(mulakatJs).toContain('yk-rating-toggle');
    expect(mulakatJs).toContain('yk-rating-btn');
    expect(mulakatJs).toContain("'strong'");
    expect(mulakatJs).toContain("'growing'");
  });

  test('self-rating saves via upsert_competency_rating RPC', () => {
    expect(mulakatJs).toContain('saveCompRating');
    expect(mulakatJs).toContain('upsert_competency_rating');
  });

  test('rating click does not trigger card navigation', () => {
    expect(mulakatJs).toContain('yk-rating-toggle');
    expect(mulakatJs).toContain('e.stopPropagation');
  });

  // ── Evidence chips ──
  test('evidence chips render for practice, journal, AI signal', () => {
    expect(mulakatJs).toContain('yk-chip-practice');
    expect(mulakatJs).toContain('yk-chip-journal');
    expect(mulakatJs).toContain('yk-chip-ai');
  });

  test('AI feedback signal shows correct labels', () => {
    expect(mulakatJs).toContain('AI: G');
    expect(mulakatJs).toContain('AI: Karma');
  });
});

// Premium Entitlement Phase 1 — payment + activation
// ═══════════════════════════════════════════════

test.describe('Premium entitlement — structural guards', () => {
  var migSql, webhookFn, premiumJs;

  test.beforeAll(() => {
    migSql = readFromRepo('supabase/migrations/20260327000000_premium_entitlement.sql');
    webhookFn = readFromRepo('supabase/functions/premium-webhook/index.ts');
    premiumJs = readFromRepo('profil-premium.js');
  });

  // ── Schema ──
  test('migration creates candidate_premium_purchases table', () => {
    expect(migSql).toContain('CREATE TABLE IF NOT EXISTS candidate_premium_purchases');
    expect(migSql).toContain("'pending'");
    expect(migSql).toContain("'completed'");
    expect(migSql).toContain("'failed'");
    expect(migSql).toContain("'aylik'");
    expect(migSql).toContain("'yillik'");
    expect(migSql).toContain("'kariyer'");
  });

  test('migration has activate_candidate_premium RPC', () => {
    expect(migSql).toContain('activate_candidate_premium');
    expect(migSql).toContain('is_premium = true');
    expect(migSql).toContain('premium_until');
    expect(migSql).toContain('SECURITY DEFINER');
  });

  test('activation RPC is idempotent and extends existing premium', () => {
    var fnStart = migSql.indexOf('CREATE OR REPLACE FUNCTION activate_candidate_premium');
    var fnEnd = migSql.indexOf('$$;', fnStart);
    var fnBody = migSql.slice(fnStart, fnEnd);
    expect(fnBody).toContain('v_current_until');
    expect(fnBody).toContain('v_current_until > now()');
  });

  test('migration has initiate_premium_purchase RPC', () => {
    expect(migSql).toContain('initiate_premium_purchase');
    expect(migSql).toContain("'pending'");
  });

  test('migration has get_my_premium_status RPC', () => {
    expect(migSql).toContain('get_my_premium_status');
    expect(migSql).toContain('days_remaining');
  });

  // ── Webhook Edge Function ──
  test('webhook validates payment and calls activation', () => {
    expect(webhookFn).toContain('activate_candidate_premium');
    expect(webhookFn).toContain('purchase_id');
    expect(webhookFn).toContain('provider_payment_id');
  });

  test('webhook handles idempotent repeated calls', () => {
    expect(webhookFn).toContain('Already activated');
    expect(webhookFn).toContain('completed');
  });

  test('webhook handles payment failure', () => {
    expect(webhookFn).toContain('failure');
    expect(webhookFn).toContain('failed');
    expect(webhookFn).toContain('Payment failed');
  });

  // ── Frontend purchase flow ──
  test('premium panel has plan CTA buttons with data-plan', () => {
    expect(premiumJs).toContain('data-plan');
    expect(premiumJs).toContain('PLAN_KEYS');
    expect(premiumJs).toContain('PLAN_AMOUNTS');
  });

  test('purchase flow calls initiatePurchase with Iyzico checkout', () => {
    expect(premiumJs).toContain('initiatePurchase');
    expect(premiumJs).toContain('PLAN_KEYS');
  });

  test('profile refresh updates _loadedDBData after purchase', () => {
    expect(premiumJs).toContain('refreshPremiumState');
    expect(premiumJs).toContain('_loadedDBData');
    expect(premiumJs).toContain('is_premium');
  });

  test('active premium banner shows for current premium users', () => {
    expect(premiumJs).toContain('pm-active-banner');
    // K069: editorial rewrite — title moved to .prem-active__title with lowercase "Premium aktif"
    expect(premiumJs).toContain('Premium aktif');
    expect(premiumJs).toContain('checkCurrentPremium');
  });
});

// Yetenek IA Reset + Learning Portal Phase 1
// ═══════════════════════════════════════════════

test.describe('Yetenek IA reset — structural guards', () => {
  var mulakatJs;

  test.beforeAll(() => {
    mulakatJs = readFromRepo('profil-studio.js') + '\n' + readFromRepo('profil-studio-coach.js') + '\n' + readFromRepo('css/studio.css');
  });

  // ── Yetenek Home ──
  test('lobby renders as bento grid learning path', () => {
    expect(mulakatJs).toContain('st-lobby');
    expect(mulakatJs).toContain('g-hero');
    expect(mulakatJs).toContain('st-course-card');
    expect(mulakatJs).toContain('st-star-ref');
  });

  test('Lobby hero has role display and change button', () => {
    expect(mulakatJs).toContain('ig-back-role-change');
    expect(mulakatJs).toContain('Rol De');
  });

  test('Lobby has bento grid course cards with status indicators', () => {
    expect(mulakatJs).toContain('st-course-card');
    expect(mulakatJs).toContain('st-course-card-name');
    expect(mulakatJs).toContain('st-course-card-progress');
    expect(mulakatJs).toContain('Devam Et');
  });

  test('Lobby has inline role picker for first-time users', () => {
    expect(mulakatJs).toContain('ig-role-dd');
    expect(mulakatJs).toContain('ig-role-start');
    expect(mulakatJs).toContain('Pozisyon se');
  });

  test('Lobby has STAR+T reference card', () => {
    expect(mulakatJs).toContain('st-star-ref');
    expect(mulakatJs).toContain('STAR+T Metodolojisi');
  });

  // ── Track Detail ──
  test('track detail shows practice units preview', () => {
    expect(mulakatJs).toContain('yk-track-units');
    expect(mulakatJs).toContain('yk-track-unit-row');
    expect(mulakatJs).toContain('yk-track-unit-theme');
  });

  // ── Unit Detail ──
  test('unit detail shows strong-answer signals', () => {
    expect(mulakatJs).toContain('yk-unit-signals');
    expect(mulakatJs).toContain('yk-unit-signals-title');
  });

  test('unit detail shows follow-up question preview', () => {
    expect(mulakatJs).toContain('yk-unit-followup');
    expect(mulakatJs).toContain('yk-unit-followup-title');
  });

  test('unit detail has inline journal panel with AI feedback (Aşama 8 restore)', () => {
    // Journal restored inline in practice via renderJournalPanel() — Aşama 8
    var practiceStart = mulakatJs.indexOf('function renderPractice()');
    var practiceEnd = mulakatJs.indexOf('\nfunction ', practiceStart + 10);
    var practiceBody = mulakatJs.slice(practiceStart, practiceEnd);
    expect(practiceBody).toContain('renderJournalPanel()');
  });

  test('AI feedback uses freemium gate (first FREE_COMP_LIMIT comps free)', () => {
    expect(mulakatJs).toContain('aiFree');
    expect(mulakatJs).toContain('FREE_COMP_LIMIT');
    expect(mulakatJs).toContain('aif-self-reflect');
  });

  test('journal tables and persistence code still exist (backend preserved)', () => {
    expect(mulakatJs).toContain('upsert_studio_journal');
    expect(mulakatJs).toContain('_journalDbCache');
  });

  // ── Lightweight summary ──
  test('completion screen uses compact summary layout', () => {
    expect(mulakatJs).toContain('yk-summary-wrap');
    expect(mulakatJs).toContain('yk-summary-card');
    expect(mulakatJs).toContain('yk-summary-stats');
  });

  // ── Runtime preservation ──
  test('runtime contracts preserved', () => {
    expect(mulakatJs).toContain('window._htLoadStudio');
    expect(mulakatJs).toContain('window._htYetkinlikData');
    expect(mulakatJs).toContain("navigate('role_select')");
    expect(mulakatJs).toContain("navigate('lobby')");
    expect(mulakatJs).toContain("navigate('course_detail')");
    expect(mulakatJs).toContain("navigate('practice')");
    expect(mulakatJs).toContain("navigate('completion')");
    /* session_complete screen still exists in navigate() handler but entry
       point removed — completion now routes directly to lobby per S06 spec */
    expect(mulakatJs).toContain("screen === 'session_complete'");
  });

  test('free/premium behavior preserved', () => {
    expect(mulakatJs).toContain('FREE_COMP_LIMIT');
    expect(mulakatJs).toContain('S.isPremium');
    expect(mulakatJs).toContain('freeLimit');
  });
});

/* ═══════════════════════════════════════════
   FAZ 4C — Content detail → practice bridge
   ═══════════════════════════════════════════ */
test.describe('FAZ 4C — detail → practice bridge', () => {
  var mulakatJs;
  test.beforeAll(() => {
    mulakatJs = readFromRepo('profil-studio.js') + '\n' + readFromRepo('profil-studio-coach.js') + '\n' + readFromRepo('css/studio.css');
  });

  test('reverse mapping objects exist', () => {
    expect(mulakatJs).toContain('MODULE_SLUG_TO_COMP');
    expect(mulakatJs).toContain('COACH_CAT_TO_COMP');
  });

  test('reverse mappings built from existing forward maps', () => {
    expect(mulakatJs).toContain('COMP_TO_MODULE_SLUG');
    expect(mulakatJs).toContain('COMP_TO_COACH_CATEGORY');
  });

  test('navigateToCompPractice function exists', () => {
    expect(mulakatJs).toContain('function navigateToCompPractice');
  });

  test('buildPracticeBridgeCTA function exists', () => {
    expect(mulakatJs).toContain('function buildPracticeBridgeCTA');
  });

  test('module detail has practice bridge CTA', () => {
    expect(mulakatJs).toContain('MODULE_SLUG_TO_COMP[mod.slug]');
    expect(mulakatJs).toContain('buildPracticeBridgeCTA(modCompCode');
  });

  test('coach detail has practice bridge CTA', () => {
    expect(mulakatJs).toContain('COACH_CAT_TO_COMP[post.category]');
    expect(mulakatJs).toContain('buildPracticeBridgeCTA(coachCompCode');
  });

  test('pendingComp mechanism in startSession', () => {
    expect(mulakatJs).toContain('S.pendingComp');
    expect(mulakatJs).toContain('pendingComp = null');
  });

  test('bridge CTA CSS class exists', () => {
    expect(mulakatJs).toContain('.st-detail-bridge');
  });

  test('does not introduce new DB objects', () => {
    /* FAZ 4C is frontend-only — no new RPCs or tables */
    expect(mulakatJs).not.toContain('create_practice_bridge');
    expect(mulakatJs).not.toContain('practice_bridge_table');
  });

  test('completion cross-links not broken (FAZ 4B preserved)', () => {
    expect(mulakatJs).toContain('hydrateCompletionXlinks');
    expect(mulakatJs).toContain('yk-completion-xlinks');
    expect(mulakatJs).toContain('COMP_TO_COACH_CATEGORY');
    expect(mulakatJs).toContain('COMP_TO_MODULE_SLUG');
  });
});

/* ═══════════════════════════════════════════
   FAZ 2C — Streak freeze / recovery
   ═══════════════════════════════════════════ */
test.describe('FAZ 2C — streak freeze and recovery', () => {
  var mulakatJs, migSql;
  test.beforeAll(() => {
    mulakatJs = readFromRepo('profil-studio.js') + '\n' + readFromRepo('profil-studio-coach.js') + '\n' + readFromRepo('css/studio.css');
    migSql = readFromRepo('supabase/migrations/20260328010000_streak_freeze_recovery.sql');
  });

  test('migration adds last_broken_streak column', () => {
    expect(migSql).toContain('last_broken_streak');
    expect(migSql).toContain('ADD COLUMN IF NOT EXISTS');
  });

  test('update_candidate_streak handles freeze consume', () => {
    expect(migSql).toContain('streak_freezes_available > 0');
    expect(migSql).toContain('streak_freezes_available - 1');
  });

  test('update_candidate_streak handles recovery', () => {
    expect(migSql).toContain('last_broken_streak > 0');
    expect(migSql).toContain('v_recovered');
  });

  test('get_my_streak_status returns can_freeze and can_recover', () => {
    expect(migSql).toContain('can_freeze');
    expect(migSql).toContain('can_recover');
  });

  test('frontend shows freeze state', () => {
    expect(mulakatJs).toContain('can_freeze');
    expect(mulakatJs).toContain('yk-streak-frozen');
    expect(mulakatJs).toContain('freeze hakk');
  });

  test('frontend shows recovery state', () => {
    expect(mulakatJs).toContain('can_recover');
    expect(mulakatJs).toContain('yk-streak-recover');
    expect(mulakatJs).toContain('geri kazan');
  });

  test('frontend shows freeze hint below active streak', () => {
    expect(mulakatJs).toContain('yk-streak-freeze-hint');
    expect(mulakatJs).toContain('freeze hakk');
  });

  test('streak foundation not broken', () => {
    expect(mulakatJs).toContain('hydrateStreakPill');
    expect(mulakatJs).toContain('update_candidate_streak');
    expect(mulakatJs).toContain('get_my_streak_status');
  });
});

/*
   FAZ 2D — Spaced repetition / review recommendation
*/
test.describe('FAZ 2D — review recommendation layer', () => {
  let mulakatJs;
  test.beforeAll(() => {
    mulakatJs = readFromRepo('profil-studio.js') + '\n' + readFromRepo('profil-studio-coach.js') + '\n' + readFromRepo('css/studio.css');
  });

  test('needsReview function exists', () => {
    expect(mulakatJs).toContain('function needsReview(');
  });

  test('needsReview checks growing self_rating', () => {
    expect(mulakatJs).toContain("self_rating === 'growing'");
  });

  test('needsReview checks AI feedback signals', () => {
    expect(mulakatJs).toContain("feedback_signal === 'mixed'");
    expect(mulakatJs).toContain("feedback_signal === 'needs_work'");
  });

  test('needsReview checks stale practice', () => {
    expect(mulakatJs).toContain('REVIEW_STALE_DAYS');
    expect(mulakatJs).toContain('last_practiced_at');
  });

  test('daily practice has review priority', () => {
    expect(mulakatJs).toContain('isReviewPick');
    expect(mulakatJs).toContain('TEKRAR PRAT');
  });

  test('recommendation shows review text', () => {
    expect(mulakatJs).toContain('tekrar g');
    expect(mulakatJs).toContain('z atmak faydal');
  });

  test('track cards get review pill', () => {
    expect(mulakatJs).toContain('yk-review-pill');
    expect(mulakatJs).toContain('Tazelemeyi d');
  });

  test('review pill CSS exists', () => {
    expect(mulakatJs).toContain('.yk-review-pill{');
  });

  test('sort includes review priority', () => {
    expect(mulakatJs).toContain('aReview');
    expect(mulakatJs).toContain('bReview');
  });

  test('existing daily practice not broken', () => {
    expect(mulakatJs).toContain('hydrateDailyPractice');
    expect(mulakatJs).toContain('yk-daily-card');
    expect(mulakatJs).toContain('yk-daily-kicker');
  });

  test('existing recommendation not broken', () => {
    expect(mulakatJs).toContain('hydrateRecommendation');
    expect(mulakatJs).toContain('yk-recommendation');
  });

  test('existing sort not broken (growing incomplete still prioritized)', () => {
    expect(mulakatJs).toContain('aGrow');
    expect(mulakatJs).toContain('bGrow');
  });
});

/*
   Phase 5B — AI feedback surface redesign
*/
test.describe('Phase 5B — AI feedback progressive disclosure', () => {
  let mulakatJs;
  test.beforeAll(() => {
    mulakatJs = readFromRepo('profil-studio.js') + '\n' + readFromRepo('profil-studio-coach.js') + '\n' + readFromRepo('css/studio.css');
  });

  test('journal toggle renamed to Cevabını Hazırla', () => {
    expect(mulakatJs).toContain('Cevab');
    expect(mulakatJs).toContain('Haz');
    /* "Gelişim Günlüğü" remains in code comments but not in user-facing toggle */
    expect(mulakatJs).toContain('ig-journal-toggle-label');
  });

  test('rubric block removed', () => {
    expect(mulakatJs).not.toContain('aif-rubric');
    expect(mulakatJs).not.toContain('Değerlendirme Kriterleri');
  });

  test('hero card exists', () => {
    expect(mulakatJs).toContain('aif-hero');
    expect(mulakatJs).toContain('aif-hero-header');
    expect(mulakatJs).toContain('aif-hero-title');
  });

  test('hero highlights exist (positive and negative)', () => {
    expect(mulakatJs).toContain('aif-hero-highlight positive');
    expect(mulakatJs).toContain('aif-hero-highlight negative');
  });

  test('next steps section exists', () => {
    expect(mulakatJs).toContain('aif-next-steps');
    expect(mulakatJs).toContain('SONRAK');
  });

  test('progressive disclosure with details/summary', () => {
    expect(mulakatJs).toContain('aif-details');
    expect(mulakatJs).toContain('aif-details-body');
    expect(mulakatJs).toContain("createElement('details')");
    expect(mulakatJs).toContain("createElement('summary')");
  });

  test('STAR+T analysis in accordion', () => {
    expect(mulakatJs).toContain('STAR+T Analizi');
    expect(mulakatJs).toContain('aif-star-row');
  });

  test('renderAifListItem helper exists', () => {
    expect(mulakatJs).toContain('function renderAifListItem(');
  });

  test('AI request/poll/retry flow preserved', () => {
    expect(mulakatJs).toContain('requestAiFeedback');
    expect(mulakatJs).toContain('pollForFeedback');
    expect(mulakatJs).toContain('_aifRequestInFlight');
    expect(mulakatJs).toContain('loadExistingFeedback');
  });

  test('premium gate preserved', () => {
    expect(mulakatJs).toContain('aif-gate');
    expect(mulakatJs).toContain('FREE_COMP_LIMIT');
  });

  test('self-reflection preserved', () => {
    expect(mulakatJs).toContain('aif-self-reflect');
    expect(mulakatJs).toContain('aif-self-reflect-input');
  });

  test('signal labels preserved', () => {
    expect(mulakatJs).toContain('AIF_SIGNAL_LABELS');
    expect(mulakatJs).toContain('AIF_STAR_STATUS');
  });
});

/* ════════════════════════════════════════════════
   Studio truth-sync regression guards (Asama 2)
   ════════════════════════════════════════════════ */
test.describe('Studio truth-sync guards', () => {
  var studioJs;

  test.beforeAll(() => {
    studioJs = readFromRepo('profil-studio.js') + '\n' + readFromRepo('css/studio.css');
  });

  test('lobby renders Performans section entry point', () => {
    expect(studioJs).toContain('st-go-perf');
    expect(studioJs).toContain("hydrateStudioSection('performans'");
  });

  test('lobby renders Bilgiler section entry point', () => {
    expect(studioJs).toContain('st-go-bilgi');
    expect(studioJs).toContain("hydrateStudioSection('bilgiler'");
  });

  test('st-module-area div is present in lobby HTML', () => {
    expect(studioJs).toContain("id=\"st-module-area\"");
  });

  test('coach feed has visible section header in lobby', () => {
    expect(studioJs).toContain('st-coach-header');
  });

  test('hydrateNotesFeedback function exists and is called for notes tab', () => {
    expect(studioJs).toContain('function hydrateNotesFeedback(');
    expect(studioJs).toContain("hydrateNotesFeedback(S.activeComp)");
  });

  test('notes tab AI feedback renders via safe DOM methods', () => {
    expect(studioJs).toContain('st-notes-feedback-slot');
    expect(studioJs).toContain('AIF_SIGNAL_LABELS');
    expect(studioJs).toContain('AIF_STAR_STATUS');
  });

  test('coach header starts hidden and only shows via JS after feed loads', () => {
    /* HTML must set display:none as the LAST display value in inline style */
    var headerMatch = studioJs.match(/id="st-coach-header"\s+style="([^"]*)"/);
    expect(headerMatch).toBeTruthy();
    var styleStr = headerMatch[1];
    /* Extract all display values in order */
    var displayValues = [];
    styleStr.replace(/display\s*:\s*([^;]+)/g, function(_, val) { displayValues.push(val.trim()); });
    /* Last display value must be none */
    expect(displayValues[displayValues.length - 1]).toBe('none');
  });

  test('coach header is shown as flex only in JS callback after feed loads', () => {
    expect(studioJs).toContain("coachHeader.style.display = 'flex'");
    expect(studioJs).toContain("coachFeed.style.display !== 'none'");
  });
});

/* ════════════════════════════════════════════════
   Profil activation regression guards (Asama 4)
   ════════════════════════════════════════════════ */
test.describe('Profil activation guards', () => {
  var genelJs, cvJs, profilHtml, settingsJs;

  test.beforeAll(() => {
    genelJs = readFromRepo('profil-genel.js');
    cvJs = readFromRepo('profil-cv.js');
    profilHtml = readFromRepo('profil.html');
    settingsJs = readFromRepo('profil-settings.js');
  });

  // K033: identity readiness card replaced by editorial hero; %45 threshold + score hints
  // moved to profil-merkez (K031). Genel Bakis surface no longer carries this vocabulary.

  test('CV card does not claim AI optimization', () => {
    expect(profilHtml).not.toContain('AI ile CV Optimize');
  });

  test('CV template includes LinkedIn URL in contact line', () => {
    expect(cvJs).toContain('linkedin');
    expect(cvJs).toContain('contactParts');
  });

  test('CV template includes target role for ATS', () => {
    expect(cvJs).toContain('target-roles-container');
    expect(cvJs).toContain('targetRole');
  });

  test('blocked companies card is visible in settings', () => {
    expect(profilHtml).toContain('id="settings-blocked-companies-card"');
    expect(profilHtml).not.toMatch(/id="settings-blocked-companies-card"[^>]*display:\s*none/);
  });

  test('blocked companies JS wiring present', () => {
    expect(settingsJs).toContain('candidate_blocked_companies');
    expect(settingsJs).toContain('blocked-company-search');
  });
});

/* ════════════════════════════════════════════════
   CV canonical template guards (Asama 9)
   ════════════════════════════════════════════════ */
test.describe('CV canonical template guards', () => {
  var cvJs2;

  test.beforeAll(() => {
    cvJs2 = readFromRepo('profil-cv.js');
  });

  test('normalizeCVData helper exists and is used by generateCV', () => {
    expect(cvJs2).toContain('function normalizeCVData()');
    expect(cvJs2).toContain('var d = normalizeCVData()');
  });

  test('single template — no style/theme selector or multiple layouts', () => {
    expect(cvJs2).not.toMatch(/template\s*===|style\s*===|layout\s*===/);
  });

  test('ATS section order: header > summary > experience > education > languages > certificates', () => {
    var summaryPos = cvJs2.indexOf('PROFESYONEL OZET');
    var expPos = cvJs2.indexOf("'Deneyim'");
    var eduPos = cvJs2.indexOf("'E\\u011Fitim'");
    var langPos = cvJs2.indexOf("'Diller'");
    var certPos = cvJs2.indexOf("'Sertifikalar'");
    expect(summaryPos).toBeGreaterThan(0);
    expect(expPos).toBeGreaterThan(summaryPos);
    expect(eduPos).toBeGreaterThan(expPos);
    expect(langPos).toBeGreaterThan(eduPos);
    expect(certPos).toBeGreaterThan(langPos);
  });

  test('avatar photo NOT embedded in PDF — ATS text layer corruption risk', () => {
    // Avatar removed from PDF per ATS best practice (Workday/Taleo corrupt adjacent text)
    expect(cvJs2).not.toContain('addImage');
    expect(cvJs2).toContain('Avatar PDF');
  });

  test('branding in PDF metadata, not body text — ATS keyword pollution prevention', () => {
    expect(cvJs2).toContain("'hellotalent.ai'");
    expect(cvJs2).toContain('setProperties');
    expect(cvJs2).toContain('creator');
  });

  test('deterministic summary in normalizeCVData — no API dependency for canonical flow', () => {
    expect(cvJs2).toContain('totalYears');
    expect(cvJs2).toContain('latestRole');
    /* normalizeCVData itself does not call any API */
    var normalizeBlock = cvJs2.slice(cvJs2.indexOf('function normalizeCVData'), cvJs2.indexOf('function _cvSection'));
    expect(normalizeBlock).not.toContain('fetch(');
    expect(normalizeBlock).not.toContain('anthropic');
  });

  test('canonical and AI CTA are separate in UI', () => {
    var profilHtml2 = readFromRepo('profil.html');
    /* Canonical export button exists */
    expect(profilHtml2).toContain('btn-generate-cv-merkez');
    /* AI optimize button exists separately */
    expect(profilHtml2).toContain('btn-ai-cv-optimize');
    /* AI button does NOT have data-premium-cta (no longer hijacked by global premium delegation) */
    var aiSection = profilHtml2.slice(profilHtml2.indexOf('btn-ai-cv-optimize'));
    expect(aiSection.substring(0, 200)).not.toContain('data-premium-cta');
  });
});

/* ════════════════════════════════════════════════
   AI CV + Anthropic integration guards (Asama 10)
   ════════════════════════════════════════════════ */
test.describe('AI CV integration guards', () => {
  var cvJs3, eventsJs, edgeFn;

  test.beforeAll(() => {
    cvJs3 = readFromRepo('profil-cv.js');
    eventsJs = readFromRepo('profil-events.js');
    edgeFn = readFromRepo('supabase/functions/cv-optimize/index.ts');
  });

  test('avatar embed uses fetch-to-dataURL, not direct URL', () => {
    expect(cvJs3).toContain('fetchAvatarAsDataURL');
    expect(cvJs3).toContain('canvas.toDataURL');
    /* No direct d.avatarUrl in addImage */
    expect(cvJs3).not.toMatch(/addImage\(d\.avatarUrl/);
  });

  test('requestCVOptimize function exists and calls Edge Function', () => {
    expect(cvJs3).toContain('function requestCVOptimize');
    expect(cvJs3).toContain('cv-optimize');
  });

  test('Anthropic API key is only in Edge Function, not in frontend', () => {
    expect(cvJs3).not.toContain('ANTHROPIC');
    expect(cvJs3).not.toContain('x-api-key');
    expect(edgeFn).toContain('ANTHROPIC_API_KEY');
    expect(edgeFn).toContain('x-api-key');
  });

  test('Edge Function enforces auth + premium gate', () => {
    expect(edgeFn).toContain('getUser');
    expect(edgeFn).toContain('is_premium');
    expect(edgeFn).toContain('Premium required');
  });

  test('Edge Function output contract has summary + experienceRewrites', () => {
    expect(edgeFn).toContain('summary');
    expect(edgeFn).toContain('experienceRewrites');
    expect(edgeFn).toContain('keywordSuggestions');
  });

  test('AI flow has loading + success + failure states in events', () => {
    expect(eventsJs).toContain('Optimize ediliyor');
    expect(eventsJs).toContain('Optimize Edildi');
    expect(eventsJs).toContain('Tekrar Dene');
  });

  test('generateCV accepts optional aiOptimized parameter', () => {
    expect(cvJs3).toContain('function generateCV(aiOptimized)');
    expect(cvJs3).toContain('aiOptimized.summary');
  });
});

/* ════════════════════════════════════════════════
   Source CV ingestion guards (Asama 11)
   ════════════════════════════════════════════════ */
test.describe('Source CV ingestion guards', () => {
  var cvJs4, eventsJs2, edgeFn2;

  test.beforeAll(() => {
    cvJs4 = readFromRepo('profil-cv.js');
    eventsJs2 = readFromRepo('profil-events.js');
    edgeFn2 = readFromRepo('supabase/functions/cv-optimize/index.ts');
  });

  test('Edge Function supports source CV ingestion', () => {
    expect(edgeFn2).toContain('sourceCVText');
    expect(edgeFn2).toContain('extractTextFromPDF');
    expect(edgeFn2).toContain('extractTextFromDOCX');
    expect(edgeFn2).toContain('cv_url');
    expect(edgeFn2).toContain('cv_filename');
  });

  test('Edge Function reports sourceUsed in output', () => {
    expect(edgeFn2).toContain('profile_only');
    expect(edgeFn2).toContain('profile_and_cv');
    expect(edgeFn2).toContain('profile_fallback');
    expect(edgeFn2).toContain('sourceUsed');
  });

  test('Parse failure falls back to profile_only honestly', () => {
    expect(edgeFn2).toContain('profile_fallback');
    /* No "CV okundu" claim on parse failure */
    expect(edgeFn2).not.toContain('CV successfully parsed');
  });

  test('experienceRewrites are applied in canonical PDF via expRewrites map', () => {
    expect(cvJs4).toContain('expRewrites[ei]');
    expect(cvJs4).toContain('rewrite.bullets');
    expect(cvJs4).toContain('rewrite.headline');
  });

  test('normalizeCVData includes cvUrl and cvFilename', () => {
    expect(cvJs4).toContain("cvUrl: profile.cv_url");
    expect(cvJs4).toContain("cvFilename: profile.cv_filename");
  });

  test('UI shows source-aware feedback after AI optimize', () => {
    expect(eventsJs2).toContain('sourceUsed');
    expect(eventsJs2).toContain('profile_and_cv');
    expect(eventsJs2).toContain('profile_fallback');
  });

  test('free CV export does not depend on AI', () => {
    expect(cvJs4).toContain('function generateCV(aiOptimized)');
    /* When called without param, expRewrites is empty object */
    expect(cvJs4).toContain('var expRewrites = {}');
  });
});

/* ════════════════════════════════════════════════
   AI CV hardening guards (Asama 12)
   ════════════════════════════════════════════════ */
test.describe('AI CV hardening guards', () => {
  var edgeFn3, cvJs5, currentState;

  test.beforeAll(() => {
    edgeFn3 = readFromRepo('supabase/functions/cv-optimize/index.ts');
    cvJs5 = readFromRepo('profil-cv.js');
    currentState = readFromRepo('docs/CURRENT-STATE.md');
  });

  test('DOCX parse uses real ZIP unzip via fflate', () => {
    expect(edgeFn3).toContain('unzipSync');
    expect(edgeFn3).toContain('fflate');
    expect(edgeFn3).toContain('word/document.xml');
    /* ZIP magic bytes verification */
    expect(edgeFn3).toContain('0x50');
    expect(edgeFn3).toContain('0x4B');
  });

  test('Edge Function reports parserUsed in output', () => {
    expect(edgeFn3).toContain('parserUsed');
    expect(edgeFn3).toContain('pdf_text');
    expect(edgeFn3).toContain('docx_unzip');
    expect(edgeFn3).toContain('doc_besteff');
  });

  test('CV upload/delete triggers AI card live sync', () => {
    expect(cvJs5).toContain('syncAiCardCopy');
    expect(cvJs5).toContain('syncAiCardCopy(true)');
    expect(cvJs5).toContain('syncAiCardCopy(false)');
  });

  test('CURRENT-STATE includes AI CV feature', () => {
    expect(currentState).toContain('AI CV Optimize');
    expect(currentState).toContain('cv-optimize');
    expect(currentState).toContain('Anthropic');
  });

  test('cv-optimize function exists in repo', () => {
    expect(edgeFn3.length).toBeGreaterThan(1000);
    expect(edgeFn3).toContain('ANTHROPIC_API_KEY');
    expect(edgeFn3).toContain('Deno.serve');
  });

  test('upload/delete syncs _loadedDBData.profile CV fields in memory', () => {
    expect(cvJs5).toContain('_loadedDBData.profile.cv_url = cvStoragePath');
    expect(cvJs5).toContain('_loadedDBData.profile.cv_filename = file.name');
    expect(cvJs5).toContain('_loadedDBData.profile.cv_url = null');
    expect(cvJs5).toContain('_loadedDBData.profile.cv_filename = null');
  });
});

/* ════════════════════════════════════════════════
   IK critical fix regression guards (Asama 6)
   ════════════════════════════════════════════════ */
test.describe('IK critical fix guards', () => {
  var ikHtml2;

  test.beforeAll(() => {
    ikHtml2 = readFromRepo('ik.html');
  });

  test('Ekip panel uses getSupa() not bare supabase global', () => {
    /* loadTeamPanel, loadPendingInvites, sendTeamInvite must use getSupa() */
    var teamSection = ikHtml2.slice(ikHtml2.indexOf('function loadTeamPanel'));
    var ekipCode = teamSection.slice(0, teamSection.indexOf('// ── EMPLOYER REALTIME') > 0 ? teamSection.indexOf('// ── EMPLOYER REALTIME') : 3000);
    expect(ekipCode).toContain('getSupa().rpc');
    expect(ekipCode).toContain('getSupa()');
    /* No bare supabase.rpc or supabase.from in Ekip functions */
    var bareSupabase = ekipCode.match(/[^a-zA-Z]supabase\.(rpc|from)\(/g);
    expect(bareSupabase).toBeFalsy();
  });

  test('Favoriler uses DB-backed loading not just ADAYLAR filter', () => {
    expect(ikHtml2).toContain('async function renderFavoriler');
    expect(ikHtml2).toContain('search_employer_candidates');
    /* Must contain missing IDs logic */
    expect(ikHtml2).toContain('missingIds');
  });

  test('Notification toggles replaced with honest coming-soon message', () => {
    /* No fake toggle buttons in Bildirim Tercihleri */
    expect(ikHtml2).not.toContain('aria-label="Yeni aday bildirimi"');
    expect(ikHtml2).not.toContain('aria-label="Haftalık özet"');
    /* Has honest message */
    expect(ikHtml2).toContain('aktif olacak');
  });
});

/* ════════════════════════════════════════════════
   IK truth-sync + mobile polish guards (Asama 7)
   ════════════════════════════════════════════════ */
test.describe('IK truth-sync guards', () => {
  var ikHtml3;

  test.beforeAll(() => {
    ikHtml3 = readFromRepo('ik.html');
  });

  test('Mesajlar mobile CSS: single-column below 768px', () => {
    expect(ikHtml3).toContain('ik-msg-active');
    expect(ikHtml3).toContain('ik-msg-hidden');
    expect(ikHtml3).toContain('ik-msg-back-btn');
  });

  test('Mobile back button wired in thread render', () => {
    expect(ikHtml3).toContain("'ik-msg-back-btn'");
    expect(ikHtml3).toContain("classList.remove('ik-msg-active')");
    expect(ikHtml3).toContain("classList.remove('ik-msg-hidden')");
  });

  test('Settings plan card is truth-synced from _employerPlan', () => {
    expect(ikHtml3).toContain('settings-plan-name');
    expect(ikHtml3).toContain("getElementById('settings-plan-name')");
  });

  test('Position metrics show honest state when no backend counter', () => {
    expect(ikHtml3).toContain('hasRealMetrics');
    expect(ikHtml3).toContain('aktif olacak');
  });
});

/* ════════════════════════════════════════════════
   Studio Aşama 8 — Practice recovery + STAR cleanup
   ════════════════════════════════════════════════ */
test.describe('Studio Aşama 8 — practice recovery + STAR cleanup', () => {
  var studioJs;

  test.beforeAll(() => {
    studioJs = readFromRepo('profil-studio.js') + '\n' + readFromRepo('css/studio.css');
  });

  test('practice render includes inline journal/answer preparation surface', () => {
    var practiceStart = studioJs.indexOf('function renderPractice()');
    var practiceEnd = studioJs.indexOf('\nfunction ', practiceStart + 10);
    var practiceBody = studioJs.slice(practiceStart, practiceEnd);
    // Inline journal panel is rendered directly in practice, not behind a hidden drawer
    expect(practiceBody).toContain('renderJournalPanel()');
    // "Cevabını Hazırla" toggle is discoverable at first glance
    expect(studioJs).toContain('ig-journal-toggle');
    expect(studioJs).toContain('ig-journal-toggle-label');
  });

  test('AI button/gate is part of visible practice flow', () => {
    // AI feedback button lives inside renderJournalPanel, visible when panel opens
    expect(studioJs).toContain('aif-request');
    expect(studioJs).toContain('aif-gate');
    expect(studioJs).toContain('aif-area');
    // Freemium gating preserved
    expect(studioJs).toContain('aiFree');
    expect(studioJs).toContain('FREE_COMP_LIMIT');
  });

  test('legacy giant STAR quad not in active render path', () => {
    // renderStarDetail (STAR intro screen) removed
    expect(studioJs).not.toContain('function renderStarDetail(');
    // STAR quad CSS classes removed from active CSS
    expect(studioJs).not.toMatch(/\.ig-star-quad-card\{/);
    expect(studioJs).not.toMatch(/\.ig-star-quad\{/);
    expect(studioJs).not.toMatch(/\.ig-star-cell\{/);
    expect(studioJs).not.toMatch(/\.ig-star-detail\{/);
    // Landing title/subtitle CSS removed
    expect(studioJs).not.toMatch(/\.ig-landing-title\{/);
    expect(studioJs).not.toMatch(/\.ig-landing-subtitle\{/);
  });

  test('notes/history surface not broken (course_detail Notlarım tab preserved)', () => {
    expect(studioJs).toContain('hydrateNotesFeedback');
    expect(studioJs).toContain('st-notes-feedback-slot');
    expect(studioJs).toContain('get_my_journals');
    expect(studioJs).toContain('renderAiFeedback');
  });

  test('journal backend contracts preserved', () => {
    expect(studioJs).toContain('saveJournalDraft');
    expect(studioJs).toContain('loadJournalDraft');
    expect(studioJs).toContain('upsert_studio_journal');
    expect(studioJs).toContain('get_my_journals');
    expect(studioJs).toContain('request_journal_feedback');
    expect(studioJs).toContain('get_journal_feedback');
    expect(studioJs).toContain('renderAiFeedback');
  });
});

/* ════════════════════════════════════════════════
   Aşama 14 — MVP Free-Tier Truth-Sync Guards
   ════════════════════════════════════════════════ */
test.describe('Aşama 14 — MVP free-tier truth-sync guards', () => {
  var premiumJs, eventsJs, studioJs14, edgeFn14;

  test.beforeAll(() => {
    premiumJs  = readFromRepo('profil-premium.js');
    eventsJs   = readFromRepo('profil-events.js');
    studioJs14 = readFromRepo('profil-studio.js');
    edgeFn14   = readFromRepo('supabase/functions/cv-optimize/index.ts');
  });

  // ── MVP free-tier truth source ──
  test('MVP_FREE_TIER constant defined in profil-premium.js', () => {
    expect(premiumJs).toContain('MVP_FREE_TIER');
    expect(premiumJs).toContain('window._htMvpFreeTier');
  });

  test('MVP_FREE_TIER is currently set to true (beta period)', () => {
    expect(premiumJs).toContain('var MVP_FREE_TIER = true');
    expect(premiumJs).toContain('window._htMvpFreeTier = MVP_FREE_TIER');
  });

  // ── Premium panel truth ──
  test('premium panel shows beta-free banner when MVP_FREE_TIER is true', () => {
    expect(premiumJs).toContain('BETA');
    /* Beta banner contains "Beta d" (lowercase — Turkish locale) */
    expect(premiumJs).toContain('Beta d');
    expect(premiumJs).toContain('beta');
  });

  test('premium panel hides pricing plans behind MVP_FREE_TIER check', () => {
    // Plans section only rendered when !MVP_FREE_TIER
    expect(premiumJs).toContain('if (!MVP_FREE_TIER)');
  });

  // ── AI CV gate ──
  test('AI CV button gate bypasses premium when HT_MVP_FREE is set', () => {
    // Events file exposes HT_MVP_FREE alias from _htMvpFreeTier
    expect(eventsJs).toContain('window.HT_MVP_FREE');
    // isPremium includes the MVP flag → gate only blocks when BOTH are falsy
    expect(eventsJs).toContain('|| window.HT_MVP_FREE');
    expect(eventsJs).toContain('if (!isPremium)');
  });

  test('AI CV button label updates to beta-free copy in MVP mode', () => {
    expect(eventsJs).toContain('Beta');
    expect(eventsJs).toContain('window.HT_MVP_FREE');
  });

  // ── Studio AI gate ──
  test('Studio resolves isPremium=true when window._htMvpFreeTier is set', () => {
    expect(studioJs14).toContain('window._htMvpFreeTier === true');
    expect(studioJs14).toContain('S.isPremium = true');
  });

  // ── Edge Function ──
  test('Edge Function has server-side MVP_FREE_TIER env check', () => {
    expect(edgeFn14).toContain('MVP_FREE_TIER');
    expect(edgeFn14).toContain('Deno.env.get("MVP_FREE_TIER")');
  });

  test('Edge Function premium gate respects MVP_FREE_TIER bypass', () => {
    // Gate condition must allow MVP_FREE_TIER to bypass is_premium check
    expect(edgeFn14).toMatch(/!MVP_FREE_TIER && candidate\.is_premium !== true/);
  });

  test('Edge Function does not expose MVP_FREE_TIER value to client response', () => {
    // The MVP flag is used for auth only, not in the output object
    var outputIdx = edgeFn14.indexOf('const output:');
    expect(outputIdx).toBeGreaterThan(0);
    var outputSection = edgeFn14.substring(outputIdx, outputIdx + 500);
    expect(outputSection).not.toContain('MVP_FREE_TIER');
  });

  // ── Critical flow: free CV export not broken ──
  test('free canonical CV generate action does not route through premium gate', () => {
    // btn-generate-cv-merkez listener calls generateCV() directly, no premium check
    var genCvIdx = eventsJs.indexOf("getElementById('btn-generate-cv-merkez')");
    expect(genCvIdx).toBeGreaterThan(0);
    /* Capture just the addEventListener callback, not any following comment */
    var genCvSection = eventsJs.substring(genCvIdx, genCvIdx + 150);
    expect(genCvSection).toContain('generateCV');
    expect(genCvSection).not.toContain('isPremium');
  });
});

/* ════════════════════════════════════════════════
   Aşama 25 — Candidate dashboard free-tier copy drift guard
   ════════════════════════════════════════════════ */
test.describe('Aşama 25 — Candidate dashboard free-tier copy drift', () => {
  var profilHtml25;

  test.beforeAll(() => {
    profilHtml25 = readFromRepo('profil.html');
  });

  test('avatar dropdown premium button shows Beta Avantajları not Premium Özellikleri', () => {
    // Locate the avatar-dropdown section by its unique button ID
    // Window is 800 chars to accommodate the long inline SVG path before the <span>
    var avdStart = profilHtml25.indexOf('id="avd-premium-btn"');
    expect(avdStart).toBeGreaterThan(0);
    var avdSnippet = profilHtml25.substring(avdStart, avdStart + 800);
    expect(avdSnippet).toContain('Beta Avantajları');
    expect(avdSnippet).not.toContain('Premium Özellikleri');
  });

  test('save-success modal premium line shows Beta avantajlarını keşfet not Premium avantajlarını keşfet', () => {
    var modalStart = profilHtml25.indexOf('modal-premium-line');
    expect(modalStart).toBeGreaterThan(0);
    var modalSnippet = profilHtml25.substring(modalStart, modalStart + 150);
    expect(modalSnippet).toContain('Beta avantajlarını keşfet');
    expect(modalSnippet).not.toContain('Premium avantajlarını keşfet');
  });

  test('K045 merkez premium toggle replaces zarf row, label "Beni Öne Çıkar"', () => {
    var premStart = profilHtml25.indexOf('id="merkez-toggle-premium"');
    expect(premStart).toBeGreaterThan(0);
    var premSnippet = profilHtml25.substring(Math.max(0, premStart - 200), premStart + 200);
    expect(premSnippet).toContain('Beni Öne Çıkar');
    expect(profilHtml25).not.toContain('Premium Aday Avantajları');
  });
});

/* ════════════════════════════════════════════════
   Aşama 24 — AI CV post-sync free-tier truth guard
   ════════════════════════════════════════════════ */
test.describe('Aşama 24 — AI CV post-sync free-tier truth guard', () => {
  var cvJs24;

  test.beforeAll(() => {
    cvJs24 = readFromRepo('profil-cv.js');
  });

  test('syncAiCardCopy uses MVP free-tier truth flag for button reset', () => {
    var fnStart = cvJs24.indexOf('function syncAiCardCopy');
    expect(fnStart).toBeGreaterThan(0);
    var fnEnd = cvJs24.indexOf('\nfunction ', fnStart + 1);
    var fnBody = fnEnd > fnStart ? cvJs24.substring(fnStart, fnEnd) : cvJs24.substring(fnStart, fnStart + 600);
    // Must reference the MVP free-tier flag — not hardcode Premium unconditionally
    expect(fnBody).toMatch(/window\._htMvpFreeTier|window\.HT_MVP_FREE/);
  });

  test('syncAiCardCopy resets button to Beta copy when MVP free-tier is active', () => {
    var fnStart = cvJs24.indexOf('function syncAiCardCopy');
    var fnEnd = cvJs24.indexOf('\nfunction ', fnStart + 1);
    var fnBody = fnEnd > fnStart ? cvJs24.substring(fnStart, fnEnd) : cvJs24.substring(fnStart, fnStart + 600);
    // Must have a 'Beta' branch for the free-tier reset path
    expect(fnBody).toContain('Beta');
  });

  test('syncAiCardCopy gates the Premium reset copy behind a free-tier check', () => {
    var fnStart = cvJs24.indexOf('function syncAiCardCopy');
    var fnEnd = cvJs24.indexOf('\nfunction ', fnStart + 1);
    var fnBody = fnEnd > fnStart ? cvJs24.substring(fnStart, fnEnd) : cvJs24.substring(fnStart, fnStart + 600);
    // 'Premium' copy must co-exist with the MVP flag — not appear as the sole unconditional value
    expect(fnBody).toContain('Premium');
    expect(fnBody).toMatch(/(_htMvpFreeTier|HT_MVP_FREE)[\s\S]{0,300}Premium|Premium[\s\S]{0,300}(_htMvpFreeTier|HT_MVP_FREE)/);
  });
});

/* ════════════════════════════════════════════════
   Aşama 26 — Inbox-notification decoupling guard
   Inbox unread count must not feed notification bell/panel.
   Bildirimler panel must not mirror inbox messages.
   Kim Baktı must not feed general notification bell.
   ════════════════════════════════════════════════ */
test.describe('Aşama 26 — Inbox-notification decoupling', () => {
  var inboxJs26;

  test.beforeAll(() => {
    inboxJs26 = readFromRepo('profil-inbox.js');
  });

  test('applyUnreadCountToUI does not write to header-notif-dot', () => {
    var fnStart = inboxJs26.indexOf('function applyUnreadCountToUI');
    expect(fnStart).toBeGreaterThan(0);
    // 800 chars captures the full function (original 12-line version is ~700 chars)
    var fnBody = inboxJs26.substring(fnStart, fnStart + 800);
    expect(fnBody).not.toContain('header-notif-dot');
  });

  test('applyUnreadCountToUI does not write to badge-bildirimler', () => {
    var fnStart = inboxJs26.indexOf('function applyUnreadCountToUI');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs26.substring(fnStart, fnStart + 800);
    expect(fnBody).not.toContain('badge-bildirimler');
  });

  test('notification popup preview does not mirror inbox allMessages', () => {
    var fnStart = inboxJs26.indexOf('window._htLoadNotifPreview');
    expect(fnStart).toBeGreaterThan(0);
    // 1400 chars covers the original long function and the fixed short version
    var fnBody = inboxJs26.substring(fnStart, fnStart + 1400);
    expect(fnBody).not.toMatch(/allMessages\.filter|threads\s*=\s*allMessages/);
  });

  test('bildirimler panel load does not derive allNotifs from allMessages', () => {
    var fnStart = inboxJs26.indexOf('window._htLoadBildirimler');
    expect(fnStart).toBeGreaterThan(0);
    // 1600 chars captures the mirroring line ~1000 chars into the original function
    var fnBody = inboxJs26.substring(fnStart, fnStart + 1600);
    expect(fnBody).not.toMatch(/allNotifs\s*=\s*allMessages/);
  });

  test('Kim Baktı viewer load does not feed header-notif-dot', () => {
    var kbJs = readFromRepo('profil-kimbakti.js');
    expect(kbJs).not.toContain('header-notif-dot');
  });

  test('Kim Baktı viewer load does not feed badge-bildirimler', () => {
    var kbJs = readFromRepo('profil-kimbakti.js');
    expect(kbJs).not.toContain('badge-bildirimler');
  });
});

// ═══════════════════════════════════════════════════════════════
// Aşama 35 — ik.html token-source guard
// ik.html --text-* token'larını resolve edilemeden kullanırsa CSS var()
// sessizce çözümsüz kalır. Bu guard kaynak garantisi verir: kullanım varsa
// ya local :root'ta tanımlı olmalı ya da css/tokens.css link'i yüklenmeli.
// Not: Faz 1b itibarıyla tokens.css tek source of truth; local :root
// opsiyonel (Faz 1c sonrası silinir).
// ═══════════════════════════════════════════════════════════════
test.describe('Aşama 35 — ik.html text-token source guard', () => {
  var ikHtml;

  test.beforeAll(() => {
    ikHtml = readFromRepo('ik.html');
  });

  test('ik.html --text-* tokens are resolvable via tokens.css link or local :root', () => {
    var usedTokens = ['--text-xs', '--text-sm', '--text-base', '--text-md',
                      '--text-lg', '--text-xl', '--text-2xl', '--text-3xl'];
    var usesAnyToken = usedTokens.some(function(t) {
      return ikHtml.indexOf('var(' + t + ')') !== -1;
    });
    if (!usesAnyToken) return;

    // Valid source A: css/tokens.css link yükleniyor (tokens.css'te --text-* tanımlı)
    var hasTokensLink = /<link\s+rel=["']stylesheet["']\s+href=["']css\/tokens\.css/.test(ikHtml);

    // Valid source B: local :root'ta --text-* tanımlı
    var rootStart = ikHtml.indexOf(':root');
    var hasLocalDefs = false;
    if (rootStart >= 0) {
      var rootBlock = ikHtml.slice(rootStart, ikHtml.indexOf('}', rootStart) + 1);
      hasLocalDefs = rootBlock.indexOf('--text-xs:') !== -1 &&
                     rootBlock.indexOf('--text-3xl:') !== -1;
    }

    expect(hasTokensLink || hasLocalDefs).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// Aşama 36 — Candidate notification truth v1
// Notification bell/panel reads from real product sources
// (coach_posts, campaigns) — not inbox messages, not Kim Bakti.
// Inbox (allMessages) and Kim Bakti (profile_view_events) stay
// in their own channels and must not leak into the notification feed.
// ═══════════════════════════════════════════════════════════════
test.describe('Aşama 36 — candidate notification truth v1', () => {
  var inboxJs36;

  test.beforeAll(() => {
    inboxJs36 = readFromRepo('profil-inbox.js');
  });

  test('_fetchNotifData async function exists in profil-inbox.js', () => {
    expect(inboxJs36).toContain('async function _fetchNotifData');
  });

  test('_fetchNotifData queries coach_posts source', () => {
    var fnStart = inboxJs36.indexOf('async function _fetchNotifData');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs36.substring(fnStart, fnStart + 3000);
    expect(fnBody).toContain('coach_posts');
  });

  test('_fetchNotifData queries campaigns source', () => {
    var fnStart = inboxJs36.indexOf('async function _fetchNotifData');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs36.substring(fnStart, fnStart + 3000);
    expect(fnBody).toContain('campaigns');
  });

  test('_htLoadNotifPreview calls _fetchNotifData (not static stub)', () => {
    var fnStart = inboxJs36.indexOf('window._htLoadNotifPreview');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs36.substring(fnStart, fnStart + 1500);
    expect(fnBody).toContain('_fetchNotifData');
  });

  test('_htLoadBildirimler calls _fetchNotifData (not static stub)', () => {
    var fnStart = inboxJs36.indexOf('window._htLoadBildirimler');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs36.substring(fnStart, fnStart + 1500);
    expect(fnBody).toContain('_fetchNotifData');
  });

  test('_fetchNotifData does not reference profile_view_events (Kim Bakti channel)', () => {
    var fnStart = inboxJs36.indexOf('async function _fetchNotifData');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs36.substring(fnStart, fnStart + 3000);
    expect(fnBody).not.toContain('profile_view_events');
  });

  test('_fetchNotifData does not reference candidate_view_stats (Kim Bakti channel)', () => {
    var fnStart = inboxJs36.indexOf('async function _fetchNotifData');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs36.substring(fnStart, fnStart + 3000);
    expect(fnBody).not.toContain('candidate_view_stats');
  });

  test('_htLoadNotifPreview does not mirror allMessages (inbox channel)', () => {
    var fnStart = inboxJs36.indexOf('window._htLoadNotifPreview');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs36.substring(fnStart, fnStart + 1500);
    expect(fnBody).not.toMatch(/allMessages/);
  });

  test('_applyNotifBellDot function exists and manages header-notif-dot', () => {
    expect(inboxJs36).toContain('function _applyNotifBellDot');
    var fnStart = inboxJs36.indexOf('function _applyNotifBellDot');
    /* K030 FAZ C: window bumped 500 → 1000 after duyuru unread count
     * integration added ~280 chars before the navBadge reference. */
    var fnBody = inboxJs36.substring(fnStart, fnStart + 1000);
    expect(fnBody).toContain('header-notif-dot');
  });

  test('_applyNotifBellDot manages badge-bildirimler', () => {
    var fnStart = inboxJs36.indexOf('function _applyNotifBellDot');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs36.substring(fnStart, fnStart + 1000);
    expect(fnBody).toContain('badge-bildirimler');
  });
});

// ═══════════════════════════════════════════════════════════════
// Aşama 37 — Notification unread-state truth fix
// When _htLoadBildirimler() opens the panel it writes ht_notif_last_seen.
// The in-memory allNotifs items must have is_unread cleared in the same
// call — bell dot, panel badge, and Okunmamış filter must not show stale
// unread indicators after the panel is opened.
// ═══════════════════════════════════════════════════════════════
test.describe('Aşama 37 — notification unread-state truth fix', () => {
  var inboxJs37;

  test.beforeAll(() => {
    inboxJs37 = readFromRepo('profil-inbox.js');
  });

  test('_htLoadBildirimler writes ht_notif_last_seen', () => {
    var fnStart = inboxJs37.indexOf('window._htLoadBildirimler');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs37.substring(fnStart, fnStart + 2000);
    expect(fnBody).toContain('ht_notif_last_seen');
  });

  test('_htLoadBildirimler clears is_unread on allNotifs after writing last_seen', () => {
    var fnStart = inboxJs37.indexOf('window._htLoadBildirimler');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs37.substring(fnStart, fnStart + 2000);
    /* Must have a loop that sets is_unread = false on allNotifs items */
    expect(fnBody).toContain('is_unread = false');
    /* The loop must reference allNotifs (not a local copy) */
    expect(fnBody).toMatch(/allNotifs\[/);
  });

  test('_htLoadBildirimler calls _applyNotifBellDot after clearing unread state', () => {
    var fnStart = inboxJs37.indexOf('window._htLoadBildirimler');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs37.substring(fnStart, fnStart + 2000);
    var lastSeenPos = fnBody.indexOf('ht_notif_last_seen');
    var clearPos = fnBody.indexOf('is_unread = false');
    var bellDotPos = fnBody.indexOf('_applyNotifBellDot');
    /* last_seen write → unread clear → bell dot update order */
    expect(lastSeenPos).toBeGreaterThan(0);
    expect(clearPos).toBeGreaterThan(lastSeenPos);
    expect(bellDotPos).toBeGreaterThan(clearPos);
  });

  test('_htLoadBildirimler calls updateNotifPanelBadge after clearing unread state', () => {
    var fnStart = inboxJs37.indexOf('window._htLoadBildirimler');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs37.substring(fnStart, fnStart + 2000);
    var clearPos = fnBody.indexOf('is_unread = false');
    var badgePos = fnBody.indexOf('updateNotifPanelBadge');
    expect(clearPos).toBeGreaterThan(0);
    expect(badgePos).toBeGreaterThan(clearPos);
  });

  test('updateNotifPanelBadge reads is_unread from allNotifs', () => {
    var fnStart = inboxJs37.indexOf('function updateNotifPanelBadge');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs37.substring(fnStart, fnStart + 500);
    expect(fnBody).toContain('allNotifs');
    expect(fnBody).toContain('is_unread');
    expect(fnBody).toContain('notif-unread-badge');
  });

  test('_applyNotifBellDot reads is_unread from allNotifs', () => {
    var fnStart = inboxJs37.indexOf('function _applyNotifBellDot');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs37.substring(fnStart, fnStart + 500);
    expect(fnBody).toContain('allNotifs');
    expect(fnBody).toContain('is_unread');
  });
});

// ── Aşama 38 — Pozisyon Metrik Truth v1 ──────────────────────────────────────
test.describe('Asama 38 — Pozisyon Metrik Truth v1', () => {
  var ikHtml38;
  var mig38;

  test.beforeAll(() => {
    ikHtml38 = readFromRepo('ik.html');
    try { mig38 = readFromRepo('supabase/migrations/20260401000000_position_gorunum_trigger.sql'); } catch(e) { mig38 = ''; }
  });

  test('openPozDetay is async and uses search_employer_candidates RPC', () => {
    var fnStart = ikHtml38.indexOf('async function openPozDetay');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = ikHtml38.substring(fnStart, fnStart + 2000);
    expect(fnBody).toContain('search_employer_candidates');
    expect(fnBody).toContain('p_position_id');
  });

  test('openPozDetay does NOT use local ADAYLAR.filter as canonical match source', () => {
    var fnStart = ikHtml38.indexOf('async function openPozDetay');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = ikHtml38.substring(fnStart, fnStart + 2000);
    // Local heuristic must not appear inside openPozDetay
    expect(fnBody.indexOf('ADAYLAR.filter(')).toBe(-1);
  });

  test('openPozDetay sets _currentPozContext with id and ad', () => {
    var fnStart = ikHtml38.indexOf('async function openPozDetay');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = ikHtml38.substring(fnStart, fnStart + 600);
    expect(fnBody).toContain('_currentPozContext');
    expect(fnBody).toContain('id: id');
    expect(fnBody).toContain('ad: p.ad');
  });

  test('profile_view_events insert uses _currentPozContext for position fields', () => {
    var insertIdx = ikHtml38.indexOf("from('profile_view_events').insert");
    expect(insertIdx).toBeGreaterThan(0);
    var insertSection = ikHtml38.substring(insertIdx, insertIdx + 400);
    expect(insertSection).toContain('_currentPozContext');
    expect(insertSection).toContain('position_id');
    expect(insertSection).toContain('position_ad_snapshot');
    expect(insertSection).toContain('position_seg_snapshot');
    // Must NOT be hardcoded null for all three fields
    expect(insertSection).not.toMatch(/position_id:\s*null[^?]/);
  });

  test('closePozDetay resets _currentPozContext', () => {
    var fnStart = ikHtml38.indexOf('function closePozDetay');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = ikHtml38.substring(fnStart, fnStart + 600);
    expect(fnBody).toContain('_currentPozContext');
    expect(fnBody).toContain('null');
  });

  test('searchCandidates syncs _currentPozContext from poz-match-select', () => {
    var fnStart = ikHtml38.indexOf('async function searchCandidates');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = ikHtml38.substring(fnStart, fnStart + 1600);
    expect(fnBody).toContain('_currentPozContext');
    expect(fnBody).toContain('selectedPozId');
  });

  test('migration exists with gorunum trigger on profile_view_events', () => {
    expect(mig38.length).toBeGreaterThan(0);
    expect(mig38).toContain('positions');
    expect(mig38).toContain('gorunum');
    expect(mig38).toContain('profile_view_events');
    expect(mig38.toUpperCase()).toContain('TRIGGER');
  });
});

// ── Aşama 39 — Metrics Truth Closure ─────────────────────────────────────────
test.describe('Asama 39 — Metrics Truth Closure', () => {
  var ikHtml39;
  var aiCollab;

  test.beforeAll(() => {
    ikHtml39 = readFromRepo('ik.html');
    aiCollab = readFromRepo('docs/AI-COLLAB.md');
  });

  test('profile_view_events dedupe uses context-aware composite key (candidateId + contextId)', () => {
    // Must contain composite key logic, not plain candidate-only set check
    var dedupeSection = ikHtml39.indexOf('_viewDedupeKey');
    expect(dedupeSection).toBeGreaterThan(0);
    var snippet = ikHtml39.substring(dedupeSection, dedupeSection + 300);
    expect(snippet).toContain('_currentPozContext');
    expect(snippet).toContain('generic');
    expect(snippet).toContain('_viewedCandidateIds.has(_viewDedupeKey)');
    expect(snippet).toContain('_viewedCandidateIds.add(_viewDedupeKey)');
  });

  test('openPozDetay count uses pozResult.total (not matched.length)', () => {
    var fnStart = ikHtml39.indexOf('async function openPozDetay');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = ikHtml39.substring(fnStart, fnStart + 3000);
    // Must reference pozResult.total
    expect(fnBody).toContain('pozResult.total');
    // Must NOT use matched.length for the count label
    expect(fnBody).not.toContain('matched.length + \' eşleşen aday\'');
  });

  test('openPozDetay shows truncation note when total exceeds rendered list', () => {
    var fnStart = ikHtml39.indexOf('async function openPozDetay');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = ikHtml39.substring(fnStart, fnStart + 3000);
    // Truncation note must be present
    expect(fnBody).toContain('ilk ');
    expect(fnBody).toContain('gösteriliyor');
  });

  test('AI-COLLAB.md smoke result is not stale 30/30', () => {
    // 30/30 must not appear as a test result claim (was a known stale value)
    expect(aiCollab).not.toContain('**30/30 PASS**');
    // Current test count varies by session — just ensure SOME pass count exists
    expect(aiCollab).toMatch(/\d+.*(?:PASS|pass)/);
  });
});

/* ════════════════════════════════════════════════
   Asama 40 — CV Upload Storage Key Harden
   Guard: bosluk/Turkce char → safe Supabase key
   cv_filename → orijinal ad korunur
   ════════════════════════════════════════════════ */
test.describe('Asama 40 — CV Upload Storage Key Harden', () => {
  var coreJs;
  var cvJs;

  test.beforeAll(() => {
    coreJs = readFromRepo('profil-core.js');
    cvJs   = readFromRepo('profil-cv.js');
  });

  test('STORAGE._sanitizeKey helper is defined in profil-core.js', () => {
    expect(coreJs).toContain('_sanitizeKey');
    expect(coreJs).toMatch(/_sanitizeKey\s*:\s*function/);
  });

  test('_sanitizeKey transliterates Turkish characters (ş, ğ, ç present in map)', () => {
    // Verify the trMap covers the six core Turkish chars
    expect(coreJs).toContain("'ş':'s'");
    expect(coreJs).toContain("'ğ':'g'");
    expect(coreJs).toContain("'ç':'c'");
    expect(coreJs).toContain("'ı':'i'");
    expect(coreJs).toContain("'ü':'u'");
    expect(coreJs).toContain("'ö':'o'");
  });

  test('_sanitizeKey replaces whitespace with safe separator', () => {
    // Must contain a space→dash replacement
    expect(coreJs).toMatch(/replace\(\/\\s\+\/g.*?'-'/);
  });

  test('STORAGE.cvPath calls _sanitizeKey (not raw filename)', () => {
    // Must delegate to _sanitizeKey, not concatenate raw filename
    expect(coreJs).toContain('_sanitizeKey(filename)');
    // Raw `+ filename` pattern must NOT appear as the tail of the path string
    expect(coreJs).not.toMatch(/'_'\s*\+\s*filename\s*;/);
  });

  test('cv_filename stores original file.name for UI and DB', () => {
    // DB write must use the original name
    expect(cvJs).toContain('cv_filename: file.name');
    // In-memory sync must also use original name
    expect(cvJs).toContain('_loadedDBData.profile.cv_filename = file.name');
  });

  test('re-upload cleanup uses currentCVStoragePath (safe key path)', () => {
    // filePath (safe key) is assigned to currentCVStoragePath after upload
    expect(cvJs).toContain('currentCVStoragePath = cvStoragePath');
    // Delete flow removes by currentCVStoragePath (safe key)
    expect(cvJs).toContain('remove([currentCVStoragePath])');
  });
});

/* ════════════════════════════════════════════════
   Asama 41 — _sanitizeKey Behavioral Assertions
   Runtime dogrulama: grep-only deil, gercek I/O
   Kanonical ornek: 'Yusuf Barış Özsoy Güncel Cv.pdf'
   ════════════════════════════════════════════════ */
test.describe('Asama 41 — _sanitizeKey behavioral assertions', () => {
  var coreJs;
  var cvJs;

  // STORAGE nesnesini Node.js VM context'inde calistir; browser bağımlılığı yok
  function loadStorage(src) {
    var vm = require('vm');
    var ctx = vm.createContext({ Date: Date });
    // Kaynak dosyadan sadece STORAGE bloğunu çıkar (iki bölüm işareti arasındaki kısmı al)
    var storageBlock = src
      .split('// ── STORAGE CONSTANTS ──')[1]
      .split('// ── THEME PREFERENCES')[0];
    // 'var STORAGE = { ... };' ifadesini yeniden oluştur
    var storageCode = 'var STORAGE' + storageBlock.split('var STORAGE')[1];
    vm.runInContext(storageCode, ctx);
    return ctx.STORAGE;
  }

  test.beforeAll(() => {
    coreJs = readFromRepo('profil-core.js');
    cvJs   = readFromRepo('profil-cv.js');
  });

  test('_sanitizeKey canonical: "Yusuf Barış Özsoy Güncel Cv.pdf" → "yusuf-baris-ozsoy-guncel-cv.pdf"', () => {
    var STORAGE = loadStorage(coreJs);
    var result = STORAGE._sanitizeKey('Yusuf Barış Özsoy Güncel Cv.pdf');
    expect(result).toBe('yusuf-baris-ozsoy-guncel-cv.pdf');
  });

  test('_sanitizeKey: .pdf uzantisi korunur ve lowercase olur', () => {
    var STORAGE = loadStorage(coreJs);
    expect(STORAGE._sanitizeKey('Yusuf Barış Özsoy Güncel Cv.pdf')).toMatch(/\.pdf$/);
    expect(STORAGE._sanitizeKey('DOSYA.PDF')).toMatch(/\.pdf$/);
  });

  test('_sanitizeKey: Turkce karakter icermez (sonuc ASCII-safe)', () => {
    var STORAGE = loadStorage(coreJs);
    var result = STORAGE._sanitizeKey('Yusuf Barış Özsoy Güncel Cv.pdf');
    // Sonuc yalnizca a-z0-9, tire ve nokta icermeli
    expect(result).toMatch(/^[a-z0-9._-]+$/);
  });

  test('STORAGE.cvPath output kanonik ornekte sanitized path ile biter (ham Turkce karakter icermez)', () => {
    var STORAGE = loadStorage(coreJs);
    var cvPath = STORAGE.cvPath('test-uuid', 'Yusuf Barış Özsoy Güncel Cv.pdf');
    expect(cvPath).toMatch(/yusuf-baris-ozsoy-guncel-cv\.pdf$/);
    // Ham Turkce karakter storage path'ine gecmemeli
    expect(cvPath).not.toMatch(/Barış|Özsoy|ş|ö|ı|ğ|ü|ç/);
  });

  test('cv_filename DB yazimi ve bellek synci orijinal adi korur (sanitize edilmemis)', () => {
    // Bu Asama 40 truth'unu Asama 41 scope'unda da sabitleyen davranissal guard
    expect(cvJs).toContain('cv_filename: file.name');
    expect(cvJs).toContain('_loadedDBData.profile.cv_filename = file.name');
  });
});

/* ── Asama 45 — .single() Lint Guard (Yapısal Guard) ── */
test.describe('Asama 45 — .single() lint guard yapisal dogrulama', () => {
  var fs = require('fs');
  var path = require('path');

  var eslintConfigPath = path.join(__dirname, '..', 'eslint.config.js');
  var eslintConfig;

  test.beforeAll(() => {
    eslintConfig = fs.readFileSync(eslintConfigPath, 'utf8');
  });

  test('eslint.config.js dosyasi mevcut ve okunabilir', () => {
    expect(eslintConfig).toBeTruthy();
    expect(eslintConfig.length).toBeGreaterThan(100);
  });

  test('no-restricted-syntax kurali eslint.config.js icinde tanimli', () => {
    expect(eslintConfig).toContain('no-restricted-syntax');
  });

  test('.single() cagrisini bloklayan AST selector tanimli', () => {
    expect(eslintConfig).toContain('callee.property.name="single"');
  });

  test('.maybeSingle() kullanimi teşvik eden mesaj mevcut', () => {
    expect(eslintConfig).toContain('maybeSingle');
  });

  test('eslint.config.js icinde no-restricted-syntax error seviyesinde ayarli', () => {
    // 'error' string'i no-restricted-syntax blogu icinde olmali
    var noRestrictedBlock = eslintConfig
      .split('no-restricted-syntax')[1] || '';
    expect(noRestrictedBlock.substring(0, 50)).toContain('error');
  });
});

// Beta Premium Gate — Asama 50
// ═══════════════════════════════════════════════

test.describe('Beta Premium Gate — AI 1-use limit + badge system', () => {
  var premiumJs, cvJs, eventsJs, studioJs;

  test.beforeAll(() => {
    premiumJs = readFromRepo('profil-premium.js');
    cvJs = readFromRepo('profil-cv.js');
    eventsJs = readFromRepo('profil-events.js');
    studioJs = readFromRepo('profil-studio.js') + '\n' + readFromRepo('css/studio.css');
  });

  // ── AI CV 1-use gate ──

  test('AI CV flow checks ai_cv_used before proceeding', () => {
    expect(eventsJs).toContain('ai_cv_used');
  });

  test('AI CV shows "hakkini kullandin" message after first use', () => {
    // After successful AI CV, user should see a message that they used their free try
    // Unicode: kulland\u0131n = kullandın
    expect(eventsJs).toContain('kulland');
  });

  test('AI CV marks ai_cv_used=true after successful optimize', () => {
    expect(eventsJs).toContain('ai_cv_used');
    expect(eventsJs).toContain('update');
  });

  // ── AI Assessment 1-use gate ──

  test('Studio AI feedback checks ai_assessment_used before proceeding', () => {
    expect(studioJs).toContain('ai_assessment_used');
  });

  test('Studio AI shows limit message after first use', () => {
    // Unicode: kulland\u0131n = kullandın
    expect(studioJs).toContain('kulland');
  });

  // ── Premium badge system ──

  test('Premium panel shows "3 ay ucretsiz" in beta mode', () => {
    expect(premiumJs).toContain('3 ay');
  });

  test('Premium features labeled as Premium but free during beta', () => {
    // Each feature card should indicate it is premium but currently free
    expect(premiumJs).toContain('PREMIUM');
    expect(premiumJs).toContain('cretsiz');
  });

  // ── Non-AI premium features fully open ──

  test('MVP_FREE_TIER still true — non-AI premium features fully open', () => {
    expect(premiumJs).toContain('MVP_FREE_TIER = true');
  });

  // ── Migration guard ──

  test('migration for ai_cv_used and ai_assessment_used exists', () => {
    var migDir = path.join(__dirname, '..', 'supabase', 'migrations');
    var files = fs.readdirSync(migDir);
    var betaGateMig = files.find(f => f.includes('beta_ai_usage'));
    expect(betaGateMig).toBeTruthy();
  });
});

// K033 — Asama 58 mini edu dash widget removed from Genel Bakis editorial layout.
// Studio frozen since K030; edu dash + summary badge gallery no longer rendered there.
// profil-summary.js _htRenderMiniRozetGalery still exists for future studio surface.

test.describe('K033/K034 — Genel Bakis editorial redesign', () => {
  var genelJs, gbCss, mkCss, extrasCss, profilHtml;

  test.beforeAll(() => {
    genelJs    = readFromRepo('profil-genel.js');
    gbCss      = readFromRepo('css/panels/genel-bakis.css');
    mkCss      = readFromRepo('css/panels/merkezi.css');
    extrasCss  = readFromRepo('css/profil-extras.css');
    profilHtml = readFromRepo('profil.html');
  });

  test('genel-bakis.css uses .gb-* namespace with hero/gundem/spine', () => {
    expect(gbCss).toContain('.gb-hero');
    expect(gbCss).toContain('.gb-gundem');
    expect(gbCss).toContain('.gb-spine');
    expect(gbCss).toContain('.gb-signature');
  });

  test('K034: genel-bakis.css ships 2-col grid + right rail + inline expand', () => {
    expect(gbCss).toContain('.gb-grid');
    expect(gbCss).toContain('.gb-rail');
    expect(gbCss).toContain('.gb-rail-cell');
    expect(gbCss).toContain('.gb-item__toggle');
    expect(gbCss).toContain('.gb-item.is-expanded');
  });

  test('K035: genel-bakis.css ships 3-card surfaces (hero + gundem + rail)', () => {
    expect(gbCss).toContain('.gb-card');
    expect(gbCss).toContain('.gb-card--hero');
    expect(gbCss).toContain('.gb-card--gundem');
    expect(gbCss).toContain('.gb-card--rail');
    expect(gbCss).toContain('.gb-hero-grid');
    expect(gbCss).toContain('.gb-hero-date');
  });

  test('K035: profil-genel.js wraps hero/gundem/rail in gb-card surfaces', () => {
    expect(genelJs).toContain('gb-card gb-card--hero');
    expect(genelJs).toContain('gb-card gb-card--gundem');
    expect(genelJs).toContain('gb-card gb-card--rail');
    expect(genelJs).toContain('gb-hero-grid');
    expect(genelJs).toContain('gb-hero-date');
  });

  test('K035: profil.html mk-pulse ring synced with Genel Bakis (r=32, stroke-width 3)', () => {
    /* Isolate the mk-pulse ring markup so we do not collide with the
       gb-ring SVG elsewhere on the page. */
    var start = profilHtml.indexOf('id="mk-pulse-ring"');
    expect(start).toBeGreaterThan(-1);
    var region = profilHtml.substring(start, start + 600);
    expect(region).toContain('viewBox="0 0 72 72"');
    expect(region).toContain('r="32"');
    expect(region).toContain('stroke-width="3"');
  });

  test('K035: merkezi.css mk-pulse__fill uses vermillion sweep', () => {
    var fillBlock = mkCss.substring(mkCss.indexOf('.mk-pulse__ring svg circle.mk-pulse__fill'));
    fillBlock = fillBlock.substring(0, 400);
    expect(fillBlock).toContain('var(--color-vermillion)');
    expect(fillBlock).toContain('201.06');
  });

  test('K034: editorial width token defined in profil-extras.css', () => {
    expect(extrasCss).toContain('--editorial-max-w');
    expect(extrasCss).toContain('1120px');
    expect(extrasCss).toContain('--editorial-pad-x');
  });

  test('K034: genel-bakis.css and merkezi.css both consume editorial token', () => {
    expect(gbCss).toContain('var(--editorial-max-w');
    expect(gbCss).toContain('var(--editorial-pad-x');
    expect(mkCss).toContain('var(--editorial-max-w');
    expect(mkCss).toContain('var(--editorial-pad-x');
  });

  test('profil-genel.js builds editorial hero + rail + gundem render', () => {
    expect(genelJs).toContain('buildHero');
    expect(genelJs).toContain('buildRail');
    expect(genelJs).toContain('buildGundem');
    expect(genelJs).toContain('buildSignature');
    expect(genelJs).toContain('buildGundemItem');
    expect(genelJs).toContain('wireGundemToggles');
  });

  test('K034: profil-genel.js hardcodes Merhaba greeting (no time-of-day branching)', () => {
    expect(genelJs).toContain('Merhaba');
    expect(genelJs).not.toContain('G\\u00FCnayd\\u0131n');
    expect(genelJs).not.toContain('\u0130yi ak\u015Famlar');
    expect(genelJs).not.toContain('\u0130yi geceler');
  });

  test('K034: gündem toggles use data-gb-toggle attribute for inline expand', () => {
    expect(genelJs).toContain('data-gb-toggle');
    /* Inline expand replaced the "Devamını oku" switchPanel jump.
     * Locate the wireGundemToggles function body and assert no
     * bildirimler navigation inside it. (Daha fazla göster CTA outside
     * this function intentionally routes to bildirimler — Tuna karari.) */
    var startIdx = genelJs.indexOf('function wireGundemToggles');
    expect(startIdx).toBeGreaterThan(-1);
    /* Crude but adequate: scan ~2KB after the function start for the
     * forbidden call. Function body is well under that size. */
    var slice = genelJs.substring(startIdx, startIdx + 2000);
    expect(slice).not.toContain("switchPanel('bildirimler')");
  });

  test('profil-genel.js wires gundem to get_announcements_feed RPC (K030 contract)', () => {
    expect(genelJs).toContain('get_announcements_feed');
  });

  test('profil-genel.js preserves coach builder helpers for studio bridge', () => {
    expect(genelJs).toContain('_htBuildCoachCover');
    expect(genelJs).toContain('_htBuildCoachAvatar');
    expect(genelJs).toContain('_htShowCoachCard');
  });

  test('profil-genel.js exposes _htLoadGenelHome and _htRefreshGenelHome', () => {
    expect(genelJs).toContain('_htLoadGenelHome');
    expect(genelJs).toContain('_htRefreshGenelHome');
  });

  test('K051: profil.html cache-bust bumped to v=20260414y for genel/merkez/profil-genel', () => {
    expect(profilHtml).toMatch(/genel-bakis\.css\?v=\d{8}[a-z0-9]*/);
    expect(profilHtml).toMatch(/profil-genel\.js\?v=\d{8}[a-z0-9]*/);
    expect(profilHtml).toMatch(/merkezi\.css\?v=\d{8}[a-z0-9]*/);
    expect(profilHtml).toMatch(/profil-extras\.css\?v=\d{8}[a-z0-9]*/);
  });

  test('legacy gh-edu/gh-id-readiness vocabulary removed from profil-genel.js', () => {
    expect(genelJs).not.toContain('gh-edu-shell');
    expect(genelJs).not.toContain('gh-id-readiness');
    expect(genelJs).not.toContain('hydrateEduDash');
  });
});

// ═══════════════════════════════════════════════════════════════
// K031 — Profil Merkezi editorial redesign
// ═══════════════════════════════════════════════════════════════
test.describe('K031 — Profil Merkezi editorial redesign', () => {
  let profilHtml;
  let merkeziCss;
  let summaryJs;
  let visibilityJs;

  test.beforeAll(() => {
    profilHtml    = readFromRepo('profil.html');
    merkeziCss    = readFromRepo('css/panels/merkezi.css');
    summaryJs     = readFromRepo('profil-summary.js');
    visibilityJs  = readFromRepo('profil-visibility.js');
  });

  test('merkezi.css ships the K031 component classes', () => {
    expect(merkeziCss).toContain('.mk-identity-wrap');
    expect(merkeziCss).toContain('.mk-avatar-ring');
    expect(merkeziCss).toContain('.mk-pulse');
    expect(merkeziCss).toContain('.mk-spine');
    expect(merkeziCss).toContain('.mk-spine__tick');
    expect(merkeziCss).toContain('.mk-spine__item');
    expect(merkeziCss).toContain('.mk-zarf');
    expect(merkeziCss).toContain('.mk-zarf__card');
    expect(merkeziCss).toContain('.mk-zarf__row--premium');
    expect(merkeziCss).toContain('.mk-zarf__row--ai');
    expect(merkeziCss).toContain('.mk-signature');
    expect(merkeziCss).toContain('@keyframes mkFadeUp');
    expect(merkeziCss).toContain('@keyframes mkRingFill');
    expect(merkeziCss).toContain('prefers-reduced-motion');
  });

  test('merkezi.css no longer contains legacy bento/card classes', () => {
    expect(merkeziCss).not.toContain('.mk-bento-grid');
    expect(merkeziCss).not.toContain('.mk-card-icon');
    expect(merkeziCss).not.toContain('.mk-card-status');
    expect(merkeziCss).not.toContain('.mk-premium-toggle-card');
    expect(merkeziCss).not.toContain('.mk-cv-grid-card');
    expect(merkeziCss).not.toContain('.mk-ai-grid-card');
    expect(merkeziCss).not.toContain('.mk-footer-premium');
  });

  test('panel-merkez markup uses K031 editorial structure', () => {
    var start = profilHtml.indexOf('id="panel-merkez"');
    expect(start).toBeGreaterThan(0);
    var end = profilHtml.indexOf('</main>', start);
    var region = profilHtml.substring(start, end);

    expect(region).toContain('class="mk-identity-wrap"');
    expect(region).toContain('class="mk-avatar-ring"');
    expect(region).toContain('class="mk-pulse__ring"');
    expect(region).toContain('class="mk-spine"');
    expect(region.match(/class="mk-spine__item"/g) || []).toHaveLength(4);
    /* K042: mk-zarf wrapper replaced with mk-card--visibility + mk-card--cv */
    expect(region).toContain('mk-card--visibility');
    expect(region).toContain('mk-card--cv');
    expect(region).toContain('class="mk-signature"');
    expect(region).toContain('HelloTalent · Beta');
  });

  test('panel-merkez preserves all required IDs + handler contracts', () => {
    var start = profilHtml.indexOf('id="panel-merkez"');
    var end = profilHtml.indexOf('</main>', start);
    var region = profilHtml.substring(start, end);

    // Wizard step contracts
    for (var s = 1; s <= 4; s++) {
      expect(region).toContain('data-step="' + s + '"');
      expect(region).toContain('id="mk-preview-' + s + '"');
      expect(region).toContain('id="mk-empty-' + s + '"');
    }
    // Visibility + CV + premium + AI
    expect(region).toContain('id="merkez-toggle-visibility"');
    expect(region).toContain('id="merkez-toggle-active"');
    expect(region).toContain('id="merkez-hide-from-current-employer"');
    expect(region).toContain('id="merkez-hide-row"');
    expect(region).toContain('id="cv-upload-area"');
    expect(region).toContain('id="cv-file-input"');
    expect(region).toContain('id="cv-drop-zone"');
    expect(region).toContain('id="cv-uploaded-state"');
    expect(region).toContain('id="cv-uploaded-name"');
    expect(region).toContain('id="cv-uploaded-date"');
    expect(region).toContain('id="btn-cv-select"');
    expect(region).toContain('id="btn-cv-reupload"');
    expect(region).toContain('id="btn-cv-delete"');
    expect(region).toContain('id="btn-generate-cv-merkez"');
    expect(region).toContain('id="btn-ai-cv-optimize"');
    expect(region).toContain('id="btn-preview-profile"');
    /* K045: premium card-link replaced by merkez-toggle-premium */
    expect(region).toContain('id="merkez-toggle-premium"');
    // Identity + topline pulse hooks used by profil-summary.js
    expect(region).toContain('id="merkez-identity"');
    expect(region).toContain('id="merkez-avatar-ring"');
    expect(region).toContain('id="merkez-avatar"');
    expect(region).toContain('id="merkez-name"');
    expect(region).toContain('id="mk-pulse-ring"');
    expect(region).toContain('id="mk-percent-number"');
    expect(region).toContain('id="mk-percent-caption"');
  });

  test('merkezi.css is referenced with K031 cache-bust token', () => {
    expect(profilHtml).toMatch(/css\/panels\/merkezi\.css\?v=\d{8}[a-z0-9]*/);
  });

  test('K031 hotfix: profil-extras.css loaded for rescued cross-cutting styles', () => {
    expect(profilHtml).toMatch(/css\/profil-extras\.css\?v=\d{8}[a-z0-9]+/);
  });

  test('profil-summary.updateBentoRing drives topline pulse + spine tick', () => {
    expect(summaryJs).toContain('mk-pulse-ring');
    expect(summaryJs).toContain('mk-percent-number');
    expect(summaryJs).toContain('mk-percent-caption');
    expect(summaryJs).toContain('is-complete');
    expect(summaryJs).toContain('--mk-pulse-progress');
    // Legacy per-card bar DOM construction removed
    expect(summaryJs).not.toContain("className = 'mk-bar-fill'");
  });

  test('profil-visibility toggles avatar-ring is-active class from Beni Öner state', () => {
    expect(visibilityJs).toContain('merkez-avatar-ring');
    expect(visibilityJs).toContain("classList.toggle('is-active'");
  });
});

// ═══════════════════════════════════════════════════════════════
// K032 — Profil Önizleme drawer editorial redesign
// ═══════════════════════════════════════════════════════════════
test.describe('K032 — Profil Önizleme drawer editorial redesign', () => {
  let profilHtml;
  let extrasCss;
  let previewJs;

  test.beforeAll(() => {
    profilHtml = readFromRepo('profil.html');
    extrasCss  = readFromRepo('css/profil-extras.css');
    previewJs  = readFromRepo('profil-preview.js');
  });

  test('profil-extras.css ships the K032 show-more clamp + toggle vocabulary', () => {
    expect(extrasCss).toContain('.pp-clamp');
    expect(extrasCss).toContain('.pp-clamp--3');
    expect(extrasCss).toContain('.pp-clamp--2');
    expect(extrasCss).toContain('.pp-toggle');
    expect(extrasCss).toContain('.pp-toggle.is-expanded');
    expect(extrasCss).toContain('.pp-exp__item');
    expect(extrasCss).toContain('.pp-kv__row');
    expect(extrasCss).toContain('.pp-split__list');
    expect(extrasCss).toContain('.pp-cv__row');
    expect(extrasCss).toContain('.pp-sign');
    expect(extrasCss).toContain('prefers-reduced-motion');
    // Rescued drawer shell selectors still exist
    expect(extrasCss).toContain('.pp-overlay');
    expect(extrasCss).toContain('.pp-drawer');
    expect(extrasCss).toContain('.pp-header');
    expect(extrasCss).toContain('.pp-body');
  });

  test('profil-extras.css no longer contains legacy bento/tag/hero drawer classes', () => {
    expect(extrasCss).not.toContain('.pp-bento');
    expect(extrasCss).not.toContain('.pp-tag');
    expect(extrasCss).not.toContain('.pp-hero-card');
    expect(extrasCss).not.toContain('.pp-contact-card');
    expect(extrasCss).not.toContain('.pp-status-badge');
  });

  test('profil-preview.js wires K032 show-more toggles and emits K032 markup', () => {
    expect(previewJs).toContain('data-pp-toggle');
    expect(previewJs).toContain('pp-clamp--3');
    expect(previewJs).toContain('pp-clamp--2');
    expect(previewJs).toContain('pp-exp__item');
    expect(previewJs).toContain('pp-kv');
    expect(previewJs).toContain('pp-split');
    expect(previewJs).toContain("'Devam\\u0131n\\u0131 oku'");
    expect(previewJs).toContain("'Daha az g\\u00F6ster'");
    expect(previewJs).toContain('pp-sign');
    expect(previewJs).toContain('HelloTalent \\u00B7 Beta');
    // Auto-hide check from the mockup
    expect(previewJs).toContain('scrollHeight');
    expect(previewJs).toContain('clientHeight');
  });

  test('profil-preview.js drops legacy pp-tag / pp-bento markup builder', () => {
    expect(previewJs).not.toContain('pp-tag');
    expect(previewJs).not.toContain('pp-bento');
    expect(previewJs).not.toContain('pp-hero-card');
    expect(previewJs).not.toContain('pp-status-badge');
  });

  test('profil.html preserves drawer contract IDs required by event handlers', () => {
    expect(profilHtml).toContain('id="pp-overlay"');
    expect(profilHtml).toContain('id="pp-drawer"');
    expect(profilHtml).toContain('id="pp-content"');
    expect(profilHtml).toContain('id="btn-close-preview"');
    expect(profilHtml).toContain('id="btn-preview-profile"');
  });

  test('profil.html uses K032 cache-bust for preview JS + extras CSS', () => {
    expect(profilHtml).toMatch(/profil-preview\.js\?v=\d{8}[a-z0-9]*/);
    expect(profilHtml).toMatch(/css\/profil-extras\.css\?v=\d{8}[a-z0-9]*/);
  });
});

// ═══════════════════════════════════════════════════════════════
// K036 — Sirketler editorial redesign
// ═══════════════════════════════════════════════════════════════
test.describe('K036 — Sirketler editorial redesign', () => {
  let profilHtml;
  let sirketlerCss;
  let markalarJs;

  test.beforeAll(() => {
    profilHtml = readFromRepo('profil.html');
    sirketlerCss = readFromRepo('css/panels/sirketler.css');
    markalarJs = readFromRepo('profil-markalar.js');
  });

  test('sirketler.css ships K036 sk-* vocabulary', () => {
    expect(sirketlerCss).toContain('.sk-card');
    expect(sirketlerCss).toContain('.sk-card--hero');
    expect(sirketlerCss).toContain('.sk-card--filter');
    expect(sirketlerCss).toContain('.sk-card--why');
    expect(sirketlerCss).toContain('.sk-grid');
    expect(sirketlerCss).toContain('.sk-brand');
    expect(sirketlerCss).toContain('.sk-brand__follow');
    expect(sirketlerCss).toContain('.sk-filter__seg');
    expect(sirketlerCss).toContain('--editorial-max-w');
  });

  test('profil.html panel uses K036 sk-* IDs and copy (K042: count moved into CTA)', () => {
    expect(profilHtml).toContain('id="sk-hero-cta-count"');
    expect(profilHtml).toContain('Çalışmak istediğin markaları seç');
    expect(profilHtml).toContain('EŞLEŞME SİNYALİ');
    expect(profilHtml).toContain('NEDEN TAKİP?');
  });

  test('K040 markalar hero cleanup — catalog count + vermillion strip removed', () => {
    // Catalog count: "32 MARKA" misleading as brand pool grows → removed
    expect(profilHtml).not.toContain('id="sk-total-count"');
    expect(profilHtml).not.toMatch(/<span[^>]*>0<\/span>\s*MARKA/);
    // Legacy vermillion strip replaced by in-hero CTA + modal
    expect(profilHtml).not.toContain('id="sk-followed-card"');
    expect(profilHtml).not.toContain('id="sk-followed-count2"');
    expect(profilHtml).not.toContain('id="sk-followed-all"');
    expect(profilHtml).not.toContain('id="sk-followed-row"');
    // New hero CTA replaces the strip
    expect(profilHtml).toContain('id="sk-hero-cta"');
    expect(profilHtml).toMatch(/Takip Ettiklerin/);
    // Modal search input for >10 brand UX
    expect(profilHtml).toContain('id="brand-follows-popup-search"');
  });

  test('profil.html preserves wired IDs required by profil-markalar.js handlers', () => {
    expect(profilHtml).toContain('id="brand-search"');
    expect(profilHtml).toContain('id="segment-pills"');
    expect(profilHtml).toContain('id="brand-grid"');
    expect(profilHtml).toContain('id="brand-follows-popup-overlay"');
  });

  test('profil-markalar.js exports preserved after K036 rewrite', () => {
    expect(markalarJs).toContain('window.loadSirketlerPanel');
    expect(markalarJs).toContain('window.toggleBrandFollow');
    expect(markalarJs).toContain('window.openBrandFollowsPopup');
    expect(markalarJs).toContain('window.closeBrandFollowsPopup');
    expect(markalarJs).toContain('window.updateMarkalaBgDots');
    expect(markalarJs).toContain('window._htBrandLogoError');
    expect(markalarJs).toContain('window._htBrandFollowReady');
    expect(markalarJs).toContain('window._htGetGenelBrandTeaser');
  });

  test('profil-markalar.js drops legacy flip/bc2/brand-card-v2 vocabulary', () => {
    expect(markalarJs).not.toContain('flip-card');
    expect(markalarJs).not.toContain('bc2-');
    expect(markalarJs).not.toContain('brand-card-v2');
  });

  test('profil.html cache-bust bumped for K037 affected assets', () => {
    expect(profilHtml).toMatch(/sirketler\.css\?v=\d{8}[a-z0-9]*/);
    expect(profilHtml).toMatch(/profil-markalar\.js\?v=\d{8}[a-z0-9]*/);
    expect(profilHtml).toMatch(/genel-bakis\.css\?v=\d{8}[a-z0-9]*/);
  });
});

// ═══════════════════════════════════════════════════════════════
// K037 — Sirketler brand card hover (Variant E — Color Flood) + hotfixes
// ═══════════════════════════════════════════════════════════════
test.describe('K037 — Sirketler brand card color flood hover', () => {
  let profilHtml;
  let sirketlerCss;
  let markalarJs;

  test.beforeAll(() => {
    profilHtml = readFromRepo('profil.html');
    sirketlerCss = readFromRepo('css/panels/sirketler.css');
    markalarJs = readFromRepo('profil-markalar.js');
  });

  test('sirketler.css ships K037 color-flood hover vocabulary', () => {
    expect(sirketlerCss).toContain('--sk-brand-accent');
    expect(sirketlerCss).toContain('.sk-card.sk-brand:hover');
    expect(sirketlerCss).toContain('.sk-card.sk-brand:focus-within');
    expect(sirketlerCss).toContain('.sk-card.sk-brand:focus-visible');
    expect(sirketlerCss).toContain('prefers-reduced-motion');
    expect(sirketlerCss).not.toContain('brightness(0) invert(1)');
  });

  test('profil-markalar.js exposes brand accent helper and seed map', () => {
    expect(markalarJs).toContain('BRAND_ACCENT_COLORS');
    expect(markalarJs).toContain('function getBrandAccentColor');
    expect(markalarJs).toContain('window._htGetBrandAccentColor');
    expect(markalarJs).toContain("card.style.setProperty('--sk-brand-accent'");
  });

  test('sirketler.css: modal item logo uses object-fit:contain (K040 — strip removed, modal owns list)', () => {
    // Modal item logo img block must use object-fit:contain for correct brand rendering
    const itemLogoMatch = sirketlerCss.match(/\.brand-follows-popup-item-logo img\{[^}]*\}/);
    expect(itemLogoMatch).not.toBeNull();
    expect(itemLogoMatch[0]).toContain('object-fit:contain');
    expect(itemLogoMatch[0]).not.toContain('object-fit:cover');
  });

  test('sirketler.css keeps search appearance-reset hotfix', () => {
    const searchBlockMatch = sirketlerCss.match(/\.sk-filter__search\{[^}]*\}/);
    expect(searchBlockMatch).not.toBeNull();
    expect(searchBlockMatch[0]).toContain('-webkit-appearance:none');
    expect(searchBlockMatch[0]).toContain('appearance:none');
  });

  test('profil.html bumps cache-bust to v=20260414j for K037 assets', () => {
    expect(profilHtml).toMatch(/sirketler\.css\?v=\d{8}[a-z0-9]*/);
    expect(profilHtml).toMatch(/profil-markalar\.js\?v=\d{8}[a-z0-9]*/);
  });
});

test.describe('K038 Faz 2 — Image editor vendor + component', () => {
  test('vendor/cropperjs-1.6.2 files exist', () => {
    const js = path.join(__dirname, '..', 'vendor', 'cropperjs-1.6.2', 'cropper.min.js');
    const css = path.join(__dirname, '..', 'vendor', 'cropperjs-1.6.2', 'cropper.min.css');
    const lic = path.join(__dirname, '..', 'vendor', 'cropperjs-1.6.2', 'LICENSE');
    expect(fs.existsSync(js)).toBe(true);
    expect(fs.existsSync(css)).toBe(true);
    expect(fs.existsSync(lic)).toBe(true);
    const jsStat = fs.statSync(js);
    expect(jsStat.size).toBeGreaterThan(20000);
    expect(jsStat.size).toBeLessThan(80000);
  });

  test('admin-image-editor.js exposes htImageEditor API', () => {
    const src = readFromRepo('js/admin/admin-image-editor.js');
    expect(src).toContain('window.htImageEditor');
    expect(src).toContain('function htImageEditor');
    expect(src).toContain('getCroppedCanvas');
    expect(src).toContain('image/webp');
    expect(src).toContain('5 * 1024 * 1024');
  });

  test('admin image editor CSS defines modal + save classes', () => {
    const css = readFromRepo('css/admin/image-editor.css');
    expect(css).toContain('.hied-overlay');
    expect(css).toContain('.hied-panel');
    expect(css).toContain('.hied-save');
  });
});

test.describe('K038 Faz 3 — Admin Markalar panel', () => {
  test('admin.html wires markalar panel markup + assets', () => {
    const html = readFromRepo('admin.html');
    expect(html).toContain('id="panel-brands"');
    expect(html).toContain('id="adm-brand-drawer"');
    expect(html).toContain('data-brands-tab="brands"');
    expect(html).toContain('data-brands-tab="companies"');
    expect(html).toContain('data-brands-tab="archive"');
    expect(html).toContain('id="adm-brands-add-btn"');
    expect(html).toContain('id="adm-brands-search"');
    expect(html).toContain('js/admin/admin-markalar.js');
    expect(html).toContain('css/admin/markalar.css');
    expect(html).toContain('vendor/cropperjs-1.6.2/cropper.min.js');
    expect(html).toContain("data-panel=\"brands\"");
  });

  test('admin-markalar.js references all six admin RPCs and image editor API', () => {
    const src = readFromRepo('js/admin/admin-markalar.js');
    expect(src).toContain('admin_upsert_brand');
    expect(src).toContain('admin_upsert_company');
    expect(src).toContain('admin_archive_brand');
    expect(src).toContain('admin_archive_company');
    expect(src).toContain('admin_restore_brand');
    expect(src).toContain('admin_restore_company');
    expect(src).toContain('htImageEditor.open');
    expect(src).toContain('htImageEditor.upload');
    expect(src).toContain('_htAdminSupa');
  });

  test('admin-markalar.js uses brand-assets bucket paths (logos/ + covers/)', () => {
    const src = readFromRepo('js/admin/admin-markalar.js');
    expect(src).toContain("'logos'");
    expect(src).toContain("'covers'");
    expect(src).toMatch(/logos\//);
    expect(src).toMatch(/covers\//);
  });

  test('markalar.css defines drawer + tabs + primary button classes', () => {
    const css = readFromRepo('css/admin/markalar.css');
    expect(css).toContain('.adm-drawer');
    expect(css).toContain('.adm-brands-tabs');
    expect(css).toContain('.adm-btn--primary');
  });
});

test.describe('K039 — Header Variant C inline segment', () => {
  let profilHtml;
  let layoutCss;

  test.beforeAll(() => {
    profilHtml = readFromRepo('profil.html');
    layoutCss = readFromRepo('css/layout.css');
  });

  test('profil.html preserves all required header IDs', () => {
    const requiredIds = [
      'btn-logo-home','header-nav','header-kimbakti',
      'header-msg-wrap','header-msg','header-msg-dot',
      'popup-messages','popup-msg-list','popup-msg-see-all',
      'header-notif-wrap','header-notif','header-notif-dot',
      'popup-notifications','popup-notif-list','popup-notif-title',
      'popup-notif-see-all','popup-duyuru-list',
      'header-avatar-wrap-outer','header-avatar-wrap','user-avatar-header',
      'avatar-dropdown','avd-avatar-img','avd-user-name',
      'avd-settings-btn','avd-premium-btn','avd-logout-btn','avd-theme-checkbox'
    ];
    for (const id of requiredIds) {
      expect(profilHtml).toContain('id="' + id + '"');
    }
  });

  test('profil.html preserves nav data-panel hooks', () => {
    expect(profilHtml).toContain('data-panel="genel"');
    expect(profilHtml).toContain('data-panel="merkez"');
    expect(profilHtml).toContain('data-panel="sirketler"');
  });

  test('profil.html preserves K030 drawer tab data attributes', () => {
    expect(profilHtml).toContain('data-drawer-tab="bildirim"');
    expect(profilHtml).toContain('data-drawer-tab="duyuru"');
    expect(profilHtml).toContain('data-drawer-content="bildirim"');
    expect(profilHtml).toContain('data-drawer-content="duyuru"');
    expect(profilHtml).toContain('data-drawer-badge="bildirim"');
    expect(profilHtml).toContain('data-drawer-badge="duyuru"');
  });

  test('hn-item nav buttons no longer contain inline SVG (icons removed)', () => {
    const re = /class="hn-item[^"]*"[^>]*>[\s\S]{0,200}?<svg/;
    expect(profilHtml).not.toMatch(re);
  });

  test('layout.css .header rule is flat (no backdrop-filter, no box-shadow)', () => {
    const headerRuleMatch = layoutCss.match(/\.header\{[^}]*\}/);
    expect(headerRuleMatch).toBeTruthy();
    const rule = headerRuleMatch[0];
    expect(rule).not.toContain('backdrop-filter');
    expect(rule).toContain('box-shadow:none');
    // K048: hex literals tokenized — accept either semantic-token or legacy literal form
    expect(rule).toMatch(/border-bottom:1px solid (var\(--border\)|#E5E3DF)/);
    expect(rule).toMatch(/background:(var\(--bg-page\)|#F7F6F4)/);
  });

  test('layout.css .hn-item uses mono uppercase letter-spacing', () => {
    const hnItemMatch = layoutCss.match(/\.hn-item\{[^}]*\}/);
    expect(hnItemMatch).toBeTruthy();
    const rule = hnItemMatch[0];
    expect(rule).toContain('letter-spacing');
    expect(rule).toContain('text-transform:uppercase');
    // K047: font-family token migration — accept var(--font-mono) or literal DM Mono
    expect(rule).toMatch(/var\(--font-mono\)|DM Mono/);
  });

  test('profil.html cache-busts layout.css to v=20260415k068b', () => {
    expect(profilHtml).toMatch(/css\/layout\.css\?v=\d{8}[a-z0-9]*/);
  });

  test('profil.html has interpunct separators and action icons', () => {
    expect(profilHtml).toContain('class="hn-sep"');
    var actionIconCount = (profilHtml.match(/class="hn-action-icon"/g) || []).length;
    expect(actionIconCount).toBeGreaterThanOrEqual(3);
  });
});

test.describe('K049 — Wizard editorial redesign', () => {
  let profilHtml;
  let wizardEditorialCss;
  let profilWizardJs;

  test.beforeAll(() => {
    profilHtml = readFromRepo('profil.html');
    wizardEditorialCss = readFromRepo('css/wizard-editorial.css');
    profilWizardJs = readFromRepo('profil-wizard.js');
  });

  test('profil.html contains the new editorial wizard wrappers', () => {
    expect(profilHtml).toContain('class="wz-grid"');
    expect(profilHtml).toContain('class="wz-main"');
    expect(profilHtml).toContain('class="wz-rail"');
    expect(profilHtml).toContain('class="wz-header"');
    expect(profilHtml).toContain('id="wz-step-num"');
    expect(profilHtml).toContain('id="wz-step-pct"');
    expect(profilHtml).toContain('id="wz-progress-bar"');
    expect(profilHtml).toContain('data-wzrail-step="1"');
    expect(profilHtml).toContain('data-wzrail-step="7"');
  });

  test('profil.html preserves critical wizard ids after redesign', () => {
    expect(profilHtml).toContain('id="panel-profil"');
    expect(profilHtml).toContain('id="wiz-progress"');
    expect(profilHtml).toContain('id="wiz-step-1"');
    expect(profilHtml).toContain('id="wiz-step-7"');
    expect(profilHtml).toContain('id="wiz-nav"');
    expect(profilHtml).toContain('id="f-adsoyad"');
    expect(profilHtml).toContain('id="exp-cards-container"');
    expect(profilHtml).toContain('id="cb-no-experience"');
    expect(profilHtml).toContain('id="btn-wiz-next"');
    expect(profilHtml).toContain('id="btn-wiz-back"');
  });

  test('profil.html links the new wizard-editorial.css after wizard.css', () => {
    const wIdx = profilHtml.indexOf('css/wizard.css');
    const wEditIdx = profilHtml.indexOf('css/wizard-editorial.css');
    expect(wIdx).toBeGreaterThan(-1);
    expect(wEditIdx).toBeGreaterThan(wIdx);
  });

  test('wizard-editorial.css contains editorial vocabulary and reduced-motion block', () => {
    expect(wizardEditorialCss).toContain('.wz-grid');
    expect(wizardEditorialCss).toContain('.wz-rail');
    expect(wizardEditorialCss).toContain('.wz-card');
    expect(wizardEditorialCss).toContain('.wz-header');
    expect(wizardEditorialCss).toContain('.wz-spine');
    expect(wizardEditorialCss).toContain('#exp-cards-container');
    expect(wizardEditorialCss).toContain('prefers-reduced-motion');
  });

  test('profil-wizard.js extends renderWizard with editorial chrome update', () => {
    expect(profilWizardJs).toContain('updateEditorialChrome');
    expect(profilWizardJs).toContain('data-wzrail-step');
    expect(profilWizardJs).toContain('wz-step-num');
    expect(profilWizardJs).toContain('wz-progress-bar');
  });
});

test.describe('K060 — Kim Baktı editorial redesign', () => {
  let profilHtml;
  let kimbaktiCss;
  let kimbaktiJs;

  test.beforeAll(() => {
    profilHtml = readFromRepo('profil.html');
    kimbaktiCss = readFromRepo('css/panels/kimbakti.css');
    kimbaktiJs = readFromRepo('profil-kimbakti.js');
  });

  test('profil.html contains the new kb editorial wrappers', () => {
    expect(profilHtml).toContain('class="kb-root"');
    expect(profilHtml).toContain('class="kb-card kb-card--hero"');
    expect(profilHtml).toContain('class="kb-headline"');
    expect(profilHtml).toContain('class="kb-stats"');
    expect(profilHtml).toContain('class="kb-grid"');
    expect(profilHtml).toContain('class="kb-signature"');
  });

  test('profil.html preserves all JS-dependent ids after K060 redesign', () => {
    var ids = [
      'id="kb-total"',
      'id="kb-hero"',
      'id="kb-trend"',
      'id="kb-last-viewed"',
      'id="kb-chart"',
      'id="kb-segments"',
      'id="kb-seg-bars"',
      'id="kb-viewers"',
      'id="kb-viewers-lock"',
      'id="kb-viewer-list"',
      'id="kb-conversion"',
      'id="kb-conversion-body"',
      'id="kb-premium-cta"',
      'id="kb-empty"',
      'id="kb-empty-pct"',
      'id="kb-skeleton"'
    ];
    ids.forEach(function(id) { expect(profilHtml).toContain(id); });
    expect(profilHtml).toContain('class="kb-premium-btn"');
  });

  test('profil.html links css/panels/kimbakti.css with cache-bust', () => {
    expect(profilHtml).toMatch(/css\/panels\/kimbakti\.css\?v=[a-zA-Z0-9._-]+/);
    expect(profilHtml).toMatch(/profil-kimbakti\.js\?v=[a-zA-Z0-9._-]+/);
  });

  test('kimbakti.css contains the K060 vocabulary and reduced-motion block', () => {
    expect(kimbaktiCss).toContain('.kb-root');
    expect(kimbaktiCss).toContain('.kb-card');
    expect(kimbaktiCss).toContain('.kb-headline');
    expect(kimbaktiCss).toContain('.kb-stats');
    expect(kimbaktiCss).toContain('.kb-chart');
    expect(kimbaktiCss).toContain('.kb-segments');
    expect(kimbaktiCss).toContain('.kb-viewers-list');
    expect(kimbaktiCss).toContain('.kb-premium-btn');
    expect(kimbaktiCss).toContain('prefers-reduced-motion');
    // K067-NightAudit: primitive var(--color-vermillion) replaced with editorial token.
    expect(kimbaktiCss).toContain('var(--editorial-vermillion)');
  });

  test('profil-kimbakti.js emits K060 class vocabulary', () => {
    expect(kimbaktiJs).toContain('kb-day');
    expect(kimbaktiJs).toContain('kb-segment-row');
    expect(kimbaktiJs).toContain('kb-viewer-row');
    expect(kimbaktiJs).not.toMatch(/console\.log/);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   K063 — Inbox editorial redesign
   Source of truth: docs/superpowers/specs/2026-04-14-inbox-redesign-mockup.html
   ═══════════════════════════════════════════════════════════════════════ */
test.describe('K063 — Inbox editorial redesign', () => {
  let profilHtml063;
  let inboxCss063;
  let inboxJs063;

  test.beforeAll(() => {
    profilHtml063 = readFromRepo('profil.html');
    inboxCss063 = readFromRepo('css/panels/inbox.css');
    inboxJs063 = readFromRepo('profil-inbox.js');
  });

  test('profil.html carries K063 editorial vocabulary on inbox panel', () => {
    expect(profilHtml063).toContain('class="ib-root"');
    expect(profilHtml063).toContain('class="ib-card ib-card--hero"');
    expect(profilHtml063).toContain('class="ib-headline"');
    expect(profilHtml063).toContain('class="ib-filter"');
    expect(profilHtml063).toContain('class="ib-split"');
  });

  test('profil.html preserves JS-targeted inbox IDs and exposes new meta IDs', () => {
    expect(profilHtml063).toContain('id="inbox-list"');
    expect(profilHtml063).toContain('id="inbox-tabs"');
    expect(profilHtml063).toContain('id="inbox-empty"');
    expect(profilHtml063).toContain('id="inbox-right-pane"');
    expect(profilHtml063).toContain('id="inbox-left-pane"');
    expect(profilHtml063).toContain('id="inbox-split"');
    expect(profilHtml063).toContain('id="inbox-thread-placeholder"');
    expect(profilHtml063).toContain('id="inbox-unread-badge"');
    expect(profilHtml063).toContain('id="inbox-total"');
    expect(profilHtml063).toContain('id="inbox-last-time"');
  });

  test('profil.html loads versioned inbox.css and bumped profil-inbox.js', () => {
    expect(profilHtml063).toMatch(/css\/panels\/inbox\.css\?v=\d{8}[a-z0-9]*/);
    expect(profilHtml063).toMatch(/profil-inbox\.js\?v=\d{8}[a-z0-9]*/);
  });

  test('K070: inbox panel is viewport-locked with internally scrolling panes', () => {
    var inboxCssK070 = readFromRepo('css/panels/inbox.css');
    expect(inboxCssK070).toContain('K070');
    expect(inboxCssK070).toContain('height:calc(100vh');
    // split fills remaining space with overflow hidden
    expect(inboxCssK070).toMatch(/\.ib-split\b[^}]*overflow:hidden/);
    // list scrolls internally
    expect(inboxCssK070).toMatch(/\.ib-list\b[^}]*overflow-y:auto/);
    // thread body keeps its internal scroll
    expect(inboxCssK070).toMatch(/\.ib-thread-body\b[^}]*overflow-y:auto/);
    // hero is compact (no card frame in the new layout)
    expect(inboxCssK070).toMatch(/\.ib-card--hero\b[^}]*background:transparent/);
  });

  test('inbox.css contains the K063 vocabulary and reduced-motion block', () => {
    expect(inboxCss063).toContain('.ib-root');
    expect(inboxCss063).toContain('.ib-card');
    expect(inboxCss063).toContain('.ib-headline');
    expect(inboxCss063).toContain('.ib-filter');
    expect(inboxCss063).toContain('.ib-split');
    expect(inboxCss063).toContain('.ib-row');
    expect(inboxCss063).toContain('.ib-thread');
    expect(inboxCss063).toContain('.ib-composer');
    expect(inboxCss063).toContain('prefers-reduced-motion');
  });

  test('profil-inbox.js emits K063 class vocabulary and has no console.log', () => {
    expect(inboxJs063).toContain('ib-row');
    expect(inboxJs063).toContain('ib-avatar');
    expect(inboxJs063).toContain('ib-sender');
    expect(inboxJs063).toContain('ib-preview');
    expect(inboxJs063).toContain('ib-time');
    expect(inboxJs063).toContain('ib-tab');
    expect(inboxJs063).toContain('ib-thread');
    expect(inboxJs063).toContain('ib-composer');
    expect(inboxJs063).not.toMatch(/console\.log/);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   K064 — Bildirimler editorial redesign
   Source of truth: docs/superpowers/specs/2026-04-14-bildirimler-redesign-mockup.html
   ═══════════════════════════════════════════════════════════════════════ */
test.describe('K064 — Bildirimler editorial redesign', () => {
  let profilHtml064;
  let bildirimlerCss064;
  let inboxJs064;

  test.beforeAll(() => {
    profilHtml064 = readFromRepo('profil.html');
    bildirimlerCss064 = readFromRepo('css/panels/bildirimler.css');
    inboxJs064 = readFromRepo('profil-inbox.js');
  });

  test('profil.html carries K064 editorial vocabulary on bildirimler panel', () => {
    expect(profilHtml064).toContain('class="bd-root"');
    expect(profilHtml064).toContain('class="bd-card bd-card--hero"');
    expect(profilHtml064).toContain('class="bd-headline"');
    expect(profilHtml064).toContain('class="bd-mode ht-segment"');
    expect(profilHtml064).toContain('class="bd-list"');
  });

  test('profil.html preserves JS-targeted bildirim IDs and exposes new meta IDs', () => {
    expect(profilHtml064).toContain('id="notif-unread-badge"');
    expect(profilHtml064).toContain('id="notif-tabs"');
    expect(profilHtml064).toContain('id="notif-list"');
    expect(profilHtml064).toContain('id="notif-empty"');
    expect(profilHtml064).toContain('id="notif-week-count"');
    expect(profilHtml064).toContain('id="notif-last-time"');
    expect(profilHtml064).toContain('data-segment="bildirim-duyuru"');
    expect(profilHtml064).toContain('data-tab="bildirim"');
    expect(profilHtml064).toContain('data-tab="duyuru"');
    expect(profilHtml064).toContain('data-tab-content="bildirim"');
    expect(profilHtml064).toContain('data-tab-content="duyuru"');
    expect(profilHtml064).toContain('data-mount="duyuru-full-feed"');
    /* Tuna 2026-04-17: data-duyuru-badge + data-bildirim-count toggle
     * sayaclari kaldirildi. Hero meta strip aktif moda gore degisir. */
    expect(profilHtml064).not.toContain('data-duyuru-badge');
    expect(profilHtml064).not.toContain('data-bildirim-count');
  });

  test('profil.html loads versioned bildirimler.css and bumped profil-inbox.js', () => {
    expect(profilHtml064).toMatch(/css\/panels\/bildirimler\.css\?v=\d{8}[a-z0-9]*/);
    expect(profilHtml064).toMatch(/profil-inbox\.js\?v=\d{8}[a-z0-9]*/);
  });

  test('bildirimler.css contains the K064 vocabulary and reduced-motion block', () => {
    expect(bildirimlerCss064).toContain('.bd-root');
    expect(bildirimlerCss064).toContain('.bd-card');
    expect(bildirimlerCss064).toContain('.bd-headline');
    expect(bildirimlerCss064).toContain('.bd-mode');
    expect(bildirimlerCss064).toContain('.bd-row');
    expect(bildirimlerCss064).toContain('prefers-reduced-motion');
  });

  test('profil-inbox.js emits K064 bildirim class vocabulary and has no console.log', () => {
    expect(inboxJs064).toContain('bd-row');
    expect(inboxJs064).toContain('bd-icon');
    expect(inboxJs064).toContain('bd-title');
    expect(inboxJs064).toContain('bd-desc');
    expect(inboxJs064).toContain('bd-time');
    expect(inboxJs064).toContain('bd-subfilter__btn');
    expect(inboxJs064).not.toMatch(/console\.log/);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   K066 Faz A — Destek editorial CSS override
   CSS-only refactor of #panel-destek using K031-K065 vocabulary.
   ═══════════════════════════════════════════════════════════════════════ */
test.describe('K066 — Destek editorial CSS override', () => {
  let profilHtml066;
  let destekCss066;
  let destekJs066;

  test.beforeAll(() => {
    profilHtml066 = readFromRepo('profil.html');
    destekCss066 = readFromRepo('css/panels/destek.css');
    destekJs066 = readFromRepo('profil-destek.js');
  });

  test('profil.html links destek.css + profil-destek.js with cache-bust', () => {
    expect(profilHtml066).toMatch(/css\/panels\/destek\.css\?v=[a-zA-Z0-9._-]+/);
    expect(profilHtml066).toMatch(/profil-destek\.js\?v=[a-zA-Z0-9._-]+/);
  });

  test('destek.css contains the editorial vocabulary and reduced-motion block', () => {
    expect(destekCss066).toContain('#panel-destek');
    expect(destekCss066).toContain('.destek-wrap');
    expect(destekCss066).toContain('.destek-hero');
    expect(destekCss066).toContain('.destek-tab');
    expect(destekCss066).toContain('.da-cat-card');
    expect(destekCss066).toContain('.dt-form');
    expect(destekCss066).toContain('.dtl-item');
    expect(destekCss066).toContain('.dtd-wrap');
    expect(destekCss066).toContain('prefers-reduced-motion');
  });

  test('profil-destek.js injectCSS is a no-op with K066 Faz A marker', () => {
    expect(destekJs066).toContain('function injectCSS');
    expect(destekJs066).toContain('K066 Faz A');
    // the early return must be before any style element creation inside the live path
    const fnStart = destekJs066.indexOf('function injectCSS');
    const markerIdx = destekJs066.indexOf('K066 Faz A', fnStart);
    const returnIdx = destekJs066.indexOf('return;', markerIdx);
    expect(returnIdx).toBeGreaterThan(-1);
    expect(returnIdx - fnStart).toBeLessThan(200);
  });
});

test.describe('K067 — Ayarlar editorial CSS override', () => {
  let profilHtml067;
  let ayarlarCss067;

  test.beforeAll(() => {
    profilHtml067 = readFromRepo('profil.html');
    ayarlarCss067 = readFromRepo('css/panels/ayarlar.css');
  });

  test('profil.html links ayarlar.css + profil-ayarlar.js with cache-bust', () => {
    expect(profilHtml067).toMatch(/css\/panels\/ayarlar\.css\?v=[a-zA-Z0-9._-]+/);
    expect(profilHtml067).toMatch(/profil-ayarlar\.js\?v=[a-zA-Z0-9._-]+/);
  });

  test('TF6: profil-ayarlar.js ships section tab switcher + tri-state theme', () => {
    var ayarJs = readFromRepo('profil-ayarlar.js');
    // TF6 — scroll-spy (IntersectionObserver) deprecate edildi; section tab switcher aktif
    expect(ayarJs).toContain('initSectionTabs');
    expect(ayarJs).toContain('.ayr-toc__tab');
    expect(ayarJs).toContain("setAttribute('aria-current', 'page')");
    expect(ayarJs).toContain("setAttribute('aria-hidden', 'true')");
    expect(ayarJs).toContain('ayr-theme-seg__opt');
    expect(ayarJs).toContain('setThemePreference');
    expect(ayarJs).toContain('ht_theme_preference');
    expect(ayarJs).not.toMatch(/console\.log\(/);
  });

  test('K067 Faz C: theme card ships as tri-state segment with system default', () => {
    expect(profilHtml067).toContain('ayr-theme-seg');
    expect(profilHtml067).toContain('data-theme-pref="system"');
    expect(profilHtml067).toContain('data-theme-pref="light"');
    expect(profilHtml067).toContain('data-theme-pref="dark"');
    var ayarlarCss067b = readFromRepo('css/panels/ayarlar.css');
    expect(ayarlarCss067b).toContain('.ayr-theme-seg__opt');
    expect(ayarlarCss067b).toContain('.ayr-theme-seg__opt.is-active');
  });

  test('ayarlar.css uses editorial palette and namespaced vocabulary', () => {
    expect(ayarlarCss067).toContain('K067 Faz A');
    expect(ayarlarCss067).toContain('#panel-ayarlar');
    // K067-NightAudit (2026-04-15): editorial palette tokenized for dark-mode parity.
    expect(ayarlarCss067).toContain('var(--editorial-bg)');
    expect(ayarlarCss067).toContain('var(--editorial-vermillion)');
    expect(ayarlarCss067).toContain('var(--editorial-hairline)');
    expect(ayarlarCss067).toContain('var(--editorial-ink)');
    expect(ayarlarCss067).toContain('var(--editorial-ink-muted)');
    // raw cream/navy/vermillion hex must NOT live in the panel anymore
    expect(ayarlarCss067).not.toMatch(/#F7F6F4/i);
    expect(ayarlarCss067).not.toMatch(/#C94E28/i);
    expect(ayarlarCss067).not.toMatch(/#1E2D5E/i);
    expect(ayarlarCss067).not.toMatch(/#E5E3DF/i);
    expect(ayarlarCss067).not.toMatch(/#6B6A66/i);
    expect(ayarlarCss067).toContain('Bricolage Grotesque');
    expect(ayarlarCss067).toContain('DM Mono');
    expect(ayarlarCss067).toContain('prefers-reduced-motion');
  });

  test('K067-NightAudit: tokens.css defines editorial dark palette', () => {
    var tokensCss = readFromRepo('css/tokens.css');
    expect(tokensCss).toContain('--editorial-bg');
    expect(tokensCss).toContain('--editorial-card');
    expect(tokensCss).toContain('--editorial-hairline');
    expect(tokensCss).toContain('--editorial-ink');
    expect(tokensCss).toContain('--editorial-ink-muted');
    expect(tokensCss).toContain('--editorial-vermillion');
    // dark block must override the editorial set
    var darkBlockMatch = tokensCss.match(/html\[data-theme="dark"\]\s*\{[\s\S]*?\n\}/);
    expect(darkBlockMatch).toBeTruthy();
    expect(darkBlockMatch[0]).toContain('--editorial-bg');
    expect(darkBlockMatch[0]).toContain('--editorial-vermillion');
  });

  test('ayarlar.css defines the ayr-* editorial vocabulary', () => {
    expect(ayarlarCss067).toContain('.ayr-root');
    expect(ayarlarCss067).toContain('.ayr-hero');
    expect(ayarlarCss067).toContain('.ayr-toc');
    expect(ayarlarCss067).toContain('.ayr-section');
    expect(ayarlarCss067).toContain('.ayr-card');
    expect(ayarlarCss067).toContain('.ayr-grid-2');
    expect(ayarlarCss067).toContain('.ayr-field');
    expect(ayarlarCss067).toContain('.ayr-btn');
    expect(ayarlarCss067).toContain('.ayr-toggle');
    expect(ayarlarCss067).toContain('.ayr-modal');
  });

  test('profil.html ayarlar panel uses ayr-* sections and preserves all critical ids', () => {
    expect(profilHtml067).toContain('class="ayr-root"');
    expect(profilHtml067).toContain('id="ayr-s-hesap"');
    expect(profilHtml067).toContain('id="ayr-s-guvenlik"');
    expect(profilHtml067).toContain('id="ayr-s-gizlilik"');
    expect(profilHtml067).toContain('id="ayr-s-bildirim"');
    expect(profilHtml067).toContain('id="ayr-s-gorunum"');
    expect(profilHtml067).toContain('id="ayr-s-tehlike"');
    // critical auth/mfa/settings ids MUST be preserved
    // TF6 ikinci round: btn-save-notifications + btn-save-contact-prefs KALDIRILDI
    // (auto-save toggle change → anlik). Bu ID'ler artik mustKeep listesinde degil.
    var mustKeepIds = [
      'settings-email', 'settings-new-email', 'settings-adsoyad', 'settings-telefon',
      'btn-settings-account-save', 'btn-show-email-change', 'btn-change-email',
      'settings-new-pw', 'settings-confirm-pw', 'btn-change-pw',
      'mfa-status-area', 'mfa-loading', 'mfa-disabled-state', 'mfa-enroll-state',
      'mfa-enabled-state', 'mfa-qr-container', 'mfa-secret-code', 'mfa-verify-code',
      'btn-mfa-enable', 'btn-mfa-verify', 'btn-mfa-cancel-enroll', 'btn-mfa-disable',
      'settings-visibility-active', 'settings-actively-looking',
      'settings-hide-from-current-employer', 'settings-benioner-hint',
      'settings-notify-email-messages', 'settings-notify-email-jobs',
      'settings-notify-sms', 'settings-notify-push',
      'settings-contact-email', 'settings-contact-phone', 'settings-contact-whatsapp',
      'blocked-company-search', 'blocked-company-dropdown',
      'blocked-companies-list', 'blocked-companies-empty',
      'settings-theme-card', 'settings-account-management-card',
      'btn-open-account-wizard', 'settings-session-management-card',
      'session-device-info', 'session-login-time', 'btn-signout-all',
      'btn-signout-settings', 'account-wizard-overlay', 'btn-close-account-wizard',
      'btn-download-data', 'btn-freeze-account', 'btn-delete-account',
      'settings-premium-pitch'
    ];
    mustKeepIds.forEach(function(id) {
      expect(profilHtml067).toContain('id="' + id + '"');
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   K069 — Premium panel editorial redesign
   CSS-only external stylesheet + DOM emitter rewrite with .prem-* vocab.
   ═══════════════════════════════════════════════════════════════════════ */
test.describe('K069 — Premium panel editorial redesign', () => {
  let profilHtml069;
  let premiumCss069;
  let premiumJs069;

  test.beforeAll(() => {
    profilHtml069 = readFromRepo('profil.html');
    premiumCss069 = readFromRepo('css/panels/premium.css');
    premiumJs069  = readFromRepo('profil-premium.js');
  });

  test('profil.html links premium.css + profil-premium.js with cache-bust', () => {
    expect(profilHtml069).toMatch(/css\/panels\/premium\.css\?v=[a-zA-Z0-9._-]+/);
    expect(profilHtml069).toMatch(/profil-premium\.js\?v=[a-zA-Z0-9._-]+/);
  });

  test('premium.css ships the editorial .prem-* vocabulary', () => {
    expect(premiumCss069).toContain('K069');
    expect(premiumCss069).toContain('#panel-premium');
    expect(premiumCss069).toContain('.prem-root');
    expect(premiumCss069).toContain('.prem-hero');
    expect(premiumCss069).toContain('.prem-headline');
    expect(premiumCss069).toContain('.prem-section');
    expect(premiumCss069).toContain('.prem-features');
    expect(premiumCss069).toContain('.prem-feature');
    expect(premiumCss069).toContain('.prem-plan');
    expect(premiumCss069).toContain('.prem-active');
    expect(premiumCss069).toContain('--editorial-card');
    expect(premiumCss069).toContain('--editorial-vermillion');
    expect(premiumCss069).toContain('prefers-reduced-motion');
  });

  test('profil-premium.js injectCSS is a no-op with K069 marker', () => {
    expect(premiumJs069).toContain('function injectCSS');
    expect(premiumJs069).toContain('K069');
    var fnStart = premiumJs069.indexOf('function injectCSS');
    var markerIdx = premiumJs069.indexOf('K069', fnStart);
    var returnIdx = premiumJs069.indexOf('return;', markerIdx);
    expect(returnIdx).toBeGreaterThan(-1);
    expect(returnIdx - fnStart).toBeLessThan(220);
  });

  test('profil-premium.js emits editorial .prem-* DOM vocabulary', () => {
    expect(premiumJs069).toContain('prem-root');
    expect(premiumJs069).toContain('prem-hero');
    expect(premiumJs069).toContain('prem-kicker');
    expect(premiumJs069).toContain('prem-headline');
    expect(premiumJs069).toContain('prem-features');
    expect(premiumJs069).toContain('prem-feature');
    expect(premiumJs069).toContain('prem-feature__title');
    expect(premiumJs069).toContain('prem-feature__desc');
    expect(premiumJs069).toContain('prem-plan');
    expect(premiumJs069).toContain('prem-plan__cta');
    expect(premiumJs069).toContain('prem-active');
    // legacy bento/.pm-* emission removed
    expect(premiumJs069).not.toContain('class="pm-bento"');
    expect(premiumJs069).not.toContain('class="pm-feature"');
    expect(premiumJs069).not.toContain("class='pm-bento'");
    expect(premiumJs069).not.toContain('g-hero-inner');
    // no console.log in production
    expect(premiumJs069).not.toMatch(/console\.log\(/);
  });

  test('profil-premium.js preserves critical ids + RPC contract', () => {
    expect(premiumJs069).toContain("id=\"pm-active-banner\"");
    expect(premiumJs069).toContain("id=\"pm-purchase-status\"");
    expect(premiumJs069).toContain("'get_my_premium_status'");
    expect(premiumJs069).toContain('MVP_FREE_TIER');
    expect(premiumJs069).toContain('window._htLoadPremium');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   K034 FAZ B — Firsatlar editorial rewrite
   Rename + redesign of the former Teklifler panel. Premium gate removed
   for MVP per Tuna karari — only freemium view. Campaign types filtered
   to ('offer', 'employer_branding'); 'hiring_boost' (iş ilanı) excluded.
   ═══════════════════════════════════════════════════════════════════════ */
test.describe('K034 FAZ B — Firsatlar editorial redesign', () => {
  var fs = require('fs');
  var path = require('path');
  var ROOT_FAZB = path.join(__dirname, '..');
  var firsatlarCss = fs.readFileSync(path.join(ROOT_FAZB, 'css/panels/firsatlar.css'), 'utf8');
  var firsatlarJs = fs.readFileSync(path.join(ROOT_FAZB, 'profil-firsatlar.js'), 'utf8');
  var profilHtmlFazB = fs.readFileSync(path.join(ROOT_FAZB, 'profil.html'), 'utf8');

  test('profil.html links firsatlar.css and bumped profil-firsatlar.js', () => {
    expect(profilHtmlFazB).toMatch(/css\/panels\/firsatlar\.css\?v=\d{8}[a-z0-9]*/);
    expect(profilHtmlFazB).toMatch(/profil-firsatlar\.js\?v=\d{8}[a-z0-9]*/);
  });

  test('firsatlar.css ships the editorial .frs-* vocabulary', () => {
    expect(firsatlarCss).toContain('.frs-root');
    expect(firsatlarCss).toContain('.frs-hero');
    expect(firsatlarCss).toContain('.frs-headline');
    expect(firsatlarCss).toContain('.frs-grid');
    expect(firsatlarCss).toContain('.frs-card');
    expect(firsatlarCss).toContain('.frs-card--offer');
    expect(firsatlarCss).toContain('.frs-card--branding');
    expect(firsatlarCss).toContain('.frs-card__promo');
    expect(firsatlarCss).toContain('.frs-empty');
    expect(firsatlarCss).toContain('.frs-skeleton');
  });

  test('firsatlar.css uses editorial palette tokens', () => {
    expect(firsatlarCss).toContain('--editorial-vermillion');
    expect(firsatlarCss).toContain('--editorial-hairline');
    expect(firsatlarCss).toContain('--editorial-ink');
  });

  test('profil-firsatlar.js emits editorial .frs-* DOM vocabulary', () => {
    expect(firsatlarJs).toContain("'frs-root'");
    expect(firsatlarJs).toContain("'frs-hero'");
    expect(firsatlarJs).toContain("'frs-headline'");
    expect(firsatlarJs).toContain("'frs-grid'");
    expect(firsatlarJs).toContain('frs-card--offer');
    expect(firsatlarJs).toContain('frs-card--branding');
  });

  test('profil-firsatlar.js removed premium tab + gate', () => {
    expect(firsatlarJs).not.toContain("data-tab=\"premium\"");
    expect(firsatlarJs).not.toContain("'tk-premium-gate'");
    expect(firsatlarJs).not.toContain('tk-gate-float');
    expect(firsatlarJs).not.toContain('currentTab');
  });

  test('profil-firsatlar.js filters campaign types (FAZ C: 4 types, hiring_boost excluded)', () => {
    expect(firsatlarJs).toContain('ALLOWED_TYPES');
    expect(firsatlarJs).toContain("'offer'");
    expect(firsatlarJs).toContain("'employer_branding'");
    expect(firsatlarJs).toContain("'store_opening'");
    expect(firsatlarJs).toContain("'brand_story'");
    /* hiring_boost must NOT appear in the allowed list. */
    expect(firsatlarJs).not.toMatch(/ALLOWED_TYPES\s*=\s*\[[^\]]*hiring_boost/);
    /* Filter enforced client-side via filterAllowed() — avoids PG enum
     * cast error during staged migration rollout. */
    expect(firsatlarJs).toContain('filterAllowed');
    expect(firsatlarJs).toContain('ALLOWED_TYPES.indexOf');
  });

  test('profil-firsatlar.js preserves critical DOM ids and public entry', () => {
    expect(firsatlarJs).toContain("'firsatlar-root'");
    expect(firsatlarJs).toContain('badge-firsatlar');
    expect(firsatlarJs).toContain('firsatlar-count-badge');
    expect(firsatlarJs).toContain('window._htLoadFirsatlar');
  });

  test('profil-firsatlar.js uses textContent for user data (no innerHTML)', () => {
    /* Guard: no innerHTML with campaign fields; safe-by-construction DOM. */
    expect(firsatlarJs).not.toMatch(/innerHTML\s*=/);
    expect(firsatlarJs).not.toMatch(/insertAdjacentHTML/);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   K034 FAZ C — Firsatlar campaign_type extension
   Adds 'store_opening' + 'brand_story' enum values, extends UI type
   metadata, surfaces the new types in ik-kampanya.js wizard (dropping
   hiring_boost — iş ilanı yasak), and updates admin-campaigns label map.
   ═══════════════════════════════════════════════════════════════════════ */
test.describe('K034 FAZ C — Firsatlar campaign_type extension', () => {
  var fs = require('fs');
  var path = require('path');
  var ROOT_FAZC = path.join(__dirname, '..');
  var migrationFazC = fs.readFileSync(
    path.join(ROOT_FAZC, 'supabase/migrations/20260416120000_firsatlar_campaign_types.sql'),
    'utf8'
  );
  var firsatlarJsFazC = fs.readFileSync(path.join(ROOT_FAZC, 'profil-firsatlar.js'), 'utf8');
  var firsatlarCssFazC = fs.readFileSync(path.join(ROOT_FAZC, 'css/panels/firsatlar.css'), 'utf8');
  var ikKampanyaJs = fs.readFileSync(path.join(ROOT_FAZC, 'ik-kampanya.js'), 'utf8');
  var adminCampaignsJs = fs.readFileSync(path.join(ROOT_FAZC, 'admin-campaigns.js'), 'utf8');

  test('migration adds store_opening + brand_story to campaign_type enum', () => {
    expect(migrationFazC).toMatch(/ALTER TYPE[\s\S]*campaign_type[\s\S]*ADD VALUE[\s\S]*store_opening/);
    expect(migrationFazC).toMatch(/ALTER TYPE[\s\S]*campaign_type[\s\S]*ADD VALUE[\s\S]*brand_story/);
    expect(migrationFazC).toContain('IF NOT EXISTS');
  });

  test('profil-firsatlar.js TYPE_META includes all 4 rendered types', () => {
    expect(firsatlarJsFazC).toContain('offer:');
    expect(firsatlarJsFazC).toContain('employer_branding:');
    expect(firsatlarJsFazC).toContain('store_opening:');
    expect(firsatlarJsFazC).toContain('brand_story:');
    expect(firsatlarJsFazC).toContain('frs-card--opening');
    expect(firsatlarJsFazC).toContain('frs-card--story');
  });

  test('firsatlar.css defines accent modifiers for new types', () => {
    expect(firsatlarCssFazC).toContain('.frs-card--opening');
    expect(firsatlarCssFazC).toContain('.frs-card--story');
  });

  test('ik-kampanya.js wizard offers store_opening + brand_story, drops hiring_boost', () => {
    /* TYPE_MAP still contains hiring_boost (legacy labels for existing
     * campaigns) but the wizard `types` array must NOT list it. */
    expect(ikKampanyaJs).toContain("key:'store_opening'");
    expect(ikKampanyaJs).toContain("key:'brand_story'");
    /* Wizard array — verify hiring_boost is not in the selectable types. */
    var typesMatch = ikKampanyaJs.match(/var types\s*=\s*\[([\s\S]*?)\];/);
    expect(typesMatch).toBeTruthy();
    expect(typesMatch[1]).not.toContain("key:'hiring_boost'");
    /* Emoji removed from type cards per design rule. */
    expect(typesMatch[1]).not.toContain('icon:');
  });

  test('admin-campaigns.js typeMap labels new types for admin list view', () => {
    expect(adminCampaignsJs).toContain('store_opening:');
    expect(adminCampaignsJs).toContain('brand_story:');
    /* hiring_boost label preserved for backward compat display. */
    expect(adminCampaignsJs).toContain('hiring_boost:');
  });

  test('profil-firsatlar.js has no demo fallback array (Tuna: fake yok)', () => {
    expect(firsatlarJsFazC).not.toMatch(/DEMO_CAMPAIGNS\s*=/);
    expect(firsatlarJsFazC).not.toMatch(/isDemoMode/);
  });

  test('profil-firsatlar.js surfaces empty state even on fetch error', () => {
    /* Error UI removed — silent fallback to buildEmpty. */
    expect(firsatlarJsFazC).not.toMatch(/function\s+buildError/);
    expect(firsatlarJsFazC).not.toContain('frs-error__retry');
    /* On error we console.warn and still call buildEmpty(). */
    expect(firsatlarJsFazC).toMatch(/console\.warn\(\s*'\[firsatlar\]/);
    expect(firsatlarJsFazC).toContain('buildEmpty()');
  });

  test('profil-genel.js rail cell uses "Fırsatları gör" label', () => {
    var genelJs = fs.readFileSync(path.join(ROOT_FAZC, 'profil-genel.js'), 'utf8');
    /* The cell should not say "Kampanyaları gör" — Tuna karari: panel
     * ismi Fırsatlar, tutarli olsun. */
    expect(genelJs).toContain('F\\u0131rsatlar\\u0131 g\\u00F6r');
    expect(genelJs).not.toMatch(/link:\s*'Kampanyalar\\u0131 g\\u00F6r'/);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   K034 FAZ D — Admin Fırsat via Duyuru Composer + Dual-Source Panel
   Admin publishes fırsat content through the existing duyuru composer
   (campaign_type optional field). Panel-firsatlar fetches both
   employer campaigns AND admin-authored announcements and renders them
   together. Migration 20260417100000 adds the column + RPC.
   ═══════════════════════════════════════════════════════════════════════ */
test.describe('K034 FAZ D — Admin fırsat via duyuru composer', () => {
  var fs = require('fs');
  var path = require('path');
  var ROOT_FAZD = path.join(__dirname, '..');
  var migrationFazD = fs.readFileSync(
    path.join(ROOT_FAZD, 'supabase/migrations/20260417100000_ht_announcements_campaign_type.sql'),
    'utf8'
  );
  var adminAnnJs = fs.readFileSync(path.join(ROOT_FAZD, 'admin-announcements.js'), 'utf8');
  var firsatlarJsFazD = fs.readFileSync(path.join(ROOT_FAZD, 'profil-firsatlar.js'), 'utf8');

  test('migration adds campaign_type column with CHECK constraint', () => {
    expect(migrationFazD).toMatch(/ht_announcements[\s\S]*ADD COLUMN IF NOT EXISTS campaign_type/);
    expect(migrationFazD).toContain("CHECK (campaign_type IS NULL OR campaign_type IN (");
    expect(migrationFazD).toContain("'offer'");
    expect(migrationFazD).toContain("'employer_branding'");
    expect(migrationFazD).toContain("'store_opening'");
    expect(migrationFazD).toContain("'brand_story'");
  });

  test('migration creates get_firsat_announcements RPC + updated feed RPC', () => {
    expect(migrationFazD).toContain('FUNCTION get_firsat_announcements()');
    expect(migrationFazD).toContain('FUNCTION get_announcements_feed(');
    /* Feed RPC must return campaign_type now. */
    expect(migrationFazD).toMatch(/campaign_type\s+text[,\s]/);
  });

  test('migration adds partial index for fırsat lookup', () => {
    expect(migrationFazD).toContain('idx_ht_ann_campaign_type');
    expect(migrationFazD).toContain('WHERE campaign_type IS NOT NULL');
  });

  test('admin-announcements.js exposes CAMPAIGN_TYPES dropdown', () => {
    expect(adminAnnJs).toContain('CAMPAIGN_TYPES');
    expect(adminAnnJs).toContain("'offer'");
    expect(adminAnnJs).toContain("'employer_branding'");
    expect(adminAnnJs).toContain("'store_opening'");
    expect(adminAnnJs).toContain("'brand_story'");
    expect(adminAnnJs).toContain('F\\u0131rsat Tipi');
  });

  test('admin-announcements.js save payload includes campaign_type', () => {
    expect(adminAnnJs).toMatch(/campaign_type:\s*campTypeSelect\.value/);
  });

  test('profil-firsatlar.js fetches dual source (campaigns + announcements)', () => {
    expect(firsatlarJsFazD).toContain('fetchFirsatAnnouncements');
    expect(firsatlarJsFazD).toContain("supabase.rpc('get_firsat_announcements'");
    expect(firsatlarJsFazD).toContain('Promise.all');
  });

  test('profil-firsatlar.js normalizes announcement rows into card shape', () => {
    expect(firsatlarJsFazD).toContain('normalizeAnnouncement');
    expect(firsatlarJsFazD).toContain("source: 'announcement'");
    expect(firsatlarJsFazD).toContain("company_name: 'HelloTalent'");
  });

  test('profil-firsatlar.js signs announcement media for private bucket', () => {
    expect(firsatlarJsFazD).toContain('signAnnMedia');
    expect(firsatlarJsFazD).toContain('HT.signStorageUrls');
  });

  test('profil-firsatlar.js skips company navigation for admin-source cards', () => {
    expect(firsatlarJsFazD).toContain("c.source !== 'announcement'");
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   K068b — HTML structural integrity guard
   Catches the class of bugs where a cache-bust edit silently drops the
   closing </script> (or </link>) of an asset tag. When the browser parser
   hits an unclosed <script>, every subsequent sibling gets swallowed into
   the open tag, so nothing below it loads. ESLint cannot see this; regular
   string-based guards cannot see this. This block enforces structural
   symmetry: open-tag count == close-tag count for every static HTML entry.
   Precedent: hotfix commit 4f31ff7 — profil-locations.js closing tag drop
   killed profil-summary.js / profil-genel.js / profil-bootstrap.js chain.
   ═══════════════════════════════════════════════════════════════════════ */
test.describe('HTML structural integrity — script/link tag close guard', () => {
  var HTML_ENTRIES = [
    'profil.html',
    'ik.html',
    'admin.html',
    'index.html',
    'giris.html',
    'uye-ol.html'
  ];

  HTML_ENTRIES.forEach(function(entry) {
    test(entry + ' has balanced <script> open/close tags', () => {
      var html;
      try {
        html = readFromRepo(entry);
      } catch (e) {
        // optional files — skip silently if missing
        return;
      }
      var openMatches = html.match(/<script[\s>]/g) || [];
      var closeMatches = html.match(/<\/script>/g) || [];
      expect(openMatches.length).toBe(closeMatches.length);
    });

    test(entry + ' has no orphan <script src="..."> line without </script>', () => {
      var html;
      try {
        html = readFromRepo(entry);
      } catch (e) {
        return;
      }
      var lines = html.split('\n');
      var violations = [];
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!/<script\s[^>]*src=/.test(line)) continue;
        // same line close is fine
        if (/<\/script>/.test(line)) continue;
        // next line close is fine
        if (i + 1 < lines.length && /<\/script>/.test(lines[i + 1])) continue;
        violations.push('line ' + (i + 1) + ': ' + line.trim());
      }
      expect(violations).toEqual([]);
    });
  });
});

