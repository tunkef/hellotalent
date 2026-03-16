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
