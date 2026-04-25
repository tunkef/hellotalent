/* ═══ admin-hr-signups.js — Kurumsal Onboarding Lead Listesi (Asama 84) ═══ */
(function(){
  'use strict';

  var mounted = false;
  var loaded = false;

  var SEGMENT_LABELS = {
    single_brand: 'Tek marka',
    holding: 'Holding/çoklu',
    distributor: 'Dağıtıcı',
    headhunter: 'Headhunter'
  };
  var URGENCY_LABELS = {
    hemen: 'Hemen',
    '1_ay': '1 ay',
    '3_ay': '3 ay',
    kesif: 'Keşif'
  };

  var PANEL_HTML = ''
    + '<div class="panel-header">'
    + '  <h2>Kurumsal Onboarding</h2>'
    + '  <div style="display:flex;gap:8px;align-items:center;">'
    + '    <select id="hrs-filter" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:var(--text-sm);">'
    + '      <option value="all">Tümü</option>'
    + '      <option value="new">Yeni (signup, wizard başlamadı)</option>'
    + '      <option value="in_progress">Wizard devam ediyor</option>'
    + '      <option value="completed">Onboarding tamamlandı</option>'
    + '    </select>'
    + '    <button class="btn-sm" onclick="window._htLoadHrSignups()" style="padding:6px 12px;background:var(--navy);color:white;border:none;border-radius:8px;cursor:pointer;font-size:var(--text-sm);">Yenile</button>'
    + '  </div>'
    + '</div>'
    + '<div id="hrs-content" aria-live="polite">'
    + '  <div class="empty-state"><div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" style="animation:htSpin 1.2s linear infinite"><circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg></div>'
    + '  <div class="empty-state-text">Yükleniyor...</div></div>'
    + '</div>';

  function mountPanel() {
    if (mounted) return;
    var panel = document.getElementById('panel-hr-signups');
    var core = window._htAdminCore;
    if (panel && core) {
      core.mount(panel, PANEL_HTML);
      mounted = true;
      var filterSel = document.getElementById('hrs-filter');
      if (filterSel) filterSel.addEventListener('change', loadList);
    }
  }
  window._htAdminMountHrSignups = mountPanel;

  function getSupa() {
    return window.HT ? window.HT.getSupa() : null;
  }

  function escHtml(str) {
    var d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function fmtDate(d) {
    if (!d) return '-';
    try {
      var dt = new Date(d);
      return dt.toLocaleDateString('tr-TR', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch(e) { return d; }
  }

  function statusBadge(row) {
    if (row.onboarding_completed) {
      return '<span style="background:#ECFDF5;color:#065F46;border:1px solid #10B981;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;">Tamamlandı</span>';
    }
    var step = parseInt(row.onboarding_step,10) || 1;
    if (step <= 1) {
      return '<span style="background:#EEF2FF;color:#1E2D5E;border:1px solid #1E2D5E;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;">Yeni signup</span>';
    }
    return '<span style="background:#FEF3C7;color:#92400E;border:1px solid #F59E0B;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;">Wizard ' + step + '/8</span>';
  }

  async function loadList() {
    var container = document.getElementById('hrs-content');
    if (!container) return;
    var filterSel = document.getElementById('hrs-filter');
    var filterVal = filterSel ? filterSel.value : 'all';

    var core = window._htAdminCore;
    if (core) core.mount(container, '<div class="empty-state"><div class="empty-state-icon"></div><div class="empty-state-text">Yükleniyor...</div></div>');

    try {
      var sb = getSupa();
      if (!sb) throw new Error('Bağlantı yok');

      var res = await sb.rpc('admin_get_hr_signups', { p_filter: filterVal, p_limit: 200, p_offset: 0 });
      if (res.error) throw res.error;

      var data = res.data || {};
      var rows = data.rows || [];
      var total = data.total || 0;

      if (rows.length === 0) {
        if (core) core.mount(container, '<div class="empty-state" style="padding:60px 20px;">'
          + '<div class="empty-state-icon"></div>'
          + '<div class="empty-state-text" style="font-size:var(--text-lg);font-weight:600;color:var(--text);margin-bottom:4px;">Kayıt yok</div>'
          + '<div style="color:var(--muted);font-size:var(--text-sm);">Bu filtre için kurumsal kayıt bulunamadı.</div>'
          + '</div>');
        return;
      }

      var html = '<div style="margin-bottom:12px;font-size:var(--text-sm);color:var(--muted);">Toplam: ' + total + ' kayıt</div>';
      html += '<table class="admin-table"><thead><tr>'
        + '<th>İsim</th><th>Şirket</th><th>E-posta</th><th>Telefon</th>'
        + '<th>Segment</th><th>Ekip</th><th>Aylık</th><th>Aciliyet</th>'
        + '<th>Durum</th><th>Kayıt</th><th>Tamamlandı</th>'
        + '</tr></thead><tbody>';

      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var name = ((r.ad || '') + ' ' + (r.soyad || '')).trim();
        html += '<tr data-uid="' + escHtml(r.id) + '">'
          + '<td>' + escHtml(name || '-') + '</td>'
          + '<td><strong>' + escHtml(r.company || '-') + '</strong></td>'
          + '<td><a href="mailto:' + escHtml(r.email) + '" style="color:var(--verm);">' + escHtml(r.email || '-') + '</a></td>'
          + '<td>' + escHtml(r.phone || '-') + '</td>'
          + '<td>' + escHtml(r.segment_type ? (SEGMENT_LABELS[r.segment_type] || r.segment_type) : '-') + '</td>'
          + '<td>' + escHtml(r.team_size || '-') + '</td>'
          + '<td>' + escHtml(r.monthly_positions || '-') + '</td>'
          + '<td>' + escHtml(r.urgency ? (URGENCY_LABELS[r.urgency] || r.urgency) : '-') + '</td>'
          + '<td>' + statusBadge(r) + '</td>'
          + '<td style="font-size:12px;color:var(--muted);">' + fmtDate(r.created_at) + '</td>'
          + '<td style="font-size:12px;color:var(--muted);">' + fmtDate(r.onboarding_completed_at) + '</td>'
          + '</tr>';
      }

      html += '</tbody></table>';
      if (core) core.mount(container, html);

    } catch (ex) {
      console.error('hr signups load error:', ex);
      var core2 = window._htAdminCore;
      if (core2) {
        core2.mount(container, '<div class="empty-state" style="padding:60px 20px;">'
          + '<div class="empty-state-icon"></div>'
          + '<div class="empty-state-text" style="color:#DC2626;">' + escHtml(ex.message || 'Yükleme hatası') + '</div>'
          + '</div>');
      }
    }
  }

  window._htLoadHrSignups = function() {
    mountPanel();
    loadList();
  };

  // Auto-load when panel becomes visible
  var observer = new MutationObserver(function() {
    var panel = document.getElementById('panel-hr-signups');
    if (panel && panel.style.display !== 'none' && !loaded) {
      loaded = true;
      loadList();
    }
  });
  var panelEl = document.getElementById('panel-hr-signups');
  if (panelEl) {
    observer.observe(panelEl, { attributes: true, attributeFilter: ['style'] });
  }
})();
