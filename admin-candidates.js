/* ═══ admin-candidates.js — Candidate Analytics Module ═══ */
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

  /* ── LOAD CANDIDATES DATA ── */
  window._htAdminLoadCandidates = async function() {
    if (loaded) return;

    var container = document.getElementById('candidates-content');
    if (!container) return;

    try {
      var supa = window._htAdminSupa;

      // Run all COUNT queries in parallel
      var queries = await Promise.all([
        // Row 1
        supa.from('candidates').select('id', { count: 'exact', head: true }),
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('profile_completed', true),
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('is_active', true),
        // Row 2
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('is_active', false).eq('profile_completed', true),
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('hide_from_current_employer', true),
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('is_premium', true),
        // Row 3
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('account_status', 'frozen'),
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('account_status', 'pending_deletion'),
        supa.from('candidates').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      var total = queries[0].count || 0;
      var profilTam = queries[1].count || 0;
      var aktif = queries[2].count || 0;
      var pasif = queries[3].count || 0;
      var gizli = queries[4].count || 0;
      var premium = queries[5].count || 0;
      var frozen = queries[6].count || 0;
      var pendingDel = queries[7].count || 0;
      var son7gun = queries[8].count || 0;

      var profilYuzde = total > 0 ? Math.round((profilTam / total) * 100) : 0;

      // Clear container
      while (container.firstChild) container.removeChild(container.firstChild);

      // Row 1: Headline
      container.appendChild(buildSectionLabel('Genel Bakış'));
      container.appendChild(buildRow([
        buildStatCard('Toplam Kayıtlı', total),
        buildStatCard('Profil Tamamlamış', profilTam, null, '%' + profilYuzde + ' tamamlama oranı'),
        buildStatCard('Aktif İş Arıyor', aktif)
      ]));

      // Row 2: Status Breakdown
      container.appendChild(buildSectionLabel('Durum Dağılımı'));
      container.appendChild(buildRow([
        buildStatCard('Beni Öner', aktif, '✅'),
        buildStatCard('Beni Önerme', pasif, '❌'),
        buildStatCard('İşverenden Gizli', gizli, '🙈'),
        buildStatCard('Premium', premium, '⭐')
      ]));

      // Row 3: Lifecycle
      container.appendChild(buildSectionLabel('Yaşam Döngüsü'));
      container.appendChild(buildRow([
        buildStatCard('Dondurulmuş', frozen, '🧊'),
        buildStatCard('Silme Bekleyen', pendingDel, '🗑️'),
        buildStatCard('Son 7 Gün Kayıt', son7gun, '📈')
      ]));

      loaded = true;
    } catch(e) {
      console.error('Candidates load error:', e);
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
