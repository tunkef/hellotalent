/* global */
/* ════════════════════════════════════════════════════════════════
   IK Data Adapter — Phase D (real-only)
   Demo data archive: data/_archive-demo-data-20260427/ (Phase D'den önce silindi)

   Real-only mode — demo branch kaldırıldı.
   Auth context guard: realMode() false → metod empty state / reject döner.
   SOLID:
     - SRP: tek sorumluluk = data fetch + cache (real Supabase).
     - DIP: UI sayfaları sadece IK_DATA public API'sini görür.
     - OCP: yeni metod imzası değişmeden eklenir.
   XSS-safe: hiçbir HTML stringi return etmez (textContent + DOM caller'da).
   localStorage namespace: ht_ik_* (block feature — candidate_blocked_companies
     tablosu Phase D scope dışı, backlog A11).
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ═══════ Config ═══════ */
  var LS_BLOCK_PREFIX = 'ht_ik_blocked_';

  /* Cache (memory only, sayfa lifecycle) */
  var _cache = {
    candidates: null,
    positions:  null,
    pipeline:   null,
    threads:    null
  };

  /* ═══════ Helpers ═══════ */

  /* realMode — Phase D: demo dosyalar silindi, real-only mode.
     Auth context yoksa false → UI empty state. */
  function realMode() {
    if (typeof window.HT !== 'object' || !window.HT.getSupa) return false;
    var supa = window.HT.getSupa();
    if (!supa) return false;
    if (!window.IK_SHELL || !window.IK_SHELL.ctx || !window.IK_SHELL.ctx.hr) return false;
    return true;
  }

  /* getSupa — realMode içinde çağır, null olmaz */
  function getSupa() {
    return window.HT.getSupa();
  }

  /* getCompanyId — hr_profiles.company_id (bigint) */
  function getCompanyId() {
    return (window.IK_SHELL && window.IK_SHELL.ctx && window.IK_SHELL.ctx.hr)
      ? window.IK_SHELL.ctx.hr.company_id
      : null;
  }

  /* getUserId — auth.uid() (uuid) */
  function getUserId() {
    return (window.IK_SHELL && window.IK_SHELL.ctx && window.IK_SHELL.ctx.user)
      ? window.IK_SHELL.ctx.user.id
      : null;
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

      if (!realMode()) {
        console.warn('[ik-data] searchCandidates: auth context yok, boş liste döndü');
        return Promise.resolve([]);
      }

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
    },

    getCandidate: function (id) {
      if (!realMode()) {
        console.warn('[ik-data] getCandidate: auth context yok');
        return Promise.resolve(null);
      }

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
    },

    /* ── Positions ── */
    getPositions: function () {
      if (!realMode()) {
        console.warn('[ik-data] getPositions: auth context yok');
        return Promise.resolve([]);
      }

      /* Real branch — positions tablosu, auth user'in pozisyonları
         positions.hr_profile_id = auth.uid() (docs/migrations/020_positions_table.sql line 6) */
      var supa = getSupa();
      var userId = getUserId();
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
    },

    _getPositionSync: function (id) {
      if (!_cache.positions) return null;
      return _cache.positions.find(function (p) { return p.id === id; }) || null;
    },

    /* ── Pipeline ── */
    getPipeline: function (position_id) {
      if (!realMode()) {
        console.warn('[ik-data] getPipeline: auth context yok');
        return Promise.resolve([]);
      }

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
    },

    moveStage: function (candidate_id, position_id, stage) {
      if (!realMode()) {
        return Promise.resolve({ ok: false, error: 'auth context yok' });
      }

      /* Real branch — hr_move_pipeline_stage(p_id uuid, p_stage pipeline_stage)
         (migration: 20260426012144, line 319-351)
         DIKKAT: p_id = candidate_pipeline_state.id (NOT candidate_id)
         Önce position+candidate ile lookup yapılır, sonra RPC çağrılır. */
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
          /* 2. stage güncelle */
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
    },

    addToPipeline: function (candidate_id, position_id, stage) {
      if (!realMode()) {
        return Promise.resolve({ ok: false, error: 'auth context yok' });
      }

      /* Real branch — hr_add_to_pipeline RPC
         (migration: 20260426012144, line 354-393)
         İmza: hr_add_to_pipeline(p_position_id bigint, p_candidate_id bigint,
                                  p_stage pipeline_stage DEFAULT 'yeni')
         Döner: { ok, duplicate, row } */
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
    },

    removeFromPipeline: function (candidate_id, position_id) {
      if (!realMode()) {
        return Promise.resolve({ ok: false, error: 'auth context yok' });
      }

      /* Real branch — RPC yok, direct DELETE candidate_pipeline_state
         (migration: 20260426012144, line 119-135 — delete policy: admin only)
         RLS siler, yetkisiz kullanıcı permission denied alır. */
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
    },

    /* ── Notes ── (per-candidate, Supabase real) */
    getNotes: function (candidate_id) {
      if (!realMode()) {
        console.warn('[ik-data] getNotes: auth context yok');
        return Promise.resolve([]);
      }

      /* Real branch — hr_list_notes RPC
         (migration: 20260426012144, line 428-459)
         İmza: hr_list_notes(p_candidate_id bigint)
         Döner: TABLE(id, candidate_id, position_id, author_id,
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
    },

    addNote: function (candidate_id, body) {
      if (!realMode()) {
        return Promise.reject(new Error('auth context yok'));
      }

      /* Real branch — hr_add_note RPC
         (migration: 20260426012144, line 396-425)
         İmza: hr_add_note(p_candidate_id bigint, p_position_id bigint, p_body text)
         DIKKAT: UI signature'ında position_id yok — IK_SHELL.getActivePositionId() ile al */
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
    },

    deleteNote: function (candidate_id, note_id) {
      if (!realMode()) {
        return Promise.resolve({ ok: false, error: 'auth context yok' });
      }

      /* Real branch — RPC yok, direct DELETE employer_candidate_notes
         (migration: 20260426012144, line 212-228 — delete policy: author veya admin)
         candidate_id parametre uyumu için tutulur (RLS yeterli, sadece note_id lazım) */
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
    },

    /* ── Block (candidate level) ──
       Backlog A11: real tablo candidate_blocked_companies var,
       Phase D scope dışı. Şimdilik localStorage kalır. */
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

    /* ═══════ Messages — Sprint C real ═══════
       RPC'ler (migration 053 + 054 + 055 + 057 verify edildi):
         get_company_message_threads(p_limit, p_offset)   → 055 final shape (8 col)
         get_message_thread(p_message_id)                 → 054 (item_id, sender, body, created_at, read_at)
         send_employer_message(...)                       → 031 (returns bigint message_id)
         send_employer_followup(p_message_id, p_body)     → 057 (returns bigint reply_id)
         mark_employer_replies_read(p_message_id)         → 054 (returns int count)

       NOT: sendMessage yeni thread başlatır (candidate_id + subject + body).
            replyToThread var olan thread'e yanıt ekler (message_id + body).
            Panel JS imza: getThread(message_id) — thread_id alias kaldırıldı. */

    getMessageThreads: function () {
      if (!realMode()) {
        console.warn('[ik-data] getMessageThreads: auth context yok');
        return Promise.resolve([]);
      }

      /* get_company_message_threads — mig 055 final shape
         Döner TABLE: message_id, candidate_id, candidate_name, subject,
                      last_body, last_sender, last_activity_at,
                      employer_read_at, unread_replies */
      var supa = getSupa();
      return (async function () {
        try {
          var res = await supa.rpc('get_company_message_threads', {
            p_limit:  50,
            p_offset: 0
          });
          if (res.error) {
            console.warn('[ik-data] getMessageThreads RPC error:', res.error.message);
            return [];
          }
          return res.data || [];
        } catch (e) {
          console.warn('[ik-data] getMessageThreads exception:', e && e.message);
          return [];
        }
      })();
    },

    /* getThread — p_message_id kullanır (thread_id değil, doğrudan employer_messages.id) */
    getThread: function (message_id) {
      if (!realMode()) {
        console.warn('[ik-data] getThread: auth context yok');
        return Promise.resolve(null);
      }

      /* get_message_thread — mig 054 final shape
         Döner TABLE: item_id, sender ('employer'|'candidate'), body, created_at, read_at
         Gönderen tip: 'employer' (root + employer follow-ups), 'candidate' (replies) */
      var supa = getSupa();
      return (async function () {
        try {
          var res = await supa.rpc('get_message_thread', {
            p_message_id: message_id
          });
          if (res.error) {
            console.warn('[ik-data] getThread RPC error:', res.error.message);
            return null;
          }
          /* Array passthrough — Panel JS sıralar ve render eder */
          return res.data || [];
        } catch (e) {
          console.warn('[ik-data] getThread exception:', e && e.message);
          return null;
        }
      })();
    },

    /* sendMessage — yeni thread başlatır (candidate_id + subject + body)
       Döner: bigint (yeni employer_messages.id)
       Mig 031, line 169-229: send_employer_message */
    sendMessage: function (candidate_id, subject, body, position_id, template_id) {
      if (!realMode()) {
        return Promise.reject(new Error('auth context yok'));
      }

      var cleanSubject = safeStr(subject).trim();
      var cleanBody    = safeStr(body).trim();
      if (!cleanBody)    return Promise.reject(new Error('body boş olamaz'));
      if (!cleanSubject) return Promise.reject(new Error('subject boş olamaz'));
      if (!candidate_id) return Promise.reject(new Error('candidate_id zorunlu'));

      var supa = getSupa();
      return (async function () {
        try {
          var res = await supa.rpc('send_employer_message', {
            p_candidate_id: candidate_id,
            p_subject:      cleanSubject,
            p_body:         cleanBody,
            p_position_id:  position_id  || null,
            p_template_id:  template_id  || null
          });
          if (res.error) {
            console.warn('[ik-data] sendMessage RPC error:', res.error.message);
            return { ok: false, error: res.error.message };
          }
          /* Döner bigint (yeni message id) */
          return { ok: true, message_id: res.data };
        } catch (e) {
          console.warn('[ik-data] sendMessage exception:', e && e.message);
          return { ok: false, error: e && e.message };
        }
      })();
    },

    /* replyToThread — var olan thread'e employer follow-up ekler
       Döner: bigint (yeni employer_message_replies.id)
       Mig 057 (auto-reactivate deleted thread) + mig 054 */
    replyToThread: function (message_id, body) {
      if (!realMode()) {
        return Promise.reject(new Error('auth context yok'));
      }

      var cleanBody = safeStr(body).trim();
      if (!cleanBody)  return Promise.reject(new Error('body boş olamaz'));
      if (!message_id) return Promise.reject(new Error('message_id zorunlu'));

      var supa = getSupa();
      return (async function () {
        try {
          var res = await supa.rpc('send_employer_followup', {
            p_message_id: message_id,
            p_body:       cleanBody
          });
          if (res.error) {
            console.warn('[ik-data] replyToThread RPC error:', res.error.message);
            return { ok: false, error: res.error.message };
          }
          /* Döner bigint (yeni reply id) */
          return { ok: true, reply_id: res.data };
        } catch (e) {
          console.warn('[ik-data] replyToThread exception:', e && e.message);
          return { ok: false, error: e && e.message };
        }
      })();
    },

    /* markThreadRead — candidate-side: employer follow-up'ları okundu işaretle
       Mig 054, line 130-164: mark_employer_replies_read(p_message_id) → int count
       NOT: Bu RPC candidate context içindir. İşveren paneli "okundu" işaretlemek
            için ayrı bir mekanizma gerekmez (işveren zaten gönderdi). */
    markThreadRead: function (message_id) {
      if (!realMode()) {
        return Promise.resolve({ ok: false, error: 'auth context yok' });
      }
      if (!message_id) return Promise.resolve({ ok: false, error: 'message_id zorunlu' });

      var supa = getSupa();
      return (async function () {
        try {
          var res = await supa.rpc('mark_employer_replies_read', {
            p_message_id: message_id
          });
          if (res.error) {
            console.warn('[ik-data] markThreadRead RPC error:', res.error.message);
            return { ok: false, error: res.error.message };
          }
          return { ok: true, count: res.data };
        } catch (e) {
          console.warn('[ik-data] markThreadRead exception:', e && e.message);
          return { ok: false, error: e && e.message };
        }
      })();
    },

    /* ═══════ Company — Sprint D real ═══════
       companies tablo schema (16 col, audit verify):
         company_name, slug, legal_name, logo_url, website_url,
         career_url, linkedin_url, industry, segment,
         short_description, is_active, created_at, updated_at,
         updated_by, archived_at, archived_by, metadata
       Şirket UPDATE: admin scope (RLS — employer_role = 'admin')
       link_employer_to_company RPC: onboarding akışı için (Phase D scope dışı) */

    getCompany: function () {
      if (!realMode()) {
        console.warn('[ik-data] getCompany: auth context yok');
        return Promise.resolve(null);
      }

      var supa      = getSupa();
      var companyId = getCompanyId();
      if (!companyId) {
        return Promise.resolve(null);
      }

      return (async function () {
        try {
          var res = await supa.from('companies')
            .select('*')
            .eq('id', companyId)
            .maybeSingle();
          if (res.error) {
            console.warn('[ik-data] getCompany error:', res.error.message);
            return null;
          }
          return res.data || null;
        } catch (e) {
          console.warn('[ik-data] getCompany exception:', e && e.message);
          return null;
        }
      })();
    },

    updateCompany: function (payload) {
      if (!realMode()) {
        return Promise.reject(new Error('auth context yok'));
      }
      if (!payload || typeof payload !== 'object') {
        return Promise.reject(new Error('payload zorunlu'));
      }

      var companyId = getCompanyId();
      if (!companyId) {
        return Promise.reject(new Error('company_id bulunamadı'));
      }

      /* Whitelist: companies tablosunda UPDATE'lenebilir alanlar
         (admin RLS scope — employer_role = 'admin')
         Kaldırılanlar: slug (otomatik), archived_*, updated_by (backend),
                        is_active (admin panel), metadata (raw) */
      var ALLOWED = [
        'company_name', 'legal_name', 'website_url', 'logo_url',
        'career_url', 'linkedin_url', 'industry', 'segment', 'short_description'
      ];
      var clean = {};
      ALLOWED.forEach(function (k) {
        if (payload[k] !== undefined) {
          clean[k] = safeStr(payload[k]).trim().slice(0, k === 'short_description' ? 500 : 200);
        }
      });

      if (!clean.company_name) {
        return Promise.reject(new Error('company_name zorunlu'));
      }

      var supa = getSupa();
      return (async function () {
        try {
          var res = await supa.from('companies')
            .update(clean)
            .eq('id', companyId);
          if (res.error) {
            console.warn('[ik-data] updateCompany error:', res.error.message);
            return { ok: false, error: res.error.message };
          }
          return { ok: true };
        } catch (e) {
          console.warn('[ik-data] updateCompany exception:', e && e.message);
          return { ok: false, error: e && e.message };
        }
      })();
    },

    /* ═══════ Team — Sprint D real ═══════
       RPC'ler (migration 037 verify edildi):
         get_employer_team_info()                    → JSON { success, plan, seat_limit,
                                                              seat_used, seats_available,
                                                              company_id, members[] }
         invite_team_member(p_email, p_role)         → JSON { success, invitation_id, email, role, message }
       Direct table:
         company_invitations.update({ status: 'cancelled' }).eq('id', invite_id)  (admin RLS)
         hr_profiles.update({ employer_role }).eq('id', member_id)                (admin RLS)
         hr_profiles.update({ company_id: null, team_id: null, employer_role: null }).eq('id', member_id) */

    getTeamMembers: function () {
      if (!realMode()) {
        console.warn('[ik-data] getTeamMembers: auth context yok');
        return Promise.resolve({ members: [], invites: [] });
      }

      /* get_employer_team_info — mig 037, line 116-172
         Döner JSON: { success, plan, seat_limit, seat_used,
                       seats_available, company_id, members[] }
         members[] shape: { id, email, display_name, employer_role, created_at } */
      var supa = getSupa();
      return (async function () {
        try {
          var res = await supa.rpc('get_employer_team_info');
          if (res.error) {
            console.warn('[ik-data] getTeamMembers RPC error:', res.error.message);
            return { members: [], invites: [] };
          }
          var data = res.data || {};
          if (!data.success) {
            console.warn('[ik-data] getTeamMembers: RPC success false —', data.error);
            return { members: [], invites: [] };
          }
          /* invites: company_invitations'dan ayrı çekilir — bu RPC yalnızca members döner.
             Phase D2 panel JS refactor'da invites sorgusu eklenecek.
             Şimdilik invites boş array (UI empty state gösterir). */
          return {
            members:         Array.isArray(data.members) ? data.members : [],
            invites:         [],
            plan:            data.plan            || 'free',
            seat_limit:      data.seat_limit      || 1,
            seat_used:       data.seat_used       || 0,
            seats_available: data.seats_available || 0
          };
        } catch (e) {
          console.warn('[ik-data] getTeamMembers exception:', e && e.message);
          return { members: [], invites: [] };
        }
      })();
    },

    inviteTeamMember: function (email, role) {
      if (!realMode()) {
        return Promise.reject(new Error('auth context yok'));
      }

      var cleanEmail = safeStr(email).trim().toLowerCase().slice(0, 120);
      var cleanRole  = safeStr(role || 'recruiter');

      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return Promise.reject(new Error('email geçersiz'));
      }
      if (['admin', 'recruiter', 'viewer'].indexOf(cleanRole) < 0) {
        return Promise.reject(new Error('role geçersiz'));
      }

      /* invite_team_member — mig 037, line 179-258
         İmza: invite_team_member(p_email text, p_role text DEFAULT 'recruiter')
         Döner JSON: { success, invitation_id, email, role, message }
                  | { success: false, error, plan, limit, used, pending } */
      var supa = getSupa();
      return (async function () {
        try {
          var res = await supa.rpc('invite_team_member', {
            p_email: cleanEmail,
            p_role:  cleanRole
          });
          if (res.error) {
            console.warn('[ik-data] inviteTeamMember RPC error:', res.error.message);
            return { ok: false, error: res.error.message };
          }
          var data = res.data || {};
          if (!data.success) {
            return { ok: false, error: data.error || 'Davet gönderilemedi' };
          }
          return { ok: true, invite: data };
        } catch (e) {
          console.warn('[ik-data] inviteTeamMember exception:', e && e.message);
          return { ok: false, error: e && e.message };
        }
      })();
    },

    cancelInvite: function (invite_id) {
      if (!realMode()) {
        return Promise.reject(new Error('auth context yok'));
      }
      if (!invite_id) return Promise.reject(new Error('invite_id zorunlu'));

      /* Direct UPDATE company_invitations — admin RLS
         (mig 029, line 163-168: ci_admin_update policy) */
      var supa = getSupa();
      return (async function () {
        try {
          var res = await supa.from('company_invitations')
            .update({ status: 'cancelled' })
            .eq('id', invite_id);
          if (res.error) {
            console.warn('[ik-data] cancelInvite error:', res.error.message);
            return { ok: false, error: res.error.message };
          }
          return { ok: true };
        } catch (e) {
          console.warn('[ik-data] cancelInvite exception:', e && e.message);
          return { ok: false, error: e && e.message };
        }
      })();
    },

    updateMemberRole: function (member_id, role) {
      if (!realMode()) {
        return Promise.reject(new Error('auth context yok'));
      }
      if (!member_id) return Promise.reject(new Error('member_id zorunlu'));
      if (['admin', 'recruiter', 'viewer'].indexOf(role) < 0) {
        return Promise.reject(new Error('role geçersiz'));
      }

      /* Direct UPDATE hr_profiles — admin RLS scope
         employer_role enum: 'admin' | 'recruiter' | 'viewer' */
      var supa = getSupa();
      return (async function () {
        try {
          var res = await supa.from('hr_profiles')
            .update({ employer_role: role })
            .eq('id', member_id);
          if (res.error) {
            console.warn('[ik-data] updateMemberRole error:', res.error.message);
            return { ok: false, error: res.error.message };
          }
          return { ok: true };
        } catch (e) {
          console.warn('[ik-data] updateMemberRole exception:', e && e.message);
          return { ok: false, error: e && e.message };
        }
      })();
    },

    removeMember: function (member_id) {
      if (!realMode()) {
        return Promise.reject(new Error('auth context yok'));
      }
      if (!member_id) return Promise.reject(new Error('member_id zorunlu'));

      /* "Çıkar" = company linkage sil (kullanıcı silinmez, sadece şirketten ayrılır)
         Direct UPDATE hr_profiles — admin RLS scope */
      var supa = getSupa();
      return (async function () {
        try {
          var res = await supa.from('hr_profiles')
            .update({ company_id: null, team_id: null, employer_role: null })
            .eq('id', member_id);
          if (res.error) {
            console.warn('[ik-data] removeMember error:', res.error.message);
            return { ok: false, error: res.error.message };
          }
          return { ok: true };
        } catch (e) {
          console.warn('[ik-data] removeMember exception:', e && e.message);
          return { ok: false, error: e && e.message };
        }
      })();
    },

    /* ═══════ Campaigns — yapım aşamasında ═══════
       Iyzico ödeme entegrasyonu MVP 2 sonrası.
       getCampaigns → boş array (UI empty state gösterir).
       Diğerleri → sentinel reject. */

    getCampaigns: function () {
      return Promise.resolve([]);
    },

    createCampaign: function () {
      return Promise.reject(new Error('campaigns_pending'));
    },

    updateCampaignStatus: function () {
      return Promise.reject(new Error('campaigns_pending'));
    },

    archiveCampaign: function () {
      return Promise.reject(new Error('campaigns_pending'));
    },

    /* ═══════ Settings — Sprint D real ═══════
       hr_profiles tablosu — notify_email_newsletter tek backend column (verify).
       Granular toggle'lar (notify_msg, notify_pipeline, notify_weekly) backend'de
       henüz yok — A10 mini migration backlog. UI gösterir ama disabled.
       getSettings: userId ile hr_profiles.maybeSingle() */

    getSettings: function () {
      if (!realMode()) {
        console.warn('[ik-data] getSettings: auth context yok');
        return Promise.resolve({ notify_email_newsletter: true });
      }

      var supa   = getSupa();
      var userId = getUserId();
      return (async function () {
        try {
          var res = await supa.from('hr_profiles')
            .select('notify_email_newsletter, plan, onboarding_completed')
            .eq('id', userId)
            .maybeSingle();
          if (res.error) {
            console.warn('[ik-data] getSettings error:', res.error.message);
            return { notify_email_newsletter: true };
          }
          return res.data || { notify_email_newsletter: true };
        } catch (e) {
          console.warn('[ik-data] getSettings exception:', e && e.message);
          return { notify_email_newsletter: true };
        }
      })();
    },

    updateSettings: function (patch) {
      if (!realMode()) {
        return Promise.reject(new Error('auth context yok'));
      }
      patch = patch || {};

      /* Whitelist: sadece notify_email_newsletter (tek backend column).
         Granular toggle'lar A10 sonrası aktif. */
      var update = {};
      if (typeof patch.notify_email_newsletter === 'boolean') {
        update.notify_email_newsletter = patch.notify_email_newsletter;
      }

      if (Object.keys(update).length === 0) {
        return Promise.resolve({ ok: true });
      }

      var supa   = getSupa();
      var userId = getUserId();
      return (async function () {
        try {
          var res = await supa.from('hr_profiles')
            .update(update)
            .eq('id', userId);
          if (res.error) {
            console.warn('[ik-data] updateSettings error:', res.error.message);
            return { ok: false, error: res.error.message };
          }
          return { ok: true };
        } catch (e) {
          console.warn('[ik-data] updateSettings exception:', e && e.message);
          return { ok: false, error: e && e.message };
        }
      })();
    },

    /* ═══════ Account lifecycle — KVKK md.11 — yapım aşamasında ═══════
       Backend retention policy + cron purge yapılmadı (A8 backlog).
       UI bu butonlara tıklanırsa "Yapım aşamasında" toast gösterir (Phase D2). */

    getAccountStatus: function () {
      return Promise.resolve({ status: 'active' });
    },

    freezeAccount: function () {
      return Promise.reject(new Error('account_lifecycle_pending'));
    },

    unfreezeAccount: function () {
      return Promise.reject(new Error('account_lifecycle_pending'));
    },

    deleteAccount: function () {
      return Promise.reject(new Error('account_lifecycle_pending'));
    },

    /* ═══════ Sprint D — Match helper expose ═══════ */
    calcMatch: calcMatch,

    /* ── Cache reset (test) ── */
    _resetCache: function () {
      _cache = { candidates: null, positions: null, pipeline: null, threads: null };
    }
  };

  window.IK_DATA = API;
})();
