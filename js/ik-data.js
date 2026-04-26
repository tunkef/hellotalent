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
  var LS_MESSAGES_OVERLAY = 'ht_ik_messages_state';
  /* Sprint D — Sirket / Ekip / Kampanyalar / Ayarlar */
  var LS_COMPANY_OVERLAY = 'ht_ik_company_state';
  var LS_TEAM_OVERLAY = 'ht_ik_team_state';
  var LS_CAMPAIGNS_OVERLAY = 'ht_ik_campaigns_state';
  var LS_SETTINGS_OVERLAY = 'ht_ik_settings_state';
  var LS_ACCOUNT_OVERLAY = 'ht_ik_account_state';

  /* Cache (memory only, sayfa lifecycle) */
  var _cache = {
    candidates: null,
    positions: null,
    pipeline: null,
    threads: null,
    campaigns: null
  };

  /* ═══════ Helpers ═══════ */

  /* realMode: tum kosullari kontrol eder —
       1. IK_REAL_MODE_ENABLED flag
       2. window.HT.getSupa singleton
       3. IK_SHELL.ctx.hr (auth tamamlanmis)
     Herhangi biri eksikse demo path calisir. */
  function realMode() {
    if (!window.IK_REAL_MODE_ENABLED) return false;
    if (typeof window.HT !== 'object' || !window.HT.getSupa) return false;
    var supa = window.HT.getSupa();
    if (!supa) return false;
    if (!window.IK_SHELL || !window.IK_SHELL.ctx || !window.IK_SHELL.ctx.hr) return false;
    return true;
  }

  /* getSupa — realMode icinde cagir, null olmaz */
  function getSupa() {
    return window.HT.getSupa();
  }

  /* getCompanyId — hr_profiles.company_id (bigint) */
  function getCompanyId() {
    return (window.IK_SHELL && window.IK_SHELL.ctx && window.IK_SHELL.ctx.hr)
      ? window.IK_SHELL.ctx.hr.company_id
      : null;
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

  /* Messages overlay (Sprint C) */
  function readMessagesOverlay() {
    try {
      var raw = localStorage.getItem(LS_MESSAGES_OVERLAY);
      return raw ? JSON.parse(raw) : { sent: {}, read: {} };
    } catch (e) {
      return { sent: {}, read: {} };
    }
  }
  function writeMessagesOverlay(state) {
    try {
      localStorage.setItem(LS_MESSAGES_OVERLAY, JSON.stringify(state || {}));
    } catch (e) {
      console.warn('[ik-data] messages overlay write fail:', e && e.message);
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

      if (realMode()) {
        /* Real branch — search_employer_candidates RPC
           (migration: 20260404092358_search_rpc_new_fields.sql, line 31-38)
           p_filters: UI filters object → JSONB shape:
             aktifArayanlar, sehir, expMin, expMax,
             pozisyon[], segment[], musait[], calisma[], egitim[], dil[]
           Sort mapping: UI key → RPC p_sort value */
        var supa = getSupa();
        var companyId = getCompanyId();

        var sortMap = {
          'match':      'relevance',
          'recent':     'newest',
          'experience': 'exp_desc',
          'name':       'name'  /* Phase C.5 — RPC name sort eklendi (mig 20260426093050) */
        };
        var pSort = sortMap[filters.sort || 'match'] || 'relevance';

        /* UI filters → JSONB shape */
        var pFilters = {};
        if (filters.search && String(filters.search).trim()) {
          pFilters.search = String(filters.search).trim();  /* Phase C.5 — text search RPC eklendi (mig 20260426093050) */
        }
        if (filters.aktifArayanlar) pFilters.aktifArayanlar = true;
        if (filters.city)      pFilters.sehir    = filters.city;
        if (filters.expMin != null) pFilters.expMin = filters.expMin;
        if (filters.expMax != null) pFilters.expMax = filters.expMax;
        if (Array.isArray(filters.pozisyon) && filters.pozisyon.length)  pFilters.pozisyon = filters.pozisyon;
        else if (filters.position) pFilters.pozisyon = [filters.position];
        if (Array.isArray(filters.segment)  && filters.segment.length)   pFilters.segment  = filters.segment;
        else if (filters.segment) pFilters.segment = [filters.segment];
        if (Array.isArray(filters.musait)   && filters.musait.length)    pFilters.musait   = filters.musait;
        else if (filters.musaitlik) pFilters.musait = [filters.musaitlik];
        if (Array.isArray(filters.calisma)  && filters.calisma.length)   pFilters.calisma  = filters.calisma;
        if (Array.isArray(filters.egitim)   && filters.egitim.length)    pFilters.egitim   = filters.egitim;
        if (Array.isArray(filters.dil)      && filters.dil.length)       pFilters.dil      = filters.dil;

        return (async function () {
          try {
            var res = await supa.rpc('search_employer_candidates', {
              p_filters:             pFilters,
              p_employer_company_id: companyId,
              p_sort:                pSort,
              p_limit:               filters.limit  || 50,
              p_offset:              filters.offset || 0,
              p_position_id:         position_id    || null
            });
            if (res.error) {
              console.warn('[ik-data] searchCandidates RPC error:', res.error.message);
              return [];
            }
            /* RPC doner: { total, candidates: [...] } — candidates array passthrough */
            var data = res.data || {};
            return Array.isArray(data.candidates) ? data.candidates : [];
          } catch (e) {
            console.warn('[ik-data] searchCandidates exception:', e && e.message);
            return [];
          }
        })();
      }

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
      if (realMode()) {
        /* Real branch — direct SELECT candidates (CLAUDE.md: maybeSingle zorunlu) */
        var supa = getSupa();
        return (async function () {
          try {
            var res = await supa.from('candidates')
              .select('*')
              .eq('id', id)
              .maybeSingle();
            if (res.error) {
              console.warn('[ik-data] getCandidate error:', res.error.message);
              return null;
            }
            return res.data || null;
          } catch (e) {
            console.warn('[ik-data] getCandidate exception:', e && e.message);
            return null;
          }
        })();
      }

      return fetchJSON('candidates').then(function (list) {
        var hit = list.find(function (c) { return c.id === id; });
        return hit ? Object.assign({}, hit) : null;
      });
    },

    /* ── Positions ── */
    getPositions: function () {
      if (realMode()) {
        /* Real branch — positions tablosu, auth user'in pozisyonlari
           positions.hr_profile_id = auth.uid() (docs/migrations/020_positions_table.sql line 6) */
        var supa = getSupa();
        var userId = window.IK_SHELL.ctx.user.id;
        return (async function () {
          try {
            var res = await supa.from('positions')
              .select('*')
              .eq('hr_profile_id', userId);
            if (res.error) {
              console.warn('[ik-data] getPositions error:', res.error.message);
              return [];
            }
            var list = res.data || [];
            _cache.positions = list;
            return list;
          } catch (e) {
            console.warn('[ik-data] getPositions exception:', e && e.message);
            return [];
          }
        })();
      }

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
      if (realMode()) {
        /* Real branch — hr_get_pipeline RPC
           (migration: 20260426012144, line 283-316)
           RETURNS TABLE: id, position_id, candidate_id, stage,
                          added_at, updated_at, candidate_name,
                          candidate_pozisyon, candidate_sehir */
        var supa = getSupa();
        return (async function () {
          try {
            var res = await supa.rpc('hr_get_pipeline', {
              p_position_id: position_id
            });
            if (res.error) {
              console.warn('[ik-data] getPipeline RPC error:', res.error.message);
              return [];
            }
            return res.data || [];
          } catch (e) {
            console.warn('[ik-data] getPipeline exception:', e && e.message);
            return [];
          }
        })();
      }

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
      if (realMode()) {
        /* Real branch — hr_move_pipeline_stage(p_id uuid, p_stage pipeline_stage)
           (migration: 20260426012144, line 319-351)
           DIKKAT: p_id = candidate_pipeline_state.id (NOT candidate_id)
           Once position+candidate ile lookup yapilir, sonra RPC cagrilir. */
        var supa = getSupa();
        return (async function () {
          try {
            /* 1. pipeline_state.id lookup */
            var lookup = await supa.from('candidate_pipeline_state')
              .select('id')
              .match({ position_id: position_id, candidate_id: candidate_id })
              .maybeSingle();
            if (lookup.error) {
              console.warn('[ik-data] moveStage lookup error:', lookup.error.message);
              return { ok: false, error: lookup.error.message };
            }
            if (!lookup.data) {
              return { ok: false, error: 'not in pipeline' };
            }
            /* 2. stage guncelle */
            var res = await supa.rpc('hr_move_pipeline_stage', {
              p_id:    lookup.data.id,
              p_stage: stage
            });
            if (res.error) {
              console.warn('[ik-data] moveStage RPC error:', res.error.message);
              return { ok: false, error: res.error.message };
            }
            return res.data || { ok: true };
          } catch (e) {
            console.warn('[ik-data] moveStage exception:', e && e.message);
            return { ok: false, error: e && e.message };
          }
        })();
      }

      var ov = readOverlay();
      ov.stageMoves = ov.stageMoves || {};
      ov.stageMoves[position_id + '|' + candidate_id] = stage;
      writeOverlay(ov);
      return Promise.resolve({ ok: true });
    },

    addToPipeline: function (candidate_id, position_id, stage) {
      if (realMode()) {
        /* Real branch — hr_add_to_pipeline RPC
           (migration: 20260426012144, line 354-393)
           Imza: hr_add_to_pipeline(p_position_id bigint, p_candidate_id bigint,
                                    p_stage pipeline_stage DEFAULT 'yeni')
           DIKKAT: demo'da stage default 'basvuru', real'de 'yeni' (Sprint 7 ENUM)
           Doner: { ok, duplicate, row } */
        var supa = getSupa();
        var pStage = stage || 'yeni';
        return (async function () {
          try {
            var res = await supa.rpc('hr_add_to_pipeline', {
              p_position_id:  position_id,
              p_candidate_id: candidate_id,
              p_stage:        pStage
            });
            if (res.error) {
              console.warn('[ik-data] addToPipeline RPC error:', res.error.message);
              return { ok: false, error: res.error.message };
            }
            return res.data || { ok: true };
          } catch (e) {
            console.warn('[ik-data] addToPipeline exception:', e && e.message);
            return { ok: false, error: e && e.message };
          }
        })();
      }

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
      if (realMode()) {
        /* Real branch — RPC yok, direct DELETE candidate_pipeline_state
           (migration: 20260426012144, line 119-135 — delete policy: admin only)
           RLS siler, yetkisiz kullanici permission denied alir. */
        var supa = getSupa();
        return (async function () {
          try {
            var res = await supa.from('candidate_pipeline_state')
              .delete()
              .match({ position_id: position_id, candidate_id: candidate_id });
            if (res.error) {
              console.warn('[ik-data] removeFromPipeline error:', res.error.message);
              return { ok: false, error: res.error.message };
            }
            return { ok: true };
          } catch (e) {
            console.warn('[ik-data] removeFromPipeline exception:', e && e.message);
            return { ok: false, error: e && e.message };
          }
        })();
      }

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

    /* ── Notes ── (per-candidate, localStorage demo / Supabase real) */
    getNotes: function (candidate_id) {
      if (realMode()) {
        /* Real branch — hr_list_notes RPC
           (migration: 20260426012144, line 428-459)
           Imza: hr_list_notes(p_candidate_id bigint)
           Doner: TABLE(id, candidate_id, position_id, author_id,
                        author_name, body, created_at, updated_at) */
        var supa = getSupa();
        return (async function () {
          try {
            var res = await supa.rpc('hr_list_notes', {
              p_candidate_id: candidate_id
            });
            if (res.error) {
              console.warn('[ik-data] getNotes RPC error:', res.error.message);
              return [];
            }
            return res.data || [];
          } catch (e) {
            console.warn('[ik-data] getNotes exception:', e && e.message);
            return [];
          }
        })();
      }

      try {
        var raw = localStorage.getItem(LS_NOTES_PREFIX + candidate_id);
        return Promise.resolve(raw ? JSON.parse(raw) : []);
      } catch (e) {
        return Promise.resolve([]);
      }
    },

    addNote: function (candidate_id, body) {
      if (realMode()) {
        /* Real branch — hr_add_note RPC
           (migration: 20260426012144, line 396-425)
           Imza: hr_add_note(p_candidate_id bigint, p_position_id bigint, p_body text)
           DIKKAT: UI signature'inda position_id yok — IK_SHELL.getActivePositionId() ile al */
        var supa = getSupa();
        var clean = safeStr(body).trim();
        if (!clean) return Promise.reject(new Error('empty'));
        var pos_id = (window.IK_SHELL && window.IK_SHELL.getActivePositionId)
          ? window.IK_SHELL.getActivePositionId()
          : null;
        return (async function () {
          try {
            var res = await supa.rpc('hr_add_note', {
              p_candidate_id: candidate_id,
              p_position_id:  pos_id,
              p_body:         clean
            });
            if (res.error) {
              console.warn('[ik-data] addNote RPC error:', res.error.message);
              return { ok: false, error: res.error.message };
            }
            return res.data || { ok: true };
          } catch (e) {
            console.warn('[ik-data] addNote exception:', e && e.message);
            return { ok: false, error: e && e.message };
          }
        })();
      }

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
      if (realMode()) {
        /* Real branch — RPC yok, direct DELETE employer_candidate_notes
           (migration: 20260426012144, line 212-228 — delete policy: author veya admin)
           candidate_id parametre uyumu icin tutulur (RLS yeterli, sadece note_id lazim) */
        var supa = getSupa();
        return (async function () {
          try {
            var res = await supa.from('employer_candidate_notes')
              .delete()
              .eq('id', note_id);
            if (res.error) {
              console.warn('[ik-data] deleteNote error:', res.error.message);
              return { ok: false, error: res.error.message };
            }
            return { ok: true };
          } catch (e) {
            console.warn('[ik-data] deleteNote exception:', e && e.message);
            return { ok: false, error: e && e.message };
          }
        })();
      }

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

    /* ═══════ Messages — Sprint C ═══════
       Demo: messages.json fetch + localStorage overlay.
       Overlay schema:
         { sent: { [thread_id]: [Msg] },
           read: { [thread_id]: true },
           unreadDelta: { [thread_id]: number } }  // negative deltas
       sendMessage → optimistic UI: returns inserted message immediately. */
    getMessageThreads: function () {
      return fetchJSON('messages').then(function (list) {
        var ov = readMessagesOverlay();
        var out = (list || []).map(function (t) {
          var clone = Object.assign({}, t);
          clone.messages = (t.messages || []).slice();
          var sent = (ov.sent && ov.sent[t.id]) || [];
          if (sent.length) {
            clone.messages = clone.messages.concat(sent);
            var lastSent = sent[sent.length - 1];
            clone.last_message = lastSent.body;
            clone.last_message_at = lastSent.sent_at;
          }
          if (ov.read && ov.read[t.id]) {
            clone.unread_count = 0;
          }
          return clone;
        }).sort(function (a, b) {
          return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
        });
        return out;
      }).catch(function () { return []; });
    },

    getThread: function (thread_id) {
      return API.getMessageThreads().then(function (list) {
        var hit = (list || []).find(function (t) { return t.id === thread_id; });
        return hit ? Object.assign({}, hit, {
          messages: (hit.messages || []).slice()
        }) : null;
      });
    },

    sendMessage: function (thread_id, body) {
      var clean = safeStr(body).trim();
      if (!clean) return Promise.reject(new Error('empty'));
      if (!thread_id) return Promise.reject(new Error('thread_id required'));

      var msg = {
        id: uid('m-x-'),
        from: 'hr',
        body: clean,
        sent_at: new Date().toISOString()
      };

      var ov = readMessagesOverlay();
      ov.sent = ov.sent || {};
      ov.sent[thread_id] = ov.sent[thread_id] || [];
      ov.sent[thread_id].push(msg);
      writeMessagesOverlay(ov);

      return Promise.resolve({ ok: true, message: msg });
    },

    markThreadRead: function (thread_id) {
      if (!thread_id) return Promise.resolve({ ok: false });
      var ov = readMessagesOverlay();
      ov.read = ov.read || {};
      ov.read[thread_id] = true;
      writeMessagesOverlay(ov);
      return Promise.resolve({ ok: true });
    },

    /* ═══════ Company — Sprint D ═══════
       Demo: hr_profiles + companies join stub.
       updateCompany → localStorage overlay (real Supabase MVP 2'de). */
    getCompany: function () {
      var ov = readJSON(LS_COMPANY_OVERLAY, null);
      if (ov) return Promise.resolve(ov);

      /* Default demo company (signup'tan gelir) */
      var demo = {
        id: 'co-demo-1',
        name: 'Demo Perakende A.Ş.',
        website: '',
        sector: '',
        region: '',
        about: '',
        brands: [],
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        contact_role: '',
        updated_at: new Date().toISOString()
      };
      return Promise.resolve(demo);
    },

    updateCompany: function (payload) {
      if (!payload || typeof payload !== 'object') {
        return Promise.reject(new Error('payload required'));
      }
      var clean = {
        id: safeStr(payload.id || 'co-demo-1'),
        name: safeStr(payload.name).trim().slice(0, 120),
        website: safeStr(payload.website).trim().slice(0, 200),
        sector: safeStr(payload.sector).slice(0, 40),
        region: safeStr(payload.region).slice(0, 40),
        about: safeStr(payload.about).slice(0, 500),
        brands: Array.isArray(payload.brands)
          ? payload.brands.filter(function (b) { return safeStr(b).trim(); })
              .map(function (b) { return safeStr(b).trim().slice(0, 60); })
              .slice(0, 30)
          : [],
        contact_name: safeStr(payload.contact_name).trim().slice(0, 80),
        contact_email: safeStr(payload.contact_email).trim().slice(0, 120),
        contact_phone: safeStr(payload.contact_phone).trim().slice(0, 30),
        contact_role: safeStr(payload.contact_role).trim().slice(0, 80),
        updated_at: new Date().toISOString()
      };
      if (!clean.name) {
        return Promise.reject(new Error('name required'));
      }
      writeJSON(LS_COMPANY_OVERLAY, clean);
      return Promise.resolve({ ok: true, company: clean });
    },

    /* ═══════ Team — Sprint D ═══════
       Demo: kendi hesabin admin + invite/role stubs (localStorage).
       Members her zaman default self icerir, invites overlay'den gelir. */
    getTeamMembers: function () {
      var ctx = (window.IK_SHELL && window.IK_SHELL.ctx) || {};
      var name = (ctx.hr && ctx.hr.full_name) ||
                 (ctx.user && ctx.user.email && ctx.user.email.split('@')[0]) ||
                 'Demo Hesap';
      var email = (ctx.user && ctx.user.email) || 'demo@hellotalent.ai';
      var defaultSelf = {
        id: 'tm-self',
        name: name,
        email: email,
        role: 'admin',
        status: 'active',
        last_active: new Date().toISOString(),
        is_self: true
      };

      var ov = readJSON(LS_TEAM_OVERLAY, { members: [], invites: [] });
      var members = Array.isArray(ov.members) && ov.members.length
        ? ov.members.slice()
        : [defaultSelf];
      var invites = Array.isArray(ov.invites) ? ov.invites.slice() : [];

      return Promise.resolve({ members: members, invites: invites });
    },

    inviteTeamMember: function (email, role, name) {
      var cleanEmail = safeStr(email).trim().toLowerCase().slice(0, 120);
      var cleanRole = safeStr(role || 'recruiter');
      var cleanName = safeStr(name).trim().slice(0, 80);

      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return Promise.reject(new Error('email invalid'));
      }
      if (['admin', 'recruiter', 'viewer'].indexOf(cleanRole) < 0) {
        return Promise.reject(new Error('role invalid'));
      }

      var ov = readJSON(LS_TEAM_OVERLAY, { members: [], invites: [] });
      ov.invites = ov.invites || [];

      /* Duplicate email guard */
      var dup = ov.invites.some(function (i) { return i.email === cleanEmail; });
      if (dup) {
        return Promise.reject(new Error('duplicate'));
      }

      var invite = {
        id: uid('tmi-'),
        email: cleanEmail,
        name: cleanName,
        role: cleanRole,
        status: 'pending',
        invited_at: new Date().toISOString()
      };
      ov.invites.push(invite);
      writeJSON(LS_TEAM_OVERLAY, ov);
      return Promise.resolve({ ok: true, invite: invite });
    },

    cancelInvite: function (invite_id) {
      if (!invite_id) return Promise.reject(new Error('invite_id required'));
      var ov = readJSON(LS_TEAM_OVERLAY, { members: [], invites: [] });
      ov.invites = (ov.invites || []).filter(function (i) { return i.id !== invite_id; });
      writeJSON(LS_TEAM_OVERLAY, ov);
      return Promise.resolve({ ok: true });
    },

    updateMemberRole: function (member_id, role) {
      if (!member_id) return Promise.reject(new Error('member_id required'));
      if (['admin', 'recruiter', 'viewer'].indexOf(role) < 0) {
        return Promise.reject(new Error('role invalid'));
      }
      var ov = readJSON(LS_TEAM_OVERLAY, { members: [], invites: [] });
      ov.members = (ov.members || []).map(function (m) {
        if (m.id === member_id) {
          return Object.assign({}, m, { role: role, updated_at: new Date().toISOString() });
        }
        return m;
      });
      writeJSON(LS_TEAM_OVERLAY, ov);
      return Promise.resolve({ ok: true });
    },

    removeMember: function (member_id) {
      if (!member_id) return Promise.reject(new Error('member_id required'));
      var ov = readJSON(LS_TEAM_OVERLAY, { members: [], invites: [] });
      ov.members = (ov.members || []).filter(function (m) {
        return m.id !== member_id || m.is_self === true; /* self silinmez */
      });
      writeJSON(LS_TEAM_OVERLAY, ov);
      return Promise.resolve({ ok: true });
    },

    /* ═══════ Campaigns — Sprint D ═══════
       Demo: campaigns.json + localStorage overlay (status + new). */
    getCampaigns: function () {
      return fetchJSON('campaigns').then(function (list) {
        var base = (list || []).map(function (c) { return Object.assign({}, c); });
        var ov = readJSON(LS_CAMPAIGNS_OVERLAY, { added: [], statusOverride: {}, removed: [] });

        /* Status override */
        if (ov.statusOverride) {
          base = base.map(function (c) {
            if (ov.statusOverride[c.id]) {
              return Object.assign({}, c, { status: ov.statusOverride[c.id], updated_at: new Date().toISOString() });
            }
            return c;
          });
        }

        /* Removed filter */
        if (ov.removed && ov.removed.length) {
          base = base.filter(function (c) { return ov.removed.indexOf(c.id) < 0; });
        }

        /* Added (yeni kampanya) */
        if (ov.added && ov.added.length) {
          ov.added.forEach(function (a) {
            if (!base.some(function (c) { return c.id === a.id; })) {
              base.push(Object.assign({}, a));
            }
          });
        }

        /* Sort: created_at desc */
        base.sort(function (a, b) {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        return base;
      }).catch(function () { return []; });
    },

    createCampaign: function (payload) {
      payload = payload || {};
      var clean = {
        id: uid('cmp-x-'),
        title: safeStr(payload.title).trim().slice(0, 100),
        status: 'draft',
        created_at: new Date().toISOString(),
        filter_summary: safeStr(payload.filter_summary).slice(0, 200),
        target_count: parseInt(payload.target_count, 10) || 0,
        sent_count: 0,
        opened_count: 0,
        replied_count: 0
      };
      if (!clean.title) {
        return Promise.reject(new Error('title required'));
      }
      var ov = readJSON(LS_CAMPAIGNS_OVERLAY, { added: [], statusOverride: {}, removed: [] });
      ov.added = ov.added || [];
      ov.added.push(clean);
      writeJSON(LS_CAMPAIGNS_OVERLAY, ov);
      return Promise.resolve({ ok: true, campaign: clean });
    },

    updateCampaignStatus: function (id, status) {
      if (!id) return Promise.reject(new Error('id required'));
      if (['draft', 'scheduled', 'sent', 'archived'].indexOf(status) < 0) {
        return Promise.reject(new Error('status invalid'));
      }
      var ov = readJSON(LS_CAMPAIGNS_OVERLAY, { added: [], statusOverride: {}, removed: [] });
      ov.statusOverride = ov.statusOverride || {};
      ov.statusOverride[id] = status;
      writeJSON(LS_CAMPAIGNS_OVERLAY, ov);
      return Promise.resolve({ ok: true });
    },

    archiveCampaign: function (id) {
      return API.updateCampaignStatus(id, 'archived');
    },

    /* ═══════ Settings — Sprint D ═══════
       Demo: tema + bildirim toggle persist (localStorage). */
    getSettings: function () {
      return Promise.resolve(readJSON(LS_SETTINGS_OVERLAY, {
        theme: 'system',
        notify_msg: true,
        notify_pipeline: true,
        notify_weekly: false
      }));
    },

    updateSettings: function (patch) {
      patch = patch || {};
      var current = readJSON(LS_SETTINGS_OVERLAY, {
        theme: 'system',
        notify_msg: true,
        notify_pipeline: true,
        notify_weekly: false
      });
      if (typeof patch.theme === 'string' &&
          ['light', 'dark', 'system'].indexOf(patch.theme) >= 0) {
        current.theme = patch.theme;
      }
      ['notify_msg', 'notify_pipeline', 'notify_weekly'].forEach(function (k) {
        if (typeof patch[k] === 'boolean') current[k] = patch[k];
      });
      writeJSON(LS_SETTINGS_OVERLAY, current);
      return Promise.resolve({ ok: true, settings: current });
    },

    /* ═══════ Account lifecycle — KVKK md.11 ═══════ */
    getAccountStatus: function () {
      return Promise.resolve(readJSON(LS_ACCOUNT_OVERLAY, {
        status: 'active', /* active | frozen | pending_deletion */
        deletion_scheduled_at: null,
        frozen_at: null
      }));
    },

    freezeAccount: function () {
      var current = readJSON(LS_ACCOUNT_OVERLAY, {});
      current.status = 'frozen';
      current.frozen_at = new Date().toISOString();
      current.deletion_scheduled_at = null;
      writeJSON(LS_ACCOUNT_OVERLAY, current);
      return Promise.resolve({ ok: true, status: 'frozen' });
    },

    unfreezeAccount: function () {
      var current = readJSON(LS_ACCOUNT_OVERLAY, {});
      current.status = 'active';
      current.frozen_at = null;
      current.deletion_scheduled_at = null;
      writeJSON(LS_ACCOUNT_OVERLAY, current);
      return Promise.resolve({ ok: true, status: 'active' });
    },

    deleteAccount: function () {
      /* KVKK md.11 — 30 gun grace period */
      var when = new Date();
      when.setDate(when.getDate() + 30);
      var current = readJSON(LS_ACCOUNT_OVERLAY, {});
      current.status = 'pending_deletion';
      current.deletion_scheduled_at = when.toISOString();
      writeJSON(LS_ACCOUNT_OVERLAY, current);
      return Promise.resolve({ ok: true, status: 'pending_deletion', scheduled: when.toISOString() });
    },

    /* ═══════ Sprint D — Match helper expose ═══════ */
    calcMatch: calcMatch,

    /* ── Cache reset (test) ── */
    _resetCache: function () {
      _cache = { candidates: null, positions: null, pipeline: null, threads: null, campaigns: null, messages: null };
    },

    /* ── Mode flags ── */
    isDemoMode: isDemoMode
  };

  /* ═══════ Generic JSON localStorage helpers (Sprint D) ═══════ */
  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : (fallback != null ? fallback : null);
    } catch (e) {
      return fallback != null ? fallback : null;
    }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value || null));
    } catch (e) {
      console.warn('[ik-data] write fail:', key, e && e.message);
    }
  }

  window.IK_DATA = API;
})();
