import { state } from '../state.js';
import { analyzeMonitorImage } from './gemini.js';
import { assessReading } from './assessment.js';
import { formatJournalEntry } from './journal.js';
import { logAiError } from './clinicalAssessment.js';

let captureTimer = null;
let isCapturing = false;

// Initialize listeners
export function initCaptureLoop() {
  state.addEventListener('change:caseActive', (e) => {
    if (e.detail.value && state.get('captureMode') === 'auto') {
      startAutoCapture();
    } else {
      stopAutoCapture();
    }
  });

  state.addEventListener('change:captureMode', (e) => {
    if (e.detail.value === 'auto' && state.get('caseActive')) {
      startAutoCapture();
    } else {
      stopAutoCapture();
    }
  });

  window.addEventListener('manual-capture-triggered', () => {
    triggerCaptureSequence(true); // true = skip countdown
  });
}

function startAutoCapture() {
  stopAutoCapture();
  // trigger immediately, then interval
  triggerCaptureSequence(false); // false = show countdown
  const intervalMs = state.get('captureInterval') * 60 * 1000;
  captureTimer = setInterval(() => {
    triggerCaptureSequence(false);
  }, intervalMs);
}

function stopAutoCapture() {
  if (captureTimer) clearInterval(captureTimer);
  captureTimer = null;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function triggerCaptureSequence(skipCountdown = false) {
  if (!window.wakeAndCapture) return;

  try {
    const flashEl = document.getElementById('capture-flash');
    // Set UI to processing state
    state.set('currentStatus', 'processing');

    const frame1 = await window.wakeAndCapture(skipCountdown);
    if (!frame1) throw new Error("Camera stream suspended or not ready (0px)");
    
    // Analyze the EXACT SAME image twice sequentially to cross-check for hallucinations
    const result1 = await analyzeMonitorImage(frame1);
    await sleep(500); // 500ms API pause
    const result2 = await analyzeMonitorImage(frame1);

    let consensusValues = resolveConsensus(result1, result2);

    const criticalDisagreement = (result1.hr && result2.hr && Math.abs(result1.hr - result2.hr)/result1.hr > 0.15) || 
                                 (result1.spo2 && result2.spo2 && Math.abs(result1.spo2 - result2.spo2) > 2);
    
    if (criticalDisagreement) {
      updateUI('Disagreement found. Capturing tie-breaker frame 3...');
      const frame3 = await window.wakeAndCapture();
      const result3 = await analyzeMonitorImage(frame3);
      consensusValues = resolveConsensus(consensusValues, result3); 
    }

    // Auto-start case if not active
    const isActive = state.get('caseActive');
    if (!isActive) {
      state.resetCase();
      if (consensusValues.detected_species) {
        state.set('species', consensusValues.detected_species);
      }
      if (consensusValues.detected_weight) {
        state.set('weight', consensusValues.detected_weight);
      }
      state.set('caseActive', true);

      // Open Patient Settings modal immediately so user can confirm species/weight
      if (window.openSettingsModal) {
         window.openSettingsModal('new-case-capture');
      }
    }

    // 60-second merge logic
    const readings = state.get('readings');
    const lastReading = readings[readings.length - 1];
    const now = new Date();
    const isAppend = lastReading && (now - lastReading.timestamp) < 60000;

    let finalValues = consensusValues;
    if (isAppend) {
      finalValues = { ...lastReading.values };
      // Overwrite with any new valid values from this photo
      for (const k in consensusValues) {
        if (consensusValues[k] !== null && consensusValues[k] !== undefined) {
           finalValues[k] = consensusValues[k];
        }
      }
    }

    const species = state.get('species');
    const assessment = assessReading(finalValues, species);
    
    // Add or merge into state
    const entryTimestamp = isAppend ? lastReading.timestamp : now;
    const entry = formatJournalEntry(entryTimestamp, finalValues, state.get('manualValues'));

    if (isAppend) {
      state.updateLastRecord(finalValues, assessment.status, assessment.notes, entry);
    } else {
      state.addReading({
        timestamp: now,
        values: finalValues,
        status: assessment.status,
        assessmentNotes: assessment.notes,
        source: 'ai'
      });
      state.addJournalEntry(entry);
      state.unconfirmManualValues();
    }

    state.set('currentStatus', assessment.status);

  } catch (err) {
    console.error("Capture sequence failed:", err);
    
    // Fail gracefully: UI reverts/shows warning naturally
    state.set('currentStatus', 'warning');
    logAiError(`Kamera/AI Fel: ${err.message}. Försöker igen nästa intervall.`, 'error');
  }
}

// Compare two Gemini JSON results and return consensus.
// If values match within 15%, return mean. If they disagree >15%, return null (discard).
function resolveConsensus(r1, r2) {
  const merged = {};
  const fields = ['hr', 'spo2', 'etco2', 'rr', 'nibp_sys', 'nibp_dia', 'nibp_map', 'temp', 'fio2', 'detected_species', 'detected_weight'];

  for (const f of fields) {
    const v1 = r1[f];
    const v2 = r2[f];
    
    if (v1 !== null && v1 !== undefined && v2 !== null && v2 !== undefined) {
      // both exist
      const diff = Math.abs(v1 - v2);
      const threshold = f === 'temp' ? 0.3 : (f === 'spo2' ? 2 : Math.max(v1, v2) * 0.15);
      
      if (diff <= threshold) {
        // agree
        merged[f] = Math.round((v1 + v2) / 2 * 10) / 10; // keep 1 decimal
      } else {
        // disagree -> drop it for this round to avoid hallucination
        console.warn(`Hallucination skipped for ${f}: ${v1} vs ${v2}`);
        merged[f] = null;
      }
    } else if (v1 !== null && v1 !== undefined) {
      merged[f] = v1;
    } else if (v2 !== null && v2 !== undefined) {
      merged[f] = v2;
    } else {
      merged[f] = null;
    }
  }
  return merged;
}
