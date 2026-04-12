import { state } from '../state.js';
import { t } from '../i18n.js';
import { getRangesForProtocol } from '../protocols.js';
import { formatJournalEntry } from '../services/journal.js';
import { showToast } from './Toast.js';

const REASONABLE_RANGES = {
  'Puls': { min: 10, max: 400 },
  'SpO2': { min: 0, max: 100 },
  'EtCO2': { min: 0, max: 150 },
  'Resp': { min: 0, max: 200 },
  'Temp': { min: 20, max: 45 },
  'NIBP_SYS': { min: 20, max: 300 },
  'NIBP_DIA': { min: 20, max: 300 },
  'NIBP_MAP': { min: 20, max: 300 },
  'Insp gas': { min: 0, max: 100 },
  'Syre': { min: 0, max: 20 },
  'Luft': { min: 0, max: 20 },
  'CRT': { min: 0, max: 10 }
};

export function createValuesTable(container) {
  const el = document.createElement('div');
  el.className = 'values-table-container';
  
  // Format based on NARKOSJOURNAL columns
  el.innerHTML = `
    <div class="values-grid">
      <!-- AI Exracted Values -->
      <div class="value-card">
        <div class="value-label">Puls</div>
        <div class="value-display" id="val-hr" data-field="Puls">--</div>
      </div>
      <div class="value-card">
        <div class="value-label">SpO2</div>
        <div class="value-display" id="val-spo2" data-field="SpO2">--</div>
      </div>
      <div class="value-card">
        <div class="value-label">EtCO2</div>
        <div class="value-display" id="val-etco2" data-field="EtCO2">--</div>
      </div>
      <div class="value-card">
        <div class="value-label">Resp</div>
        <div class="value-display" id="val-rr" data-field="Resp">--</div>
      </div>
      <div class="value-card nbp-card">
        <div class="value-label">NIBP (Sys/Dia)</div>
        <div class="value-display" id="val-nibp" data-field="NIBP">--/--</div>
        <div class="value-sub" id="val-map">MAP: --</div>
      </div>
      <div class="value-card">
        <div class="value-label">Temp</div>
        <div class="value-display" id="val-temp" data-field="Temp">--</div>
      </div>
      
      <!-- Manual Entry / Carry-forward Values -->
      <!-- Manual Entry / Carry-forward Values -->
      <div class="value-card manual-card">
        <div class="value-label">Syre / Luft (l/min)</div>
        <div class="value-display inherited" id="val-flow" data-field="Flow">-- / --</div>
      </div>
      <div class="value-card manual-card">
        <div class="value-label">Insp gas (%)</div>
        <div class="value-display inherited" id="val-gas" data-field="Insp gas">--</div>
      </div>
      <div class="value-card manual-card">
        <div class="value-label">CRT / SLH</div>
        <div class="value-display inherited" id="val-crt" data-field="CrtSlh">-- / --</div>
      </div>
    </div>

    <div id="vt-touch-popup" class="touch-popup hidden">
      <div class="touch-popup-content">
        <div class="touch-header" style="display:flex; justify-content:space-between; margin-bottom: 16px;">
          <h3 id="vt-touch-title">Edit Value</h3>
          <button class="btn-icon" id="vt-btn-touch-close" style="border:none;background:transparent;font-size:1.5rem;color:#fff;cursor:pointer;">✖</button>
        </div>

        <div class="touch-display" id="vt-touch-display"></div>

        <div class="bp-editor hidden" id="vt-touch-bp-editor">
          <div class="bp-field active" id="vt-bp-sys"></div>
          <div class="bp-sep" style="font-size:1.5rem; margin:0 4px;">/</div>
          <div class="bp-field" id="vt-bp-dia"></div>
          <div class="bp-sep" style="font-size:1rem; margin:0 8px;">MAP</div>
          <div class="bp-field" id="vt-bp-map"></div>
        </div>

        <div class="bp-editor hidden" id="vt-touch-flow-editor">
          <div class="bp-field active" id="vt-flow-syre"></div>
          <div class="bp-sep" style="font-size:1.5rem; margin:0 4px;">/</div>
          <div class="bp-field" id="vt-flow-luft"></div>
        </div>

        <div class="bp-editor hidden" id="vt-touch-crt-editor">
          <div class="bp-field active" id="vt-crt-val"></div>
          <div class="bp-sep" style="font-size:1.5rem; margin:0 4px;">/</div>
          <div class="bp-field" id="vt-slh-val"></div>
        </div>

        <div id="vt-touch-slh-grid" class="touch-bcs-grid hidden">
          <button class="bcs-btn" style="font-size:1rem; background: #c58;" data-val="Rosa">Rosa</button>
          <button class="bcs-btn" style="font-size:1rem; background: #999;" data-val="Blek">Blek</button>
          <button class="bcs-btn" style="font-size:1rem; background: #e44;" data-val="Hyper">Hyper</button>
          <button class="bcs-btn" style="font-size:1rem; background: #48a;" data-val="Cyan">Cyan</button>
          <button class="bcs-btn" style="font-size:1rem; background: #da4;" data-val="Ikt">Ikt</button>
          <button class="bcs-btn" style="font-size:1rem; grid-column: span 3; background: #633;" data-val="del">Rensa</button>
        </div>

        <div id="vt-touch-numpad" class="touch-numpad">
          <button class="numpad-btn" data-val="1">1</button>
          <button class="numpad-btn" data-val="2">2</button>
          <button class="numpad-btn" data-val="3">3</button>
          <button class="numpad-btn" data-val="4">4</button>
          <button class="numpad-btn" data-val="5">5</button>
          <button class="numpad-btn" data-val="6">6</button>
          <button class="numpad-btn" data-val="7">7</button>
          <button class="numpad-btn" data-val="8">8</button>
          <button class="numpad-btn" data-val="9">9</button>
          <button class="numpad-btn numpad-decimal" data-val="${t('decimal_sep') || '.'}">${t('decimal_sep') || '.'}</button>
          <button class="numpad-btn" data-val="0">0</button>
          <button class="numpad-btn numpad-del" data-val="del">⌫</button>
          <button class="numpad-btn numpad-ok" style="grid-column: span 3;" data-val="ok">OK</button>
        </div>

        <!-- Custom Confirmation Overlay -->
        <div id="vt-touch-confirm" class="touch-overlay hidden" style="position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.9); z-index:100; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 20px; text-align:center; border-radius:12px;">
          <div style="font-size:1.5rem; margin-bottom:16px;">⚠️</div>
          <div id="vt-confirm-msg" style="margin-bottom:24px; color:#fff; font-size:1.1rem; line-height:1.4;"></div>
          <div style="display:flex; gap:16px; width:100%;">
            <button class="numpad-btn" id="vt-confirm-cancel" style="flex:1; background:#444;">${t('cancel') || 'Cancel'}</button>
            <button class="numpad-btn" id="vt-confirm-ok" style="flex:1; background:#d33;">${t('save') || 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  `;
  container.appendChild(el);

  // Editable value handling
  const displays = el.querySelectorAll('.value-display');
  displays.forEach(disp => {
    disp.addEventListener('click', () => {
      const field = disp.getAttribute('data-field');
      const currentValue = disp.textContent.replace(' 🖊️', '');
      
      if (!state.get('caseActive')) {
        showToast(t('start_case_first') || 'Starta en narkos först', 'info');
        return;
      }
      
      openTouchPopup(field, currentValue);
    });
  });

  const mapDispEl = el.querySelector('#val-map');
  if (mapDispEl) {
    mapDispEl.addEventListener('click', () => {
      if (!state.get('caseActive')) {
        showToast(t('start_case_first') || 'Starta en narkos först', 'info');
        return;
      }
      openTouchPopup('NIBP', null);
    });
  }

  // --- TOUCH POPUP LOGIC ---
  let currentEditField = null;
  let currentEditTarget = null;
  let activeSubField = 'sys';
  let lastManualEntryTime = null;
  let isFirstKey = true;

  const popup = el.querySelector('#vt-touch-popup');
  const title = el.querySelector('#vt-touch-title');
  const dispSingle = el.querySelector('#vt-touch-display');
  const dispBp = el.querySelector('#vt-touch-bp-editor');
  const bpSys = el.querySelector('#vt-bp-sys');
  const bpDia = el.querySelector('#vt-bp-dia');
  const bpMap = el.querySelector('#vt-bp-map');
  const btnClose = el.querySelector('#vt-btn-touch-close');

  const flowEditor = el.querySelector('#vt-touch-flow-editor');
  const flowSyre = el.querySelector('#vt-flow-syre');
  const flowLuft = el.querySelector('#vt-flow-luft');

  const crtEditor = el.querySelector('#vt-touch-crt-editor');
  const crtVal = el.querySelector('#vt-crt-val');
  const slhVal = el.querySelector('#vt-slh-val');

  const numpad = el.querySelector('#vt-touch-numpad');
  const slhGrid = el.querySelector('#vt-touch-slh-grid');
  
  const confirmOverlay = el.querySelector('#vt-touch-confirm');
  const confirmMsg = el.querySelector('#vt-confirm-msg');
  const btnConfirmOk = el.querySelector('#vt-confirm-ok');
  const btnConfirmCancel = el.querySelector('#vt-confirm-cancel');

  const decBtn = el.querySelector('.numpad-decimal');
  if (decBtn) {
    const sep = t('decimal_sep') || '.';
    decBtn.setAttribute('data-val', sep);
    decBtn.textContent = sep;
  }

  const updateHighlight = () => {
    el.querySelectorAll('.bp-field').forEach(f => f.classList.remove('active'));
    
    if (activeSubField === 'sys') { bpSys.classList.add('active'); currentEditTarget = bpSys; numpad.classList.remove('hidden'); slhGrid.classList.add('hidden'); }
    if (activeSubField === 'dia') { bpDia.classList.add('active'); currentEditTarget = bpDia; numpad.classList.remove('hidden'); slhGrid.classList.add('hidden'); }
    if (activeSubField === 'map') { bpMap.classList.add('active'); currentEditTarget = bpMap; numpad.classList.remove('hidden'); slhGrid.classList.add('hidden'); }
    
    if (activeSubField === 'syre') { flowSyre.classList.add('active'); currentEditTarget = flowSyre; numpad.classList.remove('hidden'); slhGrid.classList.add('hidden'); }
    if (activeSubField === 'luft') { flowLuft.classList.add('active'); currentEditTarget = flowLuft; numpad.classList.remove('hidden'); slhGrid.classList.add('hidden'); }
    
    if (activeSubField === 'crt') { crtVal.classList.add('active'); currentEditTarget = crtVal; numpad.classList.remove('hidden'); slhGrid.classList.add('hidden'); }
    if (activeSubField === 'slh') { slhVal.classList.add('active'); currentEditTarget = slhVal; numpad.classList.add('hidden'); slhGrid.classList.remove('hidden'); }
    
    isFirstKey = true;
  };

  bpSys.addEventListener('click', () => { activeSubField = 'sys'; updateHighlight(); });
  bpDia.addEventListener('click', () => { activeSubField = 'dia'; updateHighlight(); });
  bpMap.addEventListener('click', () => { activeSubField = 'map'; updateHighlight(); });
  flowSyre.addEventListener('click', () => { activeSubField = 'syre'; updateHighlight(); });
  flowLuft.addEventListener('click', () => { activeSubField = 'luft'; updateHighlight(); });
  crtVal.addEventListener('click', () => { activeSubField = 'crt'; updateHighlight(); });
  slhVal.addEventListener('click', () => { activeSubField = 'slh'; updateHighlight(); });

  btnClose.addEventListener('click', () => popup.classList.add('hidden'));

  const openTouchPopup = (field, currentValue) => {
    currentEditField = field;
    title.textContent = `Edit ${field}`;

    dispSingle.classList.add('hidden');
    dispBp.classList.add('hidden');
    flowEditor.classList.add('hidden');
    crtEditor.classList.add('hidden');

    if (field === 'NIBP') {
      dispBp.classList.remove('hidden');
      
      const txt = el.querySelector('#val-nibp').textContent.split('/');
      const mTxt = el.querySelector('#val-map').textContent.replace('MAP: ', '');
      
      bpSys.textContent = txt[0] === '--' ? '' : txt[0];
      bpDia.textContent = txt[1] === '--' ? '' : txt[1];
      bpMap.textContent = mTxt === '--' ? '' : mTxt;
      
      activeSubField = 'sys';
      updateHighlight();
    } else if (field === 'Flow') {
      flowEditor.classList.remove('hidden');
      
      const txt = el.querySelector('#val-flow').textContent.split(' / ');
      flowSyre.textContent = txt[0] === '--' ? '' : txt[0].trim();
      flowLuft.textContent = txt[1] === '--' ? '' : txt[1].trim();
      
      activeSubField = 'syre';
      updateHighlight();
    } else if (field === 'CrtSlh') {
      crtEditor.classList.remove('hidden');
      
      const txt = el.querySelector('#val-crt').textContent.split(' / ');
      crtVal.textContent = txt[0] === '--' ? '' : txt[0].trim();
      slhVal.textContent = txt[1] === '--' ? '' : txt[1].trim();
      
      activeSubField = 'crt';
      updateHighlight();
    } else {
      dispSingle.classList.remove('hidden');
      numpad.classList.remove('hidden');
      slhGrid.classList.add('hidden');
      const val = (currentValue === '--' || !currentValue) ? '' : String(currentValue);
      dispSingle.textContent = val;
      currentEditTarget = dispSingle;
    }
    
    isFirstKey = true;
    confirmOverlay.classList.add('hidden');
    popup.classList.remove('hidden');
  };

  const handleGlobalKeyDown = (e) => {
    if (popup.classList.contains('hidden')) return;

    const key = e.key;
    const sep = t('decimal_sep') || '.';

    if (/^[0-9]$/.test(key)) {
      if (isFirstKey) {
        if (activeSubField !== 'slh') currentEditTarget.textContent = '';
        isFirstKey = false;
      }
      if (activeSubField !== 'slh') {
        currentEditTarget.textContent += key;
      }
      e.preventDefault();
    } else if (key === '.' || key === ',') {
      if (isFirstKey) {
        if (activeSubField !== 'slh') currentEditTarget.textContent = '';
        isFirstKey = false;
      }
      if (activeSubField !== 'slh' && !currentEditTarget.textContent.includes(sep)) {
        currentEditTarget.textContent += sep;
      }
      e.preventDefault();
    } else if (key === 'Backspace') {
      if (activeSubField !== 'slh') {
        currentEditTarget.textContent = currentEditTarget.textContent.slice(0, -1);
      }
      e.preventDefault();
    } else if (key === 'Enter') {
      saveAndClose();
      e.preventDefault();
    } else if (key === 'Escape') {
      popup.classList.add('hidden');
      e.preventDefault();
    } else if (key === 'Tab') {
      if (currentEditField === 'NIBP') {
        if (activeSubField === 'sys') activeSubField = 'dia';
        else if (activeSubField === 'dia') activeSubField = 'map';
        else activeSubField = 'sys';
        updateHighlight();
        e.preventDefault();
      } else if (currentEditField === 'Flow') {
        if (activeSubField === 'syre') activeSubField = 'luft';
        else activeSubField = 'syre';
        updateHighlight();
        e.preventDefault();
      } else if (currentEditField === 'CrtSlh') {
        if (activeSubField === 'crt') activeSubField = 'slh';
        else activeSubField = 'crt';
        updateHighlight();
        e.preventDefault();
      }
    }
  };
  
  if (window._vtHandleGlobalKeyDown) { window.removeEventListener('keydown', window._vtHandleGlobalKeyDown); }
  window._vtHandleGlobalKeyDown = handleGlobalKeyDown;
  window.addEventListener('keydown', handleGlobalKeyDown);

  el.querySelectorAll('.numpad-btn').forEach(b => {
    b.addEventListener('click', (e) => {
      const val = e.target.getAttribute('data-val');
      if (val === 'del') {
        currentEditTarget.textContent = currentEditTarget.textContent.slice(0, -1);
      } else if (val === 'ok') {
        saveAndClose();
      } else {
        if (isFirstKey) {
          currentEditTarget.textContent = '';
          isFirstKey = false;
        }
        const sep = t('decimal_sep') || '.';
        if (val === sep && currentEditTarget.textContent.includes(sep)) return;
        if (val !== null && val !== undefined) {
           currentEditTarget.textContent += val;
        }
      }
    });
  });

  el.querySelectorAll('#vt-touch-slh-grid .bcs-btn').forEach(b => {
    b.addEventListener('click', (e) => {
      const val = e.target.getAttribute('data-val');
      if (val === 'del') {
         currentEditTarget.textContent = '';
      } else {
         currentEditTarget.textContent = val;
      }
      saveAndClose();
    });
  });

  btnConfirmOk.addEventListener('click', () => {
    confirmOverlay.classList.add('hidden');
    doSave();
  });
  
  btnConfirmCancel.addEventListener('click', () => {
    confirmOverlay.classList.add('hidden');
  });

  const saveAndClose = () => {
    const issues = [];
    if (currentEditField === 'NIBP') {
      const s = parseFloat(bpSys.textContent);
      const d = parseFloat(bpDia.textContent);
      const m = parseFloat(bpMap.textContent);
      if (!isNaN(s) && (s < REASONABLE_RANGES.NIBP_SYS.min || s > REASONABLE_RANGES.NIBP_SYS.max)) issues.push(`SBP (${s})`);
      if (!isNaN(d) && (d < REASONABLE_RANGES.NIBP_DIA.min || d > REASONABLE_RANGES.NIBP_DIA.max)) issues.push(`DBP (${d})`);
      if (!isNaN(m) && (m < REASONABLE_RANGES.NIBP_MAP.min || m > REASONABLE_RANGES.NIBP_MAP.max)) issues.push(`MAP (${m})`);
    } else if (currentEditField === 'Flow') {
      const s = parseFloat(flowSyre.textContent);
      const l = parseFloat(flowLuft.textContent);
      if (!isNaN(s) && (s < REASONABLE_RANGES.Syre.min || s > REASONABLE_RANGES.Syre.max)) issues.push(`Syre (${s})`);
      if (!isNaN(l) && (l < REASONABLE_RANGES.Luft.min || l > REASONABLE_RANGES.Luft.max)) issues.push(`Luft (${l})`);
    } else if (currentEditField === 'CrtSlh') {
      const c = parseFloat(crtVal.textContent);
      if (!isNaN(c) && (c < REASONABLE_RANGES.CRT.min || c > REASONABLE_RANGES.CRT.max)) issues.push(`CRT (${c})`);
    } else {
      const vText = currentEditTarget.textContent.replace(t('decimal_sep'), '.').trim();
      const v = parseFloat(vText);
      const limits = REASONABLE_RANGES[currentEditField];
      if (limits && !isNaN(v) && (v < limits.min || v > limits.max)) {
        issues.push(`${currentEditField} (${vText})`);
      }
    }

    if (issues.length > 0) {
      confirmMsg.innerHTML = `<strong>${t('unreasonable_value_warning') || 'Unreasonable value(s)'}</strong>:<br>${issues.join(', ')}<br><br>${t('confirm_save_anyway') || 'Save anyway?'}`;
      confirmOverlay.classList.remove('hidden');
    } else {
      doSave();
    }
  };

  const doSave = () => {
    popup.classList.add('hidden');
    
    if (currentEditField === 'NIBP') {
      const s = bpSys.textContent;
      const d = bpDia.textContent;
      const m = bpMap.textContent;
      
      const nibpDisp = el.querySelector('#val-nibp');
      nibpDisp.textContent = `${s || '--'}/${d || '--'}`;
      nibpDisp.classList.add('manual-override');
      applyStatusClasses(nibpDisp, valueStatus('nibp', s));
      
      const mapDispEl2 = el.querySelector('#val-map');
      mapDispEl2.textContent = `MAP: ${m || '--'}`;
      mapDispEl2.classList.add('manual-override');
      // No standard status indicator for MAP on its own usually, but we could add if needed
      
      // Store in manualValues for Firestore sync
      if (s) state.updateManualValue('NIBP_SYS', s, true);
      if (d) state.updateManualValue('NIBP_DIA', d, true);
      if (m) state.updateManualValue('NIBP_MAP', m, true);
    } else if (currentEditField === 'Flow') {
      const syre = flowSyre.textContent || '';
      const luft = flowLuft.textContent || '';
      if (!syre && !luft) return;
      state.updateManualValue('Syre', syre, true);
      state.updateManualValue('Luft', luft, true);
    } else if (currentEditField === 'CrtSlh') {
      const crt = crtVal.textContent || '';
      const slh = slhVal.textContent || '';
      if (!crt && !slh) return;
      state.updateManualValue('CRT', crt, true);
      state.updateManualValue('SLH', slh, true);
    } else {
      const newValue = dispSingle.textContent;
      const disp = el.querySelector(`[data-field="${currentEditField}"]`);
      
      if (!newValue && newValue !== '0') return;

      // Store ALL manual entries in state for Firestore sync
      state.updateManualValue(currentEditField, newValue, true);

      if (currentEditField !== 'Insp gas') {
        disp.textContent = newValue;
        disp.classList.add('manual-override');
        disp.classList.remove('inherited');
        
        const aiFieldMap = { 'Puls': 'hr', 'SpO2': 'spo2', 'EtCO2': 'etco2', 'Resp': 'rr', 'Temp': 'temp' };
        if (aiFieldMap[currentEditField]) {
          applyStatusClasses(disp, valueStatus(aiFieldMap[currentEditField], newValue));
        }
      }
    }

    // Create or merge journal entry (1-minute merge window)
    if (state.get('caseActive')) {
      const now = new Date();
      const entries = state.get('journalEntries');
      const manualVals = state.get('manualValues');
      const entry = formatJournalEntry(now, {}, manualVals);

      if (lastManualEntryTime && (now - lastManualEntryTime) < 60000 && entries.length > 0) {
        // Merge: update the last journal row with current values
        entries[entries.length - 1] = entry;
        state.dispatchEvent(new CustomEvent('change:journalEntries', { detail: { entries } }));
      } else {
        // New row
        state.addJournalEntry(entry);
      }
      lastManualEntryTime = now;
    }
  };

  // Listen for state changes to update the UI
  state.addEventListener('change:readings', (e) => {
    const readings = e.detail.readings;
    if (!readings || readings.length === 0) return;
    
    const latest = readings[readings.length - 1];
    const v = latest.values;
    
    // Update UI with latest AI values + per-field status colors
    updateDisplay('val-hr',   v.hr,   valueStatus('hr', v.hr));
    updateDisplay('val-spo2', v.spo2, valueStatus('spo2', v.spo2));
    updateDisplay('val-etco2',v.etco2,valueStatus('etco2', v.etco2));
    updateDisplay('val-rr',   v.rr,   valueStatus('rr', v.rr));
    updateDisplay('val-temp', v.temp, valueStatus('temp', v.temp));
    
    const nibpDisp = el.querySelector('#val-nibp');
    if (v.nibp_sys && v.nibp_dia) {
      nibpDisp.textContent = `${v.nibp_sys}/${v.nibp_dia}`;
      applyStatusClasses(nibpDisp, valueStatus('nibp', v.nibp_sys));
    }
    
    const mapDisp = el.querySelector('#val-map');
    if (v.nibp_map) {
      mapDisp.textContent = `MAP: ${v.nibp_map}`;
    }
  });
  
  state.addEventListener('change:lang', () => {
    if (decBtn) {
      const sep = t('decimal_sep') || '.';
      decBtn.setAttribute('data-val', sep);
      decBtn.textContent = sep;
    }
  });

  state.addEventListener('change:manualValues', (e) => {
    const vals = e.detail.values;
    if (!vals) return;
    updateCombinedManualDisplay('val-flow', vals['Syre'], vals['Luft']);
    updateCombinedManualDisplay('val-crt', vals['CRT'], vals['SLH']);
    updateManualDisplay('val-gas', vals['Insp gas']);

    // Also render AI-field manual overrides (synced from remote)
    const aiFieldMap = {
      'Puls': 'val-hr',
      'SpO2': 'val-spo2',
      'EtCO2': 'val-etco2',
      'Resp': 'val-rr',
      'Temp': 'val-temp'
    };
    for (const [field, id] of Object.entries(aiFieldMap)) {
      if (vals[field]?.value) {
        const disp = el.querySelector(`#${id}`);
        if (disp) {
          disp.textContent = vals[field].value;
          const isFresh = (Date.now() - (vals[field].confirmedAt || 0)) < 60000;
          if (isFresh) {
            disp.classList.add('manual-override');
          } else {
            disp.classList.remove('manual-override');
          }
          disp.classList.remove('inherited');

          const aiMap = { 'Puls': 'hr', 'SpO2': 'spo2', 'EtCO2': 'etco2', 'Resp': 'rr', 'Temp': 'temp' };
          if (aiMap[field]) {
             applyStatusClasses(disp, valueStatus(aiMap[field], vals[field].value));
          }
        }
      }
    }

    // Handle NIBP
    const s = vals['NIBP_SYS'];
    const d = vals['NIBP_DIA'];
    if (s?.value || d?.value) {
      const nibpDisp = el.querySelector('#val-nibp');
      if (nibpDisp) {
        nibpDisp.textContent = `${s?.value || '--'}/${d?.value || '--'}`;
        const isFresh = (Date.now() - Math.max(s?.confirmedAt || 0, d?.confirmedAt || 0)) < 60000;
        if (isFresh) nibpDisp.classList.add('manual-override');
        else nibpDisp.classList.remove('manual-override');

        applyStatusClasses(nibpDisp, valueStatus('nibp', s?.value));
      }
    }
    const m = vals['NIBP_MAP'];
    if (m?.value) {
      const mapDisp = el.querySelector('#val-map');
      if (mapDisp) {
        mapDisp.textContent = `MAP: ${m.value}`;
        const isFresh = (Date.now() - (m.confirmedAt || 0)) < 60000;
        if (isFresh) mapDisp.classList.add('manual-override');
        else mapDisp.classList.remove('manual-override');
      }
    }
  });

  window.addEventListener('case-reset', () => {
    updateDisplay('val-hr', '--');
    updateDisplay('val-spo2', '--');
    updateDisplay('val-etco2', '--');
    updateDisplay('val-rr', '--');
    updateDisplay('val-temp', '--');
    const nibpDisp = el.querySelector('#val-nibp');
    if (nibpDisp) nibpDisp.textContent = '--/--';
    const mapDisp = el.querySelector('#val-map');
    if (mapDisp) mapDisp.textContent = 'MAP: --';
  });

  // Periodically check for stale values to remove blue borders (every 10s)
  setInterval(() => {
    const now = Date.now();
    const manualVals = state.get('manualValues') || {};
    
    // Check manual override borders
    el.querySelectorAll('.value-display.manual-override').forEach(d => {
       const field = d.getAttribute('data-field');
       if (!field) return; 
       
       // Special cases for combined fields
       let confirmedAt = 0;
       if (field === 'Flow') confirmedAt = Math.max(manualVals['Syre']?.confirmedAt || 0, manualVals['Luft']?.confirmedAt || 0);
       else if (field === 'CrtSlh') confirmedAt = Math.max(manualVals['CRT']?.confirmedAt || 0, manualVals['SLH']?.confirmedAt || 0);
       else if (field === 'NIBP') confirmedAt = Math.max(manualVals['NIBP_SYS']?.confirmedAt || 0, manualVals['NIBP_DIA']?.confirmedAt || 0);
       else confirmedAt = manualVals[field]?.confirmedAt || 0;

       if (now - confirmedAt >= 60000) {
         d.classList.remove('manual-override');
       }
    });

    // Also check AI readings freshness for UI fading
    const readings = state.get('readings');
    if (readings.length > 0) {
      const latest = readings[readings.length - 1];
      if (now - latest.timestamp.getTime() >= 60000) {
        // If the latest AI reading is > 60s old, we could fade it or just let it stay 
        // until next capture. The user specifically asked for Journal logic, 
        // but let's at least keep the blue borders accurate.
      }
    }
  }, 10000);

  function updateDisplay(id, value, statusClass) {
    const disp = el.querySelector(`#${id}`);
    if (!disp) return;
    if (value !== undefined && value !== null) {
      disp.textContent = value;
      disp.classList.remove('manual-override');
      applyStatusClasses(disp, statusClass);
    }
  }

  function applyStatusClasses(disp, statusClass) {
    disp.classList.remove('status-ok', 'status-warning', 'status-critical');
    if (statusClass) disp.classList.add(statusClass);
  }

  function getRanges(field) {
    const protocol = state.get('protocol') || 'General';
    const species = state.get('species') || 'Dog';
    const weight = state.get('weight') || '';
    return getRangesForProtocol(protocol, species, weight, field);
  }

  function valueStatus(field, val) {
    if (val === null || val === undefined || val === '' || val === '--') return null;
    const numericVal = typeof val === 'string' ? parseFloat(val.replace(t('decimal_sep'), '.').trim()) : val;
    if (isNaN(numericVal)) return null;

    const ranges = getRanges(field);
    if (!ranges) return null;

    const [okLo, okHi]     = ranges.ok;
    const [warnLo, warnHi] = ranges.warn;

    if (numericVal < warnLo || numericVal > warnHi) return 'status-critical';
    if (numericVal < okLo   || numericVal > okHi)   return 'status-warning';
    return 'status-ok';
  }
  
  function updateManualDisplay(id, valObj) {
    const disp = el.querySelector(`#${id}`);
    const displayValue = valObj?.value || '--';
    const isFresh = (Date.now() - (valObj?.confirmedAt || 0)) < 60000;
    
    disp.textContent = displayValue;
    if (valObj?.confirmed) {
      disp.classList.remove('inherited');
      if (isFresh) disp.classList.add('manual-override');
      else disp.classList.remove('manual-override');
    } else {
      disp.classList.add('inherited');
      disp.classList.remove('manual-override');
    }
  }

  function updateCombinedManualDisplay(id, obj1, obj2) {
    const disp = el.querySelector(`#${id}`);
    const v1 = obj1?.value || '--';
    const v2 = obj2?.value || '--';
    const isFresh = (Date.now() - Math.max(obj1?.confirmedAt || 0, obj2?.confirmedAt || 0)) < 60000;
    const isConfirmed = obj1?.confirmed || obj2?.confirmed;
    
    disp.textContent = `${v1} / ${v2}`;
    if (isConfirmed) {
      disp.classList.remove('inherited');
      if (isFresh) disp.classList.add('manual-override');
      else disp.classList.remove('manual-override');
    } else {
      disp.classList.add('inherited');
      disp.classList.remove('manual-override');
    }
  }
}
