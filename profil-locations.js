/* global ILCELER, TUR_ILLER, trLower, markWizardDirty */
// ═══════════════════════════════════════════════════
// profil-locations.js — Apple-style Search→Chip Location Picker
// Search input with autocomplete → chip per city → expand for districts.
// ═══════════════════════════════════════════════════

var POPULAR_CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Mersin', 'Kayseri'];
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

function initStep5() {
  // ── Search autocomplete ──
  var searchInput = document.getElementById('f-city-search');
  var sugList = document.getElementById('city-search-sug');
  if (searchInput && sugList) {
    searchInput.addEventListener('input', function() {
      var q = trLower(searchInput.value);
      sugList.innerHTML = '';
      if (!q || q.length < 1) { sugList.style.display = 'none'; return; }

      var matches = _allCitiesSorted.filter(function(city) {
        return trLower(city).indexOf(q) !== -1 && !selectedLocations[city];
      }).slice(0, 8);

      if (matches.length === 0) {
        sugList.style.display = 'none';
        return;
      }

      matches.forEach(function(city) {
        var item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = city;
        item.addEventListener('mousedown', function(e) {
          e.preventDefault();
          addCity(city);
          searchInput.value = '';
          sugList.style.display = 'none';
          searchInput.focus();
        });
        sugList.appendChild(item);
      });
      sugList.style.display = '';
    });

    searchInput.addEventListener('blur', function() {
      setTimeout(function() { sugList.style.display = 'none'; }, 200);
    });

    searchInput.addEventListener('focus', function() {
      if (searchInput.value.length >= 1) searchInput.dispatchEvent(new Event('input'));
    });
  }

  // ── Popular city chips (quick pick) ──
  var popContainer = document.getElementById('popular-city-chips');
  if (popContainer) {
    POPULAR_CITIES.forEach(function(city) {
      var chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.textContent = city;
      chip.addEventListener('click', function() {
        if (selectedLocations[city]) {
          delete selectedLocations[city];
        } else {
          addCity(city);
        }
        updateCityChipStates();
      });
      popContainer.appendChild(chip);
    });
  }
}

function addCity(city) {
  if (selectedLocations[city]) return;
  selectedLocations[city] = [];
  renderSelectedCities();
  updateCityChipStates();
  if (typeof markWizardDirty === 'function') markWizardDirty();
}

function updateCityChipStates() {
  // Update popular chips
  var popChips = document.querySelectorAll('#popular-city-chips .chip');
  popChips.forEach(function(chip) {
    chip.classList.toggle('selected', !!selectedLocations[chip.textContent]);
  });
  // Update count badge
  var countBadge = document.getElementById('loc-count-badge');
  var count = Object.keys(selectedLocations).length;
  if (countBadge) countBadge.textContent = count > 0 ? '(' + count + ' şehir)' : '';
}

function renderSelectedCities() {
  var container = document.getElementById('selected-cities-container');
  if (!container) return;
  container.textContent = '';

  var cities = Object.keys(selectedLocations);
  if (cities.length === 0) {
    var msg = document.createElement('p');
    msg.id = 'no-city-msg';
    msg.style.cssText = 'font-size:13px;color:var(--muted);';
    msg.textContent = 'Henüz şehir seçilmedi. Yukarıdan şehir arayın veya popüler şehirlerden seçin.';
    container.appendChild(msg);
    updateCityChipStates();
    return;
  }

  cities.sort(function(a, b) { return trLower(a).localeCompare(trLower(b), 'tr'); });

  cities.forEach(function(city) {
    var card = document.createElement('div');
    card.className = 'city-card';

    var header = document.createElement('div');
    header.className = 'city-card-header';
    var name = document.createElement('div');
    name.className = 'city-card-name';
    name.textContent = city;
    var del = document.createElement('button');
    del.className = 'city-card-del';
    del.type = 'button';
    del.textContent = '\u00D7';
    del.addEventListener('click', function() {
      delete selectedLocations[city];
      renderSelectedCities();
      updateCityChipStates();
      if (typeof markWizardDirty === 'function') markWizardDirty();
    });
    header.appendChild(name);
    header.appendChild(del);
    card.appendChild(header);

    // Districts
    var districts = ILCELER[city];
    if (districts && districts.length > 0) {
      var distContainer = document.createElement('div');
      distContainer.className = 'city-card-districts';
      var sortedDistricts = districts.slice().sort(function(a, b) {
        return trLower(a).localeCompare(trLower(b), 'tr');
      });
      sortedDistricts.forEach(function(d) {
        var dChip = document.createElement('button');
        dChip.className = 'district-chip';
        dChip.type = 'button';
        dChip.textContent = d;
        if (selectedLocations[city] && selectedLocations[city].indexOf(d) !== -1) {
          dChip.classList.add('selected');
        }
        dChip.addEventListener('click', function() {
          dChip.classList.toggle('selected');
          if (!selectedLocations[city]) selectedLocations[city] = [];
          if (dChip.classList.contains('selected')) {
            selectedLocations[city].push(d);
          } else {
            selectedLocations[city] = selectedLocations[city].filter(function(x) { return x !== d; });
          }
          if (typeof markWizardDirty === 'function') markWizardDirty();
        });
        distContainer.appendChild(dChip);
      });
      card.appendChild(distContainer);
    } else {
      var noDistrict = document.createElement('p');
      noDistrict.style.cssText = 'font-size:12px;color:var(--muted);';
      noDistrict.textContent = 'Bu il için ilçe seçimi mevcut değil.';
      card.appendChild(noDistrict);
    }

    container.appendChild(card);
  });

  updateCityChipStates();
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
