/* global IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Campaigns — Asama 86 Sprint D
   Kampanya listesi + filtre + status pill + yeni kampanya modal.
   Demo: IK_DATA.getCampaigns() + createCampaign + updateCampaignStatus.
   SOLID:
     - SRP: tek sorumluluk = campaign list render + status mgmt + new modal.
     - DIP: IK_DATA public API'sine bagli.
   XSS-safe: textContent + DOM.
   Wizard placeholder: Sprint E'de tam impl, MVP 2'de yayinla aktif.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  var els = null;
  var state = {
    campaigns: [],
    filter: 'all'
  };

  var STATUS_LABEL = {
    draft: 'Taslak',
    scheduled: 'Zamanlanmış',
    sent: 'Gönderildi',
    archived: 'Arşivlendi'
  };

  function cacheEls() {
    els = {
      newBtn: $('#ik-cmp-new-btn'),
      list: $('#ik-cmp-list'),
      loading: $('#ik-cmp-loading'),
      empty: $('#ik-cmp-empty'),
      countAll: $('#ik-cmp-count-all'),
      countDraft: $('#ik-cmp-count-draft'),
      countScheduled: $('#ik-cmp-count-scheduled'),
      countSent: $('#ik-cmp-count-sent'),
      countArchived: $('#ik-cmp-count-archived'),
      filterBtns: $$('.ik-cmp-filter-btn'),
      modal: $('#ik-cmp-modal'),
      modalBackdrop: $('#ik-cmp-modal-backdrop'),
      modalClose: $('#ik-cmp-modal-close'),
      form: $('#ik-cmp-form'),
      inputTitle: $('#ik-cmp-input-title'),
      inputSummary: $('#ik-cmp-input-summary'),
      inputTarget: $('#ik-cmp-input-target'),
      cancelBtn: $('#ik-cmp-cancel'),
      saveBtn: $('#ik-cmp-save'),
      formMsg: $('#ik-cmp-form-msg'),
      toast: $('#ik-toast')
    };
  }

  function showToast(text, kind) {
    if (!els.toast) return;
    els.toast.textContent = text || '';
    els.toast.className = 'ik-toast is-visible' + (kind ? ' ik-toast--' + kind : '');
    setTimeout(function () { els.toast.classList.remove('is-visible'); }, 3200);
  }

  function setMsg(text, kind) {
    if (!els.formMsg) return;
    els.formMsg.textContent = text || '';
    els.formMsg.className = 'ik-cmp-msg' + (kind ? ' ik-cmp-msg--' + kind : '');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('tr-TR', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch (e) { return '—'; }
  }

  function calcCTR(c) {
    if (!c || !c.sent_count) return null;
    var pct = (c.opened_count / c.sent_count) * 100;
    return isNaN(pct) ? null : Math.round(pct);
  }

  function renderRow(c) {
    var row = document.createElement('article');
    row.className = 'ik-cmp-row';
    row.dataset.id = c.id;
    row.dataset.status = c.status;

    /* Header */
    var head = document.createElement('div');
    head.className = 'ik-cmp-row__head';

    var title = document.createElement('h3');
    title.className = 'ik-cmp-row__title';
    title.textContent = c.title || 'İsimsiz kampanya';

    var statusPill = document.createElement('span');
    statusPill.className = 'ik-cmp-status ik-cmp-status--' + c.status;
    statusPill.textContent = STATUS_LABEL[c.status] || c.status || '—';

    head.appendChild(title);
    head.appendChild(statusPill);

    /* Filter summary */
    var summary = document.createElement('p');
    summary.className = 'ik-cmp-row__summary';
    summary.textContent = c.filter_summary || 'Filtre detayı yok.';

    /* Stats */
    var stats = document.createElement('div');
    stats.className = 'ik-cmp-row__stats';

    function statCell(label, value) {
      var cell = document.createElement('div');
      cell.className = 'ik-cmp-stat';
      var v = document.createElement('span');
      v.className = 'ik-cmp-stat__val';
      v.textContent = value;
      var l = document.createElement('span');
      l.className = 'ik-cmp-stat__lbl';
      l.textContent = label;
      cell.appendChild(v);
      cell.appendChild(l);
      return cell;
    }

    var ctr = calcCTR(c);
    stats.appendChild(statCell('Hedef', String(c.target_count || 0)));
    stats.appendChild(statCell('Gönderildi', String(c.sent_count || 0)));
    stats.appendChild(statCell('Açıldı', String(c.opened_count || 0)));
    stats.appendChild(statCell('Yanıtlandı', String(c.replied_count || 0)));
    stats.appendChild(statCell('Açılma oranı', ctr == null ? '—' : (ctr + '%')));
    stats.appendChild(statCell('Oluşturuldu', fmtDate(c.created_at)));

    /* Actions */
    var actions = document.createElement('div');
    actions.className = 'ik-cmp-row__actions';

    if (c.status === 'draft') {
      var publishBtn = document.createElement('button');
      publishBtn.type = 'button';
      publishBtn.className = 'ik-cmp-row__action ik-cmp-row__action--primary';
      publishBtn.textContent = 'Yayınla (MVP 2)';
      publishBtn.disabled = true;
      publishBtn.title = 'Gerçek gönderim MVP 2 ile aktif olur';
      actions.appendChild(publishBtn);
    }
    if (c.status !== 'archived') {
      var archiveBtn = document.createElement('button');
      archiveBtn.type = 'button';
      archiveBtn.className = 'ik-cmp-row__action';
      archiveBtn.textContent = 'Arşivle';
      archiveBtn.dataset.action = 'archive';
      archiveBtn.dataset.id = c.id;
      actions.appendChild(archiveBtn);
    } else {
      var restoreBtn = document.createElement('button');
      restoreBtn.type = 'button';
      restoreBtn.className = 'ik-cmp-row__action';
      restoreBtn.textContent = 'Taslağa al';
      restoreBtn.dataset.action = 'restore';
      restoreBtn.dataset.id = c.id;
      actions.appendChild(restoreBtn);
    }

    row.appendChild(head);
    row.appendChild(summary);
    row.appendChild(stats);
    row.appendChild(actions);
    return row;
  }

  function getFilteredCampaigns() {
    if (state.filter === 'all') {
      /* arsivli olmayanlari ana liste, arsivli filter ile gosterir */
      return state.campaigns.filter(function (c) { return c.status !== 'archived'; });
    }
    return state.campaigns.filter(function (c) { return c.status === state.filter; });
  }

  function renderCounts() {
    var total = 0, draft = 0, scheduled = 0, sent = 0, archived = 0;
    state.campaigns.forEach(function (c) {
      if (c.status === 'archived') archived++;
      else total++;
      if (c.status === 'draft') draft++;
      else if (c.status === 'scheduled') scheduled++;
      else if (c.status === 'sent') sent++;
    });
    if (els.countAll) els.countAll.textContent = String(total);
    if (els.countDraft) els.countDraft.textContent = String(draft);
    if (els.countScheduled) els.countScheduled.textContent = String(scheduled);
    if (els.countSent) els.countSent.textContent = String(sent);
    if (els.countArchived) els.countArchived.textContent = String(archived);
  }

  function renderList() {
    if (!els.list) return;
    els.list.textContent = '';

    var visible = getFilteredCampaigns();
    if (!visible.length) {
      if (els.empty) els.empty.hidden = false;
      return;
    }
    if (els.empty) els.empty.hidden = true;
    visible.forEach(function (c) {
      els.list.appendChild(renderRow(c));
    });
  }

  function setFilter(status) {
    state.filter = status || 'all';
    els.filterBtns.forEach(function (btn) {
      var s = btn.getAttribute('data-ik-cmp-status');
      if (s === state.filter) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-selected', 'false');
      }
    });
    renderList();
  }

  function load() {
    return IK_DATA.getCampaigns().then(function (list) {
      state.campaigns = list || [];
      renderCounts();
      renderList();
    }).catch(function (e) {
      console.warn('[ik-campaigns] load fail:', e && e.message);
      if (els.loading) els.loading.textContent = 'Yüklenemedi.';
    });
  }

  /* ── Modal ── */
  function openModal() {
    if (!els.modal) return;
    els.modal.setAttribute('aria-hidden', 'false');
    els.modal.classList.add('is-open');
    document.body.classList.add('ht-scroll-lock');
    setMsg('', '');
    if (els.inputTitle) {
      els.inputTitle.value = '';
      setTimeout(function () { els.inputTitle.focus(); }, 80);
    }
    if (els.inputSummary) els.inputSummary.value = '';
    if (els.inputTarget) els.inputTarget.value = '';
  }

  function closeModal() {
    if (!els.modal) return;
    els.modal.setAttribute('aria-hidden', 'true');
    els.modal.classList.remove('is-open');
    document.body.classList.remove('ht-scroll-lock');
  }

  function save() {
    var title = (els.inputTitle.value || '').trim();
    var summary = (els.inputSummary.value || '').trim();
    var target = parseInt(els.inputTarget.value, 10) || 0;

    if (!title) {
      setMsg('Kampanya adı zorunlu.', 'err');
      els.inputTitle.focus();
      return;
    }
    if (target < 0) target = 0;

    els.saveBtn.disabled = true;
    var orig = els.saveBtn.textContent;
    els.saveBtn.textContent = 'Kaydediliyor…';

    IK_DATA.createCampaign({
      title: title,
      filter_summary: summary,
      target_count: target
    }).then(function () {
      showToast('Kampanya taslak olarak kaydedildi', 'ok');
      closeModal();
      return load();
    }).catch(function (e) {
      var m = (e && e.message) || 'Kaydetme başarısız.';
      setMsg(m, 'err');
    }).then(function () {
      els.saveBtn.disabled = false;
      els.saveBtn.textContent = orig;
    });
  }

  function archive(id) {
    IK_DATA.archiveCampaign(id).then(function () {
      showToast('Kampanya arşivlendi', 'ok');
      return load();
    });
  }

  function restore(id) {
    IK_DATA.updateCampaignStatus(id, 'draft').then(function () {
      showToast('Kampanya taslağa alındı', 'ok');
      return load();
    });
  }

  function bindEvents() {
    if (els.newBtn) els.newBtn.addEventListener('click', openModal);
    if (els.modalClose) els.modalClose.addEventListener('click', closeModal);
    if (els.modalBackdrop) els.modalBackdrop.addEventListener('click', closeModal);
    if (els.cancelBtn) els.cancelBtn.addEventListener('click', closeModal);
    if (els.saveBtn) els.saveBtn.addEventListener('click', save);
    if (els.form) {
      els.form.addEventListener('submit', function (e) {
        e.preventDefault();
        save();
      });
    }

    els.filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var s = btn.getAttribute('data-ik-cmp-status');
        setFilter(s);
      });
    });

    if (els.list) {
      els.list.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || t.dataset == null) return;
        var act = t.dataset.action;
        var id = t.dataset.id;
        if (!act || !id) return;
        if (act === 'archive') archive(id);
        else if (act === 'restore') restore(id);
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && els.modal && els.modal.classList.contains('is-open')) {
        closeModal();
      }
    });
  }

  function init() {
    cacheEls();
    if (!els.list) return;
    bindEvents();
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
