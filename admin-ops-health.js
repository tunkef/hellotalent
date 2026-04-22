/* ═══ admin-ops-health.js — Ops Health Dashboard Module ═══ */
(function(){
  'use strict';

  var loaded = false;
  var mounted = false;

  var PANEL_HTML = ''
    + '<div class="panel-header">'
    + '  <h2>Sistem Sa&#287;l&#305;&#287;&#305;</h2>'
    + '  <button class="btn btn-sm" onclick="window._htAdminLoadOpsHealth && window._htAdminLoadOpsHealth(true)">Yenile</button>'
    + '</div>'
    + '<div id="ops-health-content" aria-live="polite">'
    + '  <div class="empty-state" style="padding:80px 20px;">'
    + '    <div class="empty-state-icon">&#9203;</div>'
    + '    <div class="empty-state-text" style="font-size:var(--text-lg);color:var(--muted);">Y&uuml;kleniyor...</div>'
    + '  </div>'
    + '</div>';

  window._htAdminMountOpsHealth = function() {
    if (mounted) return;
    var panel = document.getElementById('panel-ops-health');
    var core = window._htAdminCore;
    if (panel && core) { core.mount(panel, PANEL_HTML); mounted = true; }
  };

  var buildStatCard = function(label, value, extra) { return window._htAdminBuildStatCard(label, value, null, extra); };
  var buildRow = window._htAdminBuildRow;
  var buildSectionLabel = window._htAdminBuildSectionLabel;

  /* ── HEALTH BANNER ── */
  function buildHealthBanner(emailStats) {
    var issues = [];
    if (emailStats.stale_processing > 0) {
      issues.push(emailStats.stale_processing + ' stale processing (>10 dk)');
    }
    if (emailStats.old_pending > 0) {
      issues.push(emailStats.old_pending + ' eski bekleyen (>30 dk)');
    }
    if (emailStats.failed_1h >= 5) {
      issues.push(emailStats.failed_1h + ' basarisiz (son 1 saat)');
    }

    var banner = document.createElement('div');
    banner.style.cssText = 'padding:16px 20px;border-radius:12px;margin-bottom:24px;display:flex;align-items:center;gap:12px;font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;font-weight:600;';

    if (issues.length === 0) {
      banner.style.background = '#D1FAE5';
      banner.style.color = '#065F46';
      banner.textContent = 'Tum sistemler calisiyor';
    } else {
      banner.style.background = '#FEE2E2';
      banner.style.color = '#991B1B';
      banner.textContent = 'Sorun tespit edildi: ' + issues.join(' / ');
    }
    return banner;
  }

  /* ── FAILED EMAILS TABLE ── */
  function buildFailedTable(rows) {
    if (!rows || rows.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'padding:20px;text-align:center;color:var(--muted);font-size:13px;';
      empty.textContent = 'Son donemde basarisiz e-posta yok';
      return empty;
    }

    var table = document.createElement('table');
    table.className = 'admin-table';

    var thead = document.createElement('thead');
    var hrow = document.createElement('tr');
    var headers = ['ID', 'Tur', 'Alici', 'Hata', 'Deneme', 'Basarisizlik Zamani'];
    for (var h = 0; h < headers.length; h++) {
      var th = document.createElement('th');
      th.textContent = headers[h];
      hrow.appendChild(th);
    }
    thead.appendChild(hrow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var tr = document.createElement('tr');

      var tdId = document.createElement('td');
      tdId.textContent = r.id;
      tr.appendChild(tdId);

      var tdType = document.createElement('td');
      var pill = document.createElement('span');
      pill.className = 'status-pill';
      pill.textContent = r.email_type || '-';
      tdType.appendChild(pill);
      tr.appendChild(tdType);

      var tdEmail = document.createElement('td');
      tdEmail.textContent = r.recipient_email || '-';
      tdEmail.style.maxWidth = '200px';
      tdEmail.style.overflow = 'hidden';
      tdEmail.style.textOverflow = 'ellipsis';
      tr.appendChild(tdEmail);

      var tdError = document.createElement('td');
      tdError.textContent = r.last_error ? r.last_error.substring(0, 120) : '-';
      tdError.style.maxWidth = '300px';
      tdError.style.fontSize = '12px';
      tdError.style.color = '#991B1B';
      tr.appendChild(tdError);

      var tdAttempt = document.createElement('td');
      tdAttempt.textContent = r.attempt_count || 0;
      tr.appendChild(tdAttempt);

      var tdDate = document.createElement('td');
      var failTime = r.failed_at || r.created_at;
      tdDate.textContent = failTime ? new Date(failTime).toLocaleString('tr-TR') : '-';
      tdDate.style.fontSize = '12px';
      if (!r.failed_at && r.created_at) {
        tdDate.title = 'failed_at yok — olusturma zamani gosteriliyor';
        tdDate.style.fontStyle = 'italic';
      }
      tr.appendChild(tdDate);

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
  }

  /* ── CRON JOBS TABLE ── */
  function buildCronTable(cronJobs) {
    if (!cronJobs || cronJobs.length === 0) return null;

    var wrapper = document.createElement('div');
    wrapper.appendChild(buildSectionLabel('Cron Isleri'));

    var table = document.createElement('table');
    table.className = 'admin-table';

    var thead = document.createElement('thead');
    var hrow = document.createElement('tr');
    var headers = ['Is Adi', 'Zamanlama', 'Aktif'];
    // Check if run details are available (first job has last_run_at)
    var hasRunDetails = cronJobs[0] && cronJobs[0].last_run_at;
    if (hasRunDetails) {
      headers.push('Son Calisma');
      headers.push('Son Durum');
    }
    for (var h = 0; h < headers.length; h++) {
      var th = document.createElement('th');
      th.textContent = headers[h];
      hrow.appendChild(th);
    }
    thead.appendChild(hrow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    for (var i = 0; i < cronJobs.length; i++) {
      var j = cronJobs[i];
      var tr = document.createElement('tr');

      var tdName = document.createElement('td');
      tdName.textContent = j.jobname || '-';
      tdName.style.fontFamily = '"DM Mono", monospace';
      tdName.style.fontSize = '13px';
      tr.appendChild(tdName);

      var tdSchedule = document.createElement('td');
      tdSchedule.textContent = j.schedule || '-';
      tdSchedule.style.fontFamily = '"DM Mono", monospace';
      tdSchedule.style.fontSize = '13px';
      tr.appendChild(tdSchedule);

      var tdActive = document.createElement('td');
      var activePill = document.createElement('span');
      activePill.className = 'status-pill';
      activePill.style.background = j.active ? '#D1FAE5' : '#FEE2E2';
      activePill.style.color = j.active ? '#065F46' : '#991B1B';
      activePill.textContent = j.active ? 'Aktif' : 'Pasif';
      tdActive.appendChild(activePill);
      tr.appendChild(tdActive);

      if (hasRunDetails) {
        var tdLastRun = document.createElement('td');
        tdLastRun.textContent = j.last_run_at ? new Date(j.last_run_at).toLocaleString('tr-TR') : '-';
        tdLastRun.style.fontSize = '12px';
        tr.appendChild(tdLastRun);

        var tdLastStatus = document.createElement('td');
        tdLastStatus.textContent = j.last_status || '-';
        tdLastStatus.style.fontSize = '12px';
        tr.appendChild(tdLastStatus);
      }

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
  }

  /* ── RPC NOT DEPLOYED WARNING ── */
  function buildRpcWarning() {
    var div = document.createElement('div');
    div.style.cssText = 'padding:16px 20px;border-radius:12px;margin-bottom:16px;background:#FEF3C7;color:#92400E;font-size:13px;font-weight:500;';
    div.textContent = 'RPC henuz deploy edilmedi — e-posta pipeline ve cron verileri icin get_ops_health_stats() migration uygulanmali.';
    return div;
  }

  /* ── MAIN LOAD FUNCTION ── */
  window._htAdminLoadOpsHealth = async function(forceRefresh) {
    if (window._htAdminMountOpsHealth) window._htAdminMountOpsHealth();
    if (loaded && !forceRefresh) return;

    var container = document.getElementById('ops-health-content');
    if (!container) return;

    try {
      var supa = window._htAdminSupa;

      // Parallel queries: RPCs + direct count queries
      var results = await Promise.all([
        // 0: RPC — email + CLI pipeline + cron
        supa.rpc('get_ops_health_stats'),
        // 1: RPC — recent failed emails
        supa.rpc('get_ops_failed_emails', { p_limit: 15 }),
        // 2: Total candidates
        supa.from('candidates').select('id', { count: 'exact', head: true }),
        // 3: Active candidates
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('is_active', true),
        // 4: Frozen
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('account_status', 'frozen'),
        // 5: Pending deletion
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('account_status', 'pending_deletion'),
        // 6: Total employers
        supa.from('hr_profiles').select('id', { count: 'exact', head: true }),
        // 7-10: Profile completion distribution
        supa.from('candidates').select('id', { count: 'exact', head: true }).lt('profile_completion_pct', 25),
        supa.from('candidates').select('id', { count: 'exact', head: true }).gte('profile_completion_pct', 25).lt('profile_completion_pct', 45),
        supa.from('candidates').select('id', { count: 'exact', head: true }).gte('profile_completion_pct', 45).lt('profile_completion_pct', 75),
        supa.from('candidates').select('id', { count: 'exact', head: true }).gte('profile_completion_pct', 75),
        // 11-12: Notification preferences
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('notify_email_messages', true),
        supa.from('candidates').select('id', { count: 'exact', head: true }).eq('notify_email_jobs', true)
      ]);

      // Clear container
      while (container.firstChild) container.removeChild(container.firstChild);

      var rpcOk = !results[0].error;
      var opsData = rpcOk ? results[0].data : null;
      var failedEmails = (rpcOk && !results[1].error) ? (results[1].data || []) : [];
      var emailStats = opsData ? (opsData.email || {}) : {};
      var cliPipeline = opsData ? opsData.cli_pipeline : null;
      var cronJobs = opsData ? opsData.cron_jobs : null;

      // === SECTION 0: RPC WARNING (if not deployed) ===
      if (!rpcOk) {
        container.appendChild(buildRpcWarning());
      }

      // === SECTION 1: HEALTH BANNER ===
      if (rpcOk) {
        container.appendChild(buildHealthBanner(emailStats));
      }

      // === SECTION 2: E-POSTA PIPELINE ===
      if (rpcOk) {
        container.appendChild(buildSectionLabel('E-posta Pipeline'));
        container.appendChild(buildRow([
          buildStatCard('Gonderilen (24s)', emailStats.sent_24h || 0),
          buildStatCard('Bekleyen', emailStats.pending || 0),
          buildStatCard('Basarisiz (1s)', emailStats.failed_1h || 0, emailStats.failed_total > 0 ? 'Toplam: ' + emailStats.failed_total : null),
          buildStatCard('Stale Processing', emailStats.stale_processing || 0, emailStats.stale_processing > 0 ? '>10 dk isleniyor' : null)
        ]));

        // E-posta detay satiri
        container.appendChild(buildRow([
          buildStatCard('Toplam E-posta', emailStats.total || 0),
          buildStatCard('Atlanan (Skipped)', emailStats.skipped || 0, 'Tercih nedeniyle gonderilmedi'),
          buildStatCard('Islemde', emailStats.processing || 0),
          buildStatCard('Eski Bekleyen', emailStats.old_pending || 0, emailStats.old_pending > 0 ? '>30 dk kuyrukta' : null)
        ]));
      }

      // === SECTION 3: FAILED EMAILS TABLE ===
      if (rpcOk) {
        container.appendChild(buildSectionLabel('Son Basarisiz E-postalar'));
        container.appendChild(buildFailedTable(failedEmails));
      }

      // === SECTION 4: USER METRICS ===
      var totalCandidates = results[2].count || 0;
      var activeCandidates = results[3].count || 0;
      var frozenCandidates = results[4].count || 0;
      var pendingDelCandidates = results[5].count || 0;
      var totalEmployers = results[6].count || 0;

      container.appendChild(buildSectionLabel('Kullanici Metrikleri'));
      container.appendChild(buildRow([
        buildStatCard('Toplam Aday', totalCandidates),
        buildStatCard('Aktif', activeCandidates),
        buildStatCard('Dondurulmus', frozenCandidates),
        buildStatCard('Silme Bekleyen', pendingDelCandidates),
        buildStatCard('Toplam Isveren', totalEmployers)
      ]));

      // === SECTION 5: PROFILE COMPLETION DISTRIBUTION ===
      var pctLow = results[7].count || 0;
      var pctMid = results[8].count || 0;
      var pctHigh = results[9].count || 0;
      var pctFull = results[10].count || 0;

      container.appendChild(buildSectionLabel('Profil Tamamlama Dagilimi'));
      container.appendChild(buildRow([
        buildStatCard('<%25', pctLow, 'Baslangic'),
        buildStatCard('%25-%44', pctMid, 'Gelisiyor'),
        buildStatCard('%45-%74', pctHigh, 'Onerilebilir'),
        buildStatCard('%75-%100', pctFull, 'Tamamlandi')
      ]));

      // === SECTION 6: NOTIFICATION PREFERENCES ===
      var notifyMessages = results[11].count || 0;
      var notifyJobs = results[12].count || 0;

      container.appendChild(buildSectionLabel('Bildirim Tercihleri'));
      container.appendChild(buildRow([
        buildStatCard('Mesaj Bildirimi Acik', notifyMessages, totalCandidates > 0 ? '%' + Math.round((notifyMessages / totalCandidates) * 100) + ' oran' : null),
        buildStatCard('Is Bildirimi Acik', notifyJobs, totalCandidates > 0 ? '%' + Math.round((notifyJobs / totalCandidates) * 100) + ' oran' : null)
      ]));

      // === SECTION 7: CLI PIPELINE STATUS ===
      if (rpcOk && cliPipeline) {
        container.appendChild(buildSectionLabel('CLI Pipeline Durumu'));
        container.appendChild(buildRow([
          buildStatCard('Toplam Migration', cliPipeline.total_count || 0, 'Supabase CLI pipeline'),
          buildStatCard('Son Migration', cliPipeline.last_migration || '-')
        ]));
      } else if (rpcOk && !cliPipeline) {
        container.appendChild(buildSectionLabel('CLI Pipeline Durumu'));
        var notAvail = document.createElement('div');
        notAvail.style.cssText = 'padding:12px 16px;font-size:13px;color:var(--muted);';
        notAvail.textContent = 'CLI pipeline bilgisi erisilemedi';
        container.appendChild(notAvail);
      }

      // === SECTION 8: CRON JOBS (conditional) ===
      if (rpcOk && cronJobs && cronJobs.length > 0) {
        var cronSection = buildCronTable(cronJobs);
        if (cronSection) container.appendChild(cronSection);
      }

      loaded = true;
    } catch(e) {
      console.error('Ops health load error:', e);
      while (container.firstChild) container.removeChild(container.firstChild);
      var errDiv = document.createElement('div');
      errDiv.className = 'empty-state';
      var errIcon = document.createElement('div');
      errIcon.className = 'empty-state-icon';
      errIcon.textContent = 'Hata';
      errDiv.appendChild(errIcon);
      var errText = document.createElement('div');
      errText.className = 'empty-state-text';
      errText.textContent = 'Veriler yuklenemedi: ' + (e.message || 'Bilinmeyen hata');
      errDiv.appendChild(errText);
      container.appendChild(errDiv);
    }
  };

})();
