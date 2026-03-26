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
    expect(adminHtml).toContain('Destek Talepleri');
    expect(adminHtml).toContain('id="badge-support-open"');
    expect(adminHtml).toContain('id="panel-support"');
    expect(adminHtml).toContain('id="support-content"');
    expect(adminHtml).toContain('admin-support.js');
    expect(adminHtml).toContain("'support') window._htAdminLoadSupport");
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
    mulakatJs = readFromRepo('profil-mulakatkocu.js');
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
    expect(adminHtml).toContain('id="studio-modules-content"');
    expect(adminHtml).toContain('admin-studio-modules.js');
    expect(adminHtml).toContain("'studio-modules') window._htAdminLoadStudioModules");
  });

  test('admin module has section filter and create/publish/archive actions', () => {
    expect(adminStudioJs).toContain("'performans'");
    expect(adminStudioJs).toContain("'bilgiler'");
    expect(adminStudioJs).toContain('admin_create_studio_module');
    expect(adminStudioJs).toContain('admin_publish_studio_module');
    expect(adminStudioJs).toContain('admin_archive_studio_module');
  });

  // ── Candidate UI ──
  test('profil-mulakatkocu.js has DB-backed studio section hydration', () => {
    expect(mulakatJs).toContain('hydrateStudioSection');
    expect(mulakatJs).toContain('studio_modules');
    expect(mulakatJs).toContain('mark_studio_module_viewed');
    expect(mulakatJs).toContain('complete_studio_module');
  });

  test('candidate Studio sections no longer use toast as primary action', () => {
    // perfBtn and bilgiBtn should call hydrateStudioSection, not showStudioToast
    var bindStart = mulakatJs.indexOf('function bindStarIntroEvents');
    var bindEnd = mulakatJs.indexOf('function showStudioToast');
    var bindBody = mulakatJs.slice(bindStart, bindEnd);
    expect(bindBody).toContain("hydrateStudioSection('performans'");
    expect(bindBody).toContain("hydrateStudioSection('bilgiler'");
    expect(bindBody).not.toContain("showStudioToast('Performans");
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
    mulakatJs = readFromRepo('profil-mulakatkocu.js');
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

  test('landing cards have async progress stat placeholders', () => {
    expect(mulakatJs).toContain("id=\"st-stat-performans\"");
    expect(mulakatJs).toContain("id=\"st-stat-bilgiler\"");
    expect(mulakatJs).toContain('hydrateLandingStats');
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
    mulakatJs = readFromRepo('profil-mulakatkocu.js');
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
    mulakatJs = readFromRepo('profil-mulakatkocu.js');
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
    mulakatJs = readFromRepo('profil-mulakatkocu.js');
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
