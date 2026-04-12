import { state } from '../state.js';
import { t } from '../i18n.js';
import { createSessionSync, leaveSession } from '../services/sessionSync.js';
import { archiveCase } from '../services/caseHistory.js';
import { showToast } from './Toast.js';

export function createStatusBar(container) {
  const el = document.createElement('div');
  el.className = 'status-bar';
  
  const initialMode = state.get('captureMode');
  const initialModeKey = initialMode === 'auto' ? 'mode_auto' : 'mode_manual';
  
  el.innerHTML = `
    <button id="btn-power" class="btn btn-power">
      <svg class="icon-play" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      <svg class="icon-stop hidden" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect></svg>
      <svg class="icon-disconnect hidden" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8"></path><path d="M18 12V7a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v5"></path><path d="M6 12v1a6 6 0 0 0 12 0v-1"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
      <span class="power-text" data-i18n="start_case">${t('start_case') || 'Starta Narkos'}</span>
    </button>
    <div id="timer-container" style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
      <div id="timer" class="timer">00:00:00</div>
      <div id="data-age" class="data-age hidden" style="color:var(--status-warning); font-size: 0.75rem; font-weight: 600; text-transform: uppercase;"></div>
    </div>
    <div class="controls">
      <button id="status-signature" class="btn status-signature hidden-mobile" title="${t('nurse_sign')}">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="signature-icon" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span class="signature-text">${state.get('nurseSign') || '?'}</span>
      </button>
      <button id="btn-history" class="btn btn-icon" title="${t('case_history') || 'Historik'}">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14h6"></path><path d="M9 10h6"></path><path d="M9 18h6"></path></svg>
      </button>
      <button id="btn-share" class="btn btn-icon hidden" title="${t('share_session') || 'Dela'}">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
      </button>
      <button id="btn-layout" class="btn btn-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line><path d="M16 12l-4-4-4 4"></path><path d="M16 12l-4 4-4-4"></path></svg>
      </button>
      <button id="btn-mode-toggle" class="btn btn-icon" title="Toggle Auto/Manual">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="8"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="8" y1="2" x2="16" y2="2"></line><polyline points="12 10 12 14 15 15"></polyline></svg>
      </button>
      <button id="btn-settings" class="btn btn-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
      </button>
    </div>
  `;
  container.appendChild(el);

  const btnPower = el.querySelector('#btn-power');
  const timerDisplay = el.querySelector('#timer');
  const btnLayout = el.querySelector('#btn-layout');
  const btnMode = el.querySelector('#btn-mode');
  const btnSettings = el.querySelector('#btn-settings');
  const btnHistory = el.querySelector('#btn-history');
  const timerContainer = el.querySelector('#timer-container');
  const btnModeToggle = el.querySelector('#btn-mode-toggle');

  let timerInterval;

  // --- Modal stop-case confirmation (replaces inline and blocked native dialogs) ---
  let confirmPending = false;

  function updateVisibility() {
    const isActive = state.get('caseActive');
    const statusSign = el.querySelector('#status-signature');
    
    // Hide timer if not active
    if (isActive) {
      timerContainer.classList.remove('hidden');
      btnHistory.classList.add('hidden');
      if (btnModeToggle) btnModeToggle.classList.remove('hidden');
      if (statusSign) statusSign.classList.add('hidden-mobile');
    } else {
      timerContainer.classList.add('hidden');
      btnHistory.classList.remove('hidden');
      if (btnModeToggle) btnModeToggle.classList.add('hidden');
      if (statusSign) statusSign.classList.remove('hidden-mobile');
    }
  }

  function showStopConfirm() {
    if (confirmPending) return;
    confirmPending = true;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'stop-confirm-modal';
    overlay.style.zIndex = '2000'; // Ensure it's above the status bar

    // Clean, centered modal matching the rest of the app's dark theme
    overlay.innerHTML = `
      <div class="modal-content" style="text-align: center; max-width: 320px; padding: 24px;">
        <h3 style="margin-bottom: 16px; font-size: 1.5rem; color: var(--status-warning);">⚠️ ${t('end_case_confirm') || 'Avsluta narkos?'}</h3>
        <p style="margin-bottom: 24px; color: var(--text-muted); font-size: 1.1rem; line-height: 1.4;">
          Är du säker på att du vill avsluta?
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="btn-confirm-cancel" class="btn" style="flex: 1; background: #333; font-size: 1.1rem; padding: 12px;">Nej</button>
          <button id="btn-confirm-ok" class="btn" style="flex: 1; background: var(--status-critical); color: #000; font-weight: bold; font-size: 1.1rem; padding: 12px;">Ja, Avsluta</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-confirm-cancel').addEventListener('click', () => {
      confirmPending = false;
      overlay.remove();
    });

    overlay.querySelector('#btn-confirm-ok').addEventListener('click', async () => {
      confirmPending = false;
      overlay.remove();
      
      // Build case data for archiving
      const caseData = {
        species: state.get('species'),
        weight: state.get('weight'),
        bcs: state.get('bcs'),
        comorbidities: state.get('comorbidities'),
        protocol: state.get('protocol'),
        caseStartTime: state.get('caseStartTime') ? state.get('caseStartTime').toISOString() : new Date().toISOString(),
        caseEndTime: new Date().toISOString(),
        readings: state.get('readings').map(r => ({ ...r, timestamp: r.timestamp.toISOString() })),
        journalEntries: state.get('journalEntries'),
        sessionId: state.get('sessionId')
      };
      
      try {
        await archiveCase(caseData);
      } catch (err) {
        console.error('Failed to archive case:', err);
        // We still reset the case even if archive fails, but maybe we should alert the user
      }
      
      state.set('caseActive', false);
      state.set('currentStatus', 'idle');
    });
  }

  function showDisconnectConfirm() {
    if (confirmPending) return;
    confirmPending = true;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'disconnect-confirm-modal';
    overlay.style.zIndex = '2000';

    overlay.innerHTML = `
      <div class="modal-content" style="text-align: center; max-width: 320px; padding: 24px;">
        <h3 style="margin-bottom: 16px; font-size: 1.5rem; color: var(--status-info);">🔌 ${t('disconnect_confirm_title') || 'Koppla från?'}</h3>
        <p style="margin-bottom: 24px; color: var(--text-muted); font-size: 1.1rem; line-height: 1.4;">
          ${t('disconnect_confirm_text') || 'Vill du koppla från den delade sessionen? Narkosen fortsätter för andra användare.'}
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="btn-disconnect-cancel" class="btn" style="flex: 1; background: #333; font-size: 1.1rem; padding: 12px;">Nej</button>
          <button id="btn-disconnect-ok" class="btn" style="flex: 1; background: var(--status-info); color: white; font-weight: bold; font-size: 1.1rem; padding: 12px;">Ja, Koppla från</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-disconnect-cancel').addEventListener('click', () => {
      confirmPending = false;
      overlay.remove();
    });

    overlay.querySelector('#btn-disconnect-ok').addEventListener('click', async () => {
      confirmPending = false;
      overlay.remove();
      await leaveSession();
      state.set('caseActive', false);
      state.set('currentStatus', 'idle');
    });
  }

  function updatePowerButtonUI() {
    const isActive = state.get('caseActive');
    const sessionId = state.get('sessionId');
    const userCount = state.get('connectedUsersCount') || 1;
    
    const powerText = btnPower.querySelector('.power-text');
    const iconPlay = btnPower.querySelector('.icon-play');
    const iconStop = btnPower.querySelector('.icon-stop');
    const iconDisconnect = btnPower.querySelector('.icon-disconnect');

    if (isActive) {
      if (!state.get('caseStartTime')) {
        state.set('caseStartTime', new Date());
      }
      if (sessionId && userCount > 1) {
        powerText.setAttribute('data-i18n', 'disconnect_case');
        powerText.textContent = t('disconnect_case') || 'Koppla från';
        btnPower.classList.add('disconnect');
        iconStop.classList.add('hidden');
        iconDisconnect.classList.remove('hidden');
      } else {
        powerText.setAttribute('data-i18n', 'stop_case');
        powerText.textContent = t('stop_case') || 'Avsluta';
        btnPower.classList.remove('disconnect');
        iconStop.classList.remove('hidden');
        iconDisconnect.classList.add('hidden');
      }
      btnPower.classList.add('active');
      iconPlay.classList.add('hidden');
      startTimer();
    } else {
      powerText.setAttribute('data-i18n', 'start_case');
      powerText.textContent = t('start_case') || 'Starta Narkos';
      btnPower.classList.remove('active');
      btnPower.classList.remove('disconnect');
      iconStop.classList.add('hidden');
      iconDisconnect.classList.add('hidden');
      iconPlay.classList.remove('hidden');
      confirmPending = false;
      stopTimer();
    }
  }

  // Listen to case state to update UI
  state.addEventListener('change:caseActive', () => {
    updatePowerButtonUI();
    updateVisibility();
  });
  state.addEventListener('change:connectedUsersCount', updatePowerButtonUI);
  state.addEventListener('change:sessionId', updatePowerButtonUI);

  // Initialize UI based on persisted state
  updateVisibility();
  updatePowerButtonUI();

  // Event Listeners
  btnPower.addEventListener('click', () => {
    const isActive = state.get('caseActive');
    if (isActive) {
      if (confirmPending) return;
      
      const sessionId = state.get('sessionId');
      const userCount = state.get('connectedUsersCount') || 1;

      if (sessionId && userCount > 1) {
        showDisconnectConfirm();
      } else {
        showStopConfirm();
      }
    } else {
      if (window.openSettingsModal) {
        state.resetCase();
        window.openSettingsModal('new-case');
      } else {
        state.resetCase();
        state.set('caseActive', true);
      }
    }
  });

  btnHistory.addEventListener('click', () => {
    if (window.openHistoryModal) {
      window.openHistoryModal();
    }
  });

  btnLayout.addEventListener('click', () => {
    state.set('layoutReversed', !state.get('layoutReversed'));
  });


  btnModeToggle.addEventListener('click', () => {
    const isAuto = state.get('captureMode') === 'auto';
    state.set('captureMode', isAuto ? 'manual' : 'auto');
  });

  function updateModeUI() {
    if (!btnModeToggle) return;
    const isAuto = state.get('captureMode') === 'auto';
    if (isAuto) {
      btnModeToggle.style.color = 'var(--status-info)';
      btnModeToggle.style.opacity = '1';
      btnModeToggle.classList.add('active'); // active class in index.css has the glow
    } else {
      btnModeToggle.style.color = 'inherit';
      btnModeToggle.style.opacity = '0.4';
      btnModeToggle.classList.remove('active');
    }
  }

  state.addEventListener('change:captureMode', updateModeUI);
  updateModeUI();

  btnSettings.addEventListener('click', () => {
    if (window.openSettingsModal) {
      window.openSettingsModal('settings');
    } else {
      const modal = document.getElementById('settings-modal');
      if (modal) modal.classList.toggle('open');
    }
  });

  const statusSign = el.querySelector('#status-signature');
  statusSign.addEventListener('click', () => {
    const currentSign = state.get('nurseSign') || '';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.style.zIndex = '10001';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 300px; text-align:center;">
        <h3 style="margin-bottom: 20px;">${t('nurse_sign')}</h3>
        <div class="form-group" style="margin-bottom: 20px;">
          <input type="text" id="edit-sig-input" value="${currentSign}" style="text-align:center; font-size:1.5rem; width:100%;" autofocus />
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn" id="btn-sig-cancel" style="flex:1;">${t('cancel') || 'Avbryt'}</button>
          <button class="btn" id="btn-sig-save" style="flex:1; background:var(--status-info); color:white;">${t('save') || 'Spara'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#edit-sig-input');
    const btnCancel = overlay.querySelector('#btn-sig-cancel');
    const btnSave = overlay.querySelector('#btn-sig-save');

    input.focus();
    input.select();

    const close = () => overlay.remove();
    btnCancel.addEventListener('click', close);
    btnSave.addEventListener('click', () => {
      const newSign = input.value.trim();
      if (newSign) {
        state.set('nurseSign', newSign);
      }
      close();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnSave.click();
      if (e.key === 'Escape') close();
    });
  });

  // Handle signature change
  state.addEventListener('change:nurseSign', (e) => {
    const sigText = el.querySelector('#status-signature .signature-text');
    if (sigText) sigText.textContent = e.detail.value || '?';
  });

  // Collaboration Logic
  const btnShare = el.querySelector('#btn-share');
  const sessionIndicator = el.querySelector('#session-indicator');
  const sessionIdDisplay = el.querySelector('#session-id-display');

  function handleShare() {
    try {
      btnShare.disabled = true;
      const sessionId = state.get('sessionId') || createSessionSync();
      const url = `${window.location.origin}${window.location.pathname}#session=${sessionId}`;
      
      const shareData = {
        title: `Vet Monitor - ${state.get('species')} (${state.get('weight')}kg)`,
        url: url
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        navigator.share(shareData).catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Share failed:', err);
          }
        });
      } else {
        navigator.clipboard.writeText(url).then(() => {
          showToast(t('link_copied'), 'success');
        }).catch(() => {
          // Clipboard also failed, show the URL manually
          prompt(t('link_copied'), url);
        });
      }
    } catch (err) {
      console.error('Failed to share session:', err);
      showToast('Failed to share session.', 'error');
    } finally {
      btnShare.disabled = false;
    }
  }

  btnShare.addEventListener('click', handleShare);

  function updateCollaborationUI() {
    const isActive = state.get('caseActive');
    const sessionId = state.get('sessionId');

    // Button visible if case is active
    if (isActive) {
      btnShare.classList.remove('hidden');
    } else {
      btnShare.classList.add('hidden');
    }

    // Button is 'active' (blue glow) if session exists
    if (sessionId) {
      btnShare.style.color = 'var(--status-ok)';
    } else {
      btnShare.style.color = 'inherit';
    }
  }

  state.addEventListener('change:caseActive', updateCollaborationUI);
  state.addEventListener('change:sessionId', updateCollaborationUI);
  updateCollaborationUI();



  // Timer logic
  function startTimer() {
    if (timerInterval) return; // Already running
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    timerDisplay.textContent = '00:00:00';
  }

  function updateTimer() {
    const startTime = state.get('caseStartTime');
    if (!startTime) return;
    
    const now = new Date();
    const diff = Math.floor((now - startTime) / 1000);
    
    const h = Math.floor(diff / 3600);
    const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    const s = String(diff % 60).padStart(2, '0');
    
    if (h > 0) {
      timerDisplay.textContent = `${String(h).padStart(2, '0')}:${m}:${s}`;
    } else {
      timerDisplay.textContent = `${m}:${s}`;
    }

    const ageEl = el.querySelector('#data-age');
    if (ageEl) {
      const lastInput = state.get('lastInputTime');
      if (lastInput) {
        const inputDiffMs = now - lastInput;
        const inputDiffMin = Math.floor(inputDiffMs / 60000);
        if (inputDiffMin >= 1) {
          ageEl.textContent = `${inputDiffMin} ${t('data_age_suffix')}`;
          ageEl.classList.remove('hidden');
          // Fire stale event once per minute crossing
          if (!ageEl.dataset.staleLastMin || parseInt(ageEl.dataset.staleLastMin) !== inputDiffMin) {
            ageEl.dataset.staleLastMin = inputDiffMin;
            window.dispatchEvent(new CustomEvent('data-stale', { detail: { minutes: inputDiffMin } }));
          }
        } else {
          ageEl.classList.add('hidden');
          ageEl.dataset.staleLastMin = '';
        }
      } else {
        ageEl.classList.add('hidden');
      }
    }
  }
}
