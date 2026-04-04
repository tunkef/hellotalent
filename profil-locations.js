/* global ILCELER, TUR_ILLER, trLower, markWizardDirty */
// ═══════════════════════════════════════════════════
// profil-locations.js — Clean Multi-Select Location Picker
// No chips in input — only in "Seçilen Lokasyonlar" below.
// ═══════════════════════════════════════════════════

var selectedLocations = {}; // { cityName: [district1, ...] }

var _allCitiesSorted = [];
(function() {
  var cities = [];
  Object.keys(TUR_ILLER).forEach(function(region) {
    TUR_ILLER[region].forEach(function(city) { cities.push(city); });
  });
  _allCitiesSorted = cities.sort(function(a, b) { return trLower(a).localeCompare(trLower(b), 'tr'); });
})();

var _step5Initialized = false;
function initStep5() {
  if (_step5Initialized) {
    // Already built — just sync checkboxes with selectedLocations
    _syncCityCheckboxes();
    _rebuildDistrictList();
    _toggleDistrictField();
    renderSelectedLocations();
    return;
  }
  _step5Initialized = true;
  _buildCityDropdown();
  _buildDistrictDropdown();
  renderSelectedLocations();
}

function _syncCityCheckboxes() {
  var cityDD = document.getElementById('ms-city');
  if (!cityDD) return;
  var cbs = cityDD.querySelectorAll('.ms-item input[type=checkbox]');
  for (var i = 0; i < cbs.length; i++) {
    cbs[i].checked = selectedLocations[cbs[i].value] !== undefined;
  }
}

// ── City Dropdown ──
function _buildCityDropdown() {
  var container = document.getElementById('ms-city');
  if (!container) return;
  container.innerHTML = '';

  // Search input (NO chips inside)
  var searchWrap = document.createElement('div');
  searchWrap.className = 'ms-input-wrap';
  var search = document.createElement('input');
  search.type = 'text';
  search.className = 'ms-search';
  search.placeholder = 'İl ara...';
  search.setAttribute('autocomplete', 'off');
  searchWrap.appendChild(search);
  searchWrap.addEventListener('click', function() { dd.style.display = ''; search.focus(); });
  container.appendChild(searchWrap);

  // Dropdown list
  var dd = document.createElement('div');
  dd.className = 'ms-dropdown';
  dd.style.display = 'none';

  _allCitiesSorted.forEach(function(city) {
    var item = document.createElement('label');
    item.className = 'ms-item';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = city;
    if (selectedLocations[city] !== undefined) cb.checked = true;
    cb.addEventListener('change', function() {
      if (cb.checked) {
        if (selectedLocations[city] === undefined) selectedLocations[city] = [];
      } else {
        delete selectedLocations[city];
      }
      _rebuildDistrictList();
      _toggleDistrictField();
      renderSelectedLocations();
      if (typeof markWizardDirty === 'function') markWizardDirty();
    });
    var span = document.createElement('span');
    span.textContent = city;
    item.appendChild(cb);
    item.appendChild(span);
    dd.appendChild(item);
  });

  container.appendChild(dd);

  // Search filter — use keyup instead of input for broader compatibility
  function _filterCityList() {
    var q = trLower(search.value.trim());
    console.warn('[LOC] filter city q="' + q + '" dd items=' + dd.querySelectorAll('.ms-item').length);
    var items = dd.querySelectorAll('.ms-item');
    var visibleCount = 0;
    for (var i = 0; i < items.length; i++) {
      var span = items[i].querySelector('span');
      if (!span) continue;
      var text = trLower(span.textContent);
      var show = !q || text.indexOf(q) !== -1;
      items[i].style.display = show ? '' : 'none';
      if (show) visibleCount++;
    }
  }
  search.addEventListener('input', _filterCityList);
  search.addEventListener('keyup', _filterCityList);
  search.addEventListener('paste', function() { setTimeout(_filterCityList, 50); });

  // Also open dropdown when typing
  search.addEventListener('focus', function() { dd.style.display = ''; });

  // Close on outside click
  document.addEventListener('click', function(e) {
    if (!container.contains(e.target)) {
      dd.style.display = 'none';
      search.value = '';
      var items = dd.querySelectorAll('.ms-item');
      for (var i = 0; i < items.length; i++) items[i].style.display = '';
    }
  });
}

// ── District Dropdown ──
function _buildDistrictDropdown() {
  var container = document.getElementById('ms-district');
  if (!container) return;
  container.innerHTML = '';

  var searchWrap = document.createElement('div');
  searchWrap.className = 'ms-input-wrap';
  var search = document.createElement('input');
  search.type = 'text';
  search.className = 'ms-search';
  search.placeholder = 'İlçe ara...';
  search.setAttribute('autocomplete', 'off');
  searchWrap.appendChild(search);
  searchWrap.addEventListener('click', function() { dd.style.display = ''; search.focus(); });
  container.appendChild(searchWrap);

  var dd = document.createElement('div');
  dd.className = 'ms-dropdown';
  dd.style.display = 'none';
  dd.id = 'ms-district-list';
  container.appendChild(dd);

  // Search filter — keyup + input + paste
  function _filterDistrictList() {
    var q = trLower(search.value.trim());
    var items = dd.querySelectorAll('.ms-item');
    for (var i = 0; i < items.length; i++) {
      var span = items[i].querySelector('span');
      if (!span) continue;
      var text = trLower(span.textContent);
      items[i].style.display = (!q || text.indexOf(q) !== -1) ? '' : 'none';
    }
    var headers = dd.querySelectorAll('.ms-group-header');
    for (var h = 0; h < headers.length; h++) {
      var next = headers[h].nextElementSibling;
      var hasVisible = false;
      while (next && !next.classList.contains('ms-group-header')) {
        if (next.style.display !== 'none') hasVisible = true;
        next = next.nextElementSibling;
      }
      headers[h].style.display = (hasVisible || !q) ? '' : 'none';
    }
  }
  search.addEventListener('input', _filterDistrictList);
  search.addEventListener('keyup', _filterDistrictList);
  search.addEventListener('paste', function() { setTimeout(_filterDistrictList, 50); });
  search.addEventListener('focus', function() { dd.style.display = ''; });

  // Close on outside click
  document.addEventListener('click', function(e) {
    if (!container.contains(e.target)) {
      dd.style.display = 'none';
      search.value = '';
      var items = dd.querySelectorAll('.ms-item');
      for (var i = 0; i < items.length; i++) items[i].style.display = '';
      var headers = dd.querySelectorAll('.ms-group-header');
      for (var h = 0; h < headers.length; h++) headers[h].style.display = '';
    }
  });

  _rebuildDistrictList();
  _toggleDistrictField();
}

function _rebuildDistrictList() {
  var dd = document.getElementById('ms-district-list');
  if (!dd) return;
  dd.innerHTML = '';

  var cities = Object.keys(selectedLocations).sort(function(a, b) {
    return trLower(a).localeCompare(trLower(b), 'tr');
  });

  cities.forEach(function(city) {
    var districts = ILCELER[city];
    if (!districts || districts.length === 0) return;

    var header = document.createElement('div');
    header.className = 'ms-group-header';
    header.textContent = city;
    dd.appendChild(header);

    districts.slice().sort(function(a, b) {
      return trLower(a).localeCompare(trLower(b), 'tr');
    }).forEach(function(d) {
      var item = document.createElement('label');
      item.className = 'ms-item';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = d;
      cb.dataset.city = city;
      if (selectedLocations[city] && selectedLocations[city].indexOf(d) !== -1) cb.checked = true;
      cb.addEventListener('change', function() {
        if (!selectedLocations[city]) selectedLocations[city] = [];
        if (cb.checked) {
          if (selectedLocations[city].indexOf(d) === -1) selectedLocations[city].push(d);
        } else {
          var idx = selectedLocations[city].indexOf(d);
          if (idx !== -1) selectedLocations[city].splice(idx, 1);
        }
        renderSelectedLocations();
        if (typeof markWizardDirty === 'function') markWizardDirty();
      });
      var span = document.createElement('span');
      span.textContent = d;
      item.appendChild(cb);
      item.appendChild(span);
      dd.appendChild(item);
    });
  });
}

function _toggleDistrictField() {
  var field = document.getElementById('district-field');
  if (field) field.style.display = Object.keys(selectedLocations).length > 0 ? '' : 'none';
}

// ── Seçilen Lokasyonlar Display ──
// Her il ayrı satır, ilçeler altında
function renderSelectedLocations() {
  var container = document.getElementById('selected-locations-display');
  if (!container) return;
  container.innerHTML = '';

  var cities = Object.keys(selectedLocations);
  if (cities.length === 0) return;

  var title = document.createElement('div');
  title.style.cssText = 'font-family:Bricolage Grotesque,sans-serif;font-weight:700;font-size:14px;color:var(--navy);margin-bottom:8px;';
  title.textContent = 'Seçilen Lokasyonlar';
  container.appendChild(title);

  cities.sort(function(a, b) { return trLower(a).localeCompare(trLower(b), 'tr'); });

  cities.forEach(function(city) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:flex-start;gap:8px;padding:8px 12px;background:var(--bg-elevated,#F7F6F4);border-radius:8px;margin-bottom:6px;';

    var left = document.createElement('div');
    left.style.cssText = 'flex:1;min-width:0;';

    var cityName = document.createElement('div');
    cityName.style.cssText = 'font-weight:600;font-size:14px;color:var(--text);';
    cityName.textContent = city;
    left.appendChild(cityName);

    var ilceler = selectedLocations[city] || [];
    if (ilceler.length > 0) {
      var distText = document.createElement('div');
      distText.style.cssText = 'font-size:12px;color:var(--muted);margin-top:2px;';
      distText.textContent = ilceler.join(', ');
      left.appendChild(distText);
    } else {
      var allText = document.createElement('div');
      allText.style.cssText = 'font-size:12px;color:var(--muted);margin-top:2px;font-style:italic;';
      allText.textContent = 'Tüm ilçeler';
      left.appendChild(allText);
    }

    row.appendChild(left);

    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '\u00D7';
    delBtn.style.cssText = 'border:none;background:none;font-size:18px;cursor:pointer;color:var(--muted);padding:0 4px;line-height:1;flex-shrink:0;';
    delBtn.addEventListener('click', function() {
      delete selectedLocations[city];
      // Uncheck city in dropdown
      var cityDD = document.getElementById('ms-city');
      if (cityDD) {
        var cbs = cityDD.querySelectorAll('.ms-item input[type=checkbox]');
        for (var i = 0; i < cbs.length; i++) {
          if (cbs[i].value === city) cbs[i].checked = false;
        }
      }
      _rebuildDistrictList();
      _toggleDistrictField();
      renderSelectedLocations();
      if (typeof markWizardDirty === 'function') markWizardDirty();
    });
    row.appendChild(delBtn);

    container.appendChild(row);
  });
}

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
