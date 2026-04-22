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

  var panelMounted = false;

  var PANEL_HTML = ''
    + '<div class="panel-header"><h2>Duyurular</h2></div>'
    + '<div id="ann-root"></div>';

  window._htAdminMountAnnouncements = function() {
    if (panelMounted) return;
    var panel = document.getElementById('panel-announcements');
    var core = window._htAdminCore;
    if (panel && core) { core.mount(panel, PANEL_HTML); panelMounted = true; }
  };

  var CATEGORIES = [
    { value: 'genel',   label: 'Genel' },
    { value: 'feature', label: 'Yeni \u00D6zellik' },
    { value: 'sirket',  label: '\u015Eirket' },
    { value: 'ipucu',   label: '\u0130pucu' }
  ];

  /* FAZ D — optional fırsat type. When set, the announcement is also
   * surfaced in panel-firsatlar with a type badge; null leaves it as a
   * plain announcement. Migration 20260417100000 added the column. */
  var CAMPAIGN_TYPES = [
    { value: '',                  label: 'Yok (sadece duyuru)' },
    { value: 'offer',             label: '\u0130ndirim' },
    { value: 'employer_branding', label: 'Marka Hik\u00E2yesi' },
    { value: 'store_opening',     label: 'Yeni Ma\u011Faza' },
    { value: 'brand_story',       label: 'Marka Haberi' }
  ];

  var MAX_IMG_BYTES = 5 * 1024 * 1024;   /* 5MB — Tuna UAT ayarlamasi */
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
    /* Admin.html: real client exposed as window._htAdminSupa (from shared.js HT.getSupa()).
     * Global `supabase` in admin context is the CDN namespace (createClient only), NOT a client. */
    if (window._htAdminSupa && window._htAdminSupa.auth) return window._htAdminSupa;
    if (window.HT && typeof window.HT.getSupa === 'function') return window.HT.getSupa();
    if (typeof supabase !== 'undefined' && supabase && supabase.auth) return supabase;
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
    ['Ba\u015Fl\u0131k', 'Kategori', 'Yay\u0131n', 'Durum', 'Sabit', 'Be\u011Feni', 'G\u00F6r\u00FCnt\u00FClenme', 'Eylemler'].forEach(function (h) {
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
      tr.appendChild(txt('td', '', r.is_active ? 'Yay\u0131nda' : 'Arsiv'));
      var pinnedNow = r.pinned_until && new Date(r.pinned_until) > new Date();
      tr.appendChild(txt('td', '', pinnedNow ? 'Evet' : '-'));
      tr.appendChild(txt('td', '', String(r.like_count || 0)));
      tr.appendChild(txt('td', '', String(r.view_count || 0)));

      var actions = el('td', '');
      var edit = txt('button', 'ht-ann-admin__action', 'D\u00FCzenle');
      edit.type = 'button';
      (function (row) {
        edit.addEventListener('click', function () { openComposer(row); });
      })(r);
      actions.appendChild(edit);

      var arch = txt('button', 'ht-ann-admin__action', r.is_active ? 'Ar\u015Fivle' : 'Aktifle\u015Ftir');
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
    var res = await supa.from('ht_announcements').update({ is_active: !row.is_active }).eq('id', row.id);
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
    closeBtn.addEventListener('click', function () {
      /* K030 FAZ C: prevent Object URL memory leak on X close */
      cleanupObjectUrls(queuedMedia);
      modal.remove();
    });
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

    /* FAZ D: campaign_type — null default (yok). Setting it publishes
     * the entry to panel-firsatlar as well. */
    var campTypeLabel = txt('label', '', 'F\u0131rsat Tipi');
    var campTypeSelect = document.createElement('select');
    var existingCamp = existingRow && existingRow.campaign_type ? existingRow.campaign_type : '';
    for (var k = 0; k < CAMPAIGN_TYPES.length; k++) {
      var cOpt = document.createElement('option');
      cOpt.value = CAMPAIGN_TYPES[k].value;
      cOpt.textContent = CAMPAIGN_TYPES[k].label;
      if (existingCamp === cOpt.value) cOpt.selected = true;
      campTypeSelect.appendChild(cOpt);
    }
    campTypeLabel.appendChild(campTypeSelect);
    form.appendChild(campTypeLabel);

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
     * { tempId, file, objectUrl, storagePath, mediaType, uploaded:false, failed:false,
     *   existingMediaId? } — existingMediaId set when row is hydrated from DB */
    var queuedMedia = [];
    /* Existing media rows removed during edit — deleted on save.
     * [{ id, storage_path }] */
    var deletedExistingMedia = [];
    /* Existing 'link' media row IDs — cleaned up on save before reinserting. */
    var existingLinkIds = [];

    /* Push a ready-to-upload item (video file OR cropped image blob) into
     * the composer queue + thumbnails + preview. Shared by video direct
     * path and image editor onSave. */
    function pushQueuedFile(file, mediaType) {
      var objectUrl = URL.createObjectURL(file);
      var item = {
        tempId: uuid(),
        file: file,
        objectUrl: objectUrl,
        storagePath: null,
        mediaType: mediaType,
        uploaded: false,
        failed: false
      };
      queuedMedia.push(item);
      appendThumb(mediaRow, item, queuedMedia, updatePreview, deletedExistingMedia);
      updatePreview();
    }

    /* Derive filename extension from the editor's output blob MIME.
     * htImageEditor falls back to JPEG on WebP-unsupported browsers, so we
     * cannot hardcode .webp (Codex image-editor spec open question). */
    function extFromMime(mime) {
      if (!mime) return 'webp';
      if (mime.indexOf('webp') !== -1) return 'webp';
      if (mime.indexOf('png') !== -1) return 'png';
      if (mime.indexOf('jpeg') !== -1 || mime.indexOf('jpg') !== -1) return 'jpg';
      return 'webp';
    }

    /* Sequential file queue — mixed image/video selections processed in
     * selection order so user intent "img1, video1, img2" is preserved
     * in the feed carousel (Codex image-editor review Medium finding).
     * Videos push directly; images open htImageEditor one at a time. */
    function processFileQueue(queue, idx) {
      if (idx >= queue.length) return;
      var entry = queue[idx];
      if (entry.type === 'video') {
        pushQueuedFile(entry.file, 'video');
        processFileQueue(queue, idx + 1);
        return;
      }
      if (!window.htImageEditor || typeof window.htImageEditor.open !== 'function') {
        window.alert('Gorsel editoru yuklenemedi.');
        return;
      }
      window.htImageEditor.open({
        file: entry.file,
        aspectRatio: 16 / 9,
        outputWidth: 1600,
        outputHeight: 900,
        outputFormat: 'webp',
        quality: 0.9,
        onSave: function (blob) {
          try {
            var mime = (blob && blob.type) || 'image/webp';
            var ext = extFromMime(mime);
            var cropped = new File([blob], 'cropped-' + Date.now() + '.' + ext, { type: mime });
            pushQueuedFile(cropped, 'image');
          } catch (e) {
            console.error('[ann] image editor onSave:', e && e.message);
          }
          processFileQueue(queue, idx + 1);
        },
        onCancel: function () {
          processFileQueue(queue, idx + 1);
        }
      });
    }

    mediaInput.addEventListener('change', function () {
      var files = Array.from(mediaInput.files || []);
      var queue = [];
      for (var f = 0; f < files.length; f++) {
        var file = files[f];
        var isImage = file.type && file.type.indexOf('image/') === 0;
        var isVideo = file.type && file.type.indexOf('video/') === 0;
        if (!isImage && !isVideo) {
          window.alert('Desteklenmeyen format: ' + file.name + ' (sadece gorsel veya video)');
          continue;
        }
        var maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMG_BYTES;
        if (file.size > maxBytes) {
          var limitMb = isVideo ? '50MB' : '5MB';
          window.alert('Dosya cok buyuk: ' + file.name + ' (max ' + limitMb + ')');
          continue;
        }
        queue.push({ type: isVideo ? 'video' : 'image', file: file });
      }
      mediaInput.value = '';
      if (queue.length > 0) {
        processFileQueue(queue, 0);
      }
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
    /* Schema contract: ht_announcements has only pinned_until timestamptz;
     * is_pinned column does not exist. Mirror list-renderer pattern at ~line 133:
     * a row is currently pinned iff pinned_until is set AND in the future. */
    pinInput.checked = !!(existingRow && existingRow.pinned_until && new Date(existingRow.pinned_until) > new Date());
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

    // Live preview updates — match real ht_announcements schema
    function updatePreview() {
      if (typeof window._htRenderDuyuruPreviewCard !== 'function') return;
      var fakeMedia = queuedMedia.map(function (m, idx) {
        return {
          storage_path: m.tempId,
          media_type: m.mediaType,
          order_index: idx,
          alt_text: ''
        };
      });
      /* Link is stored as a media row (media_type='link') in the schema. */
      if (linkInput.value) {
        fakeMedia.push({
          media_type: 'link',
          external_url: linkInput.value,
          alt_text: linkTitleInput.value || '',
          order_index: fakeMedia.length
        });
      }
      var objectUrlMap = {};
      queuedMedia.forEach(function (m) { objectUrlMap[m.tempId] = m.objectUrl; });
      var fakePost = {
        id: (existingRow && existingRow.id) || 'preview',
        title: titleInput.value,
        body_md: bodyTA.value,
        category: catSelect.value,
        campaign_type: campTypeSelect.value || null,
        /* Schema: pinned_until timestamptz — ISO string when pinned, null otherwise */
        pinned_until: pinInput.checked ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
        published_at: new Date().toISOString(),
        media: fakeMedia,
        cta_url: ctaInput.value,
        cta_label: ctaLbInput.value,
        like_count: (existingRow && existingRow.like_count) || 0,
        liked_by_me: false
      };
      window._htRenderDuyuruPreviewCard(fakePost, objectUrlMap, previewHost);
    }

    campTypeSelect.addEventListener('change', updatePreview);
    titleInput.addEventListener('input', updatePreview);
    bodyTA.addEventListener('input', updatePreview);
    catSelect.addEventListener('change', updatePreview);
    pinInput.addEventListener('change', updatePreview);
    linkInput.addEventListener('input', updatePreview);
    linkTitleInput.addEventListener('input', updatePreview);
    ctaInput.addEventListener('input', updatePreview);
    ctaLbInput.addEventListener('input', updatePreview);
    updatePreview();

    /* Edit mode: hydrate existing media rows into queuedMedia + thumbnails.
     * Async after modal is mounted so UI is responsive.
     *
     * Race guard (Codex K034 review H2 pass 2):
     *   - mediaInput is disabled during hydrate so user cannot push new items
     *     BEFORE existing rows are in queuedMedia. If we allowed it, new
     *     uploads would get order_index 0..N while existing DB rows already
     *     occupy 0..M → collision on ht_announcement_media.
     *   - hydratePromise is also awaited in save() as a belt-and-braces
     *     guard; disabling the input is the primary fix.
     */
    var hydratePromise = null;
    var hydrateHint = null;
    if (existingRow && existingRow.id) {
      mediaInput.disabled = true;
      hydrateHint = txt('div', 'ht-composer__hydrate-hint', 'Mevcut medya yukleniyor...');
      if (mediaRow.parentNode) mediaRow.parentNode.insertBefore(hydrateHint, mediaRow);

      hydratePromise = (async function hydrateExistingMedia() {
        try {
          var supa = getSupa();
          if (!supa) return;
          var res = await supa.from('ht_announcement_media')
            .select('id, media_type, storage_path, external_url, order_index')
            .eq('announcement_id', existingRow.id)
            .order('order_index', { ascending: true });
          if (res.error) {
            console.warn('[ann] existing media fetch failed:', res.error.message);
            return;
          }
          var rows = res.data || [];
          var paths = [];
          for (var ri = 0; ri < rows.length; ri++) {
            if (rows[ri].storage_path) paths.push(rows[ri].storage_path);
          }
          var signedMap = {};
          if (paths.length && window.HT && typeof window.HT.signStorageUrls === 'function') {
            try { signedMap = await window.HT.signStorageUrls(paths, 3600); }
            catch (e) { console.warn('[ann] sign existing media failed:', e && e.message); }
          }
          for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            if (r.media_type === 'link') {
              existingLinkIds.push(r.id);
              if (!linkInput.value && r.external_url) linkInput.value = r.external_url;
              continue;
            }
            var item = {
              tempId: r.id,
              file: null,
              objectUrl: signedMap[r.storage_path] || '',
              storagePath: r.storage_path,
              mediaType: r.media_type,
              uploaded: true,
              failed: false,
              existingMediaId: r.id
            };
            queuedMedia.push(item);
            appendThumb(mediaRow, item, queuedMedia, updatePreview, deletedExistingMedia);
          }
          updatePreview();
        } finally {
          /* Re-enable input and drop the hint regardless of success. */
          mediaInput.disabled = false;
          if (hydrateHint && hydrateHint.parentNode) {
            hydrateHint.parentNode.removeChild(hydrateHint);
          }
        }
      })();
    }

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
        /* Race guard: wait for hydrate to finish before touching queuedMedia
         * in the upload loop, otherwise existing rows can duplicate or
         * scramble order_index (Codex K034 review H2). */
        if (hydratePromise) {
          try { await hydratePromise; } catch (e) { /* hydrate already logged */ }
        }

        // Get admin user id
        var userRes = await supa.auth.getUser();
        var adminId = userRes && userRes.data && userRes.data.user && userRes.data.user.id;
        if (!adminId) throw new Error('Admin kimli\u011Fi al\u0131namad\u0131');

        /* K030 FAZ C hotfix: payload must match actual schema
         * ht_announcements has: admin_id, title, body_md, category, cta_url,
         * cta_label, pinned_until (timestamptz), is_active (bool), published_at.
         * Links go to ht_announcement_media with media_type='link'. */
        var payload = {
          title: titleInput.value.trim(),
          category: catSelect.value,
          campaign_type: campTypeSelect.value || null,
          body_md: bodyTA.value,
          is_active: targetStatus === 'published',
          pinned_until: pinInput.checked ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
          cta_url: ctaInput.value || null,
          cta_label: ctaLbInput.value || null
        };

        var postId;
        if (existingRow && existingRow.id) {
          /* First publish of an existing draft — stamp published_at so
           * feed sort and "az once" labels are accurate (Codex K034
           * FAZ D review Medium). Subsequent edits preserve the
           * original publish moment. */
          if (targetStatus === 'published' && !existingRow.published_at) {
            payload.published_at = new Date().toISOString();
          }
          var upd = await supa.from('ht_announcements').update(payload).eq('id', existingRow.id).select().maybeSingle();
          if (upd.error) throw upd.error;
          /* Sync the local closure so a media-error retry (modal stays
           * open, user re-clicks Yayinla) does not overwrite the original
           * publish moment on the second round-trip. Codex FAZ D pass 2. */
          if (upd.data && upd.data.published_at) {
            existingRow.published_at = upd.data.published_at;
          } else if (payload.published_at) {
            existingRow.published_at = payload.published_at;
          }
          postId = existingRow.id;
        } else {
          payload.admin_id = adminId;
          if (targetStatus === 'published') payload.published_at = new Date().toISOString();
          var ins = await supa.from('ht_announcements').insert(payload).select().maybeSingle();
          if (ins.error) throw ins.error;
          postId = ins.data && ins.data.id;
          /* Closure sync: if media upload fails after this INSERT the composer
           * stays open and the admin may click "Tekrar Yayinla". Without this
           * reassignment, existingRow remains null on retry → the save() path
           * re-enters the INSERT branch and writes a duplicate ht_announcements
           * row, leaving already-uploaded media orphaned on POST_1 and new
           * media attached to POST_2. Reassigning here forces the retry to
           * take the UPDATE branch (idempotent by id). Mirrors the UPDATE
           * branch's published_at sync above. Ultrareview R2. */
          existingRow = Object.assign({}, payload, {
            id: postId,
            published_at: (ins.data && ins.data.published_at) || payload.published_at || null
          });
        }

        /* Aggregate non-fatal errors — surface to user at end, keep modal
         * open so they can retry instead of losing work silently. */
        var mediaErrors = [];

        /* Edit: delete existing media rows user removed during session.
         * Removes DB row + storage object (for image/video). Storage failures
         * are surfaced to mediaErrors so orphans do not silently accumulate
         * (Codex K034 review M3). */
        for (var ddi = 0; ddi < deletedExistingMedia.length; ddi++) {
          var dd = deletedExistingMedia[ddi];
          var delRow = await supa.from('ht_announcement_media').delete().eq('id', dd.id);
          if (delRow.error) {
            console.error('[ann] delete media row:', delRow.error.message);
            mediaErrors.push('Eski medya silinemedi: ' + delRow.error.message);
          }
          if (dd.storage_path) {
            var delObj = await supa.storage.from('cvs').remove([dd.storage_path]);
            if (delObj.error) {
              console.error('[ann] delete storage:', delObj.error.message);
              mediaErrors.push('Eski dosya storage\'dan silinemedi: ' + delObj.error.message);
            }
          }
        }

        /* Edit: clean up old link rows before reinserting fresh one.
         * Avoids duplicate link rows accumulating on repeat edits. */
        for (var eli = 0; eli < existingLinkIds.length; eli++) {
          var delLink = await supa.from('ht_announcement_media').delete().eq('id', existingLinkIds[eli]);
          if (delLink.error) {
            console.error('[ann] delete old link:', delLink.error.message);
            mediaErrors.push('Eski link silinemedi: ' + delLink.error.message);
          }
        }

        /* order_index base: query current max from DB (AFTER deletes) so new
         * rows always land at a fresh offset. Hydrate success/failure no
         * longer affects ordering — even if hydrate returned early with an
         * empty queuedMedia, the DB still reflects true existing indices
         * (Codex K034 review H2 pass 3).
         *
         * Pass 4: if the max query fails we must abort — falling back to 0
         * reopens the collision window Codex flagged. Throw so the outer
         * try/catch surfaces the error and the modal stays open for retry.
         *
         * Known limitation: max read + inserts are two round trips with no
         * transactional lock. A concurrent admin insert between them could
         * still collide. Single-admin usage makes this acceptable for now;
         * real fix is an append-media RPC (SECURITY DEFINER) — backlog.
         */
        var baseOrderIndex = 0;
        if (existingRow && existingRow.id) {
          var maxRes = await supa.from('ht_announcement_media')
            .select('order_index')
            .eq('announcement_id', postId)
            .order('order_index', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (maxRes.error) {
            throw new Error('Siralama tabani alinamadi: ' + maxRes.error.message);
          }
          if (maxRes.data && typeof maxRes.data.order_index === 'number') {
            baseOrderIndex = maxRes.data.order_index + 1;
          }
        }

        /* Upload queued media that are not yet uploaded.
         * Retry-safe: m.storagePath is set after storage success; m.uploaded
         * only after DB insert success. On retry (second Yayinla press),
         * files already in storage skip re-upload and retry DB insert only —
         * prevents orphan blobs in cvs/announcements/ (Codex K034 review H1). */
        for (var mi = 0; mi < queuedMedia.length; mi++) {
          var m = queuedMedia[mi];
          if (m.uploaded) continue;

          if (!m.storagePath) {
            var ext = extFromFile(m.file);
            var path = 'announcements/' + adminId + '/' + postId + '/' + uuid() + '.' + ext;
            var up = await supa.storage.from('cvs').upload(path, m.file, { contentType: m.file.type, upsert: false });
            if (up.error) {
              console.error('[ann] media upload failed:', up.error.message);
              mediaErrors.push('Dosya yuklenemedi (' + (m.file && m.file.name) + '): ' + up.error.message);
              m.failed = true;
              continue;
            }
            m.storagePath = path;
          }

          var insMedia = await supa.from('ht_announcement_media').insert({
            announcement_id: postId,
            storage_path: m.storagePath,
            media_type: m.mediaType,
            order_index: baseOrderIndex + mi
            /* focal_x/focal_y use DB DEFAULT 0.5 — columns kept for backward compat */
          });
          if (insMedia.error) {
            console.error('[ann] media row insert failed:', insMedia.error.message);
            mediaErrors.push('Medya kaydi yazilamadi: ' + insMedia.error.message);
            /* Keep m.storagePath so retry reuses the already-uploaded file. */
            continue;
          }
          m.uploaded = true;
        }

        /* Link as media row (if provided) — inserted after media so the
         * link preview renders below the carousel in feed render order. */
        if (linkInput.value) {
          var linkRow = await supa.from('ht_announcement_media').insert({
            announcement_id: postId,
            media_type: 'link',
            external_url: linkInput.value,
            order_index: baseOrderIndex + queuedMedia.length
          });
          if (linkRow.error) {
            console.error('[ann] link insert failed:', linkRow.error.message);
            mediaErrors.push('Link eklenemedi: ' + linkRow.error.message);
          }
        }

        /* Surface aggregated media errors BEFORE closing modal. User keeps
         * their work; can retry or copy the error for debugging. */
        if (mediaErrors.length > 0) {
          window.alert('Duyuru metni kaydedildi ama medya tarafinda sorun cikti:\n\n' + mediaErrors.join('\n') + '\n\nTekrar Yayinla\'ya basabilirsin.');
          publishBtn.disabled = false;
          draftBtn.disabled = false;
          return;
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

  function appendThumb(row, item, queue, onChange, deletedList) {
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

    /* K030 FAZ C final: focal click UX removed. Feed renders each image at
     * its natural aspect ratio (max-height 640px). focal_x/focal_y DB columns
     * stay as dormant backward-compat data (DEFAULT 0.5). */

    var remove = txt('button', 'ht-composer__media-remove', '\u00D7');
    remove.type = 'button';
    remove.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (item.existingMediaId && deletedList) {
        /* Existing DB row — defer delete to save(). Do NOT revoke objectUrl
         * (it's a signed URL, not a blob). */
        deletedList.push({ id: item.existingMediaId, storage_path: item.storagePath });
      } else {
        try { URL.revokeObjectURL(item.objectUrl); } catch (e) { /* ignore */ }
      }
      var idx = queue.indexOf(item);
      if (idx > -1) queue.splice(idx, 1);
      thumb.remove();
      if (typeof onChange === 'function') onChange();
    });
    thumb.appendChild(remove);
    row.appendChild(thumb);
  }

  function cleanupObjectUrls(queue) {
    /* Revoke only real blob: URLs created via URL.createObjectURL.
     * Hydrated existing media uses https signed URLs — revoking those is
     * a no-op under the hood but we guard by prefix to keep the contract
     * explicit (Codex K034 review L4). */
    for (var i = 0; i < queue.length; i++) {
      var u = queue[i] && queue[i].objectUrl;
      if (typeof u === 'string' && u.indexOf('blob:') === 0) {
        try { URL.revokeObjectURL(u); } catch (e) { /* ignore */ }
      }
    }
  }

  /* ── Mount ───────────────────────────────────────────────────── */
  function mount(containerEl) {
    if (!containerEl) return;
    while (containerEl.firstChild) containerEl.removeChild(containerEl.firstChild);

    /* K030 FAZ C hotfix: admin.html zaten <h2>Duyurular</h2> rendering yapiyor,
     * ayni basligi toolbar'da tekrarlamiyoruz (duplicate heading fix). */
    var toolbar = el('div', 'ht-ann-admin__toolbar');
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
