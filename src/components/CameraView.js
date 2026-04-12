import { state } from '../state.js';
import { t } from '../i18n.js';
import { showToast } from './Toast.js';

export function createCameraView(container) {
  const el = document.createElement('div');
  el.className = 'camera-container';
  
  // Collapse by default
  let isCollapsed = true; 
  container.classList.add('collapsed');

  el.innerHTML = `
    <video id="camera-feed" class="camera-feed hidden" autoplay playsinline></video>
    <canvas id="camera-canvas-display" class="camera-canvas-view"></canvas>
    <canvas id="camera-canvas-hidden" class="hidden-canvas"></canvas>

    <button id="btn-camera-toggle" class="btn-camera-toggle ${isCollapsed ? 'collapsed' : 'expanded'}" title="${t('settings')}">
      <div class="toggle-icon-container">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" class="toggle-icon-svg" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4V20" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <path d="M10 6L16 12L10 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M16 6L22 12L16 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </button>

    <div id="waking-overlay" class="waking-overlay hidden">
      <div class="status-icon">📷</div>
      <div class="waking-label">${t('waking_camera')}</div>
      <div id="waking-countdown" class="timer" style="font-size: 3rem; margin-top: 10px;">3</div>
    </div>

    <div id="manual-capture-overlay" class="capture-overlay hidden">
      <button id="btn-manual-capture" class="btn-capture-large" data-i18n="btn_capture">
        <svg width="40" height="40" viewBox="0 0 100 100" fill="none" class="capture-icon-svg" xmlns="http://www.w3.org/2000/svg" style="margin-right: 15px;">
          <defs>
            <linearGradient id="nano-capture" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFEA00" />
              <stop offset="50%" stop-color="#FF5E00" />
              <stop offset="100%" stop-color="#FF0055" />
            </linearGradient>
            <filter id="nano-glow-capture">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle cx="50" cy="50" r="40" stroke="url(#nano-capture)" stroke-width="4" filter="url(#nano-glow-capture)" stroke-dasharray="20 15" class="outer-ring"/>
          <path d="M50 25 L65 40 L80 50 L65 60 L50 75 L35 60 L20 50 L35 40 Z" fill="url(#nano-capture)" opacity="0.6" class="inner-shutter" />
          <circle cx="50" cy="50" r="12" fill="white" />
        </svg>
        <span id="btn-capture-text">${t('btn_capture') || 'Capture'}</span>
      </button>
    </div>
    
    <div id="capture-flash" class="capture-flash"></div>
    <div id="camera-error" class="camera-error hidden"></div>
  `;
  container.appendChild(el);

  const video = el.querySelector('#camera-feed');
  const canvasDisplay = el.querySelector('#camera-canvas-display');
  const canvasHidden = el.querySelector('#camera-canvas-hidden');
  const wakingOverlay = el.querySelector('#waking-overlay');
  const wakingCountdown = el.querySelector('#waking-countdown');
  const manualOverlay = el.querySelector('#manual-capture-overlay');
  const btnCapture = el.querySelector('#btn-manual-capture');
  const btnToggle = el.querySelector('#btn-camera-toggle');
  const flash = el.querySelector('#capture-flash');
  const errorMsg = el.querySelector('#camera-error');
  
  let stream = null;
  let liveTimeout = null;

  // Zoom state
  let currentZoom = 1;
  let minZoomSupported = 1;
  let maxZoomSupported = 5;
  let hardwareZoomEnabled = false;
  let initialDistance = 0;
  let initialZoom = 1;

  function applySoftwareZoom(val) {
    hardwareZoomEnabled = false;
    video.style.transform = `scale(${val})`;
    canvasDisplay.style.transform = `scale(${val})`;
  }

  function resetVisualZoom() {
    video.style.transform = `scale(1)`;
    canvasDisplay.style.transform = `scale(1)`;
  }

  async function updateZoom(val) {
    let targetZoom = val;
    let useHardware = false;

    if (stream && stream.active) {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      
      if (capabilities && capabilities.zoom) {
        useHardware = true;
        minZoomSupported = capabilities.zoom.min || 1;
        maxZoomSupported = capabilities.zoom.max || 5;
        targetZoom = Math.max(minZoomSupported, Math.min(targetZoom, maxZoomSupported));
        
        try {
          await track.applyConstraints({ advanced: [{ zoom: targetZoom }] });
          hardwareZoomEnabled = true;
          currentZoom = targetZoom;
          resetVisualZoom();
        } catch (err) {
          console.warn("Hardware zoom error", err);
          useHardware = false; // Fallback
        }
      }
    }

    if (!useHardware) {
      minZoomSupported = 1;
      maxZoomSupported = 5; // Software zoom limit
      targetZoom = Math.max(minZoomSupported, Math.min(targetZoom, maxZoomSupported));
      currentZoom = targetZoom;
      applySoftwareZoom(currentZoom);
    }
    
    if (state.get('captureMode') === 'auto') {
      window.savedAutoZoom = currentZoom;
    }
  }

  // Init camera
  async function initCamera() {
    if (stream && stream.active) return stream;
    
    try {
      console.log("Waking camera sensor...");
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      video.srcObject = stream;
      errorMsg.classList.add('hidden');
      return stream;
    } catch (err) {
      console.error('Camera access error:', err);
      errorMsg.textContent = (t('error_camera_access') || 'Camera access denied or unavailable.');
      errorMsg.classList.remove('hidden');
      return null;
    }
  }

  function stopCamera() {
    if (stream) {
      console.log("Powering down camera sensor...");
      stream.getTracks().forEach(track => track.stop());
      stream = null;
      video.srcObject = null;
    }
    video.classList.add('hidden');
    canvasDisplay.classList.remove('hidden');
  }

  async function startLiveView() {
    const s = await initCamera();
    if (!s) return;
    
    video.classList.remove('hidden');
    canvasDisplay.classList.add('hidden');
    
    // Process zoom mode logic
    if (state.get('captureMode') === 'manual') {
      await updateZoom(1);
    } else {
      if (window.savedAutoZoom) {
        await updateZoom(window.savedAutoZoom);
      } else {
        await updateZoom(1);
      }
    }

    // Auto-collapse after 30s to save battery if user forgets
    if (liveTimeout) clearTimeout(liveTimeout);
    liveTimeout = setTimeout(() => {
      isCollapsed = true;
      updateCollapseUI();
    }, 30000);
  }

  function updateCollapseUI() {
    // Check if layout is reversed
    const isReversed = state.get('layoutReversed');
    if (isReversed) {
      btnToggle.classList.add('reverse-layout');
    } else {
      btnToggle.classList.remove('reverse-layout');
    }

    if (isCollapsed) {
      container.classList.add('collapsed');
      btnToggle.classList.add('collapsed');
      btnToggle.classList.remove('expanded');
      manualOverlay.classList.add('hidden');
      stopCamera();
      canvasDisplay.classList.add('hidden'); // Hide preview image completely
    } else {
      container.classList.remove('collapsed');
      btnToggle.classList.add('expanded');
      btnToggle.classList.remove('collapsed');
      
      startLiveView();

      if (state.get('captureMode') === 'manual') {
        manualOverlay.classList.remove('hidden');
      }
    }
  }

  // Handle layout changes
  state.addEventListener('change:layoutReversed', updateCollapseUI);
  
  // Handle case active state changes
  state.addEventListener('change:caseActive', (e) => {
    if (!e.detail.value) {
      isCollapsed = true;
      updateCollapseUI();
    }
  });

  btnToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent container click from firing
    if (!state.get('caseActive') && isCollapsed) {
      showToast(t('start_case_first') || 'Starta en narkos först', 'info');
      return;
    }
    isCollapsed = !isCollapsed;
    updateCollapseUI();
  });

  // Expand when clicking anywhere on the black bar/container if collapsed
  container.addEventListener('click', () => {
    if (isCollapsed) {
      if (!state.get('caseActive')) {
        showToast(t('start_case_first') || 'Starta en narkos först', 'info');
        return;
      }
      isCollapsed = false;
      updateCollapseUI();
    }
  });

  // Handle Capture Button UI during Processing
  state.addEventListener('change:currentStatus', (e) => {
    if (e.detail.value === 'processing') {
      btnCapture.classList.add('processing');
    } else {
      btnCapture.classList.remove('processing');
    }
  });

  // Handle iOS Safari killing the camera when app goes to background
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      isCollapsed = true;
      updateCollapseUI();
    }
  });

  // Handle capture mode changes
  state.addEventListener('change:captureMode', (e) => {
    const isManualMode = e.detail.value === 'manual';
    if (isManualMode && !isCollapsed) {
      manualOverlay.classList.remove('hidden');
      updateZoom(1);
    } else {
      manualOverlay.classList.add('hidden');
      if (!isCollapsed && window.savedAutoZoom) {
        updateZoom(window.savedAutoZoom);
      }
    }
  });

  // Zoom gestures (Pinch-to-zoom)
  container.addEventListener('touchstart', (e) => {
    if (isCollapsed) return;
    if (e.touches.length === 2) {
      e.preventDefault(); // Stop native zoom
      initialDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialZoom = currentZoom;
    }
  }, { passive: false });

  container.addEventListener('touchmove', (e) => {
    if (isCollapsed) return;
    if (e.touches.length === 2) {
      e.preventDefault(); // Prevent native zoom/scroll
      const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (initialDistance > 0) {
        const scale = currentDistance / initialDistance;
        let newZoom = initialZoom * scale;
        updateZoom(newZoom);
      }
    }
  }, { passive: false });

  // Manual capture button event
  btnCapture.addEventListener('click', () => {
    if (!state.get('caseActive')) return;
    window.dispatchEvent(new CustomEvent('manual-capture-triggered'));
    if (liveTimeout) {
       clearTimeout(liveTimeout);
       liveTimeout = setTimeout(() => {
         isCollapsed = true;
         updateCollapseUI();
       }, 30000);
    }
  });

  // Public API to wake and capture (for auto-loop)
  window.wakeAndCapture = async (skipCountdown = false) => {
    const wasCollapsed = isCollapsed;

    // Expand pane to show preview if it was collapsed
    if (wasCollapsed) {
       container.classList.remove('collapsed');
    }

    const s = await initCamera();
    if (!s) {
       if (wasCollapsed) container.classList.add('collapsed');
       return null;
    }

    // Apply zoom before capturing
    if (state.get('captureMode') === 'manual') {
      await updateZoom(1);
    } else {
      if (window.savedAutoZoom) {
        await updateZoom(window.savedAutoZoom);
      } else {
        await updateZoom(1);
      }
    }

    // Explicitly show video stream for preview
    video.classList.remove('hidden');
    canvasDisplay.classList.add('hidden');

    if (!skipCountdown) {
      wakingOverlay.classList.remove('hidden');
      
      wakingCountdown.textContent = '3';
      await new Promise(r => setTimeout(r, 700));
      wakingCountdown.textContent = '2';
      await new Promise(r => setTimeout(r, 700));
      wakingCountdown.textContent = '1';
      await new Promise(r => setTimeout(r, 600));
      
      wakingOverlay.classList.add('hidden');
    }

    const frame = window.captureCameraFrame();
    
    if (wasCollapsed) {
      isCollapsed = true;
      updateCollapseUI();
    }
    
    return frame;
  };

  window.captureCameraFrame = () => {
    if (!stream || !stream.active || video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("Camera stream inactive or 0px, cannot capture");
      return null;
    }
    
    flash.style.opacity = '1';
    setTimeout(() => { flash.style.opacity = '0'; }, 100);

    const ctxHidden = canvasHidden.getContext('2d');
    canvasHidden.width = video.videoWidth;
    canvasHidden.height = video.videoHeight;

    const ctxDisplay = canvasDisplay.getContext('2d');
    canvasDisplay.width = video.videoWidth;
    canvasDisplay.height = video.videoHeight;
    
    try {
      if (hardwareZoomEnabled) {
        ctxHidden.drawImage(video, 0, 0, canvasHidden.width, canvasHidden.height);
        ctxDisplay.drawImage(video, 0, 0, canvasDisplay.width, canvasDisplay.height);
      } else {
        // Evaluate software crop
        const targetW = video.videoWidth / currentZoom;
        const targetH = video.videoHeight / currentZoom;
        const sx = (video.videoWidth - targetW) / 2;
        const sy = (video.videoHeight - targetH) / 2;
        
        ctxHidden.drawImage(video, sx, sy, targetW, targetH, 0, 0, canvasHidden.width, canvasHidden.height);
        ctxDisplay.drawImage(video, 0, 0, canvasDisplay.width, canvasDisplay.height);
      }
      
      return canvasHidden.toDataURL('image/jpeg', 0.8);
    } catch (e) {
      console.error("Canvas grab failed:", e);
      return null;
    }
  };

  updateCollapseUI();
}
