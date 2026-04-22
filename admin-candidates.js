/* ═══ admin-candidates.js — Candidate Analytics Module ═══ */
(function(){
  'use strict';

  var mounted = false;
  var loaded = false;

  var PANEL_HTML = ''
    + '<div class="panel-header"><h2>Adaylar</h2></div>'
    + '<div id="candidates-content" aria-live="polite">'
    + '  <div class="empty-state"><div class="empty-state-icon">&#9203;</div>'
    + '  <div class="empty-state-text">Y&uuml;kleniyor...</div></div>'
    + '</div>';

  window._htAdminMountCandidates = function() {
    if (mounted) return;
    var panel = document.getElementById('panel-candidates');
    var core = window._htAdminCore;
    if (panel && core) { core.mount(panel, PANEL_HTML); mounted = true; }
  };

  var buildStatCard = window._htAdminBuildStatCard;
  var buildRow = window._htAdminBuildRow;
  var buildSectionLabel = window._htAdminBuildSectionLabel;

  /* ── LOAD CANDIDATES DATA ── */
  window._htAdminLoadCandidates = async function() {
    if (window._htAdminMountCandidates) window._htAdminMountCandidates();
    var container = document.getElementById('candidates-content');
    if (!container) return;

    try {
      var supa = window._htAdminSupa;

      // Run all COUNT queries in parallel
      var now = new Date();
      var sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      var queries = await Promise.all([
        // Genel toplam
        supa.from('candidates').select('id', { count: 'exact', head: true }),
        // Tamamlanmış profiller
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('profile_completed', true),
        // Önerilebilir (tamamlanmış veya %45+)
        supa.from('candidates').select('id', { count: 'exact', head: true }).or('profile_completed.eq.true,profile_completion_pct.gte.45'),
        // Önerilebilir ama profile_completed=false
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('profile_completed', false).gte('profile_completion_pct', 45),
        // Aktif adaylar
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('is_active', true),
        // Gizli ve premium
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('hide_from_current_employer', true),
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('is_premium', true),
        // Hesap durumu + son 7 gün
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('account_status', 'frozen'),
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('account_status', 'pending_deletion'),
        supa.from('candidates').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
        // Bu ay önerilebilir kayıtlar
        supa.from('candidates').select('id', { count: 'exact', head: true })
          .or('profile_completed.eq.true,profile_completion_pct.gte.45')
          .gte('created_at', monthStart.toISOString())
      ]);

      var total = queries[0].count || 0;
      var profilTam = queries[1].count || 0;
      var onerilebilir = queries[2].count || 0;
      var onerilebilirYarim = queries[3].count || 0;
      var aktif = queries[4].count || 0;
      var gizli = queries[5].count || 0;
      var premium = queries[6].count || 0;
      var frozen = queries[7].count || 0;
      var pendingDel = queries[8].count || 0;
      var son7gun = queries[9].count || 0;
      var buAyOnerilebilir = queries[10].count || 0;

      var tamamOran = total > 0 ? Math.round((profilTam / total) * 100) : 0;
      var onerilebilirOran = total > 0 ? Math.round((onerilebilir / total) * 100) : 0;
      var yarim = total - profilTam;

      // Clear container
      while (container.firstChild) container.removeChild(container.firstChild);

      // Bölüm A: Profili Tamamlananlar
      container.appendChild(buildSectionLabel('Profili Tamamlananlar'));
      container.appendChild(buildRow([
        buildStatCard('Toplam Aday', total),
        buildStatCard('Profil Tamamlamış', profilTam, null, '%' + tamamOran + ' tamamlama oranı'),
        buildStatCard('Aktif İş Arıyor', aktif),
        buildStatCard('Son 7 Gün Kayıt', son7gun)
      ]));

      // Bölüm B: Profili Yarım Kalanlar
      container.appendChild(buildSectionLabel('Profili Yarım Kalanlar'));
      container.appendChild(buildRow([
        buildStatCard('Yarım Kalan Profil', yarim),
        buildStatCard('Önerilebilir (≥%45)', onerilebilir, null, '%' + onerilebilirOran + ' öneri eşiğini geçen'),
        buildStatCard('Önerilebilir ama Tamamlanmamış', onerilebilirYarim),
        buildStatCard('Bu Ay Önerilebilir Kayıt', buAyOnerilebilir)
      ]));

      // Bölüm C: Gizlilik ve Hesap Durumu
      container.appendChild(buildSectionLabel('Gizlilik ve Hesap Durumu'));
      container.appendChild(buildRow([
        buildStatCard('İşverenden Gizli', gizli),
        buildStatCard('Premium', premium),
        buildStatCard('Dondurulmuş', frozen),
        buildStatCard('Silme Bekleyen', pendingDel)
      ]));

      loaded = true;
    } catch(e) {
      console.error('Candidates load error:', e);
      while (container.firstChild) container.removeChild(container.firstChild);
      var errDiv = document.createElement('div');
      errDiv.className = 'empty-state';
      var iconDiv = document.createElement('div');
      iconDiv.className = 'empty-state-icon';
      iconDiv.textContent = '';
      errDiv.appendChild(iconDiv);
      var textDiv = document.createElement('div');
      textDiv.className = 'empty-state-text';
      textDiv.textContent = 'Veri yüklenirken hata oluştu';
      errDiv.appendChild(textDiv);
      container.appendChild(errDiv);
    }
  };

})();
