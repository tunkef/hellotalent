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
    var lines = profilHtml.split('\\n');
    var duplicateClassPattern = /class="[^"]*"[^>]*class="/;
    var violations = [];
    profilHtml.split('\\n').forEach(function(line, i) {
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

  test('bento grid contains locked cards with opacity styling', () => {
    expect(profilHtml).toContain('class="bento-grid"');
    // Locked cards are in the same grid, marked with .locked class
    expect((profilHtml.match(/class="bento-card[^"]*locked/g) || []).length).toBeGreaterThan(0);
    // CSS provides opacity styling for locked cards
    expect(profilCss).toContain('.bento-card.locked');
  });
});
