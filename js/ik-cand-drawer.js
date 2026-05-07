/* global IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Candidate Drawer — 7 May refactor v2 (profil-preview.js reuse)

   Aday tarafındaki "İşverenlerin gördüğü profil" drawer'ının aynısını
   HR tarafında kart click'inde açar. profil-preview.js olduğu gibi
   reuse edilir; bu modül adapter görevi görür:
     1. getCandidate(id) ile aday data fetch
     2. profile-shape'ine map (db.profile, db.experiences, ...)
     3. globals stub (_loadedDBData, currentUser, calculateCompletion, ...)
     4. window.openProfilePreview() çağır

   Public API:
     window._htOpenCandidateDrawer(candidateId)
     window._htCloseCandidateDrawer()
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var _state = { isOpen: false, candidateId: null };

  function track(name, props) {
    if (!window.posthog) return;
    try { window.posthog.capture(name, props || {}); } catch (e) {}
  }

  /* ═══════ CAREER_TYPE_LABELS — profil-ui.js sabit kopyası
     (preview tercihler section'ında kullanılıyor) ═══════ */
  var CAREER_TYPE_LABELS = {
    'mavi_yaka':   'Saha (Mavi yaka)',
    'beyaz_yaka':  'Ofis (Beyaz yaka)',
    'mavi_beyaz':  'Hibrit (Mavi/Beyaz)',
    'ust_duzey':   'Üst düzey'
  };

  /* ═══════ Map: candidate (search_employer_candidates shape) → _loadedDBData ═══════ */
  function mapCandidateToProfileShape(c) {
    if (!c) return null;

    /* Experiences — preview iste exp.pozisyon, marka, sirket_adi, rol_ailesi,
       istihdam_tipi, baslangic_yil/ay, bitis_yil/ay, devam_ediyor, description */
    var experiences = (Array.isArray(c.experiences) ? c.experiences : []).map(function (e) {
      return {
        pozisyon:       e.pozisyon || e.title || e.role || '',
        marka:          e.marka || e.brand || '',
        sirket_adi:     e.sirket || e.sirket_adi || e.company || '',
        rol_ailesi:     e.rol_ailesi || e.department || '',
        istihdam_tipi:  e.istihdam_tipi || e.employment_type || e.tam_zamanli || '',
        baslangic_yil:  e.baslangic_yil || (e.start_date ? String(e.start_date).slice(0,4) : ''),
        baslangic_ay:   e.baslangic_ay || (e.start_date ? parseInt(String(e.start_date).slice(5,7), 10) : ''),
        bitis_yil:      e.bitis_yil || (e.end_date ? String(e.end_date).slice(0,4) : ''),
        bitis_ay:       e.bitis_ay || (e.end_date ? parseInt(String(e.end_date).slice(5,7), 10) : ''),
        devam_ediyor:   !!e.devam_ediyor || (!e.end_date && !e.bitis_yil && (e.halen || e.is_current)),
        description:    e.description || e.aciklama || ''
      };
    });

    var education = (Array.isArray(c.education) ? c.education : []).map(function (e) {
      return {
        okul_adi:        e.okul || e.okul_adi || e.school || '',
        seviye:          e.seviye || e.level || '',
        bolum:           e.bolum || e.degree || '',
        mezuniyet_yili:  e.mezuniyet_yili || e.mezun_yil || e.year || ''
      };
    });

    var languages = (Array.isArray(c.diller) ? c.diller : (c.languages || [])).map(function (d) {
      if (typeof d === 'string') return { dil: d, seviye: '' };
      return { dil: d.dil || d.name || '', seviye: d.seviye || d.level || '' };
    });

    var certificates = Array.isArray(c.certificates) ? c.certificates : [];

    var workPrefs = {
      calisma_tipleri:    Array.isArray(c.calisma_tipi) ? c.calisma_tipi : [],
      musaitlik:          c.musaitlik || '',
      career_type:        c.career_type || '',
      travel_willingness: c.travel_willingness || '',
      shift_flexibility:  c.shift_flexibility || '',
      notice_period:      c.notice_period || '',
      tercih_segmentler:  Array.isArray(c.tercih_segmentler) ? c.tercih_segmentler : (c.segmentler || [])
    };

    var locations = [];
    if (c.adres_il) locations.push({ sehir: c.adres_il });
    if (Array.isArray(c.tercih_sehirler)) {
      c.tercih_sehirler.forEach(function (s) { if (s) locations.push({ sehir: s }); });
    }

    var brandInterests = Array.isArray(c.tercih_markalar) ? c.tercih_markalar :
                          (Array.isArray(c.markalar) ? c.markalar : []);

    return {
      profile: {
        id:              c.id,
        full_name:       c.full_name || '',
        avatar_url:      c.avatar_url || '',
        adres_il:        c.adres_il || '',
        telefon:         c.telefon || '',
        bio:             c.bio || c.ozet || '',
        cv_url:          c.cv_url || c.cv_path || '',
        cv_filename:     c.cv_filename || (c.cv && c.cv.filename) || '',
        cv_uploaded_at:  c.cv_uploaded_at || (c.cv && c.cv.uploaded_at) || ''
      },
      experiences:     experiences,
      education:       education,
      languages:       languages,
      certificates:    certificates,
      work_prefs:      workPrefs,
      locations:       locations,
      brand_interests: brandInterests,
      _matchScore:     c.match_score
    };
  }

  /* ═══════ Stub globals (profil-preview.js ihtiyaç duyduğu) ═══════ */
  function setupStubs(mapped, candidateEmail) {
    window._loadedDBData = mapped;
    window.currentUser   = { email: candidateEmail || '' };
    /* HR drawer aday match score'unu pulse ring'de göstersin */
    window.calculateCompletion = function () {
      return mapped && mapped._matchScore != null ? mapped._matchScore : 0;
    };
    if (typeof window.CAREER_TYPE_LABELS === 'undefined') {
      window.CAREER_TYPE_LABELS = CAREER_TYPE_LABELS;
    }
    /* val() bio için — profil-ui.js'in form-aware versiyonu yerine direkt bio döner */
    window.val = function (name) {
      if (name === 'f-bio') return mapped && mapped.profile ? (mapped.profile.bio || '') : '';
      return '';
    };
  }

  /* ═══════ Open / Close ═══════ */
  function openDrawer(candidateId) {
    if (!candidateId) return;
    if (typeof window.openProfilePreview !== 'function') {
      console.warn('[ik-cand-drawer] profil-preview.js yüklü değil');
      return;
    }
    _state.isOpen = true;
    _state.candidateId = candidateId;
    track('candidate_drawer_open', { candidate_id: candidateId });

    if (!window.IK_DATA || !IK_DATA.getCandidate) {
      console.warn('[ik-cand-drawer] IK_DATA hazır değil');
      return;
    }
    IK_DATA.getCandidate(candidateId).then(function (c) {
      if (!_state.isOpen || _state.candidateId !== candidateId) return;
      if (!c) {
        console.warn('[ik-cand-drawer] aday bulunamadı', candidateId);
        return;
      }
      var mapped = mapCandidateToProfileShape(c);
      setupStubs(mapped, c.email);
      window.openProfilePreview();
    }).catch(function (e) {
      console.warn('[ik-cand-drawer] getCandidate error:', e && e.message);
    });
  }

  function closeDrawer() {
    _state.isOpen = false;
    _state.candidateId = null;
    if (typeof window.closeProfilePreview === 'function') {
      window.closeProfilePreview();
    }
  }

  /* btn-close-preview profil-preview.js'in handler'ı yok; manual bind */
  document.addEventListener('click', function (e) {
    var closeBtn = e.target.closest && e.target.closest('#btn-close-preview');
    if (closeBtn) {
      closeDrawer();
      return;
    }
    /* Overlay click → kapat */
    var overlay = e.target.closest && e.target.closest('#pp-overlay');
    if (overlay) closeDrawer();
  });

  window._htOpenCandidateDrawer  = openDrawer;
  window._htCloseCandidateDrawer = closeDrawer;
})();
