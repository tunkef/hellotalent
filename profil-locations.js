/* global ILCELER, TUR_ILLER, trLower */
// ═══════════════════════════════════════════════════
// profil-locations.js — Location Modal & Selected Locations
// Extracted from profil-ui.js to reduce change-risk.
// Owns: selectedLocations state, city/district selection UI,
// location modal, and collectLocations() for save payload.
// Depends on: ILCELER + TUR_ILLER (profil-data.js), trLower (profil-core.js)
// ═══════════════════════════════════════════════════

var POPULAR_CITIES = ['\u0130stanbul', 'Ankara', '\u0130zmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Mersin', 'Kayseri'];
var selectedLocations = {}; // { cityName: [district1, district2, ...] }

function initStep5() {
  // Render popular city chips
  var popContainer = document.getElementById('popular-city-chips');
  if (popContainer) {
    POPULAR_CITIES.forEach(function(city) {
      var chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.textContent = city;
      chip.addEventListener('click', function() {
        toggleCitySelection(city);
        updateCityChipStates();
      });
      popContainer.appendChild(chip);
    });
  }

  // All cities button → open location modal
  var btnAllCities = document.getElementById('btn-all-cities');
  if (btnAllCities) btnAllCities.addEventListener('click', function() { openLocationModal(); });
}

function toggleCitySelection(city) {
  if (selectedLocations[city]) {
    delete selectedLocations[city];
  } else {
    selectedLocations[city] = [];
  }
  renderSelectedCities();
}

function updateCityChipStates() {
  // Update popular chips
  var popChips = document.querySelectorAll('#popular-city-chips .chip');
  popChips.forEach(function(chip) {
    if (selectedLocations[chip.textContent]) {
      chip.classList.add('selected');
    } else {
      chip.classList.remove('selected');
    }
  });
  // Update modal chips
  var lokChips = document.querySelectorAll('#lok-body .lok-city');
  lokChips.forEach(function(chip) {
    if (selectedLocations[chip.textContent]) {
      chip.classList.add('selected');
    } else {
      chip.classList.remove('selected');
    }
  });
  var countEl = document.getElementById('lok-selected-count');
  if (countEl) countEl.textContent = Object.keys(selectedLocations).length;
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
    msg.textContent = 'Henüz şehir seçilmedi. Yukarıdaki şehirlerden seçim yapın.';
    container.appendChild(msg);
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
    });
    header.appendChild(name);
    header.appendChild(del);
    card.appendChild(header);

    // Districts
    var districts = ILCELER[city];
    if (districts && districts.length > 0) {
      var distContainer = document.createElement('div');
      distContainer.className = 'city-card-districts';
      districts.forEach(function(d) {
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

function openLocationModal() {
  var lokBody = document.getElementById('lok-body');
  if (!lokBody) return;
  lokBody.textContent = '';

  Object.keys(TUR_ILLER).forEach(function(region) {
    var regionDiv = document.createElement('div');
    regionDiv.className = 'lok-region';
    var title = document.createElement('div');
    title.className = 'lok-region-title';
    title.textContent = region;
    regionDiv.appendChild(title);

    var grid = document.createElement('div');
    grid.className = 'lok-city-grid';
    TUR_ILLER[region].forEach(function(city) {
      var chip = document.createElement('button');
      chip.className = 'lok-city';
      chip.type = 'button';
      chip.textContent = city;
      if (selectedLocations[city]) chip.classList.add('selected');
      chip.addEventListener('click', function() {
        toggleCitySelection(city);
        chip.classList.toggle('selected');
        updateCityChipStates();
      });
      grid.appendChild(chip);
    });
    regionDiv.appendChild(grid);
    lokBody.appendChild(regionDiv);
  });

  // Search filter — bind once, remove previous handler to prevent accumulation
  var searchInput = document.getElementById('lok-search-input');
  if (searchInput) {
    searchInput.value = '';
    if (searchInput._htLokFilter) searchInput.removeEventListener('input', searchInput._htLokFilter);
    searchInput._htLokFilter = function() {
      var q = trLower(searchInput.value);
      lokBody.querySelectorAll('.lok-city').forEach(function(chip) {
        chip.style.display = trLower(chip.textContent).indexOf(q) !== -1 ? '' : 'none';
      });
    };
    searchInput.addEventListener('input', searchInput._htLokFilter);
  }

  updateCityChipStates();
  document.getElementById('lok-modal-overlay').classList.add('show');
}

// Location modal done button — just close and render
// (already wired in event listeners section)

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
