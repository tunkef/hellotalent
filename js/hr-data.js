/* ═════════════════════════════════════════════════════════════════
   HelloTalent — HR Data Adapter (Sprint 0 / FAZ B, MVP 2 hazirligi)

   Dual-mode pattern:
   - Demo mode (default): data/demo/*.json statik dosyalardan okur
   - Real mode (flag): window.HR_REAL_MODE_ENABLED = true ise Supabase RPC

   Flag kasitli olarak default false. MVP 2'de (Sprint 7) Supabase backend
   ayaga kalkinca flag flip + her metodun real implementasyonu acilir.

   Tum metodlar Promise<{ data, error }> dondurur (Supabase contract uyumlu).

   Global API: window.HRData.{ ... }
   ═════════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  var DEMO_BASE = 'data/demo/';

  /* ── Cache ────────────────────────────────────── */
  var _cache = {};

  /* ── Real mode helper ─────────────────────────── */
  function isRealMode() {
    return window.HR_REAL_MODE_ENABLED === true;
  }

  function supa() {
    return (window.HRShell && window.HRShell.getSupa && window.HRShell.getSupa()) || null;
  }

  /* ── Demo loader ──────────────────────────────── */
  async function loadDemo(name) {
    if (_cache[name]) return _cache[name];
    try {
      var res = await fetch(DEMO_BASE + name + '.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var json = await res.json();
      _cache[name] = json;
      return json;
    } catch (e) {
      console.error('[HRData] demo load error:', name, e && e.message);
      return null;
    }
  }

  /* ── Filter / paginate helper ─────────────────── */
  function paginate(rows, opts) {
    opts = opts || {};
    var page = Math.max(1, parseInt(opts.page || 1, 10));
    var pageSize = Math.max(1, parseInt(opts.pageSize || 20, 10));
    var start = (page - 1) * pageSize;
    return {
      rows: rows.slice(start, start + pageSize),
      total: rows.length,
      page: page,
      pageSize: pageSize
    };
  }

  function applySearch(rows, q, fields) {
    if (!q) return rows;
    var needle = String(q).toLowerCase();
    return rows.filter(function (r) {
      for (var i = 0; i < fields.length; i++) {
        var v = r[fields[i]];
        if (v && String(v).toLowerCase().indexOf(needle) !== -1) return true;
      }
      return false;
    });
  }

  /* ════════════════════════════════════════════════
     CANDIDATES (havuz + arama)
     ════════════════════════════════════════════════ */
  async function searchCandidates(opts) {
    opts = opts || {};
    if (isRealMode()) {
      // TBD Sprint 7: supabase RPC search_candidates_for_employer
      var sb = supa();
      if (!sb) return { data: null, error: { message: 'Supabase not ready' } };
      // Placeholder — gercek RPC ismi backend ekibinden gelecek
      try {
        var res = await sb.rpc('hr_search_candidates', {
          p_query: opts.q || null,
          p_filters: opts.filters || {},
          p_page: opts.page || 1,
          p_page_size: opts.pageSize || 20
        });
        return { data: res.data, error: res.error };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    }
    // Demo mode
    var rows = await loadDemo('candidates');
    if (!rows) return { data: null, error: { message: 'Demo data not loaded' } };
    var filtered = applySearch(rows, opts.q, ['full_name', 'pozisyon', 'sehir', 'markalar']);
    if (opts.filters && opts.filters.sehir) {
      filtered = filtered.filter(function (r) { return r.sehir === opts.filters.sehir; });
    }
    if (opts.filters && opts.filters.segment) {
      filtered = filtered.filter(function (r) { return r.segment === opts.filters.segment; });
    }
    var paged = paginate(filtered, opts);
    return { data: paged, error: null };
  }

  async function getCandidateById(id) {
    if (isRealMode()) {
      var sb = supa();
      if (!sb) return { data: null, error: { message: 'Supabase not ready' } };
      try {
        var res = await sb.rpc('hr_get_candidate_full', { p_candidate_id: id });
        return { data: res.data, error: res.error };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    }
    var rows = await loadDemo('candidates');
    if (!rows) return { data: null, error: { message: 'Demo data not loaded' } };
    var row = rows.find(function (r) { return String(r.id) === String(id); });
    return { data: row || null, error: row ? null : { message: 'Aday bulunamadı' } };
  }

  /* ════════════════════════════════════════════════
     PIPELINE (kanban state)
     ════════════════════════════════════════════════ */
  async function getPipeline(positionId) {
    if (isRealMode()) {
      var sb = supa();
      if (!sb) return { data: null, error: { message: 'Supabase not ready' } };
      try {
        var res = await sb.rpc('hr_get_pipeline', { p_position_id: positionId });
        return { data: res.data, error: res.error };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    }
    var rows = await loadDemo('pipeline');
    if (!rows) return { data: null, error: { message: 'Demo data not loaded' } };
    var filtered = positionId ? rows.filter(function (r) { return String(r.position_id) === String(positionId); }) : rows;
    return { data: filtered, error: null };
  }

  async function moveStage(pipelineId, newStage) {
    if (isRealMode()) {
      var sb = supa();
      if (!sb) return { data: null, error: { message: 'Supabase not ready' } };
      try {
        var res = await sb.rpc('hr_move_pipeline_stage', { p_id: pipelineId, p_stage: newStage });
        return { data: res.data, error: res.error };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    }
    // Demo: in-memory mutate (sayfa reload'da resetlenir)
    var rows = _cache.pipeline;
    if (rows) {
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i].id) === String(pipelineId)) {
          rows[i].stage = newStage;
          rows[i].updated_at = new Date().toISOString();
          break;
        }
      }
    }
    return { data: { ok: true, demo: true }, error: null };
  }

  async function addToPipeline(payload) {
    // payload: { position_id, candidate_id, stage }
    if (isRealMode()) {
      var sb = supa();
      if (!sb) return { data: null, error: { message: 'Supabase not ready' } };
      try {
        var res = await sb.rpc('hr_add_to_pipeline', payload);
        return { data: res.data, error: res.error };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    }
    return { data: { ok: true, demo: true, payload: payload }, error: null };
  }

  /* ════════════════════════════════════════════════
     NOTES
     ════════════════════════════════════════════════ */
  async function listNotes(candidateId) {
    if (isRealMode()) {
      var sb = supa();
      if (!sb) return { data: null, error: { message: 'Supabase not ready' } };
      try {
        var res = await sb.rpc('hr_list_notes', { p_candidate_id: candidateId });
        return { data: res.data, error: res.error };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    }
    return { data: [], error: null };
  }

  async function addNote(candidateId, body) {
    if (isRealMode()) {
      var sb = supa();
      if (!sb) return { data: null, error: { message: 'Supabase not ready' } };
      try {
        var res = await sb.rpc('hr_add_note', { p_candidate_id: candidateId, p_body: body });
        return { data: res.data, error: res.error };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    }
    return { data: { ok: true, demo: true }, error: null };
  }

  /* ════════════════════════════════════════════════
     MESSAGES
     ════════════════════════════════════════════════ */
  async function getMessageThreads() {
    if (isRealMode()) {
      var sb = supa();
      if (!sb) return { data: null, error: { message: 'Supabase not ready' } };
      try {
        var res = await sb.rpc('hr_list_threads');
        return { data: res.data, error: res.error };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    }
    var rows = await loadDemo('messages');
    if (!rows) return { data: null, error: { message: 'Demo data not loaded' } };
    return { data: rows, error: null };
  }

  async function sendMessage(threadId, body) {
    if (isRealMode()) {
      var sb = supa();
      if (!sb) return { data: null, error: { message: 'Supabase not ready' } };
      try {
        var res = await sb.rpc('hr_send_message', { p_thread_id: threadId, p_body: body });
        return { data: res.data, error: res.error };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    }
    return { data: { ok: true, demo: true }, error: null };
  }

  /* ════════════════════════════════════════════════
     CAMPAIGNS
     ════════════════════════════════════════════════ */
  async function getCampaigns() {
    if (isRealMode()) {
      var sb = supa();
      if (!sb) return { data: null, error: { message: 'Supabase not ready' } };
      try {
        var res = await sb.rpc('hr_list_campaigns');
        return { data: res.data, error: res.error };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    }
    var rows = await loadDemo('campaigns');
    if (!rows) return { data: null, error: { message: 'Demo data not loaded' } };
    return { data: rows, error: null };
  }

  /* ════════════════════════════════════════════════
     POSITIONS (position switcher icin)
     ════════════════════════════════════════════════ */
  async function getPositions() {
    if (isRealMode()) {
      var sb = supa();
      if (!sb) return { data: null, error: { message: 'Supabase not ready' } };
      try {
        var res = await sb.rpc('hr_list_positions');
        return { data: res.data, error: res.error };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    }
    var rows = await loadDemo('positions');
    if (!rows) return { data: null, error: { message: 'Demo data not loaded' } };
    return { data: rows, error: null };
  }

  /* ── Public API ──────────────────────────────── */
  window.HRData = {
    isRealMode: isRealMode,
    // Candidates
    searchCandidates: searchCandidates,
    getCandidateById: getCandidateById,
    // Pipeline
    getPipeline: getPipeline,
    moveStage: moveStage,
    addToPipeline: addToPipeline,
    // Notes
    listNotes: listNotes,
    addNote: addNote,
    // Messages
    getMessageThreads: getMessageThreads,
    sendMessage: sendMessage,
    // Campaigns
    getCampaigns: getCampaigns,
    // Positions
    getPositions: getPositions,
    // Cache control (test/debug)
    _clearCache: function () { _cache = {}; }
  };
})();
