/* global calculateCompletion, supabase */
// ═══════════════════════════════════════════════════
// PROFIL KIM BAKTI — Panel + Lab Card
// Extracted from profil.html inline scripts.
// Depends on: profil-core.js (supabase).
// Exposes: window.loadViewersCard (called from profil-bootstrap.js).
// ═══════════════════════════════════════════════════
(function() {
  var _viewersLoaded = false;

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

  function _makeEl(tag, styles, text) {
    var el = document.createElement(tag);
    if (styles) el.style.cssText = styles;
    if (text) el.textContent = text;
    return el;
  }

  // Update the lab bento card with a compact summary
  function _updateLabSummary(labBody, stats) {
    if (!labBody) return;
    while (labBody.firstChild) labBody.removeChild(labBody.firstChild);
    var total = (stats && stats.total_views) ? stats.total_views : 0;
    var row = _makeEl('div', 'display:flex;align-items:baseline;gap:6px;');
    row.appendChild(_makeEl('span', 'font-size:24px;font-weight:800;color:var(--text);font-family:\'DM Mono\',monospace;line-height:1;', String(total)));
    row.appendChild(_makeEl('span', 'font-size:11px;color:var(--muted);', 'görüntülenme'));
    labBody.appendChild(row);
    if (stats && stats.last_viewed_at) {
      labBody.appendChild(_makeEl('div', 'font-size:11px;color:var(--muted);margin-top:4px;', 'Son: ' + _relativeTimeTR(stats.last_viewed_at)));
    }
  }

  // ── Render the rich Kim Baktı panel ──
  function _renderPanel(stats, events, isPremium) {
    var skeleton = document.getElementById('kb-skeleton');
    var empty = document.getElementById('kb-empty');
    var hero = document.getElementById('kb-hero');
    var segCard = document.getElementById('kb-segments');
    var viewersCard = document.getElementById('kb-viewers');
    var ctaCard = document.getElementById('kb-premium-cta');
    var convCard = document.getElementById('kb-conversion');

    if (skeleton) skeleton.style.display = 'none';
    if (empty) empty.style.display = 'none';
    if (hero) hero.style.display = 'block';

    // Normalize stats for 0-view case
    if (!stats) stats = { total_views: 0, unique_positions: 0, unique_companies: 0, last_viewed_at: null };

    // Hero total
    var totalEl = document.getElementById('kb-total');
    if (totalEl) totalEl.textContent = String(stats.total_views);

    // Last viewed
    var lastEl = document.getElementById('kb-last-viewed');
    if (lastEl && stats.last_viewed_at) {
      lastEl.textContent = 'Son görüntülenme: ' + _relativeTimeTR(stats.last_viewed_at);
      lastEl.style.display = 'block';
    }

    // Mini bar chart — always render (shows empty bars if no events)
    var chartEl = document.getElementById('kb-chart');
    if (chartEl) {
      var dayBuckets = {};
      var now = new Date();
      for (var d = 6; d >= 0; d--) {
        var dt = new Date(now);
        dt.setDate(dt.getDate() - d);
        dayBuckets[dt.toISOString().slice(0, 10)] = 0;
      }
      events.forEach(function(ev) {
        if (ev.viewed_at) {
          var key = new Date(ev.viewed_at).toISOString().slice(0, 10);
          if (dayBuckets.hasOwnProperty(key)) dayBuckets[key]++;
        }
      });
      var vals = Object.values(dayBuckets);
      var maxVal = Math.max.apply(null, vals) || 1;
      var dayNames = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
      while (chartEl.firstChild) chartEl.removeChild(chartEl.firstChild);
      Object.keys(dayBuckets).forEach(function(key) {
        var v = dayBuckets[key];
        var h = Math.max(4, Math.round((v / maxVal) * 48));
        var col = _makeEl('div', 'display:flex;flex-direction:column;align-items:center;gap:2px;');
        var bar = _makeEl('div', 'width:14px;height:' + h + 'px;background:var(--verm);border-radius:3px;opacity:' + (v > 0 ? '1' : '0.2') + ';transition:height 0.3s ease;');
        var label = _makeEl('div', 'font-size:9px;color:var(--muted);', dayNames[new Date(key).getDay()]);
        col.appendChild(bar);
        col.appendChild(label);
        chartEl.appendChild(col);
      });
    }

    // Segment breakdown
    var segMap = {};
    events.forEach(function(ev) {
      var s = ev.position_seg_snapshot || (ev.companies && ev.companies.segment) || '';
      if (s) segMap[s] = (segMap[s] || 0) + 1;
    });
    var segKeys = Object.keys(segMap);
    if (segCard) {
      segCard.style.display = 'block';
      var segBars = document.getElementById('kb-seg-bars');
      if (segBars) {
        while (segBars.firstChild) segBars.removeChild(segBars.firstChild);
        if (segKeys.length === 0) {
          segBars.appendChild(_makeEl('div', 'font-size:12px;color:var(--muted);padding:8px 0;', 'Görüntülenme oldukça segment dağılımı burada görünecek.'));
        } else {
          var segTotal = events.length;
          var segColors = { 'Lüks': 'var(--navy)', 'Premium': 'var(--verm)', 'Fast Fashion': '#2D8C5A', 'Spor': '#3B82F6' };
          segKeys.sort(function(a, b) { return segMap[b] - segMap[a]; });
          segKeys.forEach(function(name) {
            var pct = Math.round((segMap[name] / segTotal) * 100);
            var row = _makeEl('div', '');
            var top = _makeEl('div', 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;');
            top.appendChild(_makeEl('span', 'font-size:12px;font-weight:600;color:var(--text);', name));
            top.appendChild(_makeEl('span', 'font-size:12px;color:var(--muted);font-family:\'DM Mono\',monospace;', pct + '%'));
            var track = _makeEl('div', 'height:6px;background:var(--border);border-radius:3px;overflow:hidden;');
            var fill = _makeEl('div', 'height:100%;width:' + pct + '%;background:' + (segColors[name] || 'var(--navy)') + ';border-radius:3px;transition:width 0.5s ease;');
            track.appendChild(fill);
            row.appendChild(top);
            row.appendChild(track);
            segBars.appendChild(row);
          });
        }
      }
    }

    // Viewer list — always show
    if (viewersCard) {
      viewersCard.style.display = 'block';
      var listEl = document.getElementById('kb-viewer-list');
      var lockEl = document.getElementById('kb-viewers-lock');
      if (listEl) {
        while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
        if (events.length === 0) {
          listEl.appendChild(_makeEl('div', 'font-size:12px;color:var(--muted);padding:12px 0;', 'Profilini inceleyenler burada listelenecek.'));
          // Show completion hint to motivate profile improvement
          if (typeof calculateCompletion === 'function') {
            var _pct = calculateCompletion();
            if (_pct < 100) {
              listEl.appendChild(_makeEl('div', 'font-size:11px;color:var(--verm);padding:0 0 8px;', 'Profilin %' + _pct + ' tamamlandı — güçlendirdikçe daha fazla işveren seni görür.'));
            }
          }
        }
        events.forEach(function(ev, idx) {
          var row = _makeEl('div', 'display:flex;align-items:center;gap:10px;padding:10px 0;' + (idx < events.length - 1 ? 'border-bottom:1px solid var(--border);' : ''));

          // Avatar placeholder
          var avatar = _makeEl('div', 'width:36px;height:36px;border-radius:50%;background:var(--navy-light,#EEF0F7);display:flex;align-items:center;justify-content:center;flex-shrink:0;');
          var avatarIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          avatarIcon.setAttribute('width', '16'); avatarIcon.setAttribute('height', '16'); avatarIcon.setAttribute('viewBox', '0 0 24 24');
          avatarIcon.setAttribute('fill', 'none'); avatarIcon.setAttribute('stroke', 'var(--navy)'); avatarIcon.setAttribute('stroke-width', '2');
          var aPath1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          aPath1.setAttribute('d', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2');
          var aCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          aCircle.setAttribute('cx', '12'); aCircle.setAttribute('cy', '7'); aCircle.setAttribute('r', '4');
          avatarIcon.appendChild(aPath1); avatarIcon.appendChild(aCircle);
          avatar.appendChild(avatarIcon);

          if (isPremium) {
            // Show company name + details
            var info = _makeEl('div', 'flex:1;min-width:0;');
            var compName = (ev.companies && ev.companies.ad) ? ev.companies.ad : 'Bilinmeyen Şirket';
            info.appendChild(_makeEl('div', 'font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;', compName));
            var detail = ev.position_ad_snapshot || '';
            var segLabel = ev.position_seg_snapshot || (ev.companies && ev.companies.segment) || '';
            var sub = (detail ? detail : '') + (detail && segLabel ? ' · ' : '') + segLabel;
            if (sub) info.appendChild(_makeEl('div', 'font-size:11px;color:var(--muted);margin-top:1px;', sub));
            if (ev.viewed_at) info.appendChild(_makeEl('div', 'font-size:10px;color:var(--muted);margin-top:2px;', _relativeTimeTR(ev.viewed_at)));
            row.appendChild(avatar);
            row.appendChild(info);
          } else {
            // Blurred — freemium teaser
            avatar.style.filter = 'blur(4px)';
            avatar.style.opacity = '0.6';
            var info = _makeEl('div', 'flex:1;min-width:0;');
            var blurName = _makeEl('div', 'font-size:13px;font-weight:600;color:var(--text);filter:blur(5px);user-select:none;', '\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588');
            info.appendChild(blurName);
            var segLabel = ev.position_seg_snapshot || (ev.companies && ev.companies.segment) || '';
            if (segLabel) info.appendChild(_makeEl('div', 'font-size:11px;color:var(--muted);margin-top:2px;', segLabel));
            if (ev.viewed_at) info.appendChild(_makeEl('div', 'font-size:10px;color:var(--muted);margin-top:2px;', _relativeTimeTR(ev.viewed_at)));
            row.appendChild(avatar);
            row.appendChild(info);
            // Lock icon
            var lock = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            lock.setAttribute('width', '14'); lock.setAttribute('height', '14'); lock.setAttribute('viewBox', '0 0 24 24');
            lock.setAttribute('fill', 'none'); lock.setAttribute('stroke', 'var(--muted)'); lock.setAttribute('stroke-width', '2');
            lock.setAttribute('stroke-linecap', 'round'); lock.setAttribute('stroke-linejoin', 'round');
            lock.style.cssText = 'flex-shrink:0;';
            var lr = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            lr.setAttribute('x', '3'); lr.setAttribute('y', '11'); lr.setAttribute('width', '18'); lr.setAttribute('height', '11'); lr.setAttribute('rx', '2'); lr.setAttribute('ry', '2');
            var lp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            lp.setAttribute('d', 'M7 11V7a5 5 0 0 1 10 0v4');
            lock.appendChild(lr); lock.appendChild(lp);
            row.appendChild(lock);
          }
          listEl.appendChild(row);
        });
        if (!isPremium && lockEl) lockEl.style.display = 'inline';
      }
    }

    // Premium CTA (freemium only)
    if (ctaCard) ctaCard.style.display = isPremium ? 'none' : 'block';

    // Conversion stat — hidden until real messaging analytics data exists.
    // No placeholder card shown; re-enable when backend provides conversion metrics.
    if (convCard) convCard.style.display = 'none';
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
          { viewed_at: new Date(now - 86400000).toISOString(), position_ad_snapshot: 'Store Manager', position_seg_snapshot: 'Lüks', companies: { ad: 'Zara', segment: 'Fast Fashion' } },
          { viewed_at: new Date(now - 2 * 86400000).toISOString(), position_ad_snapshot: 'Sales Specialist', position_seg_snapshot: 'Premium', companies: { ad: 'Vakko', segment: 'Lüks' } },
          { viewed_at: new Date(now - 3 * 86400000).toISOString(), position_ad_snapshot: 'Store Manager', position_seg_snapshot: 'Lüks', companies: { ad: 'Zara', segment: 'Fast Fashion' } }
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
      var eventsP = supabase.from('profile_view_events').select('viewed_at, position_ad_snapshot, position_seg_snapshot, company_id, companies(company_name, segment)').eq('candidate_id', candidateId).order('viewed_at', { ascending: false }).limit(20);

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
      if (skeleton) skeleton.style.display = 'none';
      var empty = document.getElementById('kb-empty');
      if (empty) {
        empty.style.display = 'block';
        // Populate completion hint in error empty state
        var _emptyPct = document.getElementById('kb-empty-pct');
        if (_emptyPct && typeof calculateCompletion === 'function') {
          var _p = calculateCompletion();
          _emptyPct.textContent = _p < 100 ? 'Profil tamamlanma: %' + _p : '';
        }
      }
    }
  };
})();
