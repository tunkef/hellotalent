/* global calculateCompletion, supabase */
// ═══════════════════════════════════════════════════
// PROFIL KIM BAKTI — K060 editorial redesign
// Extracted from profil.html inline scripts.
// Depends on: profil-core.js (supabase).
// Exposes: window.loadViewersCard (called from profil-bootstrap.js).
// Markup contract: see css/panels/kimbakti.css + profil.html #panel-kimbakti
// ═══════════════════════════════════════════════════
(function() {
  var _viewersLoaded = false;

  var DAY_LABELS_TR = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

  function _relativeTimeTR(dateStr) {
    if (!dateStr) return '';
    var now = new Date();
    var d = new Date(dateStr);
    var diffMs = now - d;
    var diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'az önce';
    if (diffMin < 60) return diffMin + ' dk önce';
    var diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return diffH + ' saat önce';
    var diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'dün';
    if (diffD < 7) return diffD + ' gün önce';
    var diffW = Math.floor(diffD / 7);
    if (diffW < 5) return diffW + ' hafta önce';
    var diffM = Math.floor(diffD / 30);
    if (diffM < 12) return diffM + ' ay önce';
    return Math.floor(diffM / 12) + ' yıl önce';
  }

  function _el(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
  }

  // Update the lab bento card with a compact summary (unchanged contract).
  function _updateLabSummary(labBody, stats) {
    if (!labBody) return;
    while (labBody.firstChild) labBody.removeChild(labBody.firstChild);
    var total = (stats && stats.total_views) ? stats.total_views : 0;
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:baseline;gap:6px;';
    var num = document.createElement('span');
    num.style.cssText = 'font-size:24px;font-weight:800;color:var(--text);font-family:\'DM Mono\',monospace;line-height:1;';
    num.textContent = String(total);
    var label = document.createElement('span');
    label.style.cssText = 'font-size:11px;color:var(--muted);';
    label.textContent = 'görüntülenme';
    row.appendChild(num);
    row.appendChild(label);
    labBody.appendChild(row);
    if (stats && stats.last_viewed_at) {
      var last = document.createElement('div');
      last.style.cssText = 'font-size:11px;color:var(--muted);margin-top:4px;';
      last.textContent = 'Son: ' + _relativeTimeTR(stats.last_viewed_at);
      labBody.appendChild(last);
    }
  }

  function _setStat(name, value) {
    var nodes = document.querySelectorAll('[data-kb-stat="' + name + '"]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = value;
    }
  }

  // ── Render chart as editorial hairline chart ──
  function _renderChart(chartEl, events) {
    if (!chartEl) return;
    while (chartEl.firstChild) chartEl.removeChild(chartEl.firstChild);

    var dayBuckets = [];
    var now = new Date();
    for (var d = 6; d >= 0; d--) {
      var dt = new Date(now);
      dt.setDate(dt.getDate() - d);
      dayBuckets.push({ key: dt.toISOString().slice(0, 10), date: dt, count: 0 });
    }

    events.forEach(function(ev) {
      if (!ev.viewed_at) return;
      var key = new Date(ev.viewed_at).toISOString().slice(0, 10);
      for (var j = 0; j < dayBuckets.length; j++) {
        if (dayBuckets[j].key === key) { dayBuckets[j].count++; break; }
      }
    });

    var maxVal = 0;
    dayBuckets.forEach(function(b) { if (b.count > maxVal) maxVal = b.count; });
    if (maxVal === 0) maxVal = 1;

    dayBuckets.forEach(function(bucket, idx) {
      var isToday = idx === dayBuckets.length - 1;
      var day = _el('div', 'kb-day' + (isToday ? ' is-today' : ''));

      var h = Math.max(8, Math.round((bucket.count / maxVal) * 100));
      var line = _el('div', 'kb-day-line');
      line.style.height = h + '%';

      var dot = _el('span', 'kb-day-dot');
      var count = _el('span', 'kb-day-count', String(bucket.count));
      line.appendChild(dot);
      line.appendChild(count);

      var label = _el('span', 'kb-day-label', DAY_LABELS_TR[bucket.date.getDay()] + (isToday ? ' · Bugün' : ''));

      day.appendChild(line);
      day.appendChild(label);
      chartEl.appendChild(day);
    });
  }

  // ── Render segment distribution ──
  function _renderSegments(segBars, events) {
    if (!segBars) return;
    while (segBars.firstChild) segBars.removeChild(segBars.firstChild);

    var segMap = {};
    events.forEach(function(ev) {
      var s = ev.position_seg_snapshot || (ev.companies && ev.companies.segment) || '';
      if (s) segMap[s] = (segMap[s] || 0) + 1;
    });
    var segKeys = Object.keys(segMap);
    if (segKeys.length === 0) return 0;

    var segTotal = events.length || 1;
    segKeys.sort(function(a, b) { return segMap[b] - segMap[a]; });
    segKeys.forEach(function(name) {
      var pct = Math.round((segMap[name] / segTotal) * 100);
      var row = _el('div', 'kb-segment-row');
      row.appendChild(_el('span', 'kb-segment-label', name));

      var bar = _el('span', 'kb-segment-bar');
      var fill = _el('span', 'kb-segment-fill');
      fill.style.setProperty('--w', pct + '%');
      bar.appendChild(fill);
      row.appendChild(bar);

      row.appendChild(_el('span', 'kb-segment-pct', pct + '%'));
      segBars.appendChild(row);
    });
    return segKeys.length;
  }

  // ── Render viewers list ──
  function _renderViewers(listEl, events, isPremium) {
    if (!listEl) return;
    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

    if (events.length === 0) {
      var empty = _el('div', 'kb-mono kb-mono--muted');
      empty.style.cssText = 'padding:12px 0;';
      empty.textContent = 'Profilini inceleyenler burada listelenecek.';
      listEl.appendChild(empty);
      if (typeof calculateCompletion === 'function') {
        var pct = calculateCompletion();
        if (pct < 100) {
          var hint = _el('div', 'kb-mono-i');
          hint.style.cssText = 'padding:4px 0 8px;color:var(--color-vermillion,#C94E28);';
          hint.textContent = 'Profilin %' + pct + ' tamamlandı — güçlendirdikçe daha fazla işveren seni görür.';
          listEl.appendChild(hint);
        }
      }
      return;
    }

    events.forEach(function(ev) {
      var row = _el('div', 'kb-viewer-row');

      var segLabel = ev.position_seg_snapshot || (ev.companies && ev.companies.segment) || '';
      var compName = (ev.companies && ev.companies.company_name) ? ev.companies.company_name : '';
      var timeAgo = ev.viewed_at ? _relativeTimeTR(ev.viewed_at) : '';

      if (isPremium && compName) {
        var initial = compName.charAt(0).toUpperCase();
        var avatar = _el('div', 'kb-viewer-avatar is-unlocked', initial);
        row.appendChild(avatar);

        var info = _el('div', '');
        info.appendChild(_el('div', 'kb-viewer-name', compName));
        var subBits = [];
        if (ev.position_ad_snapshot) subBits.push(ev.position_ad_snapshot);
        if (segLabel) subBits.push(segLabel);
        if (timeAgo) subBits.push(timeAgo);
        if (subBits.length) info.appendChild(_el('div', 'kb-viewer-sub', subBits.join(' · ')));
        row.appendChild(info);

        var right = _el('div', 'kb-viewer-right', '→');
        right.setAttribute('aria-label', 'Detay');
        row.appendChild(right);
      } else {
        var avatarL = _el('div', 'kb-viewer-avatar is-locked', '—');
        avatarL.setAttribute('aria-hidden', 'true');
        row.appendChild(avatarL);

        var infoL = _el('div', '');
        var lockedLabel = segLabel ? ('Bir ' + segLabel.toLowerCase() + ' markası') : 'Bir işveren';
        infoL.appendChild(_el('div', 'kb-viewer-name is-locked', lockedLabel));
        var subParts = [];
        if (timeAgo) subParts.push(timeAgo);
        subParts.push('Kilitli');
        infoL.appendChild(_el('div', 'kb-viewer-sub', subParts.join(' · ')));
        row.appendChild(infoL);

        var rightL = _el('div', 'kb-viewer-right is-locked', '◌');
        rightL.setAttribute('aria-label', 'Kilitli');
        row.appendChild(rightL);
      }

      listEl.appendChild(row);
    });
  }

  // ── Render the rich Kim Baktı panel ──
  function _renderPanel(stats, events, isPremium) {
    var skeleton = document.getElementById('kb-skeleton');
    var empty = document.getElementById('kb-empty');
    var segCard = document.getElementById('kb-segments');
    var viewersCard = document.getElementById('kb-viewers');
    var ctaCard = document.getElementById('kb-premium-cta');
    var convCard = document.getElementById('kb-conversion');

    if (skeleton) skeleton.hidden = true;
    if (empty) empty.hidden = true;

    if (!stats) stats = { total_views: 0, unique_positions: 0, unique_companies: 0, last_viewed_at: null };

    // Hero total
    var totalEl = document.getElementById('kb-total');
    if (totalEl) totalEl.textContent = String(stats.total_views || 0);

    // Stats strip
    _setStat('total', String(stats.total_views || 0));
    _setStat('unique', String(stats.unique_companies || 0));

    // Trend: stats may not expose week-over-week yet — derive a simple placeholder.
    var trendEl = document.getElementById('kb-trend');
    if (trendEl) trendEl.textContent = '';
    _setStat('trend', '—');

    // Last viewed
    var lastEl = document.getElementById('kb-last-viewed');
    if (lastEl && stats.last_viewed_at) {
      lastEl.textContent = 'Son görüntülenme: ' + _relativeTimeTR(stats.last_viewed_at);
    }

    // Chart
    _renderChart(document.getElementById('kb-chart'), events);

    // Segments — always show card (with empty placeholder when count=0)
    var segBars = document.getElementById('kb-seg-bars');
    var segCount = _renderSegments(segBars, events);
    if (segCard) {
      segCard.hidden = false;
      if (segCount === 0 && segBars && !segBars.firstChild) {
        var emptyRow = document.createElement('div');
        emptyRow.className = 'kb-segments-empty';
        emptyRow.textContent = 'Henüz segment verisi yok. Görüntülenmeler arttıkça hangi segmentlerin sana ilgi gösterdiğini burada göreceksin.';
        segBars.appendChild(emptyRow);
      }
    }
    _setStat('segments', String(segCount || 0));

    // Viewers
    if (viewersCard) viewersCard.hidden = false;
    _renderViewers(document.getElementById('kb-viewer-list'), events, isPremium);
    var lockEl = document.getElementById('kb-viewers-lock');
    if (lockEl) lockEl.hidden = isPremium;

    // Premium CTA (freemium only)
    if (ctaCard) ctaCard.hidden = !!isPremium;

    // Conversion — hidden until real messaging analytics exist.
    if (convCard) convCard.hidden = true;
  }

  window.loadViewersCard = async function(candidateId) {
    if (_viewersLoaded || !candidateId) return;
    _viewersLoaded = true;

    var labBody = document.getElementById('lab-viewers-body');

    // ── Dev preview override via URL param ──
    var _previewMode = new URLSearchParams(window.location.search).get('preview_viewers');
    if (_previewMode === 'freemium' || _previewMode === 'premium') {
      var now = new Date();
      var stats, events, isPremium;
      if (_previewMode === 'freemium') {
        stats = { total_views: 7, unique_positions: 3, unique_companies: 4, last_viewed_at: new Date(now - 2 * 86400000).toISOString() };
        events = [
          { viewed_at: new Date(now - 2 * 86400000).toISOString(), position_ad_snapshot: null, position_seg_snapshot: 'Lüks', companies: null },
          { viewed_at: new Date(now - 3 * 86400000).toISOString(), position_ad_snapshot: null, position_seg_snapshot: 'Premium', companies: null },
          { viewed_at: new Date(now - 5 * 86400000).toISOString(), position_ad_snapshot: null, position_seg_snapshot: 'Fast Fashion', companies: null }
        ];
        isPremium = false;
      } else {
        stats = { total_views: 12, unique_positions: 3, unique_companies: 3, last_viewed_at: new Date(now - 86400000).toISOString() };
        events = [
          { viewed_at: new Date(now - 86400000).toISOString(), position_ad_snapshot: 'Store Manager', position_seg_snapshot: 'Lüks', companies: { company_name: 'Zara', segment: 'Fast Fashion' } },
          { viewed_at: new Date(now - 2 * 86400000).toISOString(), position_ad_snapshot: 'Sales Specialist', position_seg_snapshot: 'Premium', companies: { company_name: 'Vakko', segment: 'Lüks' } },
          { viewed_at: new Date(now - 3 * 86400000).toISOString(), position_ad_snapshot: 'Store Manager', position_seg_snapshot: 'Lüks', companies: { company_name: 'Zara', segment: 'Fast Fashion' } }
        ];
        isPremium = true;
      }
      _renderPanel(stats, events, isPremium);
      _updateLabSummary(labBody, stats);
      return;
    }

    // Skeleton is already in HTML, just fetch data
    try {
      var statsP = supabase.from('candidate_view_stats').select('*').eq('candidate_id', candidateId).maybeSingle();
      // D2 Codex iter-2 fix: event_type='view' filter — pipeline_added/message_sent event'leri "Kim Baktı" feed'inde görünmesin
      var eventsP = supabase.from('profile_view_events').select('viewed_at, position_ad_snapshot, position_seg_snapshot, company_id, companies(company_name, segment)').eq('candidate_id', candidateId).eq('event_type', 'view').order('viewed_at', { ascending: false }).limit(20);

      var results = await Promise.allSettled([statsP, eventsP]);
      var stats = results[0].status === 'fulfilled' ? results[0].value.data : null;
      var events = results[1].status === 'fulfilled' ? (results[1].value.data || []) : [];

      // Check premium status (placeholder — all users are freemium for now)
      var isPremium = false;

      _renderPanel(stats, events, isPremium);
      _updateLabSummary(labBody, stats);

    } catch (err) {
      console.warn('[HT] Kim Baktı load failed:', err.message);
      var skeleton = document.getElementById('kb-skeleton');
      if (skeleton) skeleton.hidden = true;
      var empty = document.getElementById('kb-empty');
      if (empty) {
        empty.hidden = false;
        var _emptyPct = document.getElementById('kb-empty-pct');
        if (_emptyPct && typeof calculateCompletion === 'function') {
          var _p = calculateCompletion();
          _emptyPct.textContent = _p < 100 ? 'Profil tamamlanma: %' + _p : '';
        }
      }
    }
  };
})();
