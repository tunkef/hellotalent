/* global ILCELER, TUR_ILLER, trLower, markWizardDirty */
// ═══════════════════════════════════════════════════
// profil-locations.js — Dropdown-based Location Picker
// Simple dropdown: select il → optionally select ilçes → add → chips below.
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

function initStep5() {
  var ilSelect = document.getElementById('f-loc-il');
  var ilceField = document.getElementById('loc-ilce-field');
  var ilceSelect = document.getElementById('f-loc-ilce');
  var addBtn = document.getElementById('btn-loc-add');

  if (!ilSelect) return;

  // Populate il dropdown alphabetically
  _allCitiesSorted.forEach(function(city) {
    var opt = document.createElement('option');
    opt.value = city;
    opt.textContent = city;
    ilSelect.appendChild(opt);
  });

  // When il selected, populate ilçe multi-select
  ilSelect.addEventListener('change', function() {
    var city = ilSelect.value;
    if (!city) {
      if (ilceField) ilceField.style.display = 'none';
      return;
    }
    var districts = ILCELER[city];
    if (ilceSelect) {
      ilceSelect.innerHTML = '';
      if (districts && districts.length > 0) {
        var sorted = districts.slice().sort(function(a, b) {
          return trLower(a).localeCompare(trLower(b), 'tr');
        });
        sorted.forEach(function(d) {
          var opt = document.createElement('option');
          opt.value = d;
          opt.textContent = d;
          ilceSelect.appendChild(opt);
        });
        if (ilceField) ilceField.style.display = '';
      } else {
        if (ilceField) ilceField.style.display = 'none';
      }
    }
  });

  // "İl Ekle" button
  if (addBtn) {
    addBtn.addEventListener('click', function() {
      var city = ilSelect.value;
      if (!city) return;
      if (selectedLocations[city]) {
        // City already added — just reset
        ilSelect.value = '';
        if (ilceField) ilceField.style.display = 'none';
        return;
      }

      // Collect selected ilçes
      var ilceler = [];
      if (ilceSelect) {
        var opts = ilceSelect.options;
        for (var i = 0; i < opts.length; i++) {
          if (opts[i].selected) ilceler.push(opts[i].value);
        }
      }

      selectedLocations[city] = ilceler;
      renderSelectedLocations();

      // Reset dropdowns
      ilSelect.value = '';
      if (ilceSelect) ilceSelect.innerHTML = '';
      if (ilceField) ilceField.style.display = 'none';

      if (typeof markWizardDirty === 'function') markWizardDirty();
    });
  }

  // Render any pre-existing selections (from DB load)
  renderSelectedLocations();
}

function renderSelectedLocations() {
  var container = document.getElementById('selected-locations-display');
  if (!container) return;
  container.innerHTML = '';

  var cities = Object.keys(selectedLocations);
  if (cities.length === 0) return;

  cities.sort(function(a, b) { return trLower(a).localeCompare(trLower(b), 'tr'); });

  cities.forEach(function(city) {
    var chip = document.createElement('span');
    chip.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:var(--bg-elevated,#F7F6F4);border:1px solid var(--border,#E5E3DF);border-radius:8px;font-size:13px;font-family:Plus Jakarta Sans,sans-serif;margin:4px 4px 4px 0;';

    var ilceler = selectedLocations[city] || [];
    var text = city;
    if (ilceler.length > 0) {
      text += ' (' + ilceler.join(', ') + ')';
    }

    var textSpan = document.createElement('span');
    textSpan.textContent = text;
    chip.appendChild(textSpan);

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '\u00D7';
    removeBtn.style.cssText = 'border:none;background:none;font-size:16px;cursor:pointer;color:var(--muted);padding:0 2px;line-height:1;';
    removeBtn.addEventListener('click', function() {
      delete selectedLocations[city];
      renderSelectedLocations();
      if (typeof markWizardDirty === 'function') markWizardDirty();
    });
    chip.appendChild(removeBtn);

    container.appendChild(chip);
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
