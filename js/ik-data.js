/* global */
/* ════════════════════════════════════════════════════════════════
   IK Data Adapter — Asama 86 Sprint B
   Demo mode (data/demo/*.json + localStorage overlay) primary.
   Real mode (Supabase) MVP 2'de aktif (window.IK_REAL_MODE_ENABLED).
   SOLID:
     - SRP: tek sorumluluk = data fetch + cache + overlay.
     - DIP: UI sayfalari sadece IK_DATA public API'sini gorur.
     - OCP: real mode flag ile genisletilir, mevcut metod imzasi degismez.
   XSS-safe: hicbir HTML stringi return etmez (textContent + DOM caller'da).
   localStorage namespace: ht_ik_*  (eski ht_hr_* ile cakismaz).
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ═══════ Config ═══════ */
  var DEMO_BASE = 'data/demo/';
  var LS_PIPELINE_OVERLAY = 'ht_ik_pipeline_state';
  var LS_NOTES_PREFIX = 'ht_ik_notes_';
  var LS_BLOCK_PREFIX = 'ht_ik_blocked_';

  /* Cache (memory only, sayfa lifecycle) */
  var _cache = {
    candidates: null,
    positions: null,
    pipeline: null,
    threads: null,
    campaigns: null
  };

  /* ═══════ Helpers ═══════ */
  function realMode() {
    return window.IK_REAL_MODE_ENABLED === true;
  }

  function isDemoMode() {
    try {
      return localStorage.getItem('ht_ik_demo_mode') === '1' || !realMode();
    } catch (e) {
      return true;
    }
  }

  function fetchJSON(name) {
    if (_cache[name]) {
      return Promise.resolve(_cache[name]);
    }
    return fetch(DEMO_BASE + name + '.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('fetch fail: ' + name);
        return r.json();
      })
      .then(function (data) {
        _cache[name] = data;
        return data;
      });
  }

  function readOverlay() {
    try {
      var raw = localStorage.getItem(LS_PIPELINE_OVERLAY);
      return raw ? JSON.parse(raw) : { added: [], removed: [], stageMoves: {} };
    } catch (e) {
      return { added: [], removed: [], stageMoves: {} };
    }
  }
  function writeOverlay(state) {
    try {
      localStorage.setItem(LS_PIPELINE_OVERLAY, JSON.stringify(state || {}));
    } catch (e) {
      console.warn('[ik-data] overlay write fail:', e && e.message);
    }
  }

  function uid(prefix) {
    return (prefix || 'pl-x-') + Date.now().toString(36) + '-' +
           Math.random().toString(36).slice(2, 8);
  }

  function trLower(s) {
    if (!s) return '';
    return String(s)
      .replace(/I/g, 'ı')
      .replace(/İ/g, 'i')
      .toLowerCase();
  }

  function safeStr(v) { return v == null ? '' : String(v); }

  /* ═══════ Match score ═══════
     Aday <-> position parity. Basit weighted:
       segment exact = 30
       city exact   = 25
       district exact = 10
       deneyim_yil position.exp_min/max range = 20
       musaitlik (hemen=15, 2 hafta=12, 1 ay=8, 3 ay=4) = 15
     Range 0..100 cap. */
  function calcMatch(cand, pos) {
    if (!cand || !pos) return 0;
    var score = 0;

    if (cand.segment && pos.segment && cand.segment === pos.segment) score += 30;
    if (cand.sehir && pos.city && cand.sehir === pos.city) score += 25;
    if (cand.ilce && pos.district && cand.ilce === pos.district) score += 10;

    var expRange = parseExpRange(pos.experience_years);
    var cy = parseInt(cand.deneyim_yil, 10) || 0;
    if (expRange) {
      if (expRange.min == null || cy >= expRange.min) {
        if (expRange.max == null || cy <= expRange.max) {
          score += 20;
        } else if (cy <= expRange.max + 2) {
          score += 10;
        }
      }
    }

    var avail = trLower(cand.musaitlik || '');
    if (avail.indexOf('hemen') >= 0) score += 15;
    else if (avail.indexOf('2 hafta') >= 0) score += 12;
    else if (avail.indexOf('1 ay') >= 0) score += 8;
    else if (avail.indexOf('3 ay') >= 0) score += 4;

    return Math.min(100, Math.round(score));
  }

  function parseExpRange(s) {
    if (!s) return null;
    var t = String(s);
    var plus = t.match(/^(\d+)\s*\+/);
    if (plus) return { min: parseInt(plus[1], 10), max: null };
    var range = t.match(/^(\d+)\s*-\s*(\d+)/);
    if (range) return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
    var single = t.match(/^(\d+)$/);
    if (single) return { min: parseInt(single[1], 10), max: parseInt(single[1], 10) };
    return null;
  }

  /* ═══════ Public API ═══════ */
  var API = {

    /* ── Candidates ── */
    searchCandidates: function (filters, position_id) {
      filters = filters || {};
      return fetchJSON('candidates').then(function (list) {
        var arr = list.filter(function (c) { return c.is_active !== false; });

        /* search */
        var q = trLower(filters.search || '').trim();
        if (q) {
          arr = arr.filter(function (c) {
            var hay = trLower([
              c.full_name, c.pozisyon, c.sehir, c.ilce,
              (c.markalar || []).join(' '), c.segment, c.calisma_tipi
            ].join(' '));
            return hay.indexOf(q) >= 0;
          });
        }

        /* city */
        if (filters.city) {
          arr = arr.filter(function (c) { return c.sehir === filters.city; });
        }
        /* position (segment match — pozisyon adi parite) */
        if (filters.position) {
          arr = arr.filter(function (c) { return c.pozisyon === filters.position; });
        }
        /* segment */
        if (filters.segment) {
          arr = arr.filter(function (c) { return c.segment === filters.segment; });
        }
        /* musaitlik */
        if (filters.musaitlik) {
          arr = arr.filter(function (c) {
            return trLower(c.musaitlik || '') === trLower(filters.musaitlik);
          });
        }

        /* match% calc — sadece position varsa */
        var pos = null;
        var posLookup = position_id ? API._getPositionSync(position_id) : null;
        if (posLookup) pos = posLookup;
        arr = arr.map(function (c) {
          var match = pos ? calcMatch(c, pos) : 0;
          return Object.assign({}, c, { _match: match });
        });

        /* sort */
        var sort = filters.sort || 'match';
        if (sort === 'match') {
          arr.sort(function (a, b) { return (b._match || 0) - (a._match || 0); });
        } else if (sort === 'recent') {
          arr.sort(function (a, b) {
            return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
          });
        } else if (sort === 'name') {
          arr.sort(function (a, b) {
            return trLower(a.full_name).localeCompare(trLower(b.full_name), 'tr');
          });
        } else if (sort === 'experience') {
          arr.sort(function (a, b) { return (b.deneyim_yil || 0) - (a.deneyim_yil || 0); });
        }

        return arr;
      });
    },

    getCandidate: function (id) {
      return fetchJSON('candidates').then(function (list) {
        var hit = list.find(function (c) { return c.id === id; });
        return hit ? Object.assign({}, hit) : null;
      });
    },

    /* ── Positions ── */
    getPositions: function () {
      return fetchJSON('positions');
    },

    _getPositionSync: function (id) {
      if (!_cache.positions) return null;
      return _cache.positions.find(function (p) { return p.id === id; }) || null;
    },

    getPosition: function (id) {
      return fetchJSON('positions').then(function (list) {
        return list.find(function (p) { return p.id === id; }) || null;
      });
    },

    /* ── Pipeline ──
       Demo: pipeline.json + localStorage overlay (added/removed/stageMoves). */
    getPipeline: function (position_id) {
      return fetchJSON('pipeline').then(function (list) {
        var ov = readOverlay();
        /* base entries for position */
        var entries = list.filter(function (e) { return !position_id || e.position_id === position_id; })
          .map(function (e) { return Object.assign({}, e); });

        /* stageMoves apply */
        entries = entries.map(function (e) {
          var key = e.position_id + '|' + e.candidate_id;
          if (ov.stageMoves && ov.stageMoves[key]) {
            return Object.assign({}, e, {
              stage: ov.stageMoves[key],
              updated_at: new Date().toISOString()
            });
          }
          return e;
        });

        /* removed filter */
        if (ov.removed && ov.removed.length) {
          entries = entries.filter(function (e) {
            return ov.removed.indexOf(e.position_id + '|' + e.candidate_id) < 0;
          });
        }

        /* added entries */
        if (ov.added && ov.added.length) {
          ov.added.forEach(function (a) {
            if (position_id && a.position_id !== position_id) return;
            /* duplicate guard: ayni position+candidate zaten var mi */
            var dup = entries.some(function (e) {
              return e.position_id === a.position_id && e.candidate_id === a.candidate_id;
            });
            if (!dup) entries.push(Object.assign({}, a));
          });
        }

        return entries;
      });
    },

    moveStage: function (candidate_id, position_id, stage) {
      var ov = readOverlay();
      ov.stageMoves = ov.stageMoves || {};
      ov.stageMoves[position_id + '|' + candidate_id] = stage;
      writeOverlay(ov);
      return Promise.resolve({ ok: true });
    },

    addToPipeline: function (candidate_id, position_id, stage) {
      stage = stage || 'basvuru';
      var ov = readOverlay();
      ov.added = ov.added || [];
      ov.removed = ov.removed || [];

      /* idempotent — eger zaten varsa no-op */
      var key = position_id + '|' + candidate_id;
      var alreadyAdded = ov.added.some(function (a) {
        return a.position_id === position_id && a.candidate_id === candidate_id;
      });
      if (alreadyAdded) {
        return Promise.resolve({ ok: true, duplicate: true });
      }
      /* removed listesinden cikar */
      ov.removed = ov.removed.filter(function (k) { return k !== key; });

      /* base pipeline'da varsa duplicate */
      return fetchJSON('pipeline').then(function (list) {
        var inBase = list.some(function (e) {
          return e.position_id === position_id && e.candidate_id === candidate_id;
        });
        if (inBase) {
          return { ok: true, duplicate: true };
        }
        ov.added.push({
          id: uid('pl-x-'),
          position_id: position_id,
          candidate_id: candidate_id,
          stage: stage,
          added_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        writeOverlay(ov);
        return { ok: true, duplicate: false };
      });
    },

    removeFromPipeline: function (candidate_id, position_id) {
      var ov = readOverlay();
      ov.added = ov.added || [];
      ov.removed = ov.removed || [];
      var key = position_id + '|' + candidate_id;

      /* Eger added listesinde ise direkt cikar */
      ov.added = ov.added.filter(function (a) {
        return !(a.position_id === position_id && a.candidate_id === candidate_id);
      });
      /* Base'de ise removed'a ekle */
      if (ov.removed.indexOf(key) < 0) ov.removed.push(key);

      /* stageMoves temizle */
      if (ov.stageMoves && ov.stageMoves[key]) {
        delete ov.stageMoves[key];
      }
      writeOverlay(ov);
      return Promise.resolve({ ok: true });
    },

    /* ── Notes ── (per-candidate, localStorage) */
    getNotes: function (candidate_id) {
      try {
        var raw = localStorage.getItem(LS_NOTES_PREFIX + candidate_id);
        return Promise.resolve(raw ? JSON.parse(raw) : []);
      } catch (e) {
        return Promise.resolve([]);
      }
    },

    addNote: function (candidate_id, body) {
      var clean = safeStr(body).trim();
      if (!clean) return Promise.reject(new Error('empty'));
      return API.getNotes(candidate_id).then(function (notes) {
        var note = {
          id: uid('nt-'),
          body: clean,
          created_at: new Date().toISOString()
        };
        notes.unshift(note);
        try {
          localStorage.setItem(LS_NOTES_PREFIX + candidate_id, JSON.stringify(notes));
        } catch (e) { /* ignore */ }
        return note;
      });
    },

    deleteNote: function (candidate_id, note_id) {
      return API.getNotes(candidate_id).then(function (notes) {
        var next = notes.filter(function (n) { return n.id !== note_id; });
        try {
          localStorage.setItem(LS_NOTES_PREFIX + candidate_id, JSON.stringify(next));
        } catch (e) { /* ignore */ }
        return { ok: true };
      });
    },

    /* ── Block (candidate level) ── */
    blockCandidate: function (candidate_id) {
      try {
        var raw = localStorage.getItem(LS_BLOCK_PREFIX + 'list');
        var list = raw ? JSON.parse(raw) : [];
        if (list.indexOf(candidate_id) < 0) list.push(candidate_id);
        localStorage.setItem(LS_BLOCK_PREFIX + 'list', JSON.stringify(list));
      } catch (e) { /* ignore */ }
      return Promise.resolve({ ok: true });
    },

    isBlocked: function (candidate_id) {
      try {
        var raw = localStorage.getItem(LS_BLOCK_PREFIX + 'list');
        var list = raw ? JSON.parse(raw) : [];
        return list.indexOf(candidate_id) >= 0;
      } catch (e) { return false; }
    },

    /* ── Messages (Sprint C stub) ── */
    getMessageThreads: function () {
      return fetchJSON('messages').catch(function () { return []; });
    },

    sendMessage: function (thread_id, body) {
      /* Sprint C'de gelistirilecek. Stub. */
      return Promise.resolve({ ok: true, thread_id: thread_id, body: safeStr(body) });
    },

    /* ── Campaigns (Sprint D stub) ── */
    getCampaigns: function () {
      return fetchJSON('campaigns').catch(function () { return []; });
    },

    /* ── Match helper expose ── */
    calcMatch: calcMatch,

    /* ── Cache reset (test) ── */
    _resetCache: function () {
      _cache = { candidates: null, positions: null, pipeline: null, threads: null, campaigns: null };
    },

    /* ── Mode flags ── */
    isDemoMode: isDemoMode
  };

  window.IK_DATA = API;
})();
