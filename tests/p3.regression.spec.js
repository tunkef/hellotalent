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
    mulakatJs = readFromRepo('profil-studio.js');
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
    mulakatJs = readFromRepo('profil-studio.js');
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
    mulakatJs = readFromRepo('profil-studio.js');
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
    mulakatJs = readFromRepo('profil-studio.js');
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
    mulakatJs = readFromRepo('profil-studio.js');
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
    mulakatJs = readFromRepo('profil-studio.js');
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
    expect(premiumJs).toContain('Premium Aktif');
    expect(premiumJs).toContain('checkCurrentPremium');
  });
});

// Yetenek IA Reset + Learning Portal Phase 1
// ═══════════════════════════════════════════════

test.describe('Yetenek IA reset — structural guards', () => {
  var mulakatJs;

  test.beforeAll(() => {
    mulakatJs = readFromRepo('profil-studio.js');
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
    mulakatJs = readFromRepo('profil-studio.js');
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
    mulakatJs = readFromRepo('profil-studio.js');
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
    mulakatJs = readFromRepo('profil-studio.js');
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
    mulakatJs = readFromRepo('profil-studio.js');
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
    studioJs = readFromRepo('profil-studio.js');
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

  test('completion bar shows %45 threshold readiness state', () => {
    expect(genelJs).toContain('pct >= 45');
    expect(genelJs).toContain('gh-id-readiness');
  });

  test('below threshold shows actionable hints from getProfileScoreHints', () => {
    expect(genelJs).toContain('getProfileScoreHints');
    expect(genelJs).toContain('gh-id-hints');
  });

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
    expect(cvJs5).toContain('_loadedDBData.profile.cv_url = cvUrl');
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
    studioJs = readFromRepo('profil-studio.js');
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
    var modalStart = profilHtml25.indexOf('class="modal-premium-line"');
    expect(modalStart).toBeGreaterThan(0);
    var modalSnippet = profilHtml25.substring(modalStart, modalStart + 150);
    expect(modalSnippet).toContain('Beta avantajlarını keşfet');
    expect(modalSnippet).not.toContain('Premium avantajlarını keşfet');
  });

  test('merkez top footer premium entry shows Beta Avantajları not Premium Aday Avantajları', () => {
    // Window is 500 chars to accommodate the inline SVG polygon before mk-footer-text
    var footerStart = profilHtml25.indexOf('id="mk-footer-premium"');
    expect(footerStart).toBeGreaterThan(0);
    var footerSnippet = profilHtml25.substring(footerStart, footerStart + 500);
    expect(footerSnippet).toContain('Beta Avantajları');
    expect(footerSnippet).not.toContain('Premium Aday Avantajları');
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
// ik.html --text-* token'larını local :root'ta tanımlamadan kullanırsa
// CSS var() sessizce çözümsüz kalır. Bu guard tanım-kullanım tutarlılığını
// zorlar: kullanım varsa tanım da aynı dosyada bulunmalı.
// ═══════════════════════════════════════════════════════════════
test.describe('Aşama 35 — ik.html text-token source guard', () => {
  var ikHtml;

  test.beforeAll(() => {
    ikHtml = readFromRepo('ik.html');
  });

  test('ik.html defines all --text-* tokens it uses in its own :root', () => {
    var usedTokens = ['--text-xs', '--text-sm', '--text-base', '--text-md',
                      '--text-lg', '--text-xl', '--text-2xl', '--text-3xl'];
    var usesAnyToken = usedTokens.some(function(t) {
      return ikHtml.indexOf('var(' + t + ')') !== -1;
    });
    // If ik.html uses any --text-* token, every token in the set must be defined in its :root.
    if (usesAnyToken) {
      usedTokens.forEach(function(t) {
        expect(ikHtml).toContain(t + ':');
      });
    }
  });

  test('ik.html --text-* definitions are in a local :root block, not imported from shared.css', () => {
    var rootStart = ikHtml.indexOf(':root');
    expect(rootStart).toBeGreaterThanOrEqual(0);
    var rootBlock = ikHtml.slice(rootStart, ikHtml.indexOf('}', rootStart) + 1);
    expect(rootBlock).toContain('--text-xs:');
    expect(rootBlock).toContain('--text-3xl:');
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
    var fnBody = inboxJs36.substring(fnStart, fnStart + 500);
    expect(fnBody).toContain('header-notif-dot');
  });

  test('_applyNotifBellDot manages badge-bildirimler', () => {
    var fnStart = inboxJs36.indexOf('function _applyNotifBellDot');
    expect(fnStart).toBeGreaterThan(0);
    var fnBody = inboxJs36.substring(fnStart, fnStart + 500);
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

  test('AI-COLLAB.md Asama 38 smoke result shows 68/68 not 30/30', () => {
    // 30/30 must not appear as a test result claim
    expect(aiCollab).not.toContain('**30/30 PASS**');
    expect(aiCollab).toContain('68/68 PASS');
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
    expect(cvJs).toContain('currentCVStoragePath = filePath');
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
    studioJs = readFromRepo('profil-studio.js');
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
