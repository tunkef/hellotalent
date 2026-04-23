/* global currentUser, STORAGE, setAvatarImage, supabase, ht_track */
'use strict';
/* ═══════════════════════════════════════════════════════════════════
   TF4 — Avatar Cropper Modal (custom, brand-native)
   ───────────────────────────────────────────────────────────────────
   Kendi canvas tabanli cropper — Cropper.js bagimliligi yok.
   - Circular crop overlay (avatar yansimasi)
   - Zoom slider (min: fit, max: 3x original)
   - Pan (drag) — mouse + touch (tek parmak)
   - Pinch-to-zoom (cift parmak touch)
   - Brand stil: Clatu editorial, dark mode token-driven
   - ARIA dialog semantik (role/aria-modal/aria-labelledby)
   - Output: 512x512 JPEG blob (avatar path'e upload)

   Expose: window._htOpenAvatarCropper(file, onComplete)
     onComplete(err, { blob, displayUrl }) — blob upload edildi, displayUrl hazir
   ═══════════════════════════════════════════════════════════════════ */

(function() {
  var OUTPUT_SIZE = 512;          // 1:1 kare, circular render
  var VIEWPORT_SIZE = 360;        // modal icinde canvas gorsel boyut
  var MAX_ZOOM = 3;
  var MIN_ZOOM = 1;

  var state = {
    file: null,
    image: null,
    scale: 1,
    minScale: 1,
    maxScale: MAX_ZOOM,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartOffsetX: 0,
    dragStartOffsetY: 0,
    pinchStartDist: 0,
    pinchStartScale: 1,
    onComplete: null
  };

  var dom = null; // built lazily on first open

  function buildModal() {
    var overlay = document.createElement('div');
    overlay.id = 'avatar-cropper-overlay';
    overlay.className = 'avc-overlay';

    var modal = document.createElement('div');
    modal.className = 'avc-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'avc-title');

    var head = document.createElement('div');
    head.className = 'avc-head';
    var title = document.createElement('h2');
    title.id = 'avc-title';
    title.className = 'avc-title';
    title.textContent = 'Profil fotoğrafını düzenle';
    var sub = document.createElement('p');
    sub.className = 'avc-sub';
    sub.textContent = 'Fotoğrafı hareket ettir ve yakınlaştır. Dairenin içinde kalan alan kaydedilir.';
    head.appendChild(title);
    head.appendChild(sub);

    // Canvas + circular overlay
    var stage = document.createElement('div');
    stage.className = 'avc-stage';
    stage.style.width = VIEWPORT_SIZE + 'px';
    stage.style.height = VIEWPORT_SIZE + 'px';

    var canvas = document.createElement('canvas');
    canvas.className = 'avc-canvas';
    canvas.width = VIEWPORT_SIZE;
    canvas.height = VIEWPORT_SIZE;
    canvas.setAttribute('aria-label', 'Fotoğraf önizlemesi');

    var mask = document.createElement('div');
    mask.className = 'avc-mask';
    mask.setAttribute('aria-hidden', 'true');

    stage.appendChild(canvas);
    stage.appendChild(mask);

    // Zoom slider
    var controls = document.createElement('div');
    controls.className = 'avc-controls';

    var zoomLabel = document.createElement('label');
    zoomLabel.className = 'avc-zoom-label';
    zoomLabel.htmlFor = 'avc-zoom';
    zoomLabel.textContent = 'Yakınlaştırma';

    var zoomRow = document.createElement('div');
    zoomRow.className = 'avc-zoom-row';

    var zoomOut = document.createElement('button');
    zoomOut.type = 'button';
    zoomOut.className = 'avc-zoom-btn';
    zoomOut.setAttribute('aria-label', 'Uzaklaştır');
    zoomOut.textContent = '−';

    var zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.id = 'avc-zoom';
    zoom.className = 'avc-zoom-slider';
    zoom.min = '1';
    zoom.max = '300';
    zoom.step = '1';
    zoom.value = '100';

    var zoomIn = document.createElement('button');
    zoomIn.type = 'button';
    zoomIn.className = 'avc-zoom-btn';
    zoomIn.setAttribute('aria-label', 'Yakınlaştır');
    zoomIn.textContent = '+';

    zoomRow.appendChild(zoomOut);
    zoomRow.appendChild(zoom);
    zoomRow.appendChild(zoomIn);

    controls.appendChild(zoomLabel);
    controls.appendChild(zoomRow);

    // Action buttons
    var actions = document.createElement('div');
    actions.className = 'avc-actions';
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'ht-btn ht-btn--secondary avc-cancel';
    cancelBtn.textContent = 'Vazgeç';
    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'ht-btn ht-btn--primary avc-save';
    saveBtn.textContent = 'Kaydet';
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);

    var msgEl = document.createElement('div');
    msgEl.className = 'avc-msg';
    msgEl.setAttribute('aria-live', 'polite');

    modal.appendChild(head);
    modal.appendChild(stage);
    modal.appendChild(controls);
    modal.appendChild(msgEl);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    return {
      overlay: overlay,
      modal: modal,
      canvas: canvas,
      ctx: canvas.getContext('2d'),
      zoomSlider: zoom,
      zoomOutBtn: zoomOut,
      zoomInBtn: zoomIn,
      cancelBtn: cancelBtn,
      saveBtn: saveBtn,
      msgEl: msgEl
    };
  }

  function render() {
    if (!dom || !state.image) return;
    var ctx = dom.ctx;
    var img = state.image;
    var scale = state.scale;

    ctx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);
    ctx.fillStyle = '#0B0F1C';
    ctx.fillRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);

    var w = img.naturalWidth * scale;
    var h = img.naturalHeight * scale;
    var cx = VIEWPORT_SIZE / 2 + state.offsetX;
    var cy = VIEWPORT_SIZE / 2 + state.offsetY;

    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  }

  function computeMinScale(imgW, imgH) {
    // Viewport'u tam dolduracak min scale (circle alanini kapla)
    return Math.max(VIEWPORT_SIZE / imgW, VIEWPORT_SIZE / imgH);
  }

  function clampOffset() {
    // Offset limit: circular mask center'da kalmalı, resim mask disina kaymamali
    var w = state.image.naturalWidth * state.scale;
    var h = state.image.naturalHeight * state.scale;
    var maxX = Math.max(0, (w - VIEWPORT_SIZE) / 2);
    var maxY = Math.max(0, (h - VIEWPORT_SIZE) / 2);
    state.offsetX = Math.max(-maxX, Math.min(maxX, state.offsetX));
    state.offsetY = Math.max(-maxY, Math.min(maxY, state.offsetY));
  }

  function setScale(newScale) {
    var clamped = Math.max(state.minScale, Math.min(state.maxScale, newScale));
    state.scale = clamped;
    // Slider senkron
    var sliderVal = Math.round(((clamped - state.minScale) / (state.maxScale - state.minScale)) * 299 + 1);
    dom.zoomSlider.value = sliderVal;
    clampOffset();
    render();
  }

  function loadImage(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() { resolve(img); };
        img.onerror = function() { reject(new Error('Görsel yüklenemedi.')); };
        img.src = e.target.result;
      };
      reader.onerror = function() { reject(new Error('Dosya okunamadı.')); };
      reader.readAsDataURL(file);
    });
  }

  function cropToBlob() {
    return new Promise(function(resolve, reject) {
      var out = document.createElement('canvas');
      out.width = OUTPUT_SIZE;
      out.height = OUTPUT_SIZE;
      var octx = out.getContext('2d');
      octx.fillStyle = '#FFFFFF';
      octx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      // Viewport'tan output ratio
      var img = state.image;
      var scale = state.scale;
      var w = img.naturalWidth * scale;
      var h = img.naturalHeight * scale;
      var cx = VIEWPORT_SIZE / 2 + state.offsetX;
      var cy = VIEWPORT_SIZE / 2 + state.offsetY;

      var ratio = OUTPUT_SIZE / VIEWPORT_SIZE;
      octx.drawImage(
        img,
        (cx - w / 2) * ratio,
        (cy - h / 2) * ratio,
        w * ratio,
        h * ratio
      );

      out.toBlob(function(blob) {
        if (!blob) { reject(new Error('Kırpma başarısız.')); return; }
        resolve(blob);
      }, 'image/jpeg', 0.92);
    });
  }

  function attachEvents() {
    var canvas = dom.canvas;

    // Mouse drag
    canvas.addEventListener('mousedown', function(e) {
      state.dragging = true;
      state.dragStartX = e.clientX;
      state.dragStartY = e.clientY;
      state.dragStartOffsetX = state.offsetX;
      state.dragStartOffsetY = state.offsetY;
    });
    window.addEventListener('mousemove', function(e) {
      if (!state.dragging) return;
      state.offsetX = state.dragStartOffsetX + (e.clientX - state.dragStartX);
      state.offsetY = state.dragStartOffsetY + (e.clientY - state.dragStartY);
      clampOffset();
      render();
    });
    window.addEventListener('mouseup', function() { state.dragging = false; });

    // Touch (tek + cift parmak)
    canvas.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        state.dragging = true;
        state.dragStartX = e.touches[0].clientX;
        state.dragStartY = e.touches[0].clientY;
        state.dragStartOffsetX = state.offsetX;
        state.dragStartOffsetY = state.offsetY;
      } else if (e.touches.length === 2) {
        state.dragging = false;
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        state.pinchStartDist = Math.hypot(dx, dy);
        state.pinchStartScale = state.scale;
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', function(e) {
      if (e.touches.length === 1 && state.dragging) {
        state.offsetX = state.dragStartOffsetX + (e.touches[0].clientX - state.dragStartX);
        state.offsetY = state.dragStartOffsetY + (e.touches[0].clientY - state.dragStartY);
        clampOffset();
        render();
      } else if (e.touches.length === 2) {
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        var d = Math.hypot(dx, dy);
        if (state.pinchStartDist > 0) {
          setScale(state.pinchStartScale * (d / state.pinchStartDist));
        }
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', function() { state.dragging = false; });

    // Wheel zoom
    canvas.addEventListener('wheel', function(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -0.05 : 0.05;
      setScale(state.scale + delta);
    }, { passive: false });

    // Zoom slider
    dom.zoomSlider.addEventListener('input', function() {
      var v = parseInt(dom.zoomSlider.value, 10);
      var pct = (v - 1) / 299;
      var s = state.minScale + pct * (state.maxScale - state.minScale);
      state.scale = s;
      clampOffset();
      render();
    });

    // Zoom buttons
    dom.zoomOutBtn.addEventListener('click', function() { setScale(state.scale - 0.1); });
    dom.zoomInBtn.addEventListener('click', function() { setScale(state.scale + 0.1); });

    // Cancel
    dom.cancelBtn.addEventListener('click', function() { close(); });
    // ESC key
    document.addEventListener('keydown', escHandler);

    // Save
    dom.saveBtn.addEventListener('click', handleSave);
  }

  function escHandler(e) {
    if (e.key === 'Escape' && dom && dom.overlay && dom.overlay.classList.contains('is-open')) {
      close();
    }
  }

  async function handleSave() {
    if (!state.image) return;
    var origText = dom.saveBtn.textContent;
    dom.saveBtn.disabled = true;
    dom.saveBtn.textContent = 'Kaydediliyor...';
    dom.cancelBtn.disabled = true;
    dom.msgEl.textContent = '';
    dom.msgEl.style.display = 'none';

    try {
      var blob = await cropToBlob();
      var done = state.onComplete;
      close();
      if (typeof done === 'function') done(null, { blob: blob });
    } catch (e) {
      dom.msgEl.textContent = 'Hata: ' + (e.message || 'Kaydedilemedi.');
      dom.msgEl.style.display = 'block';
      dom.saveBtn.disabled = false;
      dom.saveBtn.textContent = origText;
      dom.cancelBtn.disabled = false;
    }
  }

  function close() {
    if (!dom) return;
    dom.overlay.classList.remove('is-open');
    state.image = null;
    state.file = null;
    state.onComplete = null;
  }

  async function open(file, onComplete) {
    if (!dom) {
      dom = buildModal();
      attachEvents();
    }
    state.file = file;
    state.onComplete = onComplete;
    state.offsetX = 0;
    state.offsetY = 0;
    dom.msgEl.textContent = '';
    dom.msgEl.style.display = 'none';
    dom.saveBtn.disabled = false;
    dom.saveBtn.textContent = 'Kaydet';
    dom.cancelBtn.disabled = false;

    try {
      var img = await loadImage(file);
      state.image = img;
      state.minScale = computeMinScale(img.naturalWidth, img.naturalHeight);
      state.maxScale = Math.max(state.minScale * MAX_ZOOM, MAX_ZOOM);
      state.scale = state.minScale;
      dom.zoomSlider.value = '1';
      dom.overlay.classList.add('is-open');
      // Slider range reset (min=1, max=300)
      render();
    } catch (e) {
      if (typeof onComplete === 'function') onComplete(e, null);
    }
  }

  window._htOpenAvatarCropper = open;
})();
