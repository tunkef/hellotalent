/* global supabase */
/* K030 FAZ C — admin-announcements.js
 * Admin composer + list for HT Duyurular (ht_announcements).
 * Depends on: supabase (global), window._htRenderDuyuruPreviewCard (profil-duyurular.js),
 *             marked + DOMPurify (CDN), shared.js (window.HT.getSupa fallback).
 *
 * Exposes:
 *   window._htAdminAnnouncements = { mount(containerEl), refresh() }
 *
 * Rules: vanilla JS, IIFE, var-only, Turkish UI, no emoji, no innerHTML for user data,
 *        .maybeSingle() pattern, console.error/warn only.
 */

(function () {
  'use strict';

  var CATEGORIES = [
    { value: 'genel',   label: 'Genel' },
    { value: 'feature', label: 'Yeni \u00D6zellik' },
    { value: 'sirket',  label: '\u015Eirket' },
    { value: 'ipucu',   label: '\u0130pucu' }
  ];

  var MAX_IMG_BYTES = 10 * 1024 * 1024;
  var MAX_VIDEO_BYTES = 50 * 1024 * 1024;
  var MAX_TITLE = 200;
  var MAX_BODY  = 8000;

  var _listContainer = null;

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }
  function txt(tag, cls, text) {
    var n = el(tag, cls);
    if (text != null) n.textContent = String(text);
    return n;
  }

  function getSupa() {
    if (typeof supabase !== 'undefined') return supabase;
    if (window.HT && typeof window.HT.getSupa === 'function') return window.HT.getSupa();
    return null;
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function extFromFile(file) {
    var name = (file && file.name) || '';
    var idx = name.lastIndexOf('.');
    return idx > -1 ? name.substring(idx + 1).toLowerCase() : 'bin';
  }

  /* ── List / refresh ──────────────────────────────────────────── */
  async function refresh() {
    if (!_listContainer) return;
    var supa = getSupa();
    if (!supa) {
      _listContainer.textContent = 'Supabase istemcisi y\u00FCklenemedi.';
      return;
    }
    _listContainer.textContent = 'Y\u00FCkleniyor...';
    var res = await supa.from('ht_announcements')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(100);
    if (res.error) {
      console.error('[ann] list fetch failed:', res.error.message);
      _listContainer.textContent = 'Duyurular y\u00FCklenemedi: ' + res.error.message;
      return;
    }
    renderList(res.data || []);
  }

  function renderList(rows) {
    while (_listContainer.firstChild) _listContainer.removeChild(_listContainer.firstChild);
    if (rows.length === 0) {
      _listContainer.appendChild(txt('div', '', 'Hen\u00FCz duyuru yok.'));
      return;
    }
    var table = el('table', 'ht-ann-admin__table');
    var thead = el('thead', '');
    var trh = el('tr', '');
    ['Ba\u015Fl\u0131k', 'Kategori', 'Yay\u0131n', 'Durum', 'Sabit', 'Be\u011Feni', 'Eylemler'].forEach(function (h) {
      trh.appendChild(txt('th', '', h));
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    var tbody = el('tbody', '');
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var tr = el('tr', '');
      tr.appendChild(txt('td', '', r.title || '(ba\u015Fl\u0131ks\u0131z)'));
      tr.appendChild(txt('td', '', r.category || 'genel'));
      tr.appendChild(txt('td', '', r.published_at ? new Date(r.published_at).toLocaleDateString('tr-TR') : '-'));
      tr.appendChild(txt('td', '', r.status || 'draft'));
      tr.appendChild(txt('td', '', r.is_pinned ? 'Evet' : '-'));
      tr.appendChild(txt('td', '', String(r.like_count || 0)));

      var actions = el('td', '');
      var edit = txt('button', 'ht-ann-admin__action', 'D\u00FCzenle');
      edit.type = 'button';
      (function (row) {
        edit.addEventListener('click', function () { openComposer(row); });
      })(r);
      actions.appendChild(edit);

      var arch = txt('button', 'ht-ann-admin__action', r.status === 'archived' ? 'Aktifle\u015Ftir' : 'Ar\u015Fivle');
      arch.type = 'button';
      (function (row) {
        arch.addEventListener('click', function () { toggleArchive(row); });
      })(r);
      actions.appendChild(arch);

      var del = txt('button', 'ht-ann-admin__action', 'Sil');
      del.type = 'button';
      (function (row) {
        del.addEventListener('click', function () {
          if (window.confirm('Bu duyuruyu silmek istedi\u011Fine emin misin?')) deleteRow(row);
        });
      })(r);
      actions.appendChild(del);

      tr.appendChild(actions);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    _listContainer.appendChild(table);
  }

  async function toggleArchive(row) {
    var supa = getSupa();
    if (!supa) return;
    var next = row.status === 'archived' ? 'published' : 'archived';
    var res = await supa.from('ht_announcements').update({ status: next }).eq('id', row.id);
    if (res.error) {
      console.error('[ann] archive toggle failed:', res.error.message);
      window.alert('G\u00FCncellenemedi: ' + res.error.message);
    }
    refresh();
  }

  async function deleteRow(row) {
    var supa = getSupa();
    if (!supa) return;
    var res = await supa.from('ht_announcements').delete().eq('id', row.id);
    if (res.error) {
      console.error('[ann] delete failed:', res.error.message);
      window.alert('Silinemedi: ' + res.error.message);
      return;
    }
    refresh();
  }

  /* ── Composer ────────────────────────────────────────────────── */
  function openComposer(existingRow) {
    // Remove any existing modal
    var prev = document.getElementById('ht-composer-modal');
    if (prev) prev.parentNode.removeChild(prev);

    var modal = el('div', 'ht-composer__modal');
    modal.id = 'ht-composer-modal';
    var panel = el('div', 'ht-composer__panel');

    // Head
    var head = el('div', 'ht-composer__head');
    head.appendChild(txt('h3', '', existingRow ? 'Duyuruyu D\u00FCzenle' : 'Yeni Duyuru'));
    var closeBtn = txt('button', 'ht-composer__close', '\u00D7');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', function () { modal.remove(); });
    head.appendChild(closeBtn);
    panel.appendChild(head);

    // Body: form + preview
    var body = el('div', 'ht-composer__body');
    var form = el('form', 'ht-composer__form');
    form.noValidate = true;

    var titleLabel = txt('label', '', 'Ba\u015Fl\u0131k');
    var titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.maxLength = MAX_TITLE;
    titleInput.required = true;
    titleInput.value = (existingRow && existingRow.title) || '';
    titleLabel.appendChild(titleInput);
    form.appendChild(titleLabel);

    var catLabel = txt('label', '', 'Kategori');
    var catSelect = document.createElement('select');
    for (var c = 0; c < CATEGORIES.length; c++) {
      var opt = document.createElement('option');
      opt.value = CATEGORIES[c].value;
      opt.textContent = CATEGORIES[c].label;
      if (existingRow && existingRow.category === opt.value) opt.selected = true;
      catSelect.appendChild(opt);
    }
    catLabel.appendChild(catSelect);
    form.appendChild(catLabel);

    var bodyLabel = txt('label', '', '\u0130\u00E7erik (markdown)');
    var bodyTA = document.createElement('textarea');
    bodyTA.maxLength = MAX_BODY;
    bodyTA.value = (existingRow && existingRow.body_md) || '';
    bodyLabel.appendChild(bodyTA);
    form.appendChild(bodyLabel);

    // Media row
    var mediaLabel = txt('label', '', 'G\u00F6rsel / Video');
    var mediaInput = document.createElement('input');
    mediaInput.type = 'file';
    mediaInput.accept = 'image/*,video/*';
    mediaInput.multiple = true;
    mediaLabel.appendChild(mediaInput);
    form.appendChild(mediaLabel);

    var mediaRow = el('div', 'ht-composer__media-row');
    form.appendChild(mediaRow);

    /* queued media state:
     * { tempId, file, objectUrl, storagePath, mediaType, uploaded:false, failed:false } */
    var queuedMedia = [];

    mediaInput.addEventListener('change', function () {
      var files = Array.from(mediaInput.files || []);
      for (var f = 0; f < files.length; f++) {
        var file = files[f];
        var isVideo = file.type && file.type.indexOf('video/') === 0;
        var maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMG_BYTES;
        if (file.size > maxBytes) {
          window.alert('Dosya \u00E7ok b\u00FCy\u00FCk: ' + file.name);
          continue;
        }
        var objectUrl = URL.createObjectURL(file);
        var item = {
          tempId: uuid(),
          file: file,
          objectUrl: objectUrl,
          storagePath: null,
          mediaType: isVideo ? 'video' : 'image',
          uploaded: false,
          failed: false
        };
        queuedMedia.push(item);
        appendThumb(mediaRow, item, queuedMedia, updatePreview);
      }
      mediaInput.value = '';
      updatePreview();
    });

    // Link
    var linkLabel = txt('label', '', 'Link URL');
    var linkInput = document.createElement('input');
    linkInput.type = 'url';
    linkInput.value = (existingRow && existingRow.link_url) || '';
    linkLabel.appendChild(linkInput);
    form.appendChild(linkLabel);

    var linkTitleLabel = txt('label', '', 'Link Ba\u015Fl\u0131\u011F\u0131');
    var linkTitleInput = document.createElement('input');
    linkTitleInput.type = 'text';
    linkTitleInput.value = (existingRow && existingRow.link_title) || '';
    linkTitleLabel.appendChild(linkTitleInput);
    form.appendChild(linkTitleLabel);

    // CTA
    var ctaLabel = txt('label', '', 'CTA URL');
    var ctaInput = document.createElement('input');
    ctaInput.type = 'url';
    ctaInput.value = (existingRow && existingRow.cta_url) || '';
    ctaLabel.appendChild(ctaInput);
    form.appendChild(ctaLabel);

    var ctaLbLabel = txt('label', '', 'CTA Etiketi');
    var ctaLbInput = document.createElement('input');
    ctaLbInput.type = 'text';
    ctaLbInput.value = (existingRow && existingRow.cta_label) || '';
    ctaLbLabel.appendChild(ctaLbInput);
    form.appendChild(ctaLbLabel);

    // Pin toggle
    var pinLabel = txt('label', '', 'Sabitle (24 saat)');
    var pinInput = document.createElement('input');
    pinInput.type = 'checkbox';
    pinInput.checked = !!(existingRow && existingRow.is_pinned);
    pinLabel.appendChild(pinInput);
    form.appendChild(pinLabel);

    body.appendChild(form);

    // Preview pane
    var previewWrap = el('div', 'ht-composer__preview-wrap');
    previewWrap.appendChild(txt('div', 'ht-composer__preview-label', '\u00D6nizleme'));
    var previewHost = el('div', '');
    previewWrap.appendChild(previewHost);
    body.appendChild(previewWrap);

    panel.appendChild(body);

    // Footer buttons
    var footer = el('div', 'ht-composer__footer');
    var cancelBtn = txt('button', 'ht-composer__btn', '\u0130ptal');
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', function () { cleanupObjectUrls(queuedMedia); modal.remove(); });
    footer.appendChild(cancelBtn);

    var draftBtn = txt('button', 'ht-composer__btn', 'Taslak Kaydet');
    draftBtn.type = 'button';
    draftBtn.addEventListener('click', function () { save('draft'); });
    footer.appendChild(draftBtn);

    var publishBtn = txt('button', 'ht-composer__btn ht-composer__btn--primary', 'Yay\u0131nla');
    publishBtn.type = 'button';
    publishBtn.addEventListener('click', function () { save('published'); });
    footer.appendChild(publishBtn);

    panel.appendChild(footer);
    modal.appendChild(panel);
    document.body.appendChild(modal);

    // Live preview updates
    function updatePreview() {
      if (typeof window._htRenderDuyuruPreviewCard !== 'function') return;
      var fakeMedia = queuedMedia.map(function (m, idx) {
        return { storage_path: m.tempId, media_type: m.mediaType, order_index: idx, alt_text: '' };
      });
      var objectUrlMap = {};
      queuedMedia.forEach(function (m) { objectUrlMap[m.tempId] = m.objectUrl; });
      var fakePost = {
        id: (existingRow && existingRow.id) || 'preview',
        title: titleInput.value,
        body_md: bodyTA.value,
        category: catSelect.value,
        is_pinned: pinInput.checked,
        published_at: new Date().toISOString(),
        media: fakeMedia,
        link_url: linkInput.value,
        link_title: linkTitleInput.value,
        cta_url: ctaInput.value,
        cta_label: ctaLbInput.value,
        like_count: (existingRow && existingRow.like_count) || 0,
        liked_by_me: false
      };
      window._htRenderDuyuruPreviewCard(fakePost, objectUrlMap, previewHost);
    }

    titleInput.addEventListener('input', updatePreview);
    bodyTA.addEventListener('input', updatePreview);
    catSelect.addEventListener('change', updatePreview);
    pinInput.addEventListener('change', updatePreview);
    linkInput.addEventListener('input', updatePreview);
    linkTitleInput.addEventListener('input', updatePreview);
    ctaInput.addEventListener('input', updatePreview);
    ctaLbInput.addEventListener('input', updatePreview);
    updatePreview();

    async function save(targetStatus) {
      var supa = getSupa();
      if (!supa) return;
      if (!titleInput.value.trim()) {
        window.alert('Ba\u015Fl\u0131k zorunlu.');
        return;
      }

      publishBtn.disabled = true;
      draftBtn.disabled = true;

      try {
        // Get admin user id
        var userRes = await supa.auth.getUser();
        var adminId = userRes && userRes.data && userRes.data.user && userRes.data.user.id;
        if (!adminId) throw new Error('Admin kimli\u011Fi al\u0131namad\u0131');

        var payload = {
          title: titleInput.value.trim(),
          category: catSelect.value,
          body_md: bodyTA.value,
          status: targetStatus,
          is_pinned: pinInput.checked,
          link_url: linkInput.value || null,
          link_title: linkTitleInput.value || null,
          cta_url: ctaInput.value || null,
          cta_label: ctaLbInput.value || null
        };

        var postId;
        if (existingRow && existingRow.id) {
          payload.id = existingRow.id;
          var upd = await supa.from('ht_announcements').update(payload).eq('id', existingRow.id).select().maybeSingle();
          if (upd.error) throw upd.error;
          postId = existingRow.id;
        } else {
          payload.author_id = adminId;
          if (targetStatus === 'published') payload.published_at = new Date().toISOString();
          var ins = await supa.from('ht_announcements').insert(payload).select().maybeSingle();
          if (ins.error) throw ins.error;
          postId = ins.data && ins.data.id;
        }

        // Upload queued media that are not yet uploaded
        for (var mi = 0; mi < queuedMedia.length; mi++) {
          var m = queuedMedia[mi];
          if (m.uploaded) continue;
          var ext = extFromFile(m.file);
          var path = 'announcements/' + adminId + '/' + postId + '/' + uuid() + '.' + ext;
          var up = await supa.storage.from('cvs').upload(path, m.file, { contentType: m.file.type, upsert: false });
          if (up.error) {
            console.error('[ann] media upload failed:', up.error.message);
            m.failed = true;
            continue;
          }
          m.storagePath = path;
          m.uploaded = true;

          var insMedia = await supa.from('ht_announcement_media').insert({
            announcement_id: postId,
            storage_path: path,
            media_type: m.mediaType,
            order_index: mi
          });
          if (insMedia.error) console.error('[ann] media row insert failed:', insMedia.error.message);
        }

        cleanupObjectUrls(queuedMedia);
        modal.remove();
        refresh();
      } catch (e) {
        console.error('[ann] save failed:', e && e.message);
        window.alert('Kay\u0131t ba\u015Far\u0131s\u0131z: ' + (e && e.message));
        publishBtn.disabled = false;
        draftBtn.disabled = false;
      }
    }
  }

  function appendThumb(row, item, queue, onChange) {
    var thumb = el('div', 'ht-composer__media-thumb');
    thumb.setAttribute('data-temp-id', item.tempId);
    if (item.mediaType === 'video') {
      var v = document.createElement('video');
      v.src = item.objectUrl;
      v.muted = true;
      thumb.appendChild(v);
    } else {
      var img = document.createElement('img');
      img.src = item.objectUrl;
      thumb.appendChild(img);
    }
    var remove = txt('button', 'ht-composer__media-remove', '\u00D7');
    remove.type = 'button';
    remove.addEventListener('click', function () {
      URL.revokeObjectURL(item.objectUrl);
      var idx = queue.indexOf(item);
      if (idx > -1) queue.splice(idx, 1);
      thumb.remove();
      if (typeof onChange === 'function') onChange();
    });
    thumb.appendChild(remove);
    row.appendChild(thumb);
  }

  function cleanupObjectUrls(queue) {
    for (var i = 0; i < queue.length; i++) {
      try { URL.revokeObjectURL(queue[i].objectUrl); } catch (e) { /* ignore */ }
    }
  }

  /* ── Mount ───────────────────────────────────────────────────── */
  function mount(containerEl) {
    if (!containerEl) return;
    while (containerEl.firstChild) containerEl.removeChild(containerEl.firstChild);

    var toolbar = el('div', 'ht-ann-admin__toolbar');
    toolbar.appendChild(txt('h3', '', 'Duyurular'));
    var newBtn = txt('button', 'ht-composer__btn ht-composer__btn--primary', 'Yeni duyuru');
    newBtn.type = 'button';
    newBtn.addEventListener('click', function () { openComposer(null); });
    toolbar.appendChild(newBtn);
    containerEl.appendChild(toolbar);

    _listContainer = el('div', 'ht-ann-admin__list');
    containerEl.appendChild(_listContainer);

    refresh();
  }

  window._htAdminAnnouncements = { mount: mount, refresh: refresh };

})();
