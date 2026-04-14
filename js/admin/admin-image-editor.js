/*!
 * HelloTalent Admin Image Editor (K038 Faz 2)
 * LinkedIn-style crop/zoom/rotate/flip modal built on Cropper.js 1.6.2.
 * Safari-safe: IIFE + var only, no const/let/arrow at top level.
 * Exposes: window.htImageEditor.open(options), window.htImageEditor.upload(blob, path)
 */
(function () {
  'use strict';

  var ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  var MAX_FILE_BYTES = 5 * 1024 * 1024;

  function supportsWebP() {
    try {
      var c = document.createElement('canvas');
      if (!c || !c.toDataURL) return false;
      return c.toDataURL('image/webp').indexOf('image/webp') === 5;
    } catch (e) {
      return false;
    }
  }

  function showToast(msg) {
    try {
      if (window._htToast && typeof window._htToast === 'function') {
        window._htToast(msg);
        return;
      }
    } catch (e) {}
    try {
      var t = document.createElement('div');
      t.className = 'hied-toast';
      t.textContent = msg;
      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1E2D5E;color:#fff;padding:12px 20px;border-radius:8px;font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;z-index:100000;box-shadow:0 8px 32px rgba(0,0,0,.24)';
      document.body.appendChild(t);
      setTimeout(function () {
        if (t.parentNode) t.parentNode.removeChild(t);
      }, 3200);
    } catch (e) {}
  }

  function validateFile(file) {
    if (!file) {
      showToast('Dosya seçilmedi');
      return false;
    }
    if (ALLOWED_MIME.indexOf(file.type) === -1) {
      showToast('JPG, PNG veya WebP yükleyin');
      return false;
    }
    if (file.size > MAX_FILE_BYTES) {
      showToast("Dosya boyutu 5 MB'ı aşmamalı");
      return false;
    }
    return true;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function buildModal(options) {
    var overlay = el('div', 'hied-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Görseli düzenle');

    var panel = el('div', 'hied-panel');

    // Header
    var header = el('div', 'hied-panel__header');
    var title = el('h2', 'hied-panel__title', 'Görseli düzenle');
    var closeBtn = el('button', 'hied-panel__close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Kapat');
    header.appendChild(title);
    header.appendChild(closeBtn);

    // Body
    var body = el('div', 'hied-panel__body');
    var canvasWrap = el('div', 'hied-canvas-wrap');
    var img = el('img', 'hied-img');
    img.alt = '';
    canvasWrap.appendChild(img);

    var sidebar = el('div', 'hied-sidebar');

    // Zoom section
    var zoomSec = el('div', 'hied-section');
    var zoomLabel = el('div', 'hied-label', 'Zoom');
    var zoomSlider = document.createElement('input');
    zoomSlider.type = 'range';
    zoomSlider.min = '0.1';
    zoomSlider.max = '3';
    zoomSlider.step = '0.01';
    zoomSlider.value = '1';
    zoomSlider.className = 'hied-slider';
    zoomSlider.setAttribute('aria-label', 'Zoom');
    zoomSec.appendChild(zoomLabel);
    zoomSec.appendChild(zoomSlider);

    // Rotate section
    var rotSec = el('div', 'hied-section');
    var rotLabel = el('div', 'hied-label', 'Döndür');
    var rotRow = el('div', 'hied-tool-row');
    var btnRotL = el('button', 'hied-tool-btn', '⟲');
    btnRotL.type = 'button';
    btnRotL.setAttribute('aria-label', '90 sola döndür');
    btnRotL.title = 'Sola döndür';
    var btnRotR = el('button', 'hied-tool-btn', '⟳');
    btnRotR.type = 'button';
    btnRotR.setAttribute('aria-label', '90 sağa döndür');
    btnRotR.title = 'Sağa döndür';
    var btnFlipH = el('button', 'hied-tool-btn', '↔');
    btnFlipH.type = 'button';
    btnFlipH.setAttribute('aria-label', 'Yatay aynala');
    btnFlipH.title = 'Yatay aynala';
    var btnFlipV = el('button', 'hied-tool-btn', '↕');
    btnFlipV.type = 'button';
    btnFlipV.setAttribute('aria-label', 'Dikey aynala');
    btnFlipV.title = 'Dikey aynala';
    rotRow.appendChild(btnRotL);
    rotRow.appendChild(btnRotR);
    rotRow.appendChild(btnFlipH);
    rotRow.appendChild(btnFlipV);
    rotSec.appendChild(rotLabel);
    rotSec.appendChild(rotRow);

    // Straighten section
    var strSec = el('div', 'hied-section');
    var strLabel = el('div', 'hied-label', 'Düzelt');
    var strSlider = document.createElement('input');
    strSlider.type = 'range';
    strSlider.min = '-45';
    strSlider.max = '45';
    strSlider.step = '0.5';
    strSlider.value = '0';
    strSlider.className = 'hied-slider';
    strSlider.setAttribute('aria-label', 'Düzelt');
    strSec.appendChild(strLabel);
    strSec.appendChild(strSlider);

    sidebar.appendChild(zoomSec);
    sidebar.appendChild(rotSec);
    sidebar.appendChild(strSec);

    body.appendChild(canvasWrap);
    body.appendChild(sidebar);

    // Footer
    var footer = el('div', 'hied-panel__footer');
    var cancelBtn = el('button', 'hied-cancel', 'Vazgeç');
    cancelBtn.type = 'button';
    var saveBtn = el('button', 'hied-save', 'Kaydet');
    saveBtn.type = 'button';
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);
    overlay.appendChild(panel);

    return {
      overlay: overlay,
      panel: panel,
      img: img,
      closeBtn: closeBtn,
      cancelBtn: cancelBtn,
      saveBtn: saveBtn,
      zoomSlider: zoomSlider,
      strSlider: strSlider,
      btnRotL: btnRotL,
      btnRotR: btnRotR,
      btnFlipH: btnFlipH,
      btnFlipV: btnFlipV
    };
  }

  function htImageEditor(options) {
    if (!validateFile(options && options.file)) {
      if (options && typeof options.onCancel === 'function') {
        try { options.onCancel(); } catch (e) {}
      }
      return;
    }

    if (typeof window.Cropper !== 'function') {
      showToast('Editör yüklenemedi');
      console.error('[htImageEditor] Cropper.js not loaded');
      if (typeof options.onCancel === 'function') {
        try { options.onCancel(); } catch (e) {}
      }
      return;
    }

    var aspectRatio = options.aspectRatio || 1;
    var outW = options.outputWidth || 1024;
    var outH = options.outputHeight || 1024;
    var fmtPref = options.outputFormat || 'webp';
    var quality = typeof options.quality === 'number' ? options.quality : 0.9;
    var useWebP = fmtPref === 'webp' && supportsWebP();
    var outMime = useWebP ? 'image/webp' : 'image/jpeg';

    var objectUrl = URL.createObjectURL(options.file);
    var dom = buildModal(options);
    var cropper = null;
    var dirty = false;
    var scaleX = 1;
    var scaleY = 1;
    var closed = false;

    dom.img.src = objectUrl;
    document.body.appendChild(dom.overlay);

    function cleanup() {
      if (closed) return;
      closed = true;
      try { if (cropper) cropper.destroy(); } catch (e) {}
      try { URL.revokeObjectURL(objectUrl); } catch (e) {}
      if (dom.overlay.parentNode) dom.overlay.parentNode.removeChild(dom.overlay);
      document.removeEventListener('keydown', onKey);
    }

    function doCancel() {
      if (dirty) {
        if (!window.confirm('Değişiklikler kaydedilmedi. Çıkmak istiyor musunuz?')) return;
      }
      cleanup();
      if (typeof options.onCancel === 'function') {
        try { options.onCancel(); } catch (e) {}
      }
    }

    function doSave() {
      if (!cropper) return;
      try {
        var srcCanvas = cropper.getCroppedCanvas({
          width: outW,
          height: outH,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
          fillColor: '#ffffff'
        });
        if (!srcCanvas) {
          showToast('Kırpılmış görsel oluşturulamadı');
          return;
        }
        // Manual white-flatten: Cropper.fillColor is ignored for alpha
        // formats (WebP/PNG). Compose a fresh canvas with explicit white
        // bg, then draw the cropped output on top so transparent areas
        // become baked white. Brand logo boxes always render solid.
        var canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(srcCanvas, 0, 0, outW, outH);
        var dataUrl = canvas.toDataURL(outMime, quality);
        canvas.toBlob(function (blob) {
          if (!blob) {
            showToast('Görsel kaydedilemedi');
            return;
          }
          cleanup();
          if (typeof options.onSave === 'function') {
            try { options.onSave(blob, dataUrl); } catch (e) { console.error(e); }
          }
        }, outMime, quality);
      } catch (e) {
        console.error('[htImageEditor] save error', e);
        showToast('Görsel kaydedilemedi');
      }
    }

    function onKey(ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        doCancel();
      }
    }

    dom.closeBtn.addEventListener('click', doCancel);
    dom.cancelBtn.addEventListener('click', doCancel);
    dom.overlay.addEventListener('click', function (ev) {
      if (ev.target === dom.overlay) doCancel();
    });
    dom.saveBtn.addEventListener('click', doSave);
    document.addEventListener('keydown', onKey);

    dom.img.addEventListener('load', function () {
      try {
        cropper = new window.Cropper(dom.img, {
          aspectRatio: aspectRatio,
          viewMode: 1,
          dragMode: 'move',
          autoCropArea: 0.9,
          background: false,
          responsive: true,
          checkOrientation: true,
          guides: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false
        });
      } catch (e) {
        console.error('[htImageEditor] cropper init failed', e);
        showToast('Editör başlatılamadı');
        cleanup();
      }
    });

    dom.zoomSlider.addEventListener('input', function () {
      if (!cropper) return;
      dirty = true;
      try { cropper.zoomTo(parseFloat(dom.zoomSlider.value)); } catch (e) {}
    });

    dom.strSlider.addEventListener('input', function () {
      if (!cropper) return;
      dirty = true;
      try { cropper.rotateTo(parseFloat(dom.strSlider.value)); } catch (e) {}
    });

    dom.btnRotL.addEventListener('click', function () {
      if (!cropper) return;
      dirty = true;
      try { cropper.rotate(-90); } catch (e) {}
    });
    dom.btnRotR.addEventListener('click', function () {
      if (!cropper) return;
      dirty = true;
      try { cropper.rotate(90); } catch (e) {}
    });
    dom.btnFlipH.addEventListener('click', function () {
      if (!cropper) return;
      dirty = true;
      scaleX = scaleX * -1;
      try { cropper.scaleX(scaleX); } catch (e) {}
    });
    dom.btnFlipV.addEventListener('click', function () {
      if (!cropper) return;
      dirty = true;
      scaleY = scaleY * -1;
      try { cropper.scaleY(scaleY); } catch (e) {}
    });
  }

  function uploadBlob(blob, bucketPath) {
    var supa = window._htAdminSupa;
    if (!supa || !supa.storage) {
      throw new Error('Admin Supabase client bulunamadı');
    }
    if (!blob) throw new Error('Blob boş');
    if (!bucketPath) throw new Error('Hedef yol boş');
    return supa.storage
      .from('brand-assets')
      .upload(bucketPath, blob, { upsert: true, contentType: blob.type })
      .then(function (res) {
        if (res && res.error) throw res.error;
        var pub = supa.storage.from('brand-assets').getPublicUrl(bucketPath);
        return pub && pub.data && pub.data.publicUrl ? pub.data.publicUrl : null;
      });
  }

  window.htImageEditor = {
    open: htImageEditor,
    upload: uploadBlob,
    _supportsWebP: supportsWebP,
    _version: '1.0.0'
  };
})();
