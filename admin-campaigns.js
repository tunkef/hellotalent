/* ═══ admin-campaigns.js — Campaign Moderation Module ═══ */
(function(){
  'use strict';

  // Panel mount state — iki panel: review + campaigns
  var reviewMounted = false;
  var campaignsMounted = false;

  var REVIEW_HTML = ''
    + '<div class="panel-header"><h2>Kampanya &#304;ncele</h2></div>'
    + '<div class="stats-grid" id="review-stats">'
    + '  <div class="stat-card"><div class="stat-card-label">Bekleyen</div>'
    + '    <div class="stat-card-value" id="stat-pending">0</div></div>'
    + '  <div class="stat-card"><div class="stat-card-label">Aktif</div>'
    + '    <div class="stat-card-value" id="stat-active">0</div></div>'
    + '  <div class="stat-card"><div class="stat-card-label">Toplam</div>'
    + '    <div class="stat-card-value" id="stat-total">0</div></div>'
    + '</div>'
    + '<div id="pending-campaigns-list">'
    + '  <div class="empty-state"><div class="empty-state-icon">&#128203;</div>'
    + '  <div class="empty-state-text">&#304;ncelenecek kampanya yok</div></div>'
    + '</div>';

  var CAMPAIGNS_HTML = ''
    + '<div class="panel-header"><h2>T&uuml;m Kampanyalar</h2></div>'
    + '<div id="all-campaigns-list">'
    + '  <div class="empty-state"><div class="empty-state-icon">&#128202;</div>'
    + '  <div class="empty-state-text">Hen&uuml;z kampanya olu&#351;turulmam&#305;&#351;</div></div>'
    + '</div>';

  window._htAdminMountReview = function() {
    if (reviewMounted) return;
    var panel = document.getElementById('panel-review');
    var core = window._htAdminCore;
    if (panel && core) { core.mount(panel, REVIEW_HTML); reviewMounted = true; }
  };
  window._htAdminMountCampaigns = function() {
    if (campaignsMounted) return;
    var panel = document.getElementById('panel-campaigns');
    var core = window._htAdminCore;
    if (panel && core) { core.mount(panel, CAMPAIGNS_HTML); campaignsMounted = true; }
  };

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
    /* FAZ C: store_opening + brand_story eklendi; hiring_boost label'i
     * mevcut veriler icin korundu ama wizard'da create edilmez. */
    var typeMap = {
      offer: 'Teklif',
      employer_branding: 'Marka',
      hiring_boost: 'İşe Alım',
      store_opening: 'Yeni Mağaza',
      brand_story: 'Marka Haberi'
    };
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

  /* ── LOAD REVIEW PANEL STATS ── */
  async function loadReviewStats() {
    try {
      var supa = window._htAdminSupa;
      var pending = await supa.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'pending_review');
      var active = await supa.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active');
      var total = await supa.from('campaigns').select('id', { count: 'exact', head: true });

      var el = document.getElementById('stat-pending');
      if (el) el.textContent = pending.count || 0;
      el = document.getElementById('stat-active');
      if (el) el.textContent = active.count || 0;
      el = document.getElementById('stat-total');
      if (el) el.textContent = total.count || 0;
    } catch(e) {
      console.error('Review stats error:', e);
    }
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
        container.appendChild(buildEmptyState('', 'İncelenecek kampanya yok'));
      } else {
        container.appendChild(buildCampaignTable(res.data, true));
      }

      // Update review panel stats
      loadReviewStats();
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
        container.appendChild(buildEmptyState('', 'Henüz kampanya oluşturulmamış'));
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
  window._htAdminLoadPending = function() {
    if (window._htAdminMountReview) window._htAdminMountReview();
    return loadPendingCampaigns();
  };
  window._htAdminLoadAllCampaigns = function() {
    if (window._htAdminMountCampaigns) window._htAdminMountCampaigns();
    return loadAllCampaigns();
  };

})();
