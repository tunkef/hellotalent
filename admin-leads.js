/* ═══ admin-leads.js — Employer Lead Management Module ═══ */
(function(){
  'use strict';

  var mounted = false;
  var loaded = false;

  var PANEL_HTML = ''
    + '<div class="panel-header">'
    + '  <h2>&#304;&#351;veren Leads</h2>'
    + '  <div style="display:flex;gap:8px;align-items:center;">'
    + '    <select id="leads-filter-status" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:var(--text-sm);">'
    + '      <option value="">T&uuml;m durumlar</option>'
    + '      <option value="yeni">Yeni</option>'
    + '      <option value="iletisime_gecildi">&#304;leti&#351;ime ge&ccedil;ildi</option>'
    + '      <option value="demo_gosterildi">Demo g&ouml;sterildi</option>'
    + '      <option value="kayit_oldu">Kay&#305;t oldu</option>'
    + '      <option value="reddedildi">Reddedildi</option>'
    + '    </select>'
    + '    <button class="btn-sm" onclick="window._htLoadLeads()" style="padding:6px 12px;background:var(--navy);color:white;border:none;border-radius:8px;cursor:pointer;font-size:var(--text-sm);">Yenile</button>'
    + '  </div>'
    + '</div>'
    + '<div id="leads-content" aria-live="polite">'
    + '  <div class="empty-state"><div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" style="animation:htSpin 1.2s linear infinite"><circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg></div>'
    + '  <div class="empty-state-text">Y&uuml;kleniyor...</div></div>'
    + '</div>';

  function mountPanel() {
    if (mounted) return;
    var panel = document.getElementById('panel-leads');
    var core = window._htAdminCore;
    if (panel && core) {
      core.mount(panel, PANEL_HTML);
      mounted = true;
      // Re-bind filter change after mount
      var filterSel = document.getElementById('leads-filter-status');
      if (filterSel) filterSel.addEventListener('change', loadLeads);
    }
  }

  window._htAdminMountLeads = mountPanel;
  var STATUS_LABELS = {
    'yeni': 'Yeni',
    'iletisime_gecildi': 'İletişime Geçildi',
    'demo_gosterildi': 'Demo Gösterildi',
    'kayit_oldu': 'Kayıt Oldu',
    'reddedildi': 'Reddedildi'
  };

  function getSupa() {
    return window.HT ? window.HT.getSupa() : null;
  }

  function formatDate(d) {
    if (!d) return '-';
    var dt = new Date(d);
    return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async function loadLeads() {
    var container = document.getElementById('leads-content');
    if (!container) return;

    var statusFilter = document.getElementById('leads-filter-status');
    var filterVal = statusFilter ? statusFilter.value : null;

    var core = window._htAdminCore;
    if (core && typeof core.mount === 'function') {
      core.mount(container, '<div class="empty-state"><div class="empty-state-icon"></div><div class="empty-state-text">Yükleniyor...</div></div>');
    }

    try {
      var sb = getSupa();
      if (!sb) throw new Error('Bağlantı yok');

      var result = await sb.rpc('admin_get_leads', {
        p_status: filterVal || null,
        p_limit: 100,
        p_offset: 0
      });

      if (result.error) throw result.error;

      var data = result.data;
      var leads = data.leads || [];
      var total = data.total || 0;

      var core = window._htAdminCore;
      if (leads.length === 0) {
        if (core) core.mount(container, '<div class="empty-state" style="padding:60px 20px;">'
          + '<div class="empty-state-icon"></div>'
          + '<div class="empty-state-text" style="font-size:var(--text-lg);font-weight:600;color:var(--text);margin-bottom:4px;">Henüz lead yok</div>'
          + '<div style="color:var(--muted);font-size:var(--text-sm);">İşveren formu doldurulduğunda burada görünecek.</div>'
          + '</div>');
        return;
      }

      var html = '<div style="margin-bottom:12px;font-size:var(--text-sm);color:var(--muted);">Toplam: ' + total + ' lead</div>';
      html += '<table class="admin-table"><thead><tr>'
        + '<th>İsim</th><th>Şirket</th><th>E-posta</th><th>Telefon</th><th>Ekip</th><th>Durum</th><th>Tarih</th><th>Not</th><th></th>'
        + '</tr></thead><tbody>';

      for (var i = 0; i < leads.length; i++) {
        var l = leads[i];
        html += '<tr data-lead-id="' + l.id + '">'
          + '<td>' + escHtml(l.name) + '</td>'
          + '<td><strong>' + escHtml(l.company) + '</strong></td>'
          + '<td><a href="mailto:' + escHtml(l.email) + '" style="color:var(--verm);">' + escHtml(l.email) + '</a></td>'
          + '<td>' + escHtml(l.phone || '-') + '</td>'
          + '<td>' + escHtml(l.team_size || '-') + '</td>'
          + '<td><select class="lead-status-select" data-id="' + l.id + '" style="padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px;">';

        var statuses = ['yeni', 'iletisime_gecildi', 'demo_gosterildi', 'kayit_oldu', 'reddedildi'];
        for (var s = 0; s < statuses.length; s++) {
          html += '<option value="' + statuses[s] + '"' + (l.status === statuses[s] ? ' selected' : '') + '>' + STATUS_LABELS[statuses[s]] + '</option>';
        }

        html += '</select></td>'
          + '<td style="font-size:12px;color:var(--muted);">' + formatDate(l.created_at) + '</td>'
          + '<td><input type="text" class="lead-note-input" data-id="' + l.id + '" value="' + escHtml(l.notes || '') + '" placeholder="Not ekle..." style="padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px;width:120px;"></td>'
          + '<td><button class="lead-save-btn" data-id="' + l.id + '" style="padding:4px 8px;background:var(--navy);color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer;">Kaydet</button></td>'
          + '</tr>';
      }

      html += '</tbody></table>';
      if (core) core.mount(container, html);

      // Bind save buttons
      container.querySelectorAll('.lead-save-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.dataset.id;
          var row = btn.closest('tr');
          var statusSel = row.querySelector('.lead-status-select');
          var noteInput = row.querySelector('.lead-note-input');
          updateLead(id, statusSel.value, noteInput.value, btn);
        });
      });

    } catch (ex) {
      console.error('Lead yükleme hatası:', ex);
      var core2 = window._htAdminCore;
      if (core2) {
        core2.mount(container, '<div class="empty-state" style="padding:60px 20px;">'
          + '<div class="empty-state-icon"></div>'
          + '<div class="empty-state-text" style="color:#DC2626;">' + escHtml(ex.message || 'Yükleme hatası') + '</div>'
          + '</div>');
        if (core2.toast) core2.toast('Lead yükleme hatası: ' + (ex.message || 'Bilinmeyen'), 'error');
      }
    }
  }

  async function updateLead(leadId, status, notes, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    try {
      var sb = getSupa();
      var result = await sb.rpc('admin_update_lead', {
        p_lead_id: leadId,
        p_status: status,
        p_notes: notes || null
      });
      if (result.error) throw result.error;
      if (btn) { btn.textContent = '✓'; setTimeout(function() { btn.textContent = 'Kaydet'; btn.disabled = false; }, 1500); }
    } catch (ex) {
      console.error('Lead güncelleme hatası:', ex);
      if (btn) { btn.textContent = 'Hata!'; btn.disabled = false; }
    }
  }

  function escHtml(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // Expose for panel switch + manual refresh
  window._htLoadLeads = function() {
    mountPanel();
    loadLeads();
  };

  // Filter change → reload (initial bind — post-mount re-bind happens in mountPanel)
  var filterSel = document.getElementById('leads-filter-status');
  if (filterSel) {
    filterSel.addEventListener('change', function() { loadLeads(); });
  }

  // Auto-load when panel becomes visible
  var observer = new MutationObserver(function() {
    var panel = document.getElementById('panel-leads');
    if (panel && panel.style.display !== 'none' && !loaded) {
      loaded = true;
      loadLeads();
    }
  });
  var panelLeads = document.getElementById('panel-leads');
  if (panelLeads) {
    observer.observe(panelLeads, { attributes: true, attributeFilter: ['style'] });
  }
})();
