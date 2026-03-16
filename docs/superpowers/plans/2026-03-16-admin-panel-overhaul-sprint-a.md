# Admin Panel Overhaul — Sprint A Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform admin.html from a campaign-only moderation tool into a modular admin dashboard with new sidebar navigation, Dashboard overview, Candidates analytics, Employers analytics, and "Yakında" placeholders for future panels.

**Architecture:** admin.html stays as the shell (sidebar + auth + panel HTML containers). Existing inline campaign JS is extracted to admin-campaigns.js. New analytics panels get their own JS files (admin-candidates.js, admin-employers.js) following the IIFE + `window._htAdmin*` pattern proven in profil.html. Panels lazy-load on first sidebar click.

**Tech Stack:** Vanilla JS (var, not const/let — Safari safety), Supabase JS v2, static HTML/CSS on GitHub Pages

**Spec:** `docs/superpowers/specs/2026-03-16-admin-panel-overhaul-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `admin.html` | MODIFY | Shell: sidebar nav, panel HTML containers, auth, core switchPanel, CSS, script tags |
| `admin-campaigns.js` | CREATE | Campaign moderation: table builder, review actions, load pending/all campaigns |
| `admin-candidates.js` | CREATE | Candidate analytics: 9 stat cards across 3 rows |
| `admin-employers.js` | CREATE | Employer analytics: 5 stat cards + last 10 registrations table |
| `docs/migrations/019_is_employer_fix.sql` | CREATE | Fix is_employer() with SET search_path = public |

---

## Chunk 1: Admin Shell Refactor + Campaign Extraction

### Task 1: Refactor admin.html Sidebar Navigation

**Files:**
- Modify: `admin.html:270-310` (sidebar nav section)

The current sidebar has only 3 items under 2 sections (Moderasyon, Sistem). We need to expand it to match the spec's 7-item, 4-section structure with `data-panel` attributes for role filtering support.

- [ ] **Step 1.1: Replace sidebar nav HTML**

In `admin.html`, replace the entire `<nav class="sidebar-nav">` block (lines 276-296) with the new expanded navigation:

```html
    <nav class="sidebar-nav">
      <div class="nav-item active" data-panel="dashboard" onclick="switchPanel('dashboard',this)">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>
        Dashboard
      </div>

      <div class="nav-section-label">Moderasyon</div>

      <div class="nav-item" data-panel="review" onclick="switchPanel('review',this)">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg></span>
        Kampanya İncele
        <span class="nav-badge" id="badge-pending" style="display:none;">0</span>
      </div>

      <div class="nav-item" data-panel="campaigns" onclick="switchPanel('campaigns',this)">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></span>
        Tüm Kampanyalar
      </div>

      <div class="nav-section-label">Yönetim</div>

      <div class="nav-item" data-panel="candidates" onclick="switchPanel('candidates',this)">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></span>
        Adaylar
      </div>

      <div class="nav-item" data-panel="employers" onclick="switchPanel('employers',this)">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M10 21V7l2-4 2 4v14"/></svg></span>
        İşverenler
      </div>

      <div class="nav-section-label">Gelir</div>

      <div class="nav-item" data-panel="sales" onclick="switchPanel('sales',this)">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></span>
        Satışlar
      </div>

      <div class="nav-section-label">Sistem</div>

      <div class="nav-item" data-panel="team" onclick="switchPanel('team',this)">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></span>
        Ekip Yönetimi
      </div>

      <div class="nav-item" data-panel="settings" onclick="switchPanel('settings',this)">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg></span>
        Ayarlar
      </div>
    </nav>
```

- [ ] **Step 1.2: Verify sidebar renders correctly**

Open `admin.html` in browser, login. Confirm:
- Dashboard is first item (active by default)
- 4 section labels: Moderasyon, Yönetim, Gelir, Sistem
- 8 nav items total: Dashboard, Kampanya İncele, Tüm Kampanyalar, Adaylar, İşverenler, Satışlar, Ekip Yönetimi, Ayarlar
- Pending badge still shows on Kampanya İncele

- [ ] **Step 1.3: Commit sidebar changes**

```bash
git add admin.html
git commit -m "feat(admin): expand sidebar navigation with 4 sections and 8 nav items"
```

---

### Task 2: Add New Panel HTML Shells

**Files:**
- Modify: `admin.html:313-368` (main content area — add new panels)

Add HTML containers for Dashboard, Candidates, Employers panels plus "Yakında" placeholders for Sales and Team. The existing review, campaigns, settings panels stay. Dashboard becomes the default active panel.

- [ ] **Step 2.1: Change default active panel from review to dashboard**

In `admin.html`, change `panel-review` from active to inactive:

Old (line 316):
```html
    <div class="panel active" id="panel-review">
```
New:
```html
    <div class="panel" id="panel-review">
```

- [ ] **Step 2.2: Add Dashboard overview panel before panel-review**

Insert before the `<!-- ═══ PANEL: KAMPANYA INCELE ═══ -->` comment (before line 315):

```html
    <!-- ═══ PANEL: DASHBOARD ═══ -->
    <div class="panel active" id="panel-dashboard">
      <div class="panel-header">
        <h2>Dashboard</h2>
      </div>
      <div class="stats-grid" id="dashboard-stats">
        <div class="stat-card">
          <div class="stat-card-label">Toplam Aday</div>
          <div class="stat-card-value" id="dash-candidates">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Toplam İşveren</div>
          <div class="stat-card-value" id="dash-employers">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Aktif Kampanya</div>
          <div class="stat-card-value" id="dash-campaigns">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Onay Bekleyen</div>
          <div class="stat-card-value" id="dash-pending">—</div>
        </div>
      </div>
    </div>
```

- [ ] **Step 2.3: Add Candidates panel after panel-campaigns**

Insert after the `</div>` closing `panel-campaigns` (after line 355):

```html
    <!-- ═══ PANEL: ADAYLAR ═══ -->
    <div class="panel" id="panel-candidates">
      <div class="panel-header">
        <h2>Adaylar</h2>
      </div>
      <div id="candidates-content">
        <div class="empty-state">
          <div class="empty-state-icon">⏳</div>
          <div class="empty-state-text">Yükleniyor...</div>
        </div>
      </div>
    </div>
```

- [ ] **Step 2.4: Add Employers panel after panel-candidates**

```html
    <!-- ═══ PANEL: İŞVERENLER ═══ -->
    <div class="panel" id="panel-employers">
      <div class="panel-header">
        <h2>İşverenler</h2>
      </div>
      <div id="employers-content">
        <div class="empty-state">
          <div class="empty-state-icon">⏳</div>
          <div class="empty-state-text">Yükleniyor...</div>
        </div>
      </div>
    </div>
```

- [ ] **Step 2.5: Add Sales "Yakında" placeholder panel**

```html
    <!-- ═══ PANEL: SATIŞLAR (YAKINDA) ═══ -->
    <div class="panel" id="panel-sales">
      <div class="panel-header">
        <h2>Satışlar</h2>
      </div>
      <div class="empty-state" style="padding:80px 20px;">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-text" style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:8px;">Yakında</div>
        <div style="font-size:13px;color:var(--muted);">Bu bölüm bir sonraki güncellemede aktif olacak.</div>
      </div>
    </div>
```

- [ ] **Step 2.6: Add Team "Yakında" placeholder panel**

```html
    <!-- ═══ PANEL: EKİP YÖNETİMİ (YAKINDA) ═══ -->
    <div class="panel" id="panel-team">
      <div class="panel-header">
        <h2>Ekip Yönetimi</h2>
      </div>
      <div class="empty-state" style="padding:80px 20px;">
        <div class="empty-state-icon">👥</div>
        <div class="empty-state-text" style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:8px;">Yakında</div>
        <div style="font-size:13px;color:var(--muted);">Bu bölüm bir sonraki güncellemede aktif olacak.</div>
      </div>
    </div>
```

- [ ] **Step 2.7: Verify all panels exist in DOM**

Open browser console on admin.html and run:
```javascript
['dashboard','review','campaigns','candidates','employers','sales','team','settings'].forEach(function(p){ console.warn(p, !!document.getElementById('panel-' + p)); });
```
Expected: All 8 return `true`.

- [ ] **Step 2.8: Commit panel shells**

```bash
git add admin.html
git commit -m "feat(admin): add dashboard, candidates, employers panels + yakında placeholders for sales/team"
```

---

### Task 3: Extract Campaign JS to admin-campaigns.js

**Files:**
- Create: `admin-campaigns.js`
- Modify: `admin.html:371-762` (inline script — remove campaign functions, keep core)

Extract campaign-specific functions from admin.html inline JS into a separate IIFE file. The core shell (auth, switchPanel, screen switching, DOM refs) stays inline.

- [ ] **Step 3.1: Create admin-campaigns.js**

Create file `admin-campaigns.js` with the campaign moderation logic extracted from admin.html:

```javascript
/* ═══ admin-campaigns.js — Campaign Moderation Module ═══ */
(function(){
  'use strict';

  /* ── EMPTY STATE BUILDER ── */
  function buildEmptyState(icon, text) {
    var div = document.createElement('div');
    div.className = 'empty-state';
    var iconDiv = document.createElement('div');
    iconDiv.className = 'empty-state-icon';
    iconDiv.textContent = icon;
    div.appendChild(iconDiv);
    var textDiv = document.createElement('div');
    textDiv.className = 'empty-state-text';
    textDiv.textContent = text;
    div.appendChild(textDiv);
    return div;
  }

  /* ── SAFE DOM TABLE BUILDER ── */
  function buildCampaignTable(campaigns, showActions) {
    var typeMap = { offer: 'Teklif', employer_branding: 'Marka', hiring_boost: 'İşe Alım' };
    var statusMap = {
      draft: ['Taslak', 'draft'], pending_review: ['Beklemede', 'pending'],
      approved: ['Onaylı', 'approved'], active: ['Aktif', 'active'],
      rejected: ['Reddedildi', 'rejected'], revision_needed: ['Düzenleme', 'revision'],
      ended: ['Sona Erdi', 'ended'], archived: ['Arşiv', 'archived'],
      paused: ['Duraklatıldı', 'paused']
    };

    var table = document.createElement('table');
    table.className = 'admin-table';

    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');
    var headers = ['Kampanya', 'Tür', 'Durum', 'Tarih'];
    if (showActions) headers.push('İşlem');
    for (var h = 0; h < headers.length; h++) {
      var th = document.createElement('th');
      th.textContent = headers[h];
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    for (var i = 0; i < campaigns.length; i++) {
      var c = campaigns[i];
      var tr = document.createElement('tr');

      var tdName = document.createElement('td');
      var strong = document.createElement('strong');
      strong.textContent = c.title || '(Başlıksız)';
      tdName.appendChild(strong);
      tdName.appendChild(document.createElement('br'));
      var idSpan = document.createElement('span');
      idSpan.style.cssText = 'font-size:11px;color:var(--muted);';
      idSpan.textContent = 'ID: ' + c.id;
      tdName.appendChild(idSpan);
      tr.appendChild(tdName);

      var tdType = document.createElement('td');
      tdType.textContent = typeMap[c.campaign_type] || c.campaign_type;
      tr.appendChild(tdType);

      var tdStatus = document.createElement('td');
      var pill = document.createElement('span');
      var statusInfo = statusMap[c.status] || [c.status, 'draft'];
      pill.className = 'status-pill ' + statusInfo[1];
      pill.textContent = statusInfo[0];
      tdStatus.appendChild(pill);
      tr.appendChild(tdStatus);

      var tdDate = document.createElement('td');
      tdDate.style.cssText = 'font-size:12px;color:var(--muted);';
      var dateVal = c.submitted_at || c.created_at;
      tdDate.textContent = dateVal ? new Date(dateVal).toLocaleDateString('tr-TR') : '-';
      tr.appendChild(tdDate);

      if (showActions) {
        var tdActions = document.createElement('td');

        var btnApprove = document.createElement('button');
        btnApprove.className = 'btn btn-approve btn-sm';
        btnApprove.textContent = 'Onayla';
        btnApprove.addEventListener('click', (function(id){ return function(){ window._htReviewCampaign(id, 'approve'); }; })(c.id));
        tdActions.appendChild(btnApprove);

        tdActions.appendChild(document.createTextNode(' '));

        var btnReject = document.createElement('button');
        btnReject.className = 'btn btn-reject btn-sm';
        btnReject.textContent = 'Reddet';
        btnReject.addEventListener('click', (function(id){ return function(){ window._htReviewCampaign(id, 'reject'); }; })(c.id));
        tdActions.appendChild(btnReject);

        tdActions.appendChild(document.createTextNode(' '));

        var btnRevision = document.createElement('button');
        btnRevision.className = 'btn btn-sm';
        btnRevision.textContent = 'Düzenleme İste';
        btnRevision.addEventListener('click', (function(id){ return function(){ window._htReviewCampaign(id, 'revision_needed'); }; })(c.id));
        tdActions.appendChild(btnRevision);

        tr.appendChild(tdActions);
      }

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
  }

  /* ── LOAD PENDING CAMPAIGNS ── */
  async function loadPendingCampaigns() {
    try {
      var supa = window._htAdminSupa;
      var res = await supa.from('campaigns')
        .select('id, title, campaign_type, status, company_id, brand_id, created_by, created_at, submitted_at, payment_status, start_date, end_date')
        .eq('status', 'pending_review')
        .order('submitted_at', { ascending: true });

      var container = document.getElementById('pending-campaigns-list');
      if (res.error) { console.error('Load pending error:', res.error); return; }

      while (container.firstChild) container.removeChild(container.firstChild);

      if (!res.data || res.data.length === 0) {
        container.appendChild(buildEmptyState('✅', 'İncelenecek kampanya yok'));
        return;
      }

      container.appendChild(buildCampaignTable(res.data, true));
    } catch(e) {
      console.error('Load pending exception:', e);
    }
  }

  /* ── LOAD ALL CAMPAIGNS ── */
  async function loadAllCampaigns() {
    try {
      var supa = window._htAdminSupa;
      var res = await supa.from('campaigns')
        .select('id, title, campaign_type, status, company_id, brand_id, created_by, created_at, submitted_at, payment_status, start_date, end_date, impression_count, click_count')
        .order('created_at', { ascending: false });

      var container = document.getElementById('all-campaigns-list');
      if (res.error) { console.error('Load all error:', res.error); return; }

      while (container.firstChild) container.removeChild(container.firstChild);

      if (!res.data || res.data.length === 0) {
        container.appendChild(buildEmptyState('📊', 'Henüz kampanya oluşturulmamış'));
        return;
      }

      container.appendChild(buildCampaignTable(res.data, false));
    } catch(e) {
      console.error('Load all exception:', e);
    }
  }

  /* ── REVIEW ACTION ── */
  window._htReviewCampaign = async function(campaignId, action) {
    var adminUser = window._htAdminUser;
    if (!adminUser) return;

    var statusMap = { approve: 'approved', reject: 'rejected', revision_needed: 'revision_needed' };
    var newStatus = statusMap[action];
    if (!newStatus) return;

    var note = '';
    if (action === 'reject' || action === 'revision_needed') {
      note = prompt(action === 'reject' ? 'Reddetme sebebi:' : 'Düzenleme notu:');
      if (note === null) return;
    }

    try {
      var supa = window._htAdminSupa;

      var reviewRes = await supa.from('campaign_reviews').insert({
        campaign_id: campaignId,
        reviewer_id: adminUser.id,
        action: action,
        note: note || null
      });

      if (reviewRes.error) { console.error('Review insert error:', reviewRes.error); alert('Hata: ' + reviewRes.error.message); return; }

      var updateData = { status: newStatus };
      if (action === 'approve') updateData.approved_at = new Date().toISOString();

      var updateRes = await supa.from('campaigns').update(updateData).eq('id', campaignId);
      if (updateRes.error) { console.error('Campaign update error:', updateRes.error); alert('Hata: ' + updateRes.error.message); return; }

      // Reload panels + dashboard badge
      loadPendingCampaigns();
      loadAllCampaigns();
      window._htAdminLoadDashboard && window._htAdminLoadDashboard();
    } catch(e) {
      console.error('Review action exception:', e);
      alert('Hata: ' + e.message);
    }
  };

  /* ── PUBLIC API ── */
  window._htAdminLoadPending = loadPendingCampaigns;
  window._htAdminLoadAllCampaigns = loadAllCampaigns;

})();
```

- [ ] **Step 3.2: Verify file created**

```bash
wc -l admin-campaigns.js
```
Expected: ~180 lines.

- [ ] **Step 3.3: Commit campaign extraction**

```bash
git add admin-campaigns.js
git commit -m "feat(admin): extract campaign moderation to admin-campaigns.js IIFE module"
```

---

### Task 4: Refactor admin.html Inline JS (Core Shell Only)

**Files:**
- Modify: `admin.html:371-762` (replace entire `<script>` block)

The inline JS now becomes the thin core shell: Supabase init, auth flow, screen/panel switching, and the new Dashboard data loader. Campaign code is removed (now in admin-campaigns.js). Supabase client + admin user are exposed via `window._htAdminSupa` and `window._htAdminUser` for module access.

- [ ] **Step 4.1: Replace inline script block**

Replace everything from `<script>` (line 371) to `</script>` (line 762) with the refactored core:

```html
<script src="admin-campaigns.js?v=1"></script>
<script src="admin-candidates.js?v=1"></script>
<script src="admin-employers.js?v=1"></script>
<script>
(function(){
  'use strict';

  /* ── SUPABASE INIT ── */
  var HT_SUPA_URL = 'https://cpwibefquojehjehtrog.supabase.co';
  var HT_SUPA_KEY = 'sb_publishable_POUtNwJyjAAheukwYP5hmA_TKKjphwa';
  var _supa = supabase.createClient(HT_SUPA_URL, HT_SUPA_KEY);

  /* Expose for module JS files */
  window._htAdminSupa = _supa;
  window._htAdminUser = null;

  /* ── DOM REFS ── */
  var loginScreen = document.getElementById('login-screen');
  var unauthScreen = document.getElementById('unauthorized-screen');
  var adminShell = document.getElementById('admin-shell');
  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  var loginBtn = document.getElementById('login-btn');

  /* ── SCREEN SWITCHING ── */
  function showScreen(screen) {
    loginScreen.style.display = 'none';
    unauthScreen.className = 'unauthorized';
    adminShell.className = 'admin-shell';

    if (screen === 'login') loginScreen.style.display = 'flex';
    else if (screen === 'unauthorized') unauthScreen.className = 'unauthorized active';
    else if (screen === 'admin') adminShell.className = 'admin-shell active';
  }

  /* ── ADMIN CHECK ── */
  async function checkAdminAccess(userId) {
    try {
      var res = await _supa.from('admin_users').select('id, role, display_name').eq('id', userId).maybeSingle();
      if (res.error) { console.error('Admin check error:', res.error); return null; }
      return res.data;
    } catch(e) {
      console.error('Admin check exception:', e);
      return null;
    }
  }

  /* ── SESSION INIT ── */
  async function initSession() {
    var sessionRes = await _supa.auth.getSession();
    var session = sessionRes.data?.session;

    if (!session) {
      showScreen('login');
      return;
    }

    var admin = await checkAdminAccess(session.user.id);
    if (!admin) {
      showScreen('unauthorized');
      return;
    }

    window._htAdminUser = admin;
    showAdminDashboard(session.user, admin);
  }

  /* ── LOGIN ── */
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    loginError.style.display = 'none';
    loginBtn.disabled = true;
    loginBtn.textContent = 'Giriş yapılıyor...';

    try {
      var email = document.getElementById('login-email').value.trim();
      var password = document.getElementById('login-password').value;

      var res = await _supa.auth.signInWithPassword({ email: email, password: password });
      if (res.error) {
        showLoginError('Giriş başarısız: ' + res.error.message);
        return;
      }

      var admin = await checkAdminAccess(res.data.user.id);
      if (!admin) {
        showScreen('unauthorized');
        return;
      }

      window._htAdminUser = admin;
      showAdminDashboard(res.data.user, admin);
    } catch(e) {
      showLoginError('Hata: ' + e.message);
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Giriş Yap';
    }
  });

  function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.style.display = 'block';
  }

  /* ── SIGN OUT ── */
  window._htAdminSignOut = async function() {
    await _supa.auth.signOut();
    window._htAdminUser = null;
    showScreen('login');
  };

  /* ── SHOW ADMIN DASHBOARD ── */
  function showAdminDashboard(user, admin) {
    showScreen('admin');

    var nameEl = document.getElementById('admin-name');
    var roleEl = document.getElementById('admin-role');
    var avatarEl = document.getElementById('admin-avatar');

    nameEl.textContent = admin.display_name || user.email;
    roleEl.textContent = admin.role;
    avatarEl.textContent = (admin.display_name || user.email || 'A').charAt(0).toUpperCase();

    // Load default panel (Dashboard)
    loadDashboardOverview();
  }

  /* ── DASHBOARD OVERVIEW (4 stat cards) ── */
  async function loadDashboardOverview() {
    try {
      var candidates = await _supa.from('candidates').select('id', { count: 'exact', head: true });
      var employers = await _supa.from('hr_profiles').select('id', { count: 'exact', head: true });
      var activeCampaigns = await _supa.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active');
      var pendingCampaigns = await _supa.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'pending_review');

      document.getElementById('dash-candidates').textContent = candidates.count || 0;
      document.getElementById('dash-employers').textContent = employers.count || 0;
      document.getElementById('dash-campaigns').textContent = activeCampaigns.count || 0;
      document.getElementById('dash-pending').textContent = pendingCampaigns.count || 0;

      // Update badge on sidebar
      var badge = document.getElementById('badge-pending');
      if (pendingCampaigns.count > 0) {
        badge.textContent = pendingCampaigns.count;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
    } catch(e) {
      console.error('Dashboard overview error:', e);
    }
  }
  window._htAdminLoadDashboard = loadDashboardOverview;

  /* ── PANEL SWITCHING ── */
  window.switchPanel = function(name, el) {
    var panels = document.querySelectorAll('.panel');
    for (var i = 0; i < panels.length; i++) panels[i].classList.remove('active');

    var navItems = document.querySelectorAll('.nav-item');
    for (var j = 0; j < navItems.length; j++) navItems[j].classList.remove('active');

    var panel = document.getElementById('panel-' + name);
    if (panel) panel.classList.add('active');
    if (el) el.classList.add('active');

    // Lazy-load data per panel
    if (name === 'dashboard') loadDashboardOverview();
    if (name === 'review') window._htAdminLoadPending && window._htAdminLoadPending();
    if (name === 'campaigns') window._htAdminLoadAllCampaigns && window._htAdminLoadAllCampaigns();
    if (name === 'candidates') window._htAdminLoadCandidates && window._htAdminLoadCandidates();
    if (name === 'employers') window._htAdminLoadEmployers && window._htAdminLoadEmployers();
  };

  /* ── INIT ── */
  initSession();

})();
</script>
```

**Key changes from original:**
1. Supabase client exposed as `window._htAdminSupa` (modules need it)
2. Admin user exposed as `window._htAdminUser` (modules need it)
3. Campaign functions removed (now in admin-campaigns.js)
4. `loadDashboardStats()` replaced with `loadDashboardOverview()` (queries candidates + hr_profiles too)
5. switchPanel now calls lazy-load hooks for all panels
6. Script tags for module files added BEFORE the inline script (modules register their `window._htAdmin*` functions, then inline script calls them)

**IMPORTANT — Script load order:**
- The Supabase CDN (`@supabase/supabase-js@2`) is loaded in `<head>` (line 10 of admin.html) — it's available before ANY body scripts run.
- Module JS files (admin-campaigns.js, etc.) reference `window._htAdminSupa` which is set when the inline script runs. Modules only REGISTER functions at load time (via `window._htAdminLoadPending = ...`), they don't call `_htAdminSupa` at load time.
- The actual Supabase calls happen later when triggered by user actions.

Safe execution order:
1. `<head>`: Supabase CDN loads → `window.supabase` available
2. Module scripts load and register `window._htAdmin*` functions (no Supabase calls yet)
3. Inline script runs: creates client → sets `window._htAdminSupa` → calls `initSession()`
4. `initSession()` → `showAdminDashboard()` → `loadDashboardOverview()` (Dashboard auto-loads on init, NOT via sidebar click)
5. User clicks other panel → `switchPanel` calls registered functions → they access `window._htAdminSupa` (now available)

- [ ] **Step 4.2: Verify no duplicate function definitions**

Search admin.html for any remaining campaign functions that should have been removed:
```bash
grep -n "buildCampaignTable\|loadPendingCampaigns\|loadAllCampaigns\|_htReviewCampaign\|buildEmptyState\|escHtml" admin.html
```
Expected: Only references within `switchPanel` conditional calls (not function definitions).

- [ ] **Step 4.3: Verify admin panel loads and login works**

Open admin.html in browser:
1. Login screen appears
2. Login with admin credentials
3. Dashboard panel shows with 4 stat cards (values load)
4. Click "Kampanya İncele" → loads pending campaigns
5. Click "Tüm Kampanyalar" → loads all campaigns
6. Click "Adaylar" → shows loading spinner (module loads)
7. Click "Satışlar" → shows "Yakında" placeholder
8. Click "Ekip Yönetimi" → shows "Yakında" placeholder

- [ ] **Step 4.4: Commit core refactor**

```bash
git add admin.html
git commit -m "refactor(admin): slim inline JS to core shell, expose _htAdminSupa/_htAdminUser for modules"
```

---

### Task 5: Build admin-candidates.js

**Files:**
- Create: `admin-candidates.js`

Candidate analytics dashboard: 9 stat cards across 3 rows. All read-only COUNT queries against the existing `candidates` table. No new tables needed.

**Data sources** (all from `candidates` table):
- Row 1: COUNT(*), COUNT(profile_completed=true) + %, COUNT(is_active=true)
- Row 2: COUNT(is_active=true), COUNT(is_active=false AND profile_completed=true), COUNT(hide_from_current_employer=true), COUNT(is_premium=true)
- Row 3: COUNT(account_status='frozen'), COUNT(account_status='pending_deletion'), COUNT(created_at > now()-7days)

- [ ] **Step 5.1: Create admin-candidates.js**

```javascript
/* ═══ admin-candidates.js — Candidate Analytics Module ═══ */
(function(){
  'use strict';

  var loaded = false;

  /* ── BUILD STAT CARD ── */
  function buildStatCard(label, value, emoji, extra) {
    var card = document.createElement('div');
    card.className = 'stat-card';

    var labelDiv = document.createElement('div');
    labelDiv.className = 'stat-card-label';
    labelDiv.textContent = (emoji ? emoji + ' ' : '') + label;
    card.appendChild(labelDiv);

    var valueDiv = document.createElement('div');
    valueDiv.className = 'stat-card-value';
    valueDiv.textContent = value;
    card.appendChild(valueDiv);

    if (extra) {
      var extraDiv = document.createElement('div');
      extraDiv.style.cssText = 'font-size:11px;color:var(--muted);margin-top:4px;';
      extraDiv.textContent = extra;
      card.appendChild(extraDiv);
    }

    return card;
  }

  /* ── BUILD ROW ── */
  function buildRow(cards) {
    var grid = document.createElement('div');
    grid.className = 'stats-grid';
    for (var i = 0; i < cards.length; i++) {
      grid.appendChild(cards[i]);
    }
    return grid;
  }

  /* ── BUILD SECTION LABEL ── */
  function buildSectionLabel(text) {
    var label = document.createElement('div');
    label.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin:24px 0 12px;';
    label.textContent = text;
    return label;
  }

  /* ── LOAD CANDIDATES DATA ── */
  window._htAdminLoadCandidates = async function() {
    if (loaded) return;

    var container = document.getElementById('candidates-content');
    if (!container) return;

    try {
      var supa = window._htAdminSupa;

      // Run all COUNT queries in parallel
      var queries = await Promise.all([
        // Row 1
        supa.from('candidates').select('id', { count: 'exact', head: true }),
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('profile_completed', true),
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('is_active', true),
        // Row 2
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('is_active', false).eq('profile_completed', true),
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('hide_from_current_employer', true),
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('is_premium', true),
        // Row 3
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('account_status', 'frozen'),
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('account_status', 'pending_deletion'),
        supa.from('candidates').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      var total = queries[0].count || 0;
      var profilTam = queries[1].count || 0;
      var aktif = queries[2].count || 0;
      var pasif = queries[3].count || 0;
      var gizli = queries[4].count || 0;
      var premium = queries[5].count || 0;
      var frozen = queries[6].count || 0;
      var pendingDel = queries[7].count || 0;
      var son7gun = queries[8].count || 0;

      var profilYuzde = total > 0 ? Math.round((profilTam / total) * 100) : 0;

      // Clear container
      while (container.firstChild) container.removeChild(container.firstChild);

      // Row 1: Headline
      container.appendChild(buildSectionLabel('Genel Bakış'));
      container.appendChild(buildRow([
        buildStatCard('Toplam Kayıtlı', total),
        buildStatCard('Profil Tamamlamış', profilTam, null, '%' + profilYuzde + ' tamamlama oranı'),
        buildStatCard('Aktif İş Arıyor', aktif)
      ]));

      // Row 2: Status Breakdown
      container.appendChild(buildSectionLabel('Durum Dağılımı'));
      container.appendChild(buildRow([
        buildStatCard('Beni Öner', aktif, '✅'),
        buildStatCard('Beni Önerme', pasif, '❌'),
        buildStatCard('İşverenden Gizli', gizli, '🙈'),
        buildStatCard('Premium', premium, '⭐')
      ]));

      // Row 3: Lifecycle
      container.appendChild(buildSectionLabel('Yaşam Döngüsü'));
      container.appendChild(buildRow([
        buildStatCard('Dondurulmuş', frozen, '🧊'),
        buildStatCard('Silme Bekleyen', pendingDel, '🗑️'),
        buildStatCard('Son 7 Gün Kayıt', son7gun, '📈')
      ]));

      loaded = true;
    } catch(e) {
      console.error('Candidates load error:', e);
      while (container.firstChild) container.removeChild(container.firstChild);
      var errDiv = document.createElement('div');
      errDiv.className = 'empty-state';
      var iconDiv = document.createElement('div');
      iconDiv.className = 'empty-state-icon';
      iconDiv.textContent = '⚠️';
      errDiv.appendChild(iconDiv);
      var textDiv = document.createElement('div');
      textDiv.className = 'empty-state-text';
      textDiv.textContent = 'Veri yüklenirken hata oluştu';
      errDiv.appendChild(textDiv);
      container.appendChild(errDiv);
    }
  };

})();
```

- [ ] **Step 5.2: Verify file created and no syntax errors**

```bash
node -c admin-candidates.js && echo "Syntax OK"
```
Expected: `Syntax OK`

- [ ] **Step 5.3: Test in browser**

Open admin.html → login → click "Adaylar" in sidebar. Verify:
- 3 section labels appear (Genel Bakış, Durum Dağılımı, Yaşam Döngüsü)
- 9 stat cards load with numeric values
- "Profil Tamamlamış" shows percentage
- Cards have emoji prefixes
- Second click doesn't reload (cached)

- [ ] **Step 5.4: Commit candidates module**

```bash
git add admin-candidates.js
git commit -m "feat(admin): add candidate analytics dashboard with 9 stat cards"
```

---

## Chunk 2: Employers Panel + Migration + Final Polish

### Task 6: Build admin-employers.js

**Files:**
- Create: `admin-employers.js`

**DRY note:** `buildStatCard`, `buildRow`, `buildSectionLabel` are intentionally duplicated from admin-candidates.js. Each module is self-contained — no shared admin-utils.js needed for 3 small helpers (~30 lines each). If a third analytics module appears (Sprint B sales), extract to shared file then.

Employer analytics dashboard: 6 stat cards (Row 1: total, onboarded, pending onboarding; Row 2: has active campaigns, premium, freemium) + table of last 10 registrations.

**Important DB notes:**
- `hr_profiles` has NO `is_premium` column. Premium status comes from `subscriptions` table (Sprint B).
- Until subscriptions table exists, premium count shows 0 and freemium = total. This is acceptable per spec.
- Onboarding = `company_id IS NOT NULL` (not `sirket`).

- [ ] **Step 6.1: Create admin-employers.js**

```javascript
/* ═══ admin-employers.js — Employer Analytics Module ═══ */
(function(){
  'use strict';

  var loaded = false;

  /* ── BUILD STAT CARD ── */
  function buildStatCard(label, value, emoji, extra) {
    var card = document.createElement('div');
    card.className = 'stat-card';

    var labelDiv = document.createElement('div');
    labelDiv.className = 'stat-card-label';
    labelDiv.textContent = (emoji ? emoji + ' ' : '') + label;
    card.appendChild(labelDiv);

    var valueDiv = document.createElement('div');
    valueDiv.className = 'stat-card-value';
    valueDiv.textContent = value;
    card.appendChild(valueDiv);

    if (extra) {
      var extraDiv = document.createElement('div');
      extraDiv.style.cssText = 'font-size:11px;color:var(--muted);margin-top:4px;';
      extraDiv.textContent = extra;
      card.appendChild(extraDiv);
    }

    return card;
  }

  /* ── BUILD ROW ── */
  function buildRow(cards) {
    var grid = document.createElement('div');
    grid.className = 'stats-grid';
    for (var i = 0; i < cards.length; i++) {
      grid.appendChild(cards[i]);
    }
    return grid;
  }

  /* ── BUILD SECTION LABEL ── */
  function buildSectionLabel(text) {
    var label = document.createElement('div');
    label.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin:24px 0 12px;';
    label.textContent = text;
    return label;
  }

  /* ── BUILD RECENT REGISTRATIONS TABLE ── */
  function buildRecentTable(employers) {
    var table = document.createElement('table');
    table.className = 'admin-table';

    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');
    var headers = ['İsim', 'E-posta', 'Şirket', 'Kayıt Tarihi'];
    for (var h = 0; h < headers.length; h++) {
      var th = document.createElement('th');
      th.textContent = headers[h];
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    for (var i = 0; i < employers.length; i++) {
      var emp = employers[i];
      var tr = document.createElement('tr');

      var tdName = document.createElement('td');
      var strong = document.createElement('strong');
      strong.textContent = emp.full_name || '(İsimsiz)';
      tdName.appendChild(strong);
      tr.appendChild(tdName);

      var tdEmail = document.createElement('td');
      tdEmail.style.cssText = 'font-size:12px;color:var(--muted);';
      tdEmail.textContent = emp.email || '-';
      tr.appendChild(tdEmail);

      var tdCompany = document.createElement('td');
      if (emp.companies && emp.companies.company_name) {
        tdCompany.textContent = emp.companies.company_name;
      } else {
        var noCompany = document.createElement('span');
        noCompany.style.cssText = 'color:var(--muted);font-style:italic;';
        noCompany.textContent = 'Onboarding bekliyor';
        tdCompany.appendChild(noCompany);
      }
      tr.appendChild(tdCompany);

      var tdDate = document.createElement('td');
      tdDate.style.cssText = 'font-size:12px;color:var(--muted);';
      tdDate.textContent = emp.created_at ? new Date(emp.created_at).toLocaleDateString('tr-TR') : '-';
      tr.appendChild(tdDate);

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
  }

  /* ── LOAD EMPLOYERS DATA ── */
  window._htAdminLoadEmployers = async function() {
    if (loaded) return;

    var container = document.getElementById('employers-content');
    if (!container) return;

    try {
      var supa = window._htAdminSupa;

      // Run all queries in parallel
      var queries = await Promise.all([
        // Row 1: Counts
        supa.from('hr_profiles').select('id', { count: 'exact', head: true }),
        supa.from('hr_profiles').select('id', { count: 'exact', head: true }).not('company_id', 'is', null),
        supa.from('hr_profiles').select('id', { count: 'exact', head: true }).is('company_id', null),
        // Row 2: Campaign activity — get employers with active-ish campaigns
        supa.from('campaigns').select('created_by').in('status', ['active', 'approved', 'pending_review']),
        // Recent registrations (last 10)
        supa.from('hr_profiles').select('id, full_name, email, company_id, created_at, companies(company_name)').order('created_at', { ascending: false }).limit(10)
      ]);

      var total = queries[0].count || 0;
      var onboarded = queries[1].count || 0;
      var pendingOnboard = queries[2].count || 0;

      // Count distinct employers with campaigns
      var campaignEmployers = queries[3].data || [];
      var uniqueEmployers = {};
      for (var c = 0; c < campaignEmployers.length; c++) {
        if (campaignEmployers[c].created_by) {
          uniqueEmployers[campaignEmployers[c].created_by] = true;
        }
      }
      var withCampaigns = Object.keys(uniqueEmployers).length;

      // Premium: 0 until subscriptions table exists (Sprint B)
      var premiumCount = 0;
      var freemiumCount = total;

      var recentData = queries[4].data || [];

      // Clear container
      while (container.firstChild) container.removeChild(container.firstChild);

      // Row 1: Overview
      container.appendChild(buildSectionLabel('Genel Bakış'));
      container.appendChild(buildRow([
        buildStatCard('Toplam İşveren', total),
        buildStatCard('Şirket Kaydı Tamamlamış', onboarded),
        buildStatCard('Onboarding Bekleyen', pendingOnboard)
      ]));

      // Row 2: Activity
      container.appendChild(buildSectionLabel('Aktivite'));
      container.appendChild(buildRow([
        buildStatCard('Aktif Kampanyası Var', withCampaigns, '📢'),
        buildStatCard('Premium', premiumCount, '⭐', 'Sprint B\'de aktif olacak'),
        buildStatCard('Freemium', freemiumCount)
      ]));

      // Recent Registrations Table
      if (recentData.length > 0) {
        container.appendChild(buildSectionLabel('Son Kaydolanlar'));
        container.appendChild(buildRecentTable(recentData));
      }

      loaded = true;
    } catch(e) {
      console.error('Employers load error:', e);
      while (container.firstChild) container.removeChild(container.firstChild);
      var errDiv = document.createElement('div');
      errDiv.className = 'empty-state';
      var iconDiv = document.createElement('div');
      iconDiv.className = 'empty-state-icon';
      iconDiv.textContent = '⚠️';
      errDiv.appendChild(iconDiv);
      var textDiv = document.createElement('div');
      textDiv.className = 'empty-state-text';
      textDiv.textContent = 'Veri yüklenirken hata oluştu';
      errDiv.appendChild(textDiv);
      container.appendChild(errDiv);
    }
  };

})();
```

- [ ] **Step 6.2: Verify file created and no syntax errors**

```bash
node -c admin-employers.js && echo "Syntax OK"
```
Expected: `Syntax OK`

- [ ] **Step 6.3: Test in browser**

Open admin.html → login → click "İşverenler" in sidebar. Verify:
- 2 section labels (Genel Bakış, Aktivite) + possible "Son Kaydolanlar"
- 6 stat cards load with numeric values
- Premium shows 0 with "Sprint B'de aktif olacak" subtitle
- Recent table shows employer names, emails, company, date
- Employers without company show italic "Onboarding bekliyor"

- [ ] **Step 6.4: Commit employers module**

```bash
git add admin-employers.js
git commit -m "feat(admin): add employer analytics dashboard with 6 stat cards + recent registrations"
```

---

### Task 7: Create is_employer() Migration

**Files:**
- Create: `docs/migrations/019_is_employer_fix.sql`

Fix the `is_employer()` function to include `SET search_path = public` for security. This fixes the broken `cbf_employer_read` RLS policy on `candidate_brand_follows`.

- [ ] **Step 7.1: Create migration file**

```sql
-- Migration 019: Fix is_employer() function with SET search_path
-- Fixes search path injection vulnerability on SECURITY DEFINER function
-- Fixes broken cbf_employer_read RLS policy on candidate_brand_follows

CREATE OR REPLACE FUNCTION is_employer()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
```

- [ ] **Step 7.2: Commit migration**

```bash
git add docs/migrations/019_is_employer_fix.sql
git commit -m "fix(db): add SET search_path to is_employer() SECURITY DEFINER function"
```

- [ ] **Step 7.3: Apply migration to Supabase**

Apply via Supabase SQL Editor:
1. Open Supabase Dashboard → SQL Editor
2. Paste the migration SQL
3. Execute (Cmd+Return)
4. Verify: Run `SELECT is_employer();` — should return false for non-employer users

---

### Task 8: Final Integration Verification

- [ ] **Step 8.1: Full panel navigation test**

Test every panel transition in browser:
1. Login → Dashboard loads (4 cards with numbers)
2. Dashboard → Kampanya İncele (table or empty state)
3. Kampanya İncele → Tüm Kampanyalar (table or empty state)
4. Tüm Kampanyalar → Adaylar (9 stat cards across 3 rows)
5. Adaylar → İşverenler (6 stat cards + table)
6. İşverenler → Satışlar ("Yakında" placeholder)
7. Satışlar → Ekip Yönetimi ("Yakında" placeholder)
8. Ekip Yönetimi → Ayarlar (Phase 7 placeholder)
9. Ayarlar → Dashboard (back to start)

Each transition: verify active sidebar highlighting, correct panel visible, data loads.

- [ ] **Step 8.2: Verify no console errors**

Open browser DevTools Console. Navigate through all panels. Confirm:
- No `console.log` calls (only `console.error` on actual errors)
- No undefined variable errors
- No Supabase query failures
- No 404 for JS files

- [ ] **Step 8.3: Verify badge system**

Check that the pending campaign badge:
- Shows count when pending campaigns exist
- Hides when count is 0
- Updates after approving/rejecting a campaign

- [ ] **Step 8.4: Run existing Playwright tests**

```bash
npx playwright test --reporter=list
```
Expected: 64+ passing (no regressions — admin.html has no Playwright tests yet, but ensure other pages unaffected)

- [ ] **Step 8.5: Verify file structure**

```bash
ls -la admin*.js admin.html docs/migrations/019*
```
Expected:
```
admin.html
admin-campaigns.js
admin-candidates.js
admin-employers.js
docs/migrations/019_is_employer_fix.sql
```

- [ ] **Step 8.6: Verify responsive behavior**

Resize browser to mobile width (< 768px). Verify:
- Sidebar hides
- Stat cards stack vertically
- Tables scroll horizontally if needed

- [ ] **Step 8.7: Final commit — integration verified**

```bash
git add admin.html admin-campaigns.js admin-candidates.js admin-employers.js docs/migrations/019_is_employer_fix.sql
git status
git commit -m "chore(admin): Sprint A integration verified — all panels functional"
```

- [ ] **Step 8.8: Deploy**

```bash
git push origin main
```
Wait ~40 seconds, then hard refresh admin panel on hellotalent.ai.
