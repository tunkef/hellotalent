/* global calculateCompletion, supabase */
// ═══════════════════════════════════════════════════
// PROFIL KIM BAKTI — PR-6 feed impl
// Extracted from profil.html inline scripts.
// Depends on: profil-core.js (supabase).
// Exposes: window.loadViewersCard (called from profil-bootstrap.js).
// Markup contract: see css/panels/kimbakti.css + profil.html #panel-kimbakti
//
// PR-6 Audit fixes:
//   H1 — select fields explicit (total_interactions KALDIRILDI)
//   H2 — preview_viewers URL param KALDIRILDI (dev: localhost guard ile)
//   M2 — console.warn sadece err.code (PII-safe)
//
// Feature flag: KVKK_AUTO_MATCH_NOTIF_ENABLED
//   false (default) → sadece 'view' event_type (mevcut D2 davranış)
//   true  (avukat + Tuna onayı sonrası) → pipeline_added + message_sent de feed'e gelir
// ═══════════════════════════════════════════════════
(function() {
  // ── Feature flag — KVKK avukat onayı sonrası true yapılacak ──
  // Activation: KVKK_AUTO_MATCH_NOTIF_ENABLED = true + cache-bust ?v=pr6-feed-v2
  var KVKK_AUTO_MATCH_NOTIF_ENABLED = false;

  var _viewersLoaded = false;

  var DAY_LABELS_TR = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

  // ── Zaman formatı (mevcut + hafta bazlı rollup label genişletme) ──
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

  // ── Rollup için hafta bazlı label (en yeni event timestamp esas alınır) ──
  function _weekLabelTR(dateStr) {
    if (!dateStr) return '';
    var now = new Date();
    var d = new Date(dateStr);

    // Bu takvim haftasının Pazartesi başlangıcı
    function _mondayOf(dt) {
      var tmp = new Date(dt);
      var day = tmp.getDay(); // 0=Pz
      var diff = (day === 0) ? -6 : 1 - day;
      tmp.setDate(tmp.getDate() + diff);
      tmp.setHours(0, 0, 0, 0);
      return tmp;
    }

    var thisMonday = _mondayOf(now);
    var lastMonday = new Date(thisMonday);
    lastMonday.setDate(lastMonday.getDate() - 7);

    var dMonday = _mondayOf(d);

    if (dMonday >= thisMonday) return 'Bu hafta';
    if (dMonday >= lastMonday) return 'Geçen hafta';

    // Bu ay mı?
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return 'Bu ay';

    // Geçen ay mı?
    var lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth()) return 'Geçen ay';

    var diffM = Math.floor((now - d) / (30 * 24 * 3600000));
    if (diffM < 12) return diffM + ' ay önce';
    return Math.floor(diffM / 12) + ' yıl önce';
  }

  // ── Event type → aday feed cümlesi (premium / marka görünür) ──
  // KVKK_AUTO_MATCH_NOTIF_ENABLED false iken pipeline_added + message_sent
  // bu fonksiyon çağrılmaz (query filtresi önler). Flag true olunca aktif olur.
  function _eventCopyPremium(eventType, compName) {
    var brand = compName || 'Bir marka';
    if (eventType === 'view')          return brand + ' profilini inceledi.';
    if (eventType === 'pipeline_added') return brand + ' seni aday listesine aldı.';
    if (eventType === 'message_sent')   return brand + ' seninle iletişime geçti.';
    return brand + ' profilini inceledi.';
  }

  // ── Kilitli (freemium) copy — P3 backlog
  // function _eventCopyFreemium(eventType, segLabel) {
  //   var seg = segLabel ? ('Bir ' + segLabel.toLowerCase() + ' markası') : 'Bir marka';
  //   if (eventType === 'view')           return seg + ' profilini inceledi.';
  //   if (eventType === 'pipeline_added') return seg + ' seni aday listesine aldı.';
  //   if (eventType === 'message_sent')   return seg + ' seninle iletişime geçti.';
  //   return seg + ' profilini inceledi.';
  // }

  // ── Rollup copy (aynı company + aynı hafta + aynı event_type, 3+ event) ──
  function _rollupCopy(eventType, compName, count) {
    var brand = compName || 'Bir marka';
    if (eventType === 'view')           return brand + ' bu hafta profilini ' + count + ' kez inceledi.';
    if (eventType === 'pipeline_added') return brand + ' bu hafta ' + count + ' pozisyon için seni değerlendirdi.';
    if (eventType === 'message_sent')   return brand + ' bu hafta ' + count + ' kez seninle iletişime geçti.';
    return brand + ' bu hafta profilini ' + count + ' kez inceledi.';
  }

  // ── Feed sıralama önceliği: message_sent > pipeline_added > view ──
  function _eventPriority(eventType) {
    if (eventType === 'message_sent')   return 0;
    if (eventType === 'pipeline_added') return 1;
    return 2; // view
  }

  // ── Dedupe rollup: company_id + takvim haftası + event_type grupla ──
  // Eşik 3 — 1-2 ayrı satır, 3+ rollup
  function _groupEvents(events) {
    var groups = {};

    events.forEach(function(ev) {
      if (!ev.viewed_at) return;
      var d = new Date(ev.viewed_at);
      // ISO hafta anahtar: YYYY-Www (Pazartesi bazlı)
      var day = d.getDay();
      var diff = (day === 0) ? -6 : 1 - day;
      var monday = new Date(d);
      monday.setDate(d.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      var weekKey = monday.toISOString().slice(0, 10);

      var compId = ev.company_id || 'unknown';
      var evType = ev.event_type || 'view';
      var key = compId + '_' + weekKey + '_' + evType;

      if (!groups[key]) {
        groups[key] = {
          key:       key,
          compId:    compId,
          weekKey:   weekKey,
          eventType: evType,
          events:    [],
          latestAt:  ev.viewed_at,
          companies: ev.companies
        };
      }
      groups[key].events.push(ev);
      // En yeni timestamp: rollup label için
      if (new Date(ev.viewed_at) > new Date(groups[key].latestAt)) {
        groups[key].latestAt = ev.viewed_at;
      }
    });

    // Grup dizisine çevir, önce önceliğe göre sırala
    var result = [];
    Object.keys(groups).forEach(function(k) {
      result.push(groups[k]);
    });

    result.sort(function(a, b) {
      // Önce event tipi önceliği
      var pA = _eventPriority(a.eventType);
      var pB = _eventPriority(b.eventType);
      if (pA !== pB) return pA - pB;
      // Sonra zaman (en yeni önce)
      return new Date(b.latestAt) - new Date(a.latestAt);
    });

    return result;
  }

  function _el(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
  }

  // ── Update the lab bento card with a compact summary (unchanged contract) ──
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

  // ── Bell badge güncelle ──
  // count: 0 → badge gizli, 1-99 → sayı, 100+ → "99+"
  function _updateBellBadge(count) {
    var bellBadge = document.getElementById('kb-bell-badge');
    var navBadge  = document.getElementById('badge-kimbakti');
    var headerBtn = document.getElementById('header-kimbakti');
    var navBtn    = document.getElementById('nav-kimbakti');

    var label = count > 99 ? '99+' : String(count);
    var tooltip = count > 0 ? label + ' yeni etkinlik' : 'Yeni etkinlik yok';

    if (bellBadge) {
      bellBadge.textContent = label;
      bellBadge.style.display = count > 0 ? 'flex' : 'none';
      bellBadge.setAttribute('aria-label', tooltip);
    }
    if (navBadge) {
      navBadge.textContent = label;
      navBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    if (headerBtn) {
      headerBtn.setAttribute('aria-label', 'Kim Baktı' + (count > 0 ? ' · ' + tooltip : ''));
    }
    if (navBtn && count > 0) {
      navBtn.setAttribute('aria-label', 'Kim Baktı · ' + tooltip);
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

    // Sadece view eventlerini say (grafik = görüntülenme)
    events.forEach(function(ev) {
      if (!ev.viewed_at) return;
      if (ev.event_type && ev.event_type !== 'view') return;
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
    if (!segBars) return 0;
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

  // ── Render feed: grouped events, rollup, event type copy ──
  function _renderFeed(listEl, events, isPremium) {
    if (!listEl) return;
    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

    if (events.length === 0) {
      var empty = _el('div', 'kb-mono kb-mono--muted');
      empty.style.cssText = 'padding:12px 0;';
      // PR-6 empty state copy (spec §4A)
      empty.textContent = 'Henüz hiçbir marka profilini incelemedi.';
      listEl.appendChild(empty);
      if (typeof calculateCompletion === 'function') {
        var pct = calculateCompletion();
        if (pct < 100) {
          var hint = _el('div', 'kb-mono-i');
          hint.style.cssText = 'padding:4px 0 8px;color:var(--color-vermillion,#C94E28);';
          hint.textContent = 'Profilini tamamla, daha çok marka seni keşfetsin.';
          listEl.appendChild(hint);
        }
      }
      return;
    }

    var groups = _groupEvents(events);
    var newEventCount = 0;

    groups.forEach(function(grp) {
      var count    = grp.events.length;
      var isRollup = count >= 3;
      var compName = (grp.companies && grp.companies.company_name) ? grp.companies.company_name : '';
      var segLabel = grp.events[0] && (grp.events[0].position_seg_snapshot || (grp.companies && grp.companies.segment)) || '';
      var timeAgo  = _relativeTimeTR(grp.latestAt);
      var weekLabel = isRollup ? _weekLabelTR(grp.latestAt) : '';

      // Bell badge sayacı: sadece view sayısını tut (PR-6'da yeni event'ler flag OFF'ta gelmez)
      // Flag ON olunca pipeline_added + message_sent de sayılır (aynı mantık)
      newEventCount += count;

      var row = _el('div', 'kb-viewer-row' + (isRollup ? ' kb-viewer-row--rollup' : ''));
      row.setAttribute('data-event-type', grp.eventType);

      if (isPremium && compName) {
        // ── Premium: marka adı görünür ──
        var initial = compName.charAt(0).toUpperCase();
        var avatarCls = 'kb-viewer-avatar is-unlocked';
        if (grp.eventType === 'pipeline_added') avatarCls += ' kb-viewer-avatar--pipeline';
        if (grp.eventType === 'message_sent')   avatarCls += ' kb-viewer-avatar--message';
        var avatar = _el('div', avatarCls, initial);
        row.appendChild(avatar);

        var info = _el('div', 'kb-viewer-info');

        // Ana copy satırı
        var copyText = isRollup
          ? _rollupCopy(grp.eventType, compName, count)
          : _eventCopyPremium(grp.eventType, compName);
        info.appendChild(_el('div', 'kb-viewer-name', copyText));

        // Alt meta
        var subBits = [];
        // Popup sub için: pozisyon adı sadece view + pipeline_added'de (spec §5)
        var posSnap = grp.events[0] && grp.events[0].position_ad_snapshot;
        if (!isRollup && posSnap && (grp.eventType === 'view' || grp.eventType === 'pipeline_added')) {
          subBits.push(posSnap);
        }
        if (segLabel) subBits.push(segLabel);
        if (isRollup) {
          subBits.push(weekLabel);
        } else {
          if (timeAgo) subBits.push(timeAgo);
        }
        if (subBits.length) info.appendChild(_el('div', 'kb-viewer-sub', subBits.join(' · ')));

        row.appendChild(info);

        // Sağ: rollup badge veya chevron / mesaj CTA
        if (isRollup) {
          var badge = _el('div', 'kb-rollup-badge', count + ' etkinlik');
          badge.setAttribute('aria-label', count + ' etkinlik bu grupta');
          row.appendChild(badge);
        } else if (grp.eventType === 'message_sent') {
          // CTA: "Mesajı Gör" → #panel-inbox (aday mesaj sekmesi)
          var ctaBtn = _el('button', 'kb-msg-cta', 'Mesajı Gör');
          ctaBtn.setAttribute('type', 'button');
          ctaBtn.setAttribute('data-panel', 'inbox');
          ctaBtn.setAttribute('aria-label', compName + ' mesajını gör');
          ctaBtn.addEventListener('click', function() {
            var navBtn = document.querySelector('[data-panel="inbox"]');
            if (navBtn) navBtn.click();
          });
          row.appendChild(ctaBtn);
        } else {
          var right = _el('div', 'kb-viewer-right', '→');
          right.setAttribute('aria-label', 'Detay');
          row.appendChild(right);
        }

      } else {
        // ── Freemium / kilitli: marka adı gizli ──
        var avatarL = _el('div', 'kb-viewer-avatar is-locked', '—');
        avatarL.setAttribute('aria-hidden', 'true');
        row.appendChild(avatarL);

        var infoL = _el('div', 'kb-viewer-info');
        var lockedLabel = segLabel ? ('Bir ' + segLabel.toLowerCase() + ' markası') : 'Bir işveren';
        // Freemium copy: event tipi bilgisi verilmez (P3 backlog)
        var lockedCopy = lockedLabel + ' profilini inceledi.';
        if (grp.eventType === 'pipeline_added') lockedCopy = lockedLabel + ' seni aday listesine aldı.';
        if (grp.eventType === 'message_sent')   lockedCopy = lockedLabel + ' seninle iletişime geçti.';
        infoL.appendChild(_el('div', 'kb-viewer-name is-locked', lockedCopy));
        var subPartsL = [];
        if (isRollup) {
          subPartsL.push(weekLabel);
          subPartsL.push(count + ' etkinlik');
        } else {
          if (timeAgo) subPartsL.push(timeAgo);
        }
        subPartsL.push('Kilitli');
        infoL.appendChild(_el('div', 'kb-viewer-sub', subPartsL.join(' · ')));
        row.appendChild(infoL);

        var rightL = _el('div', 'kb-viewer-right is-locked', '◌');
        rightL.setAttribute('aria-label', 'Kilitli');
        row.appendChild(rightL);
      }

      listEl.appendChild(row);
    });

    // Bell badge güncelle (99+ cap)
    _updateBellBadge(Math.min(newEventCount, 99) < newEventCount ? 99 : newEventCount);
  }

  // ── Render the rich Kim Baktı panel ──
  function _renderPanel(stats, events, isPremium) {
    var skeleton  = document.getElementById('kb-skeleton');
    var empty     = document.getElementById('kb-empty');
    var segCard   = document.getElementById('kb-segments');
    var viewersCard = document.getElementById('kb-viewers');
    var ctaCard   = document.getElementById('kb-premium-cta');
    var convCard  = document.getElementById('kb-conversion');

    if (skeleton) skeleton.hidden = true;
    if (empty) empty.hidden = true;

    if (!stats) stats = { total_views: 0, unique_positions: 0, unique_companies: 0, last_viewed_at: null };

    // Hero total
    var totalEl = document.getElementById('kb-total');
    if (totalEl) totalEl.textContent = String(stats.total_views || 0);

    // Stats strip
    _setStat('total', String(stats.total_views || 0));
    _setStat('unique', String(stats.unique_companies || 0));

    // Trend placeholder
    var trendEl = document.getElementById('kb-trend');
    if (trendEl) trendEl.textContent = '';
    _setStat('trend', '—');

    // Last viewed
    var lastEl = document.getElementById('kb-last-viewed');
    if (lastEl && stats.last_viewed_at) {
      lastEl.textContent = 'Son görüntülenme: ' + _relativeTimeTR(stats.last_viewed_at);
    }

    // Chart (sadece view eventleri — grafik = görüntülenme)
    _renderChart(document.getElementById('kb-chart'), events);

    // Segments — always show card
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

    // Feed (PR-6: rollup + event type copy)
    if (viewersCard) viewersCard.hidden = false;
    _renderFeed(document.getElementById('kb-viewer-list'), events, isPremium);
    var lockEl = document.getElementById('kb-viewers-lock');
    if (lockEl) lockEl.hidden = isPremium;

    // Premium CTA (freemium only)
    if (ctaCard) ctaCard.hidden = !!isPremium;

    // Conversion — hidden until real messaging analytics exist
    if (convCard) convCard.hidden = true;
  }

  window.loadViewersCard = async function(candidateId) {
    if (_viewersLoaded || !candidateId) return;
    _viewersLoaded = true;

    var labBody = document.getElementById('lab-viewers-body');

    // H2 fix: preview_viewers URL param KALDIRILDI
    // Dev preview için ayrı profil-preview.html dosyası oluşturulabilir.
    // Gerekirse: if (hostname==='localhost' || hostname==='127.0.0.1') { ... }

    // Skeleton is already in HTML, just fetch data
    try {
      // H1 fix: explicit select fields — total_interactions YOK (PII)
      var statsP = supabase
        .from('candidate_view_stats')
        .select('total_views, unique_companies, unique_positions, last_viewed_at')
        .eq('candidate_id', candidateId)
        .maybeSingle();

      // D2 fix (korunuyor): feature flag false → sadece 'view' event_type
      // Flag true (avukat onayı sonrası): tüm event_type'lar gelir
      var eventsQuery = supabase
        .from('profile_view_events')
        .select('viewed_at, event_type, position_ad_snapshot, position_seg_snapshot, company_id, companies(company_name, segment)')
        .eq('candidate_id', candidateId)
        .order('viewed_at', { ascending: false })
        .limit(50);

      if (!KVKK_AUTO_MATCH_NOTIF_ENABLED) {
        // D2 davranış: sadece view event'leri
        eventsQuery = eventsQuery.eq('event_type', 'view');
      }
      // Flag true olunca filtre kaldırılır → pipeline_added + message_sent de gelir

      var results = await Promise.allSettled([statsP, eventsQuery]);
      var stats  = results[0].status === 'fulfilled' ? results[0].value.data : null;
      var events = results[1].status === 'fulfilled' ? (results[1].value.data || []) : [];

      // Tier sistemi yok — tüm kullanıcılar freemium (P3 kararına kadar)
      var isPremium = false;

      _renderPanel(stats, events, isPremium);
      _updateLabSummary(labBody, stats);

    } catch (err) {
      // M2 fix: sadece error.code (PII-safe) — err.message KULLANMA
      console.warn('[HT] Kim Baktı load failed (code:', err && err.code, ')');
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

  // Expose for cross-IIFE use (bell badge test erişimi)
  window._htKbUpdateBellBadge = _updateBellBadge;
  window._htKbFeatureFlag = function() { return KVKK_AUTO_MATCH_NOTIF_ENABLED; };

})();
