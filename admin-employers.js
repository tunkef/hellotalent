/* ═══ admin-employers.js — Employer Analytics Module ═══ */
(function(){
  'use strict';

  var mounted = false;
  var loaded = false;

  var PANEL_HTML = ''
    + '<div class="panel-header"><h2>&#304;&#351;verenler</h2></div>'
    + '<div id="employers-content" aria-live="polite">'
    + '  <div class="empty-state"><div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" style="animation:htSpin 1.2s linear infinite"><circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg></div>'
    + '  <div class="empty-state-text">Y&uuml;kleniyor...</div></div>'
    + '</div>';

  window._htAdminMountEmployers = function() {
    if (mounted) return;
    var panel = document.getElementById('panel-employers');
    var core = window._htAdminCore;
    if (panel && core) { core.mount(panel, PANEL_HTML); mounted = true; }
  };

  var buildStatCard = window._htAdminBuildStatCard;
  var buildRow = window._htAdminBuildRow;
  var buildSectionLabel = window._htAdminBuildSectionLabel;

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
    if (window._htAdminMountEmployers) window._htAdminMountEmployers();
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
        supa.from('campaigns').select('created_by').in('status', ['active', 'approved', 'pending_review']).limit(1000),
        // Recent registrations (last 10)
        supa.from('hr_profiles').select('id, full_name, email, company_id, created_at, companies(company_name)').order('created_at', { ascending: false }).limit(10),
        // Row 3: Positions
        supa.from('positions').select('id', { count: 'exact', head: true }),
        supa.from('positions').select('id', { count: 'exact', head: true }).eq('durum', 'active'),
        supa.from('positions').select('id', { count: 'exact', head: true }).eq('durum', 'draft'),
        supa.from('positions').select('id', { count: 'exact', head: true }).eq('durum', 'closed'),
        // Premium count: active employer subscriptions (pro + enterprise)
        supa.from('subscriptions').select('id', { count: 'exact', head: true }).eq('user_type', 'employer').in('status', ['active', 'trial']).in('plan', ['pro', 'enterprise'])
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

      // Premium: count from subscriptions table (active pro/enterprise)
      // Safe: if subscriptions table doesn't exist yet, .count is null → 0
      var premiumCount = (queries[9] && queries[9].count) || 0;
      var freemiumCount = total - premiumCount;

      var recentData = queries[4].data || [];

      // Positions data
      var totalPoz = queries[5].count || 0;
      var activePoz = queries[6].count || 0;
      var draftPoz = queries[7].count || 0;
      var closedPoz = queries[8].count || 0;

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
        buildStatCard('Premium', premiumCount),
        buildStatCard('Freemium', freemiumCount)
      ]));

      // Row 3: Positions
      container.appendChild(buildSectionLabel('Pozisyon İlanları'));
      container.appendChild(buildRow([
        buildStatCard('Toplam Pozisyon', totalPoz),
        buildStatCard('Aktif İlan', activePoz),
        buildStatCard('Taslak', draftPoz, '📝'),
        buildStatCard('Kapalı', closedPoz, '🔒')
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
      iconDiv.textContent = '';
      errDiv.appendChild(iconDiv);
      var textDiv = document.createElement('div');
      textDiv.className = 'empty-state-text';
      textDiv.textContent = 'Veri yüklenirken hata oluştu';
      errDiv.appendChild(textDiv);
      container.appendChild(errDiv);
    }
  };

})();
