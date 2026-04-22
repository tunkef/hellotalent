/* ═══════════════════════════════════════════════════════════════
   ADMIN SUPPORT — Destek Talepleri queue + detail + actions
   Lazy-loaded via window._htAdminLoadSupport()
   Pattern: matches admin-coach-content.js (IIFE, var, DOM APIs)
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var loaded = false;
var mounted = false;
var _tickets = [];
var _currentFilter = 'open';
var _detailTicketId = null;

var PANEL_HTML = ''
  + '<div class="panel-header">'
  + '  <h2>Destek Talepleri</h2>'
  + '  <button class="btn btn-sm" onclick="window._htAdminLoadSupport && window._htAdminLoadSupport(true)">Yenile</button>'
  + '</div>'
  + '<div id="support-content">'
  + '  <div class="empty-state" style="padding:80px 20px;">'
  + '    <div class="empty-state-icon">&#9203;</div>'
  + '    <div class="empty-state-text" style="font-size:var(--text-lg);color:var(--muted);">Y&uuml;kleniyor...</div>'
  + '  </div>'
  + '</div>';

window._htAdminMountSupport = function() {
  if (mounted) return;
  var panel = document.getElementById('panel-support');
  var core = window._htAdminCore;
  if (panel && core) { core.mount(panel, PANEL_HTML); mounted = true; }
};

// ── HELPERS ──────────────────────────────────────

function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function formatDate(d) {
  if (!d) return '\u2014';
  var dt = new Date(d);
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

var STATUS_LABELS = {
  open: 'A\u00E7\u0131k',
  in_review: '\u0130nceleniyor',
  resolved: '\u00C7\u00F6z\u00FCld\u00FC',
  closed: 'Kapat\u0131ld\u0131',
  waiting_on_candidate: 'Yan\u0131t Bekleniyor'
};

var STATUS_CSS = {
  open: 'pending',
  in_review: 'active',
  resolved: 'approved',
  closed: 'ended',
  waiting_on_candidate: 'revision'
};

var UI_CATEGORIES = {
  hesap_giris: 'Hesap ve Giri\u015F',
  profil_cv: 'Profil ve CV',
  mesajlar: 'Mesajlar',
  teklifler: 'F\u0131rsatlar',
  premium_odeme: 'Premium ve \u00D6deme',
  teknik: 'Teknik Sorunlar'
};

function categoryLabel(ticket) {
  if (ticket.ui_topic && UI_CATEGORIES[ticket.ui_topic]) return UI_CATEGORIES[ticket.ui_topic];
  if (UI_CATEGORIES[ticket.category]) return UI_CATEGORIES[ticket.category];
  if (ticket.category === 'mesajlar_teklifler') return 'Mesajlar / F\u0131rsatlar';
  return ticket.category;
}

function getSupa() {
  return window._htAdminSupa;
}

// ── PUBLIC LOADER ────────────────────────────────

window._htAdminLoadSupport = async function(forceRefresh) {
  if (window._htAdminMountSupport) window._htAdminMountSupport();
  var container = document.getElementById('support-content');
  if (!container) return;
  if (loaded && !forceRefresh) {
    if (_detailTicketId) return;
    renderQueue(container);
    return;
  }
  loaded = true;
  _detailTicketId = null;
  await renderQueue(container);
  updateSupportBadge();
};

// ── BADGE ────────────────────────────────────────

async function updateSupportBadge() {
  var supa = getSupa();
  if (!supa) return;
  try {
    var res = await supa.from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_review', 'waiting_on_candidate']);
    var badge = document.getElementById('badge-support-open');
    if (badge) {
      var count = res.count || 0;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline' : 'none';
    }
  } catch (e) { /* silent */ }
}

// ── QUEUE VIEW ───────────────────────────────────

async function renderQueue(container) {
  while (container.firstChild) container.removeChild(container.firstChild);
  _detailTicketId = null;

  // Filter tabs
  var tabBar = el('div', 'acc-tabs');
  var filters = [
    { key: 'open', label: 'A\u00E7\u0131k' },
    { key: 'in_review', label: '\u0130nceleniyor' },
    { key: 'waiting_on_candidate', label: 'Yan\u0131t Bekleniyor' },
    { key: 'resolved', label: '\u00C7\u00F6z\u00FCld\u00FC' },
    { key: 'closed', label: 'Kapal\u0131' },
    { key: 'all', label: 'T\u00FCm\u00FC' }
  ];
  for (var f = 0; f < filters.length; f++) {
    var tab = el('button', 'acc-tab' + (_currentFilter === filters[f].key ? ' active' : ''), filters[f].label);
    tab.addEventListener('click', (function(key) {
      return function() {
        _currentFilter = key;
        renderQueue(container);
      };
    })(filters[f].key));
    tabBar.appendChild(tab);
  }
  container.appendChild(tabBar);

  // Loading
  var loadingEl = el('div', '', 'Y\u00FCkleniyor\u2026');
  loadingEl.style.cssText = 'text-align:center;padding:24px;color:var(--muted);font-size:13px;';
  container.appendChild(loadingEl);

  // Fetch
  var supa = getSupa();
  if (!supa) return;

  try {
    var res = await supa.rpc('admin_get_support_queue', {
      p_status: _currentFilter,
      p_limit: 100,
      p_offset: 0
    });

    container.removeChild(loadingEl);

    if (res.error) {
      var errEl = el('div', '', 'Talepler y\u00FCklenemedi: ' + res.error.message);
      errEl.style.cssText = 'text-align:center;padding:24px;color:#ef4444;font-size:13px;';
      container.appendChild(errEl);
      return;
    }

    _tickets = res.data || [];

    if (_tickets.length === 0) {
      var emptyEl = el('div', 'empty-state');
      emptyEl.style.cssText = 'padding:60px 20px;';
      emptyEl.appendChild(el('div', 'empty-state-icon', '\uD83D\uDCE8'));
      emptyEl.appendChild(el('div', 'empty-state-text', 'Bu filtrede talep bulunmuyor.'));
      container.appendChild(emptyEl);
      return;
    }

    // Table
    var table = el('table', 'admin-table');
    var thead = el('thead');
    var hrow = el('tr');
    var headers = ['No', 'Konu', 'Kategori', 'Durum', 'Aday', 'Atanan', 'Tarih'];
    for (var h = 0; h < headers.length; h++) {
      hrow.appendChild(el('th', '', headers[h]));
    }
    thead.appendChild(hrow);
    table.appendChild(thead);

    var tbody = el('tbody');
    for (var i = 0; i < _tickets.length; i++) {
      var t = _tickets[i];
      var tr = el('tr');
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', (function(ticket) {
        return function() { renderDetail(container, ticket); };
      })(t));

      // No
      var tdNo = el('td');
      tdNo.style.cssText = 'font-family:"DM Mono",monospace;font-size:12px;font-weight:700;color:var(--verm);';
      tdNo.textContent = t.ticket_no;
      tr.appendChild(tdNo);

      // Subject
      var tdSubject = el('td');
      tdSubject.style.cssText = 'font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      tdSubject.textContent = t.subject;
      tr.appendChild(tdSubject);

      // Category
      tr.appendChild(el('td', '', categoryLabel(t)));

      // Status pill
      var tdStatus = el('td');
      var pill = el('span', 'status-pill ' + (STATUS_CSS[t.status] || 'draft'), STATUS_LABELS[t.status] || t.status);
      tdStatus.appendChild(pill);
      tr.appendChild(tdStatus);

      // Candidate
      tr.appendChild(el('td', '', t.candidate_name || t.candidate_email || '\u2014'));

      // Assigned
      tr.appendChild(el('td', '', t.assigned_admin_name || '\u2014'));

      // Date
      var tdDate = el('td');
      tdDate.style.cssText = 'font-size:12px;color:var(--muted);white-space:nowrap;';
      tdDate.textContent = formatDate(t.created_at);
      tr.appendChild(tdDate);

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);

  } catch (e) {
    container.removeChild(loadingEl);
    console.error('admin_get_support_queue error:', e);
    container.appendChild(el('div', '', 'Bir hata olu\u015Ftu.'));
  }
}

// ── DETAIL VIEW ──────────────────────────────────

async function renderDetail(container, ticket) {
  while (container.firstChild) container.removeChild(container.firstChild);
  _detailTicketId = ticket.id;

  // Back button
  var backBtn = el('button', 'btn btn-sm', '\u2190 Talep Listesi');
  backBtn.addEventListener('click', function() { renderQueue(container); });
  container.appendChild(backBtn);

  // Header
  var headerRow = el('div');
  headerRow.style.cssText = 'display:flex;align-items:center;gap:12px;margin:16px 0 8px;flex-wrap:wrap;';

  var noEl = el('span');
  noEl.style.cssText = 'font-family:"DM Mono",monospace;font-size:18px;font-weight:700;color:var(--verm);';
  noEl.textContent = ticket.ticket_no;
  headerRow.appendChild(noEl);

  var pill = el('span', 'status-pill ' + (STATUS_CSS[ticket.status] || 'draft'), STATUS_LABELS[ticket.status] || ticket.status);
  headerRow.appendChild(pill);

  if (ticket.assigned_admin_name) {
    var assignEl = el('span');
    assignEl.style.cssText = 'font-size:12px;color:var(--muted);';
    assignEl.textContent = '\u2192 ' + ticket.assigned_admin_name;
    headerRow.appendChild(assignEl);
  }
  container.appendChild(headerRow);

  // Subject
  var subEl = el('h3');
  subEl.style.cssText = 'font-family:"Bricolage Grotesque",sans-serif;font-size:18px;font-weight:700;margin:0 0 4px;';
  subEl.textContent = ticket.subject;
  container.appendChild(subEl);

  // Meta
  var metaEl = el('div');
  metaEl.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:16px;';
  metaEl.textContent = categoryLabel(ticket) + ' \u00B7 ' + (ticket.candidate_name || '') + ' (' + (ticket.candidate_email || '') + ') \u00B7 ' + formatDate(ticket.created_at);
  container.appendChild(metaEl);

  // Fetch full ticket data for description and context
  var supa = getSupa();
  var fullRes = await supa.from('support_tickets')
    .select('description, current_panel, page_path, user_agent')
    .eq('id', ticket.id)
    .maybeSingle();

  if (fullRes.data) {
    var ft = fullRes.data;
    // Description card
    var descCard = el('div');
    descCard.style.cssText = 'background:var(--bg,#F7F6F4);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px;';
    var descLabel = el('div');
    descLabel.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);margin-bottom:6px;';
    descLabel.textContent = 'A\u00E7\u0131klama';
    descCard.appendChild(descLabel);
    var descBody = el('div');
    descBody.style.cssText = 'font-size:14px;line-height:1.6;white-space:pre-wrap;';
    descBody.textContent = ft.description || '';
    descCard.appendChild(descBody);
    container.appendChild(descCard);

    // Context (collapsible)
    if (ft.current_panel || ft.page_path || ft.user_agent) {
      var ctxToggle = el('button', 'btn btn-sm', 'Teknik Detay');
      var ctxDiv = el('div');
      ctxDiv.style.cssText = 'font-size:11px;color:var(--muted);line-height:1.8;margin-top:8px;display:none;padding:8px 12px;background:#FAFAF8;border-radius:8px;';
      if (ft.current_panel) ctxDiv.appendChild(el('div', '', 'Panel: ' + ft.current_panel));
      if (ft.page_path) ctxDiv.appendChild(el('div', '', 'Sayfa: ' + ft.page_path));
      if (ft.user_agent) ctxDiv.appendChild(el('div', '', 'UA: ' + ft.user_agent));
      ctxToggle.addEventListener('click', function() {
        ctxDiv.style.display = ctxDiv.style.display === 'none' ? 'block' : 'none';
      });
      container.appendChild(ctxToggle);
      container.appendChild(ctxDiv);
    }
  }

  // ── Timeline ──
  var timelineLabel = el('div');
  timelineLabel.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);margin:20px 0 10px;';
  timelineLabel.textContent = 'Zaman \u00C7izelgesi';
  container.appendChild(timelineLabel);

  var timelineWrap = el('div');
  timelineWrap.id = 'support-timeline';
  container.appendChild(timelineWrap);
  await loadTimeline(ticket.id, timelineWrap);

  // ── Action Area ──
  var actionArea = el('div');
  actionArea.style.cssText = 'margin-top:20px;padding-top:16px;border-top:1px solid var(--border);';
  actionArea.id = 'support-actions';
  renderActions(actionArea, container, ticket);
  container.appendChild(actionArea);
}

async function loadTimeline(ticketId, container) {
  while (container.firstChild) container.removeChild(container.firstChild);

  var supa = getSupa();
  var res = await supa.from('support_ticket_messages')
    .select('id, author_type, author_user_id, body, visibility, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (res.error) {
    container.appendChild(el('div', '', 'Mesajlar y\u00FCklenemedi.'));
    return;
  }

  var msgs = res.data || [];
  if (msgs.length === 0) {
    container.appendChild(el('div', '', 'Hen\u00FCz mesaj yok.'));
    return;
  }

  for (var i = 0; i < msgs.length; i++) {
    var m = msgs[i];
    var bubble = el('div');
    var isInternal = m.visibility === 'internal';
    var isSystem = m.author_type === 'system';
    var isSupport = m.author_type === 'support';

    var bgColor = isInternal ? '#FEF3C7' : isSystem ? '#F3F4F6' : isSupport ? '#EEF2FF' : '#F7F6F4';
    var borderColor = isInternal ? '#F59E0B' : 'transparent';

    bubble.style.cssText = 'padding:10px 14px;border-radius:10px;margin-bottom:6px;background:' + bgColor + ';' + (isInternal ? 'border-left:3px solid ' + borderColor + ';' : '');

    // Author line
    var authorLine = el('div');
    authorLine.style.cssText = 'font-size:11px;font-weight:600;color:var(--muted);margin-bottom:4px;display:flex;justify-content:space-between;';

    var authorLabel = m.author_type === 'candidate' ? 'Aday'
      : m.author_type === 'support' ? 'Destek Ekibi'
      : 'Sistem';
    if (isInternal) authorLabel += ' (dahili)';

    var authorSpan = el('span', '', authorLabel);
    authorLine.appendChild(authorSpan);
    var timeSpan = el('span', '', formatDate(m.created_at));
    timeSpan.style.fontWeight = '400';
    authorLine.appendChild(timeSpan);
    bubble.appendChild(authorLine);

    var bodyEl = el('div');
    bodyEl.style.cssText = 'font-size:13px;line-height:1.5;white-space:pre-wrap;';
    bodyEl.textContent = m.body;
    bubble.appendChild(bodyEl);

    container.appendChild(bubble);
  }
}

function renderActions(actionArea, parentContainer, ticket) {
  while (actionArea.firstChild) actionArea.removeChild(actionArea.firstChild);

  if (ticket.status === 'open') {
    // Claim + Resolve
    var row1 = el('div');
    row1.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;';

    var claimBtn = el('button', 'btn btn-primary', '\u00DCstlen ve \u0130ncele');
    claimBtn.addEventListener('click', function() { doClaim(ticket.id, parentContainer); });
    row1.appendChild(claimBtn);

    var resolveDirectBtn = el('button', 'btn btn-approve', '\u00C7\u00F6z\u00FCld\u00FC Olarak \u0130\u015Faretle');
    resolveDirectBtn.addEventListener('click', function() { doResolve(ticket.id, parentContainer); });
    row1.appendChild(resolveDirectBtn);

    actionArea.appendChild(row1);
  }

  if (ticket.status === 'in_review' || ticket.status === 'waiting_on_candidate') {
    // Public note
    var pubLabel = el('div');
    pubLabel.style.cssText = 'font-size:12px;font-weight:600;color:var(--text);margin-bottom:4px;';
    pubLabel.textContent = 'Adaya mesaj (herkese a\u00E7\u0131k)';
    actionArea.appendChild(pubLabel);

    var pubInput = document.createElement('textarea');
    pubInput.style.cssText = 'width:100%;min-height:60px;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;resize:vertical;margin-bottom:8px;box-sizing:border-box;';
    pubInput.placeholder = '\u00C7\u00F6z\u00FCm veya yan\u0131t\u0131n\u0131z\u0131 yaz\u0131n\u2026';
    actionArea.appendChild(pubInput);

    // "Set waiting" checkbox — only when currently in_review
    var waitCheckWrap = null;
    var waitCheck = null;
    if (ticket.status === 'in_review') {
      waitCheckWrap = el('div');
      waitCheckWrap.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:10px;';
      waitCheck = document.createElement('input');
      waitCheck.type = 'checkbox';
      waitCheck.id = 'support-set-waiting';
      waitCheck.style.cssText = 'width:16px;height:16px;cursor:pointer;';
      waitCheckWrap.appendChild(waitCheck);
      var waitLabel = document.createElement('label');
      waitLabel.setAttribute('for', 'support-set-waiting');
      waitLabel.style.cssText = 'font-size:12px;color:var(--muted);cursor:pointer;';
      waitLabel.textContent = 'Aday yan\u0131t\u0131 bekle (durumu "Yan\u0131t Bekleniyor" olarak de\u011Fi\u015Ftir)';
      waitCheckWrap.appendChild(waitLabel);
      actionArea.appendChild(waitCheckWrap);
    }

    var row2 = el('div');
    row2.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;';

    var sendPubBtn = el('button', 'btn btn-primary', 'Mesaj G\u00F6nder');
    sendPubBtn.addEventListener('click', function() {
      var text = pubInput.value.trim();
      if (!text) return;
      var setWaiting = waitCheck ? waitCheck.checked : false;
      doAddNote(ticket.id, text, 'public', parentContainer, setWaiting);
    });
    row2.appendChild(sendPubBtn);

    var resolveBtn = el('button', 'btn btn-approve', '\u00C7\u00F6z\u00FCld\u00FC Olarak \u0130\u015Faretle');
    resolveBtn.addEventListener('click', function() { doResolve(ticket.id, parentContainer); });
    row2.appendChild(resolveBtn);

    actionArea.appendChild(row2);

    // Waiting banner for waiting_on_candidate
    if (ticket.status === 'waiting_on_candidate') {
      var waitBanner = el('div');
      waitBanner.style.cssText = 'padding:12px 16px;background:#DBEAFE;color:#1E40AF;border-radius:10px;font-size:13px;margin-bottom:12px;line-height:1.5;';
      waitBanner.textContent = 'Aday yan\u0131t\u0131 bekleniyor. Aday yan\u0131t g\u00F6nderdi\u011Finde talep otomatik olarak \u0130nceleniyor durumuna ge\u00E7ecek.';
      actionArea.appendChild(waitBanner);
    }

    // Internal note
    var intLabel = el('div');
    intLabel.style.cssText = 'font-size:12px;font-weight:600;color:var(--muted);margin-bottom:4px;';
    intLabel.textContent = 'Dahili not (aday g\u00F6remez)';
    actionArea.appendChild(intLabel);

    var intInput = document.createElement('textarea');
    intInput.style.cssText = 'width:100%;min-height:40px;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;resize:vertical;margin-bottom:8px;box-sizing:border-box;background:#FFFBEB;';
    intInput.placeholder = 'Dahili not ekle\u2026';
    actionArea.appendChild(intInput);

    var intBtn = el('button', 'btn btn-sm', 'Dahili Not Ekle');
    intBtn.addEventListener('click', function() {
      var text = intInput.value.trim();
      if (!text) return;
      doAddNote(ticket.id, text, 'internal', parentContainer, false);
    });
    actionArea.appendChild(intBtn);
  }

  if (ticket.status === 'resolved') {
    var banner = el('div');
    banner.style.cssText = 'padding:14px 16px;background:#D1FAE5;color:#065F46;border-radius:10px;font-size:13px;margin-bottom:12px;line-height:1.5;';
    banner.textContent = 'Aday onay\u0131 bekleniyor. \u00C7\u00F6z\u00FCld\u00FC olarak i\u015Faretlendi: ' + formatDate(ticket.resolved_at) + '. 7 g\u00FCn i\u00E7inde yan\u0131t gelmezse otomatik kapanacak.';
    actionArea.appendChild(banner);

    var forceBtn = el('button', 'btn btn-reject btn-sm', 'Zorla Kapat');
    forceBtn.addEventListener('click', function() { doForceClose(ticket.id, parentContainer); });
    actionArea.appendChild(forceBtn);
  }

  if (ticket.status === 'closed') {
    var closedInfo = el('div');
    closedInfo.style.cssText = 'font-size:13px;color:var(--muted);';
    closedInfo.textContent = 'Bu talep kapat\u0131ld\u0131: ' + formatDate(ticket.closed_at);
    actionArea.appendChild(closedInfo);
  }
}

// ── ACTION HANDLERS ──────────────────────────────

async function doClaim(ticketId, container) {
  var supa = getSupa();
  var res = await supa.rpc('admin_claim_support_ticket', { p_ticket_id: ticketId });
  if (res.error) {
    window.alert('Hata: ' + res.error.message);
    return;
  }
  await refreshDetailInPlace(ticketId, container);
  updateSupportBadge();
}

async function doResolve(ticketId, container) {
  var message = window.prompt('\u00C7\u00F6z\u00FCm a\u00E7\u0131klamas\u0131 (adaya g\u00F6r\u00FCn\u00FCr):');
  if (message === null) return;
  if (!message.trim()) {
    window.alert('L\u00FCtfen bir \u00E7\u00F6z\u00FCm a\u00E7\u0131klamas\u0131 girin.');
    return;
  }
  var supa = getSupa();
  var res = await supa.rpc('admin_resolve_support_ticket', {
    p_ticket_id: ticketId,
    p_message: message.trim()
  });
  if (res.error) {
    window.alert('Hata: ' + res.error.message);
    return;
  }
  await refreshDetailInPlace(ticketId, container);
  updateSupportBadge();
}

async function doAddNote(ticketId, body, visibility, container, setWaiting) {
  var supa = getSupa();
  var res = await supa.rpc('admin_add_support_note', {
    p_ticket_id: ticketId,
    p_body: body,
    p_visibility: visibility,
    p_set_waiting: setWaiting || false
  });
  if (res.error) {
    window.alert('Hata: ' + res.error.message);
    return;
  }
  // If status changed (set_waiting), refresh entire detail; otherwise just timeline
  if (setWaiting) {
    await refreshDetailInPlace(ticketId, container);
    updateSupportBadge();
  } else {
    var timelineWrap = document.getElementById('support-timeline');
    if (timelineWrap) await loadTimeline(ticketId, timelineWrap);
  }
}

async function doForceClose(ticketId, container) {
  var reason = window.prompt('Kapatma nedeni (opsiyonel):');
  if (reason === null) return;
  var supa = getSupa();
  var res = await supa.rpc('admin_close_support_ticket', {
    p_ticket_id: ticketId,
    p_reason: reason.trim() || null
  });
  if (res.error) {
    window.alert('Hata: ' + res.error.message);
    return;
  }
  await refreshDetailInPlace(ticketId, container);
  updateSupportBadge();
}

async function refreshDetailInPlace(ticketId, container) {
  var supa = getSupa();
  var res = await supa.rpc('admin_get_support_queue', { p_status: 'all', p_limit: 1, p_offset: 0 });
  // Re-fetch specific ticket
  var qRes = await supa.from('support_tickets')
    .select('id, ticket_no, category, ui_topic, subject, status, contact_email_snapshot, created_at, updated_at, resolved_at, closed_at, assigned_admin_user_id, candidate_id')
    .eq('id', ticketId)
    .maybeSingle();

  if (!qRes.data) {
    renderQueue(container);
    return;
  }

  var t = qRes.data;
  // Enrich with candidate name + admin name
  var cRes = await supa.from('candidates').select('full_name').eq('id', t.candidate_id).maybeSingle();
  t.candidate_name = cRes.data ? cRes.data.full_name : '';
  t.candidate_email = t.contact_email_snapshot || '';

  if (t.assigned_admin_user_id) {
    var aRes = await supa.from('admin_users').select('display_name').eq('id', t.assigned_admin_user_id).maybeSingle();
    t.assigned_admin_name = aRes.data ? aRes.data.display_name : '';
  } else {
    t.assigned_admin_name = '';
  }

  renderDetail(container, t);
}

})();
