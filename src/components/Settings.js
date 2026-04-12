import { state } from '../state.js';
import { t } from '../i18n.js';
import { getProtocolNames, loadProtocols, saveProtocols, addProtocol, deleteProtocol, encodeProtocol, FIELDS, FIELD_LABELS, SIZE_GROUPS, SIZE_LABELS } from '../protocols.js';
import { getCaseHistory, deleteCase } from '../services/caseHistory.js';
import { joinSession } from '../services/sessionSync.js';
import { showToast } from './Toast.js';

export function createSettings(container) {
  const el = document.createElement('div');
  el.className = 'modal-overlay';
  el.id = 'settings-modal';

  function renderInner() {
    return `
      <div class="modal-content">
        <h2 id="modal-title">⚙️ ${t('settings')}</h2>
        
        <div class="settings-tabs">
          <button class="settings-tab-btn active" data-tab="tab-case-settings">${t('case_settings') || 'Patient'}</button>
          <button class="settings-tab-btn" data-tab="tab-app-settings">${t('app_settings') || 'App'}</button>
          <button class="settings-tab-btn" data-tab="tab-about-settings">${t('help_about') || 'Help'}</button>
        </div>

        <div id="tab-case-settings" class="settings-tab-content active">
          <div class="form-group">
            <label>${t('species')}</label>
            <div class="species-selector">
              <div class="species-btn ${state.get('species') === 'Dog' ? 'active' : ''}" data-species="Dog">${t('dog')}</div>
              <div class="species-btn ${state.get('species') === 'Cat' ? 'active' : ''}" data-species="Cat">${t('cat')}</div>
            </div>
          </div>

          <div class="form-group">
            <label>${t('weight')}</label>
            <div class="touch-input" id="patient-weight-btn" data-val="${state.get('weight')}">
              ${state.get('weight') ? state.get('weight') + ' kg' : t('tap_to_enter')}
            </div>
          </div>

          <div class="form-group">
            <label>${t('bcs')}</label>
            <div class="touch-input" id="patient-bcs-btn" data-val="${state.get('bcs')}">
              ${state.get('bcs') ? state.get('bcs') + '/9' : t('tap_to_enter')}
            </div>
          </div>

          <div class="form-group">
            <label for="patient-comorb">${t('comorbidities')}</label>
            <input type="text" id="patient-comorb" placeholder="e.g Diabetic..." value="${state.get('comorbidities')}" />
          </div>

          <div class="form-group">
            <label>${t('protocol')}</label>
            <div class="touch-input" id="patient-protocol-btn" data-val="${state.get('protocol') || 'General'}">
              ${state.get('protocol') || 'General'}
            </div>
          </div>
        </div>

        <div id="tab-app-settings" class="settings-tab-content">
          <div class="form-group">
            <label>${t('language')}</label>
            <select id="lang">
              <option value="sv" ${state.get('lang') === 'sv' ? 'selected' : ''}>Svenska</option>
              <option value="en" ${state.get('lang') === 'en' ? 'selected' : ''}>English</option>
            </select>
          </div>

          <div class="form-group">
            <label for="nurse-sign">${t('nurse_sign')}</label>
            <input type="text" id="nurse-sign" value="${state.get('nurseSign')}" />
          </div>

          <div class="form-group">
            <label for="capture-interval">${t('capture_interval')} <span id="interval-val">${state.get('captureInterval')} min</span></label>
            <input type="range" id="capture-interval" min="1" max="15" step="1" value="${state.get('captureInterval')}" />
          </div>

          <div class="form-group">
            <label>${t('protocols') || 'Protocols'}</label>
            <button class="btn" id="btn-manage-protocols" style="width:100%; margin-top:4px;">⚙️ ${t('manage_protocols') || 'Manage Protocols'}</button>
          </div>
        </div>

        <div id="tab-about-settings" class="settings-tab-content">
          <div class="about-tab-content">
            <div class="about-header">
              <h3>${t('guide_title')}</h3>
              <p>${t('guide_text')}</p>
            </div>
            <div class="help-grid">
              <div class="help-card">
                <div class="help-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="8"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="8" y1="2" x2="16" y2="2"></line><polyline points="12 10 12 14 15 15"></polyline></svg>
                </div>
                <div class="help-content">
                  <h4>${t('guide_auto_title')}</h4>
                  <p>${t('guide_auto_desc')}</p>
                </div>
              </div>
              <div class="help-card">
                <div class="help-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <div class="help-content">
                  <h4>${t('guide_manual_title')}</h4>
                  <p>${t('guide_manual_desc')}</p>
                </div>
              </div>
              <div class="help-card">
                <div class="help-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
                    <path d="M4 4V20" stroke-linecap="round"/>
                    <path d="M10 6L16 12L10 18" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 6L22 12L16 18" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="help-content">
                  <h4>${t('guide_camera_title')}</h4>
                  <p>${t('guide_camera_desc')}</p>
                </div>
              </div>
              <div class="help-card">
                <div class="help-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14h6"></path><path d="M9 10h6"></path><path d="M9 18h6"></path></svg>
                </div>
                <div class="help-content">
                  <h4>${t('guide_journal_title')}</h4>
                  <p>${t('guide_journal_desc')}</p>
                </div>
              </div>
              <div class="help-card">
                <div class="help-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </div>
                <div class="help-content">
                  <h4>${t('guide_settings_title')}</h4>
                  <p>${t('guide_settings_desc')}</p>
                </div>
              </div>
              <div class="help-card">
                <div class="help-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </div>
                <div class="help-content">
                  <h4>${t('guide_share_title')}</h4>
                  <p>${t('guide_share_desc')}</p>
                </div>
              </div>
              <div class="help-card">
                <div class="help-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </div>
                <div class="help-content">
                  <h4>${t('guide_share_protocol_title')}</h4>
                  <p>${t('guide_share_protocol_desc')}</p>
                </div>
              </div>
            </div>
            <div style="margin-top:20px; border-top:1px solid #333; padding-top:15px;">
              <p><strong>${t('about_version')}${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'Dev'}</strong></p>
              <p>${t('about_copyright')}</p>
              <div class="about-links">
                <a href="mailto:andrei@ignat.se" class="about-link">📧 andrei@ignat.se</a>
                <a href="https://www.linkedin.com/in/andrei-ignat-718401b" target="_blank" class="about-link">🔗 ${t('about_linkedin')}</a>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn" id="btn-cancel-settings" style="margin-right: 8px; background: transparent; border: 1px solid #444;">${t('cancel')}</button>
          <button class="btn" id="btn-save-settings">${t('save')}</button>
        </div>

        <div id="touch-popup" class="touch-popup hidden">
          <div class="touch-popup-content">
            <div class="touch-header">
              <h3 id="touch-title">Title</h3>
              <button class="btn-icon" id="btn-touch-close" style="border: none; background: transparent; font-size: 1.5rem; color: #fff; cursor: pointer;">✖</button>
            </div>
            <div class="touch-display" id="touch-display"></div>
            
            <div id="touch-numpad" class="touch-numpad hidden">
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

            <div id="touch-bcs-grid" class="touch-bcs-grid hidden">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="bcs-btn" data-val="${n}">${n}</button>`).join('')}
            </div>

            <div id="touch-protocol-list" class="touch-list hidden">
              ${getProtocolNames().map(p => `<button class="touch-list-btn ${state.get('protocol') === p ? 'active' : ''}" data-val="${p}">${p}</button>`).join('')}
            </div>
          </div>
        </div>

      </div>
    `;
  }

  el.innerHTML = renderInner();
  container.appendChild(el);

  let currentMode = 'settings';
  let selectedSpecies = state.get('species');
  let onCloseCallback = null;

  function attachListeners() {
    const btnSave = el.querySelector('#btn-save-settings');
    const btnCancel = el.querySelector('#btn-cancel-settings');
    const btnOpenHistory = el.querySelector('#btn-open-history');
    const inputSign = el.querySelector('#nurse-sign');
    const btnWeight = el.querySelector('#patient-weight-btn');
    const btnBcs = el.querySelector('#patient-bcs-btn');
    const inputComorb = el.querySelector('#patient-comorb');
    const rangeInterval = el.querySelector('#capture-interval');
    const valInterval = el.querySelector('#interval-val');
    const title = el.querySelector('#modal-title');
    const modalActions = el.querySelector('.modal-actions');
    const tabsContainer = el.querySelector('.settings-tabs');
    const tabContents = el.querySelectorAll('.settings-tab-content');
    const caseHistoryView = el.querySelector('#case-history-view');
    const speciesBtns = el.querySelectorAll('.species-btn');
    const selLang = el.querySelector('#lang');

    const touchPopup = el.querySelector('#touch-popup');
    const touchTitle = el.querySelector('#touch-title');
    const touchDisplay = el.querySelector('#touch-display');
    const touchNumpad = el.querySelector('#touch-numpad');
    const touchBcsGrid = el.querySelector('#touch-bcs-grid');

    let currentTouchTarget = null;
    let currentTouchValue = '';
    const tabBtns = el.querySelectorAll('.settings-tab-btn');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        el.querySelector('#' + btn.getAttribute('data-tab')).classList.add('active');
      });
    });

    if (currentMode === 'new-case' || currentMode === 'new-case-capture') {
      title.textContent = t('new_case');
      btnSave.textContent = t('start_case');
    }

    rangeInterval.addEventListener('input', (e) => {
      valInterval.textContent = `${e.target.value} min`;
    });

    speciesBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        speciesBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSpecies = btn.getAttribute('data-species');
      });
    });

    // Protocol selector
    let selectedProtocol = state.get('protocol') || 'General';
    const btnProtocol = el.querySelector('#patient-protocol-btn');
    const touchProtocolList = el.querySelector('#touch-protocol-list');

    btnProtocol.addEventListener('click', () => {
      currentTouchTarget = 'protocol';
      touchTitle.textContent = t('protocol') || 'Protocol';
      touchDisplay.textContent = selectedProtocol;
      touchNumpad.classList.add('hidden');
      touchBcsGrid.classList.add('hidden');
      touchProtocolList.classList.remove('hidden');
      touchPopup.classList.remove('hidden');
    });

    touchProtocolList.querySelectorAll('.touch-list-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedProtocol = btn.getAttribute('data-val');
        btnProtocol.dataset.val = selectedProtocol;
        btnProtocol.textContent = selectedProtocol;

        // Highlight active in list
        touchProtocolList.querySelectorAll('.touch-list-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        touchPopup.classList.add('hidden');
      });
    });

    // Protocols button
    const btnManageProtos = el.querySelector('#btn-manage-protocols');
    if (btnManageProtos) {
      btnManageProtos.addEventListener('click', () => {
        window.openProtocolSettingsModal();
      });
    }

    btnCancel.addEventListener('click', () => {
      el.classList.remove('open');
      if (onCloseCallback) onCloseCallback(false);
    });

    const btnTouchClose = el.querySelector('#btn-touch-close');
    btnTouchClose.addEventListener('click', () => {
      touchPopup.classList.add('hidden');
    });
    btnWeight.addEventListener('click', () => {
      currentTouchTarget = 'weight';
      currentTouchValue = btnWeight.dataset.val || '';
      touchTitle.textContent = t('weight') || 'Weight (kg)';
      touchDisplay.textContent = currentTouchValue;
      touchNumpad.classList.remove('hidden');
      touchBcsGrid.classList.add('hidden');
      touchProtocolList.classList.add('hidden');
      touchPopup.classList.remove('hidden');
    });

    btnBcs.addEventListener('click', () => {
      currentTouchTarget = 'bcs';
      touchTitle.textContent = t('bcs') || 'BCS';
      touchDisplay.textContent = btnBcs.dataset.val ? btnBcs.dataset.val + '/9' : '';
      touchNumpad.classList.add('hidden');
      touchBcsGrid.classList.remove('hidden');
      touchProtocolList.classList.add('hidden');
      touchPopup.classList.remove('hidden');
    });

    el.querySelectorAll('.numpad-btn').forEach(b => b.addEventListener('click', (e) => {
      const val = e.target.getAttribute('data-val');
      if (val === 'del') {
        currentTouchValue = currentTouchValue.slice(0, -1);
      } else if (val === 'ok') {
        btnWeight.dataset.val = currentTouchValue;
        btnWeight.textContent = currentTouchValue ? currentTouchValue + ' kg' : t('tap_to_enter');
        touchPopup.classList.add('hidden');
        return;
      } else {
        const sep = t('decimal_sep') || '.';
        if (val === sep && currentTouchValue.includes(sep)) return;
        currentTouchValue += val;
      }
      touchDisplay.textContent = currentTouchValue;
    }));

    el.querySelectorAll('.bcs-btn').forEach(b => b.addEventListener('click', (e) => {
      const val = e.target.getAttribute('data-val');
      btnBcs.dataset.val = val;
      btnBcs.textContent = val + '/9';
      touchPopup.classList.add('hidden');
    }));

    const handleGlobalKeyDown = (e) => {
      // Don't intercept if settings modal itself is closed OR if touch popup is closed
      if (!el.classList.contains('open') || touchPopup.classList.contains('hidden')) return;

      const key = e.key;
      const sep = t('decimal_sep') || '.';

      if (/^[0-9]$/.test(key)) {
        if (currentTouchTarget === 'weight') {
          currentTouchValue += key;
          touchDisplay.textContent = currentTouchValue;
        } else if (currentTouchTarget === 'bcs') {
          // Direct selection for BCS
          btnBcs.dataset.val = key;
          btnBcs.textContent = key + '/9';
          touchPopup.classList.add('hidden');
        }
        e.preventDefault();
      } else if (key === '.' || key === ',') {
        if (currentTouchTarget === 'weight' && !currentTouchValue.includes(sep)) {
          currentTouchValue += sep;
          touchDisplay.textContent = currentTouchValue;
        }
        e.preventDefault();
      } else if (key === 'Backspace') {
        if (currentTouchTarget === 'weight') {
          currentTouchValue = currentTouchValue.slice(0, -1);
          touchDisplay.textContent = currentTouchValue;
        }
        e.preventDefault();
      } else if (key === 'Enter') {
        if (currentTouchTarget === 'weight') {
          btnWeight.dataset.val = currentTouchValue;
          btnWeight.textContent = currentTouchValue ? currentTouchValue + ' kg' : t('tap_to_enter');
        }
        touchPopup.classList.add('hidden');
        e.preventDefault();
      } else if (key === 'Escape') {
        touchPopup.classList.add('hidden');
        e.preventDefault();
      }
    };

    if (window._stHandleGlobalKeyDown) { window.removeEventListener('keydown', window._stHandleGlobalKeyDown); }
    window._stHandleGlobalKeyDown = handleGlobalKeyDown;
    window.addEventListener('keydown', handleGlobalKeyDown);

    btnSave.addEventListener('click', () => {
      const oldLang = state.get('lang');
      const newLang = selLang.value;
      if (oldLang !== newLang) {
        state.set('lang', newLang);
      }

      state.set('species', selectedSpecies);
      state.set('protocol', selectedProtocol);
      state.set('weight', btnWeight.dataset.val || '');
      state.set('bcs', btnBcs.dataset.val || '');
      state.set('comorbidities', inputComorb.value);
      state.set('nurseSign', inputSign.value);
      state.set('captureInterval', parseInt(rangeInterval.value, 10));

      el.classList.remove('open');
      if (currentMode === 'new-case' || currentMode === 'new-case-capture') {
        state.set('caseActive', true);
      }
      if (onCloseCallback) onCloseCallback(true);
    });

    window.openSettingsModal = (mode = 'settings', onClose = null) => {
      currentMode = mode;
      onCloseCallback = onClose;
      // re-render to catch lang changes safely
      el.innerHTML = renderInner();
      attachListeners();
      el.classList.add('open');
    };
  }

  attachListeners();

  // --- Dedicated Case History Modal ---
  const histEl = document.createElement('div');
  histEl.className = 'modal-overlay';
  histEl.id = 'history-modal';

  histEl.innerHTML = `
    <div class="modal-content history-modal-content">
      <div class="history-header">
        <h2><span>📋</span> ${t('case_history')}</h2>
        <button class="btn-icon btn-modal-close" id="btn-history-close">✖</button>
      </div>
      <div id="history-list-container" class="history-list"></div>
    </div>

    <!-- Sub-modal for Journal Preview -->
    <div id="journal-preview-modal" class="touch-popup hidden" style="z-index: 99999;">
      <div class="touch-popup-content premium-preview">
        <div class="touch-header premium-preview-header">
          <div class="preview-title-row">
            <h3 id="preview-title">Journal Preview</h3>
            <button class="btn-icon btn-modal-close" id="btn-preview-close">✖</button>
          </div>
          <div class="preview-actions-row">
            <button class="btn btn-premium-action btn-resume" id="btn-preview-resume">
              <span class="blue-play-icon">▶</span>
              <span class="action-label">${t('resume_case') || 'Återuppta'}</span>
            </button>
            <button class="btn btn-premium-action" id="btn-preview-copy">
              <span class="action-icon">📋</span>
              <span class="action-label">${t('copy_to_journal') || 'Kopiera för Journal'}</span>
            </button>
          </div>
        </div>
        <div class="journal-table-wrapper">
          <table class="journal-table">
            <thead>
              <tr><th>Tid</th><th>Syre/Luft</th><th>Insp gas</th><th>CRT/Slh</th><th>Resp</th><th>EtCO2</th><th>SpO2</th><th>Puls</th><th>Sys</th><th>Dia</th><th>MAP</th><th>Temp</th><th>Sign</th></tr>
            </thead>
            <tbody id="preview-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  container.appendChild(histEl);

  const histList = histEl.querySelector('#history-list-container');
  const previewModal = histEl.querySelector('#journal-preview-modal');
  const previewTbody = histEl.querySelector('#preview-tbody');
  const previewTitle = histEl.querySelector('#preview-title');
  let previewedCase = null;

  async function renderHistory() {
    histList.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted); font-size: 1.2rem;">Laddar historik...</div>`;
    const cases = await getCaseHistory();

    if (cases.length === 0) {
      histList.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">${t('no_cases') || 'Inga sparade narkoser'}</div>`;
      return;
    }

    histList.innerHTML = '';
    cases.forEach(c => {
      const isShared = c._source === 'remote';
      const icon = isShared ? '🔗' : '📱';
      const label = isShared ? t('shared') : t('local');
      const date = new Date(c.caseStartTime || c.archivedAt);
      const dateStr = date.toLocaleDateString(state.get('lang') || 'sv', { month: 'short', day: 'numeric' });
      const timeStr = date.toLocaleTimeString(state.get('lang') || 'sv', { hour: '2-digit', minute: '2-digit' });

      const card = document.createElement('div');
      card.className = 'history-card-premium';
      card.innerHTML = `
        <div class="card-left">
          <div class="card-icon">${c.species === 'Dog' ? '🐶' : '🐱'}</div>
          <div class="card-main">
            <div class="card-title">${c.weight ? c.weight + 'kg' : ''} ${c.protocol || 'General'}</div>
            <div class="card-sub">
              ${dateStr} kl ${timeStr} | ${icon} ${label}
              ${c.totalSessionCost ? `<span style="color:var(--success); margin-left:8px; font-weight:600;">💰 $${c.totalSessionCost.toFixed(3)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-icon btn-del-case" style="color:var(--status-critical);">🗑️</button>
        </div>
      `;

      card.onclick = () => openPreview(c);
      card.querySelector('.btn-del-case').onclick = async (e) => {
        e.stopPropagation();
        if (confirm(t('delete_case') || 'Radera journal?')) {
          await deleteCase(c.id, isShared);
          renderHistory();
        }
      };
      histList.appendChild(card);
    });
  }

  function openPreview(c) {
    previewedCase = c;
    const dateStr = new Date(c.caseStartTime || c.archivedAt).toLocaleString(state.get('lang') || 'sv', { month: 'short', day: 'numeric' });
    previewTitle.textContent = `${c.species === 'Dog' ? '🐶' : '🐱'} ${c.weight}kg - ${dateStr}`;

    previewTbody.innerHTML = '';
    const entries = c.journalEntries || [];
    if (entries.length > 0) {
      entries.forEach(entry => {
        const tr = document.createElement('tr');
        const cells = Array.isArray(entry) ? entry : [
          entry.tid, entry.flow, entry.gas, entry.crt, entry.resp, entry.etco2,
          entry.spo2, entry.puls, entry.sys, entry.dia, entry.map, entry.temp, entry.sign
        ];
        cells.forEach(val => {
          const td = document.createElement('td');
          if (val && val.includes && val.includes('*')) {
            td.innerHTML = `<i style="opacity:0.8">${val.replace(/\*/g, '') || ''}</i>`;
          } else {
            td.textContent = val || '';
          }
          tr.appendChild(td);
        });
        previewTbody.appendChild(tr);
      });
    } else {
      previewTbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:20px; color:var(--text-muted);">Inga värden registrerade</td></tr>`;
    }
    previewModal.classList.remove('hidden');
  }

  histEl.querySelector('#btn-history-close').onclick = () => histEl.classList.remove('open');
  histEl.querySelector('#btn-preview-close').onclick = () => previewModal.classList.add('hidden');

  histEl.querySelector('#btn-preview-copy').onclick = () => {
    if (!previewedCase) return;
    const HEADERS = ['Tid', 'Syre/Luft', 'Insp gas', 'CRT/Slh', 'Resp', 'EtCO2', 'SpO2', 'Puls', 'Systol', 'Diastol', 'MAP', 'Temp', 'Sign'];
    const clean = (v) => (v && typeof v === 'string' && v.includes('*')) ? v.replace(/\*/g, '') : (v || '');
    const rowArrays = (previewedCase.journalEntries || []).map(entry =>
      Array.isArray(entry) ? entry : [
        entry.tid, entry.flow, entry.gas, entry.crt, entry.resp, entry.etco2,
        entry.spo2, entry.puls, entry.sys, entry.dia, entry.map, entry.temp, entry.sign
      ]
    );

    const activeCols = HEADERS.map((h, i) => i).filter(i => rowArrays.some(r => clean(r[i]) !== ''));
    const species = previewedCase.species === 'Dog' ? 'Hund' : 'Katt';
    const weight = previewedCase.weight ? ` ${previewedCase.weight} kg` : '';
    const bcs = previewedCase.bcs ? ` | BCS ${previewedCase.bcs}/9` : '';
    const dateStr = new Date(previewedCase.caseStartTime || previewedCase.archivedAt)
      .toLocaleDateString(state.get('lang') || 'sv', { day: 'numeric', month: 'short', year: 'numeric' });

    const cellStyle = 'padding:4px 10px; border:1px solid #ccc; text-align:center;';
    let html = `<p><b>Narkosjournal \u2014 ${species}${weight}${bcs} | ${dateStr}</b></p>`;
    html += '<table cellpadding="4" cellspacing="0" style="border-collapse:collapse; font-size:13px; font-family:sans-serif;">';
    html += '<tr>' + activeCols.map(i => `<td style="${cellStyle} background:#f0f0f0;"><b>${HEADERS[i]}</b></td>`).join('') + '</tr>';
    rowArrays.forEach(row => {
      html += '<tr>' + activeCols.map(i => `<td style="${cellStyle}">${clean(row[i])}</td>`).join('') + '</tr>';
    });
    html += '</table>';

    const tsv = [HEADERS.filter((_, i) => activeCols.includes(i)).join('\t'),
    ...rowArrays.map(r => activeCols.map(i => clean(r[i])).join('\t'))
    ].join('\n');

    const htmlBlob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([tsv], { type: 'text/plain' });
    navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })]).then(() => {
      const btnCopy = histEl.querySelector('#btn-preview-copy');
      const oldText = btnCopy.innerHTML;
      btnCopy.innerHTML = `<span class="action-icon">✅</span><span class="action-label">${t('copied')}</span>`;
      setTimeout(() => btnCopy.innerHTML = oldText, 2000);
    });
  };

  let resumeConfirmPending = false;
  let resumeConfirmTimer = null;

  histEl.querySelector('#btn-preview-resume').onclick = () => {
    if (!previewedCase) {
      console.warn('[Resume] No previewed case');
      return;
    }

    const btn = histEl.querySelector('#btn-preview-resume');

    if (!resumeConfirmPending) {
      // First tap: enter confirm state
      resumeConfirmPending = true;
      const orig = btn.innerHTML;
      btn.innerHTML = `<span class="action-icon">⚠️</span><span class="action-label">Bekräfta?</span>`;
      resumeConfirmTimer = setTimeout(() => {
        resumeConfirmPending = false;
        btn.innerHTML = orig;
      }, 3000);
    } else {
      // Second tap: actually resume
      clearTimeout(resumeConfirmTimer);
      resumeConfirmPending = false;

      const isShared = previewedCase._source === 'remote';
      const cData = previewedCase;
      const sessionId = cData.sessionId;

      console.log('[Resume] Restoring case:', cData);
      previewModal.classList.add('hidden');
      histEl.classList.remove('open');
      state.restoreCase(cData);

      if (isShared && sessionId) {
        joinSession(sessionId).catch(console.error);
      }

      window.location.reload();
    }
  };

  window.openHistoryModal = () => {
    histEl.classList.add('open');
    renderHistory();
  };

  // --- Dedicated Protocol Settings Modal ---
  const protoEl = document.createElement('div');
  protoEl.className = 'modal-overlay';
  protoEl.id = 'protocol-settings-modal';

  function renderProtoInner() {
    return `
      <div class="modal-content" style="max-width: 500px;">
        <div class="history-header">
          <h2>⚙️ ${t('protocol_settings') || 'Protocol Settings'}</h2>
          <button class="btn-icon btn-modal-close" id="btn-proto-close">✖</button>
        </div>
        
        <div class="form-group">
          <label>${t('select_protocol') || 'Select Protocol'}</label>
          <select id="proto-settings-select" style="padding:8px; background:#000; border:1px solid #444; color:#fff; border-radius:6px; font-size:1rem;">
            ${getProtocolNames().map(p => `<option value="${p}">${p}</option>`).join('')}
          </select>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button class="btn" id="btn-proto-add" style="flex:1; font-size:0.85rem;">${t('add_protocol')}</button>
            <button class="btn" id="btn-proto-share" style="flex:1; font-size:0.85rem;">${t('share_protocol')}</button>
            <button class="btn" id="btn-proto-del" style="flex:0.6; font-size:0.85rem; background:#5a2e2e;">${t('delete_protocol')}</button>
          </div>
        </div>

        <div class="form-group" style="margin-top:20px;">
          <label>${t('custom_ai_instructions') || 'Custom AI Instructions'}</label>
          <textarea id="proto-ai-instructions" rows="3" style="width:100%; padding:8px; background:#000; border:1px solid #444; color:#fff; border-radius:6px; font-size:0.9rem; resize: vertical;" placeholder="e.g. SpO2 sensor often falls off during dentals..."></textarea>
        </div>

        <div id="proto-ranges-container" style="margin-top: 20px; max-height: 35vh; overflow-y: auto; border: 1px solid #333; border-radius: 6px; padding: 12px; background: rgba(0,0,0,0.2);"></div>

        <div class="modal-actions" style="margin-top:20px;">
          <button class="btn" id="btn-proto-save" style="width:100%;">${t('done') || 'Done'}</button>
        </div>
      </div>
    `;
  }

  protoEl.innerHTML = renderProtoInner();
  container.appendChild(protoEl);

  function attachProtoListeners() {
    const sel = protoEl.querySelector('#proto-settings-select');
    const container = protoEl.querySelector('#proto-ranges-container');
    const aiInp = protoEl.querySelector('#proto-ai-instructions');
    const btnAdd = protoEl.querySelector('#btn-proto-add');
    const btnShare = protoEl.querySelector('#btn-proto-share');
    const btnDel = protoEl.querySelector('#btn-proto-del');
    const btnSave = protoEl.querySelector('#btn-proto-save');
    const btnClose = protoEl.querySelector('#btn-proto-close');

    function renderRanges() {
      const name = sel.value;
      const all = loadProtocols();
      const proto = all[name];
      if (!proto) { container.innerHTML = ''; return; }

      aiInp.value = proto.customAIInstructions || "";

      let html = '';
      SIZE_GROUPS.forEach(sg => {
        html += `<div style="margin-bottom:16px;"><strong style="color:var(--status-info); display:block; margin-bottom:4px;">${SIZE_LABELS[sg]}</strong>`;
        html += `<table style="width:100%; font-size:0.85rem; border-collapse:collapse;">`;
        html += `<tr><th style="text-align:left; padding:4px;">Param</th><th style="padding:4px;">Min</th><th style="padding:4px;">Max</th></tr>`;
        FIELDS.forEach(f => {
          const vals = proto[sg]?.[f] || [0, 0];
          html += `<tr>
            <td style="padding:4px;">${FIELD_LABELS[f]}</td>
            <td style="padding:2px;"><input type="number" step="any" value="${vals[0]}" data-proto="${name}" data-sg="${sg}" data-field="${f}" data-idx="0" style="width:100%; background:#000; color:#fff; border:1px solid #555; border-radius:4px; padding:6px; text-align:center;" /></td>
            <td style="padding:2px;"><input type="number" step="any" value="${vals[1]}" data-proto="${name}" data-sg="${sg}" data-field="${f}" data-idx="1" style="width:100%; background:#000; color:#fff; border:1px solid #555; border-radius:4px; padding:6px; text-align:center;" /></td>
          </tr>`;
        });
        html += `</table></div>`;
      });
      container.innerHTML = html;

      // Live-save ranges
      container.querySelectorAll('input[type="number"]').forEach(inp => {
        inp.addEventListener('change', () => {
          const allP = loadProtocols();
          const pName = inp.dataset.proto;
          const sg = inp.dataset.sg;
          const f = inp.dataset.field;
          const idx = parseInt(inp.dataset.idx);
          if (!allP[pName]?.[sg]?.[f]) return;
          allP[pName][sg][f][idx] = parseFloat(inp.value);
          saveProtocols(allP);
        });
      });
    }

    sel.addEventListener('change', renderRanges);
    aiInp.addEventListener('change', () => {
      const allP = loadProtocols();
      const name = sel.value;
      if (allP[name]) {
        allP[name].customAIInstructions = aiInp.value;
        saveProtocols(allP);
      }
    });

    btnAdd.onclick = () => {
      const name = prompt(t('add_protocol'));
      if (!name || !name.trim()) return;
      addProtocol(name.trim());
      protoEl.innerHTML = renderProtoInner();
      attachProtoListeners();
      protoEl.querySelector('#proto-settings-select').value = name.trim();
      protoEl.querySelector('#proto-settings-select').dispatchEvent(new Event('change'));
    };

    btnDel.onclick = () => {
      const name = sel.value;
      if (['General', 'Dental', 'Kastration', 'Ortopedi'].includes(name)) {
        alert('Cannot delete built-in protocol');
        return;
      }
      if (confirm(`Delete protocol "${name}"?`)) {
        deleteProtocol(name);
        protoEl.innerHTML = renderProtoInner();
        attachProtoListeners();
      }
    };

    btnShare.onclick = () => {
      const name = sel.value;
      const encoded = encodeProtocol(name);
      const url = `${window.location.origin}${window.location.pathname}#protocol=${encoded}`;
      
      const shareData = {
        title: `Vet Anesthesia Protocol: ${name}`,
        url: url
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        navigator.share(shareData).catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Protocol share failed:', err);
          }
        });
      } else {
        navigator.clipboard.writeText(url).then(() => {
          showToast(`Link for "${name}" copied!`, 'success');
        }).catch(() => {
          prompt('Copy this link:', url);
        });
      }
    };

    btnSave.onclick = () => protoEl.classList.remove('open');
    btnClose.onclick = () => protoEl.classList.remove('open');

    renderRanges();
  }

  window.openProtocolSettingsModal = () => {
    protoEl.innerHTML = renderProtoInner();
    attachProtoListeners();
    protoEl.classList.add('open');
  };
}
