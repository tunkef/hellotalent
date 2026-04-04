/* global ILCELER, TUR_ILLER, trLower, markWizardDirty */
// ═══════════════════════════════════════════════════
// profil-locations.js — Custom Multi-Select Location Picker
// Checkbox dropdowns with chips for il/ilçe selection.
// ═══════════════════════════════════════════════════

var selectedLocations = {}; // { cityName: [district1, district2, ...] }

// Build flat sorted city list from TUR_ILLER
var _allCitiesSorted = [];
(function() {
  var cities = [];
  Object.keys(TUR_ILLER).forEach(function(region) {
    TUR_ILLER[region].forEach(function(city) { cities.push(city); });
  });
  _allCitiesSorted = cities.sort(function(a, b) { return trLower(a).localeCompare(trLower(b), 'tr'); });
})();

// ── City Multi-Select ──────────────────────────────
function _initCityMultiSelect() {
  var container = document.getElementById('ms-city');
  if (!container) return;
  container.innerHTML = '';

  // Input wrapper
  var wrap = document.createElement('div');
  wrap.className = 'ms-input-wrap';

  var search = document.createElement('input');
  search.type = 'text';
  search.className = 'ms-search';
  search.placeholder = 'İl ara...';
  search.setAttribute('autocomplete', 'off');
  wrap.appendChild(search);

  wrap.addEventListener('click', function() {
    _openDropdown(container);
    search.focus();
  });

  container.appendChild(wrap);

  // Dropdown
  var dd = document.createElement('div');
  dd.className = 'ms-dropdown';
  dd.style.display = 'none';

  var list = document.createElement('div');
  list.className = 'ms-list';

  _allCitiesSorted.forEach(function(city) {
    var label = document.createElement('label');
    label.className = 'ms-item';

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = city;
    if (selectedLocations[city] !== undefined) cb.checked = true;

    cb.addEventListener('change', function(e) {
      if (e.target.checked) {
        if (selectedLocations[city] === undefined) {
          selectedLocations[city] = [];
        }
      } else {
        delete selectedLocations[city];
      }
      _renderCityChips();
      _rebuildDistrictDropdown();
      _toggleDistrictField();
      renderSelectedLocations();
      if (typeof markWizardDirty === 'function') markWizardDirty();
    });

    var span = document.createElement('span');
    span.textContent = city;

    label.appendChild(cb);
    label.appendChild(span);
    list.appendChild(label);
  });

  dd.appendChild(list);
  container.appendChild(dd);

  // Search filter
  search.addEventListener('input', function() {
    var q = trLower(search.value.trim());
    var items = list.querySelectorAll('.ms-item');
    for (var i = 0; i < items.length; i++) {
      var text = trLower(items[i].querySelector('span').textContent);
      items[i].style.display = text.indexOf(q) !== -1 ? '' : 'none';
    }
  });

  // Render existing chips
  _renderCityChips();
}

function _renderCityChips() {
  var container = document.getElementById('ms-city');
  if (!container) return;
  var wrap = container.querySelector('.ms-input-wrap');
  if (!wrap) return;
  var search = wrap.querySelector('.ms-search');

  // Remove old chips
  var oldChips = wrap.querySelectorAll('.ms-chip');
  for (var i = 0; i < oldChips.length; i++) {
    wrap.removeChild(oldChips[i]);
  }

  // Add chips for selected cities
  var cities = Object.keys(selectedLocations).sort(function(a, b) {
    return trLower(a).localeCompare(trLower(b), 'tr');
  });

  cities.forEach(function(city) {
    var chip = document.createElement('span');
    chip.className = 'ms-chip';

    var text = document.createElement('span');
    text.textContent = city;
    chip.appendChild(text);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '\u00D7';
    btn.setAttribute('aria-label', city + ' kaldır');
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      delete selectedLocations[city];
      // Uncheck in dropdown
      var cb = _findCityCb(city);
      if (cb) cb.checked = false;
      _renderCityChips();
      _rebuildDistrictDropdown();
      _toggleDistrictField();
      renderSelectedLocations();
      if (typeof markWizardDirty === 'function') markWizardDirty();
    });
    chip.appendChild(btn);

    wrap.insertBefore(chip, search);
  });
}

function _findCityCb(city) {
  var container = document.getElementById('ms-city');
  if (!container) return null;
  var cbs = container.querySelectorAll('.ms-item input[type=checkbox]');
  for (var i = 0; i < cbs.length; i++) {
    if (cbs[i].value === city) return cbs[i];
  }
  return null;
}

// ── District Multi-Select ──────────────────────────
function _initDistrictMultiSelect() {
  var container = document.getElementById('ms-district');
  if (!container) return;
  container.innerHTML = '';

  var wrap = document.createElement('div');
  wrap.className = 'ms-input-wrap';

  var search = document.createElement('input');
  search.type = 'text';
  search.className = 'ms-search';
  search.placeholder = 'İlçe ara...';
  search.setAttribute('autocomplete', 'off');
  wrap.appendChild(search);

  wrap.addEventListener('click', function() {
    _openDropdown(container);
    search.focus();
  });

  container.appendChild(wrap);

  var dd = document.createElement('div');
  dd.className = 'ms-dropdown';
  dd.style.display = 'none';

  var list = document.createElement('div');
  list.className = 'ms-list';
  dd.appendChild(list);
  container.appendChild(dd);

  // Search filter
  search.addEventListener('input', function() {
    var q = trLower(search.value.trim());
    var items = list.querySelectorAll('.ms-item');
    var headers = list.querySelectorAll('.ms-group-header');
    for (var i = 0; i < items.length; i++) {
      var text = trLower(items[i].querySelector('span').textContent);
      items[i].style.display = text.indexOf(q) !== -1 ? '' : 'none';
    }
    // Show/hide group headers based on visible items
    for (var h = 0; h < headers.length; h++) {
      var next = headers[h].nextElementSibling;
      var hasVisible = false;
      while (next && !next.classList.contains('ms-group-header')) {
        if (next.style.display !== 'none') hasVisible = true;
        next = next.nextElementSibling;
      }
      headers[h].style.display = hasVisible || q === '' ? '' : 'none';
    }
  });

  _rebuildDistrictDropdown();
  _toggleDistrictField();
}

function _rebuildDistrictDropdown() {
  var container = document.getElementById('ms-district');
  if (!container) return;
  var list = container.querySelector('.ms-list');
  if (!list) return;
  list.innerHTML = '';

  var cities = Object.keys(selectedLocations).sort(function(a, b) {
    return trLower(a).localeCompare(trLower(b), 'tr');
  });

  cities.forEach(function(city) {
    var districts = ILCELER[city];
    if (!districts || districts.length === 0) return;

    var header = document.createElement('div');
    header.className = 'ms-group-header';
    header.textContent = city;
    list.appendChild(header);

    var sorted = districts.slice().sort(function(a, b) {
      return trLower(a).localeCompare(trLower(b), 'tr');
    });

    sorted.forEach(function(d) {
      var label = document.createElement('label');
      label.className = 'ms-item';

      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = d;
      cb.dataset.city = city;
      if (selectedLocations[city] && selectedLocations[city].indexOf(d) !== -1) {
        cb.checked = true;
      }

      cb.addEventListener('change', function(e) {
        if (!selectedLocations[city]) selectedLocations[city] = [];
        if (e.target.checked) {
          if (selectedLocations[city].indexOf(d) === -1) {
            selectedLocations[city].push(d);
          }
        } else {
          var idx = selectedLocations[city].indexOf(d);
          if (idx !== -1) selectedLocations[city].splice(idx, 1);
        }
        _renderDistrictChips();
        renderSelectedLocations();
        if (typeof markWizardDirty === 'function') markWizardDirty();
      });

      var span = document.createElement('span');
      span.textContent = d;

      label.appendChild(cb);
      label.appendChild(span);
      list.appendChild(label);
    });
  });

  _renderDistrictChips();
}

function _renderDistrictChips() {
  var container = document.getElementById('ms-district');
  if (!container) return;
  var wrap = container.querySelector('.ms-input-wrap');
  if (!wrap) return;
  var search = wrap.querySelector('.ms-search');

  // Remove old chips
  var oldChips = wrap.querySelectorAll('.ms-chip');
  for (var i = 0; i < oldChips.length; i++) {
    wrap.removeChild(oldChips[i]);
  }

  var cities = Object.keys(selectedLocations).sort(function(a, b) {
    return trLower(a).localeCompare(trLower(b), 'tr');
  });

  cities.forEach(function(city) {
    var dists = selectedLocations[city] || [];
    dists.forEach(function(d) {
      var chip = document.createElement('span');
      chip.className = 'ms-chip';

      var text = document.createElement('span');
      text.textContent = city + ' / ' + d;
      chip.appendChild(text);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '\u00D7';
      btn.setAttribute('aria-label', d + ' kaldır');
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var idx = selectedLocations[city].indexOf(d);
        if (idx !== -1) selectedLocations[city].splice(idx, 1);
        // Uncheck in dropdown
        var cbs = container.querySelectorAll('.ms-item input[type=checkbox]');
        for (var j = 0; j < cbs.length; j++) {
          if (cbs[j].value === d && cbs[j].dataset.city === city) {
            cbs[j].checked = false;
          }
        }
        _renderDistrictChips();
        renderSelectedLocations();
        if (typeof markWizardDirty === 'function') markWizardDirty();
      });
      chip.appendChild(btn);

      wrap.insertBefore(chip, search);
    });
  });
}

function _toggleDistrictField() {
  var field = document.getElementById('district-field');
  if (!field) return;
  var hasCities = Object.keys(selectedLocations).length > 0;
  field.style.display = hasCities ? '' : 'none';
}

// ── Dropdown open/close ────────────────────────────
function _openDropdown(container) {
  var dd = container.querySelector('.ms-dropdown');
  if (dd) dd.style.display = '';
}

function _closeDropdown(container) {
  var dd = container.querySelector('.ms-dropdown');
  if (dd) dd.style.display = 'none';
  // Clear search
  var search = container.querySelector('.ms-search');
  if (search) {
    search.value = '';
    // Show all items
    var items = container.querySelectorAll('.ms-item');
    for (var i = 0; i < items.length; i++) items[i].style.display = '';
    var headers = container.querySelectorAll('.ms-group-header');
    for (var h = 0; h < headers.length; h++) headers[h].style.display = '';
  }
}

// Close dropdowns on outside click
(function() {
  document.addEventListener('click', function(e) {
    var cityContainer = document.getElementById('ms-city');
    var distContainer = document.getElementById('ms-district');

    if (cityContainer && !cityContainer.contains(e.target)) {
      _closeDropdown(cityContainer);
    }
    if (distContainer && !distContainer.contains(e.target)) {
      _closeDropdown(distContainer);
    }
  });
})();

// ── Selected Locations Display ─────────────────────
function renderSelectedLocations() {
  var container = document.getElementById('selected-locations-display');
  if (!container) return;
  container.innerHTML = '';

  var cities = Object.keys(selectedLocations);
  if (cities.length === 0) return;

  var title = document.createElement('div');
  title.className = 'ms-selected-title';
  title.textContent = 'Seçilen Lokasyonlar';
  container.appendChild(title);

  var pillWrap = document.createElement('div');
  pillWrap.className = 'ms-selected-pills';

  cities.sort(function(a, b) { return trLower(a).localeCompare(trLower(b), 'tr'); });

  cities.forEach(function(city) {
    var pill = document.createElement('span');
    pill.className = 'ms-selected-pill';

    var ilceler = selectedLocations[city] || [];
    var text = city;
    if (ilceler.length > 0) {
      text += ' (' + ilceler.join(', ') + ')';
    }

    var textSpan = document.createElement('span');
    textSpan.textContent = text;
    pill.appendChild(textSpan);

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '\u00D7';
    removeBtn.setAttribute('aria-label', city + ' kaldır');
    removeBtn.addEventListener('click', function() {
      delete selectedLocations[city];
      // Uncheck city in dropdown
      var cb = _findCityCb(city);
      if (cb) cb.checked = false;
      _renderCityChips();
      _rebuildDistrictDropdown();
      _toggleDistrictField();
      renderSelectedLocations();
      if (typeof markWizardDirty === 'function') markWizardDirty();
    });
    pill.appendChild(removeBtn);

    pillWrap.appendChild(pill);
  });

  container.appendChild(pillWrap);
}

// ── Collect for save ───────────────────────────────
function collectLocations() {
  var result = [];
  Object.keys(selectedLocations).forEach(function(city) {
    result.push({
      sehir: city,
      ilceler: selectedLocations[city] || []
    });
  });
  return result;
}

// ── Init ───────────────────────────────────────────
function initStep5() {
  _initCityMultiSelect();
  _initDistrictMultiSelect();
  _toggleDistrictField();
  renderSelectedLocations();
}
