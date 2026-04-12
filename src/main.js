import './styles/index.css';
import './styles/components.css';
import { createStatusBar } from './components/StatusBar.js';
import { createCameraView } from './components/CameraView.js';
import { createValuesTable } from './components/ValuesTable.js';
import { createJournal } from './components/Journal.js';
import { createAssessment } from './components/Assessment.js';
import { createSettings } from './components/Settings.js';
import { initCaptureLoop } from './services/captureLoop.js';
import { updateI18n, t } from './i18n.js';
import { state } from './state.js';
import { decodeProtocol, importProtocol } from './protocols.js';
import { initSessionSync, joinSession } from './services/sessionSync.js';
import { initClinicalAssessment } from './services/clinicalAssessment.js';
import { showToast } from './components/Toast.js';

console.log('Vet Anesthesia Monitor started');

// Global Pinch-to-Zoom Prevention (for PWA-style interface safety)
document.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
}, { passive: false });

// Initialize session sync
initSessionSync();

document.querySelector('#app').innerHTML = `
  <div id="status-bar-container" style="flex-shrink: 0;"></div>
  <div class="split-view">
    <div class="camera-pane" id="camera-pane"></div>
    <div class="data-pane" id="data-pane">
      <div class="tabs-header">
        <button class="tab-btn active" data-target="tab-values" data-i18n="tab_values">${t('tab_values')}</button>
        <button class="tab-btn" id="tab-btn-status" data-target="tab-assessment"><span data-i18n="tab_status">${t('tab_status')}</span> <span id="tab-status-icon">⌛</span></button>
        <button class="tab-btn" data-target="tab-journal" data-i18n="tab_journal">${t('tab_journal')}</button>
      </div>
      <div class="tab-content">
        <div id="tab-values" class="tab-pane active">
          <div id="values-table-container"></div>
        </div>
        <div id="tab-assessment" class="tab-pane">
          <div id="assessment-container"></div>
        </div>
        <div id="tab-journal" class="tab-pane">
          <div id="journal-container"></div>
        </div>
      </div>
    </div>
  </div>
  <div id="settings-root"></div>
`;

createStatusBar(document.getElementById('status-bar-container'));
createCameraView(document.getElementById('camera-pane'));

// Tabs Logic
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // remove active from all
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));
    
    // add active to clicked
    btn.classList.add('active');
    const target = document.getElementById(btn.getAttribute('data-target'));
    if (target) target.classList.add('active');
  });
});

createValuesTable(document.getElementById('values-table-container'));
createAssessment(document.getElementById('assessment-container'));
createJournal(document.getElementById('journal-container'));
createSettings(document.getElementById('settings-root'));

// Initialize services
initCaptureLoop();
initClinicalAssessment();

// Fire initial state events so components render persisted data on reload
(function initRestoredState() {
  state.dispatchEvent(new CustomEvent('change:journalEntries', { detail: { entries: state.get('journalEntries') } }));
  state.dispatchEvent(new CustomEvent('change:readings', { detail: { readings: state.get('readings') } }));
  state.dispatchEvent(new CustomEvent('change:manualValues', { detail: { values: state.get('manualValues') } }));
})();

state.addEventListener('change:lang', () => {
  updateI18n();
});

function updateLayout() {
  document.querySelector('.split-view').classList.toggle('reverse-layout', state.get('layoutReversed'));
}
state.addEventListener('change:layoutReversed', updateLayout);
updateLayout();

// --- Protocol Import via URL hash ---
(function checkProtocolImport() {
  const hash = window.location.hash;
  if (!hash.startsWith('#protocol=')) return;
  const b64 = hash.replace('#protocol=', '');
  const data = decodeProtocol(b64);
  if (!data || !data.name) return;

  // Clean hash immediately
  history.replaceState(null, '', window.location.pathname);

  const msg = `${t('import_protocol_msg')} "${data.name}"?`;
  const choice = confirm(msg);
  if (!choice) return;

  importProtocol(data, 'add');
  showToast(`Protocol "${data.name}" imported!`, 'success');
})();
// --- Session Join via URL hash ---
(async function checkSessionJoin() {
  const hash = window.location.hash;
  if (!hash.startsWith('#session=')) return;
  const sessionId = hash.replace('#session=', '');

  // Clean hash immediately
  history.replaceState(null, '', window.location.pathname);

  try {
    await joinSession(sessionId);
    showToast(`${t('session_joined')}: ${sessionId}`, 'success');
  } catch (err) {
    console.error('Failed to join session:', err);
    showToast(t('session_join_failed') || 'Failed to join session', 'error');
  }
})();

// --- Onboarding Flow ---
(function checkOnboarding() {
  if (state.get('hasSeenOnboarding')) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.style.zIndex = '10000';
  
  overlay.innerHTML = `
    <div class="modal-content onboarding-content">
      <div id="onboarding-step-1" class="onboarding-step active">
        <h2>${t('welcome_title')}</h2>
        <p style="margin: 20px 0;">${t('welcome_text')}</p>
        <div class="form-group">
          <input type="text" id="ob-nurse-sign" placeholder="${t('nurse_sign')}" style="text-align:center; font-size: 1.5rem; padding: 15px;" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-power" id="btn-ob-next" style="width: 100%; padding: 12px; font-size: 1.1rem;">
             <span class="power-text">${t('onboarding_next')}</span>
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>
      
      <div id="onboarding-step-2" class="onboarding-step">
        <h2>${t('guide_title')}</h2>
        <div class="help-grid" style="max-height: 50vh; overflow-y: auto; text-align: left; padding: 0 10px;">
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
        <div class="modal-actions">
          <button class="btn btn-power" id="btn-ob-done" style="width: 100%; padding: 12px; font-size: 1.1rem;">
            <span class="power-text">${t('onboarding_done')}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const inputSign = overlay.querySelector('#ob-nurse-sign');
  const btnNext = overlay.querySelector('#btn-ob-next');
  const btnDone = overlay.querySelector('#btn-ob-done');
  const step1 = overlay.querySelector('#onboarding-step-1');
  const step2 = overlay.querySelector('#onboarding-step-2');

  btnNext.addEventListener('click', () => {
    const sign = inputSign.value.trim();
    if (sign) {
      state.set('nurseSign', sign);
    }
    step1.classList.remove('active');
    step2.classList.add('active');
  });

  btnDone.addEventListener('click', () => {
    state.set('hasSeenOnboarding', true);
    overlay.remove();
  });
})();
