/* ═══ admin-newsletter.js — Newsletter Management Module ═══
   Subscriber list + campaign composer + send flow + delivery report.
   Depends on: window.HT.getSupa(), admin session (is_admin).
   Backend: admin_list_newsletter_subscribers, admin_save_newsletter_campaign,
            admin_send_newsletter_campaign.
   Note: All dynamic string content passed through esc() before DOM insertion
   to prevent XSS. markdown→html runs on esc()'d input, only safe tags added.
*/
(function(){
  'use strict';

  var STATE = {
    tab: 'subs',
    filters: { audience: '', status: '', search: '' },
    activeCampaign: null,
  };

  function getSupa() {
    return window.HT ? window.HT.getSupa() : null;
  }

  function fmtDate(d) {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return d; }
  }

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Markdown → HTML. Input is plain text; we esc first, then add safe tags.
  function mdToHtml(md) {
    if (!md) return '';
    var html = esc(md);
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#C94E28;">$1</a>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    var lines = html.split('\n');
    var out = [];
    var inList = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (/^[-*]\s+/.test(line)) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + line.replace(/^[-*]\s+/, '') + '</li>');
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        if (line) out.push('<p style="margin:0 0 12px;">' + line + '</p>');
      }
    }
    if (inList) out.push('</ul>');
    return out.join('\n');
  }

  // Safe HTML template builder — dynamic parts already esc()'d
  function setHtml(el, html) {
    if (!el) return;
    // Caller contract: all dynamic content passed through esc() + safe static markup.
    el.innerHTML = html;
  }

  // ═════ SUBSCRIBER LIST ═════
  async function loadSubscribers() {
    var container = document.getElementById('newsletter-content');
    if (!container) return;

    setHtml(container, renderSubsShell());

    var audEl = document.getElementById('nl-filter-audience');
    var stEl = document.getElementById('nl-filter-status');
    var searchEl = document.getElementById('nl-filter-search');
    if (audEl) audEl.value = STATE.filters.audience;
    if (stEl) stEl.value = STATE.filters.status;
    if (searchEl) searchEl.value = STATE.filters.search;

    var listEl = document.getElementById('nl-subs-list');
    setHtml(listEl, '<div class="empty-state"><div class="empty-state-icon">&#9203;</div><div class="empty-state-text">Yükleniyor...</div></div>');

    try {
      var sb = getSupa();
      if (!sb) throw new Error('Bağlantı yok');

      var result = await sb.rpc('admin_list_newsletter_subscribers', {
        p_audience: STATE.filters.audience || null,
        p_status: STATE.filters.status || null,
        p_email_search: STATE.filters.search || null,
        p_limit: 100,
        p_offset: 0,
      });
      if (result.error) throw result.error;

      var rows = result.data || [];
      if (rows.length === 0) {
        setHtml(listEl, '<div class="empty-state" style="padding:60px 20px;">'
          + '<div class="empty-state-icon">&#128238;</div>'
          + '<div class="empty-state-text" style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:8px;">Abone yok</div>'
          + '<div style="font-size:14px;color:var(--muted);">Filtre kriterlerine uygun abone bulunamadı.</div>'
          + '</div>');
        return;
      }

      var total = rows[0] ? rows[0].total_count : 0;

      var html = '<div style="margin-bottom:12px;font-size:13px;color:var(--muted);">Toplam: <strong>' + esc(total) + '</strong> &middot; Gösterilen: ' + rows.length + '</div>';
      html += '<table class="admin-table"><thead><tr>'
        + '<th>E-posta</th><th>Kitle</th><th>Durum</th><th>Kaynak</th><th>Onay</th><th>Oluşturma</th>'
        + '</tr></thead><tbody>';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var statusBadge = renderStatusBadge(r.status);
        var audBadge = r.audience === 'kurumsal'
          ? '<span style="padding:2px 8px;border-radius:8px;background:rgba(30,45,94,0.1);color:#1E2D5E;font-size:11px;font-weight:600;">Kurumsal</span>'
          : '<span style="padding:2px 8px;border-radius:8px;background:rgba(201,78,40,0.1);color:#C94E28;font-size:11px;font-weight:600;">Aday</span>';
        html += '<tr>'
          + '<td><code style="font-size:12px;">' + esc(r.email) + '</code></td>'
          + '<td>' + audBadge + '</td>'
          + '<td>' + statusBadge + '</td>'
          + '<td style="font-size:12px;color:var(--muted);">' + esc(r.source || '-') + '</td>'
          + '<td style="font-size:12px;color:var(--muted);">' + esc(fmtDate(r.confirmed_at)) + '</td>'
          + '<td style="font-size:12px;color:var(--muted);">' + esc(fmtDate(r.created_at)) + '</td>'
          + '</tr>';
      }
      html += '</tbody></table>';
      html += '<div style="margin-top:16px;"><button class="btn-sm" id="nl-export-csv" style="padding:6px 12px;background:#fff;color:var(--navy);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:13px;">CSV İndir</button></div>';

      setHtml(listEl, html);

      var exportBtn = document.getElementById('nl-export-csv');
      if (exportBtn) {
        exportBtn.addEventListener('click', function(){ exportCsv(rows); });
      }
    } catch (err) {
      setHtml(listEl, '<div class="empty-state" style="padding:60px 20px;"><div class="empty-state-icon">&#9888;</div><div class="empty-state-text" style="color:#EF4444;">Hata: ' + esc(err.message || String(err)) + '</div></div>');
    }
  }

  function renderStatusBadge(s) {
    var colors = {
      pending: ['#F59E0B', 'rgba(245,158,11,0.12)', 'Bekliyor'],
      confirmed: ['#10B981', 'rgba(16,185,129,0.12)', 'Onaylı'],
      unsubscribed: ['#6B7280', 'rgba(107,114,128,0.12)', 'Ayrıldı'],
      bounced: ['#EF4444', 'rgba(239,68,68,0.12)', 'Bounce'],
    };
    var c = colors[s] || colors.pending;
    return '<span style="padding:2px 8px;border-radius:8px;background:' + c[1] + ';color:' + c[0] + ';font-size:11px;font-weight:600;">' + c[2] + '</span>';
  }

  function exportCsv(rows) {
    var header = ['email', 'audience', 'status', 'source', 'confirmed_at', 'created_at'];
    var csv = [header.join(',')];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      csv.push([
        '"' + (r.email || '').replace(/"/g, '""') + '"',
        r.audience || '',
        r.status || '',
        '"' + (r.source || '').replace(/"/g, '""') + '"',
        r.confirmed_at || '',
        r.created_at || '',
      ].join(','));
    }
    var blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'newsletter-subscribers-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderSubsShell() {
    return ''
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center;">'
      + '  <select id="nl-filter-audience" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;">'
      + '    <option value="">Tüm kitleler</option>'
      + '    <option value="aday">Aday</option>'
      + '    <option value="kurumsal">Kurumsal</option>'
      + '  </select>'
      + '  <select id="nl-filter-status" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;">'
      + '    <option value="">Tüm durumlar</option>'
      + '    <option value="pending">Bekliyor</option>'
      + '    <option value="confirmed">Onaylı</option>'
      + '    <option value="unsubscribed">Ayrıldı</option>'
      + '    <option value="bounced">Bounce</option>'
      + '  </select>'
      + '  <input type="search" id="nl-filter-search" placeholder="E-posta ara..." style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;min-width:200px;">'
      + '  <button id="nl-apply-filters" style="padding:6px 12px;background:var(--navy);color:#fff;border:0;border-radius:8px;font-size:13px;cursor:pointer;">Filtrele</button>'
      + '</div>'
      + '<div id="nl-subs-list"></div>';
  }

  // ═════ CAMPAIGN LIST ═════
  async function loadCampaigns() {
    var container = document.getElementById('newsletter-content');
    if (!container) return;

    setHtml(container, '<div id="nl-camps-list"><div class="empty-state"><div class="empty-state-icon">&#9203;</div><div class="empty-state-text">Yükleniyor...</div></div></div>');

    try {
      var sb = getSupa();
      var result = await sb
        .from('newsletter_campaigns')
        .select('id, audience, subject, status, scheduled_at, sent_at, total_recipients, sent_count, bounce_count, unsub_count, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (result.error) throw result.error;

      var rows = result.data || [];
      var listEl = document.getElementById('nl-camps-list');

      if (rows.length === 0) {
        setHtml(listEl, '<div class="empty-state" style="padding:60px 20px;">'
          + '<div class="empty-state-icon">&#128196;</div>'
          + '<div class="empty-state-text" style="font-size:18px;font-weight:600;margin-bottom:8px;">Henüz kampanya yok</div>'
          + '<div style="font-size:14px;color:var(--muted);">"+ Yeni Kampanya" butonuna tıklayarak başla.</div>'
          + '</div>');
        return;
      }

      var html = '<table class="admin-table"><thead><tr>'
        + '<th>Konu</th><th>Kitle</th><th>Durum</th><th>Alıcı/Gönderim</th><th>Oluşturma</th><th></th>'
        + '</tr></thead><tbody>';
      for (var i = 0; i < rows.length; i++) {
        var c = rows[i];
        var statusMap = {
          draft: ['#6B7280', 'Taslak'],
          scheduled: ['#F59E0B', 'Zamanlandı'],
          sending: ['#3B82F6', 'Gönderiliyor'],
          sent: ['#10B981', 'Gönderildi'],
          failed: ['#EF4444', 'Başarısız'],
        };
        var sc = statusMap[c.status] || ['#6B7280', c.status];
        html += '<tr>'
          + '<td style="font-weight:600;">' + esc(c.subject) + '</td>'
          + '<td><span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:8px;background:rgba(30,45,94,0.08);">' + esc(c.audience) + '</span></td>'
          + '<td><span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:8px;background:rgba(0,0,0,0.04);color:' + sc[0] + ';">' + sc[1] + '</span></td>'
          + '<td style="font-size:12px;color:var(--muted);">' + esc(c.sent_count || 0) + ' / ' + esc(c.total_recipients || 0) + '</td>'
          + '<td style="font-size:12px;color:var(--muted);">' + esc(fmtDate(c.created_at)) + '</td>'
          + '<td>'
          + (c.status === 'draft' || c.status === 'scheduled'
            ? '<button data-cid="' + esc(c.id) + '" class="nl-send-btn" style="padding:4px 10px;background:var(--verm);color:#fff;border:0;border-radius:6px;font-size:12px;cursor:pointer;">Gönder</button>'
            : '-')
          + '</td>'
          + '</tr>';
      }
      html += '</tbody></table>';
      setHtml(listEl, html);

      var btns = listEl.querySelectorAll('.nl-send-btn');
      for (var j = 0; j < btns.length; j++) {
        btns[j].addEventListener('click', function(e){
          var cid = e.currentTarget.getAttribute('data-cid');
          sendCampaign(cid);
        });
      }
    } catch (err) {
      setHtml(document.getElementById('nl-camps-list'),
        '<div class="empty-state" style="padding:60px 20px;"><div class="empty-state-icon">&#9888;</div><div class="empty-state-text" style="color:#EF4444;">Hata: ' + esc(err.message) + '</div></div>');
    }
  }

  // ═════ COMPOSE ═════
  function renderCompose() {
    var container = document.getElementById('newsletter-content');
    if (!container) return;

    setHtml(container, ''
      + '<div style="max-width:800px;">'
      + '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">'
      + '    <div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Kitle</label>'
      + '      <select id="nl-c-audience" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;">'
      + '        <option value="aday">Aday</option>'
      + '        <option value="kurumsal">Kurumsal</option>'
      + '        <option value="all">Tümü</option>'
      + '      </select></div>'
      + '    <div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Konu</label>'
      + '      <input type="text" id="nl-c-subject" placeholder="E-posta konusu" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;"></div>'
      + '  </div>'
      + '  <div style="margin-bottom:12px;">'
      + '    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Preheader (inbox önizleme)</label>'
      + '    <input type="text" id="nl-c-preheader" placeholder="Kısa ön izleme metni" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;">'
      + '  </div>'
      + '  <div style="margin-bottom:12px;">'
      + '    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">İçerik (Markdown destekli)</label>'
      + '    <textarea id="nl-c-body" rows="16" placeholder="## Başlık&#10;&#10;Paragraf metin...&#10;&#10;- Madde 1&#10;- Madde 2&#10;&#10;**Kalın** ve *italik* destekli. [Link](https://...)." style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:monospace;font-size:13px;line-height:1.5;"></textarea>'
      + '  </div>'
      + '  <div id="nl-c-preview" style="margin-bottom:16px;padding:16px;background:#F7F6F4;border:1px solid var(--border);border-radius:8px;min-height:60px;"><em style="color:var(--muted);">Önizleme burada görünecek...</em></div>'
      + '  <div style="display:flex;gap:8px;flex-wrap:wrap;">'
      + '    <button id="nl-c-preview-btn" style="padding:10px 20px;background:#fff;color:var(--navy);border:1px solid var(--border);border-radius:8px;font-weight:600;cursor:pointer;">Önizle</button>'
      + '    <button id="nl-c-save" style="padding:10px 20px;background:var(--navy);color:#fff;border:0;border-radius:8px;font-weight:600;cursor:pointer;">Taslak Kaydet</button>'
      + '  </div>'
      + '  <div id="nl-c-msg" style="margin-top:12px;font-size:13px;"></div>'
      + '</div>');

    document.getElementById('nl-c-preview-btn').addEventListener('click', function(){
      var body = document.getElementById('nl-c-body').value;
      setHtml(document.getElementById('nl-c-preview'), mdToHtml(body) || '<em style="color:var(--muted);">Boş.</em>');
    });
    document.getElementById('nl-c-save').addEventListener('click', saveDraft);
  }

  async function saveDraft() {
    var msg = document.getElementById('nl-c-msg');
    msg.style.color = 'var(--muted)';
    msg.textContent = 'Kaydediliyor...';
    try {
      var audience = document.getElementById('nl-c-audience').value;
      var subject = document.getElementById('nl-c-subject').value.trim();
      var preheader = document.getElementById('nl-c-preheader').value.trim();
      var body = document.getElementById('nl-c-body').value.trim();
      if (!subject || !body) { msg.style.color = '#EF4444'; msg.textContent = 'Konu ve içerik zorunlu.'; return; }
      var sb = getSupa();
      var result = await sb.rpc('admin_save_newsletter_campaign', {
        p_audience: audience,
        p_subject: subject,
        p_preheader: preheader || null,
        p_body_html: mdToHtml(body),
        p_body_text: body,
      });
      if (result.error) throw result.error;
      msg.style.color = '#10B981';
      msg.textContent = 'Taslak kaydedildi. Kampanyalar sekmesinden gönderebilirsin.';
      STATE.activeCampaign = result.data;
    } catch (err) {
      msg.style.color = '#EF4444';
      msg.textContent = 'Hata: ' + (err.message || String(err));
    }
  }

  async function sendCampaign(campaignId) {
    if (!confirm('Bu kampanya tüm uygun abonelere gönderilecek. İYS onayları doğrulandı mı? Emin misin?')) return;
    try {
      var sb = getSupa();
      var result = await sb.rpc('admin_send_newsletter_campaign', { p_campaign_id: campaignId });
      if (result.error) throw result.error;
      alert('Kampanya kuyruğa alındı. ' + result.data + ' alıcıya gönderim başladı. email-send cron 1 dakikada gönderir.');
      loadCampaigns();
    } catch (err) {
      alert('Hata: ' + err.message);
    }
  }

  // ═════ TAB SWITCH ═════
  window._htNlSwitchTab = function(tab) {
    STATE.tab = tab;
    var tabs = ['subs', 'camps', 'compose'];
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      var el = document.getElementById('nl-tab-' + t);
      if (!el) continue;
      if (t === tab) {
        el.style.background = t === 'compose' ? 'var(--verm)' : 'var(--navy)';
        el.style.color = '#fff';
        el.style.borderColor = 'transparent';
      } else {
        el.style.background = 'transparent';
        el.style.color = t === 'compose' ? 'var(--verm)' : 'var(--navy)';
        el.style.borderColor = t === 'compose' ? 'var(--verm)' : 'var(--border)';
      }
    }
    if (tab === 'subs') loadSubscribers();
    else if (tab === 'camps') loadCampaigns();
    else if (tab === 'compose') renderCompose();
  };

  // ═════ BOOTSTRAP ═════
  window._htLoadNewsletter = function() {
    window._htNlSwitchTab(STATE.tab);
    setTimeout(function(){
      var applyBtn = document.getElementById('nl-apply-filters');
      if (applyBtn) {
        applyBtn.addEventListener('click', function(){
          STATE.filters.audience = document.getElementById('nl-filter-audience').value;
          STATE.filters.status = document.getElementById('nl-filter-status').value;
          STATE.filters.search = document.getElementById('nl-filter-search').value.trim();
          loadSubscribers();
        });
      }
    }, 100);
  };
})();
