import { state } from '../state.js';
import { queryGeminiText } from './gemini.js';
import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getInstructionsForProtocol } from '../protocols.js';

let flashTimer = null;
let proTimer = null;

export function initClinicalAssessment() {
  function handleDataChange(e) {
    // 1. Clear existing timers on ANY data change (local or remote)
    if (flashTimer) clearTimeout(flashTimer);
    if (proTimer) clearTimeout(proTimer);
    flashTimer = null;
    proTimer = null;

    if (!state.get('caseActive')) return;

    // 2. Start timers ONLY if this was a local data change
    if (!e.detail?.isRemote) {
       startTimers();
    }
  }

  state.addEventListener('change:readings', handleDataChange);
  state.addEventListener('change:manualValues', handleDataChange);
}

function startTimers() {
  flashTimer = setTimeout(() => executeAssessment('flash'), 5000);
  proTimer = setTimeout(() => executeAssessment('pro'), 30000);
}

async function executeAssessment(tier) {
  const modelName = tier === 'pro' ? 'gemini-3.1-pro-preview' : 'gemini-3.1-flash-lite-preview';
  
  const currentAssesment = state.get('aiAssessment') || {};
  const isUpgrading = currentAssesment.tier === 'flash' && tier === 'pro';

  state.set('aiAssessment', {
     ...currentAssesment,
     status: isUpgrading ? currentAssesment.status : 'analyzing',
     isUpgrading: isUpgrading,
     tier: isUpgrading ? 'flash' : tier
  });
  
  try {
     const prompt = buildPrompt();
     if (!prompt) {
       state.set('aiAssessment', null);
       return;
     }
     
     const result = await queryGeminiText(prompt, modelName);
     
     // A/B Comparison Telemetry Logging
     if (tier === 'flash') {
       window._lastFlashResponseForTelemtry = result;
     } else if (tier === 'pro' && window._lastFlashResponseForTelemtry) {
       try {
         await addDoc(collection(db, 'ai_model_comparisons'), {
           timestamp: serverTimestamp(),
           flashResponse: window._lastFlashResponseForTelemtry,
           proResponse: result
         });
         window._lastFlashResponseForTelemtry = null;
       } catch (e) {
         console.error('Failed to log telemetry:', e);
       }
     }
     
     state.set('aiAssessment', {
       tier: tier,
       status: result.status,
       summary: result.summary,
       details: result.details || [],
       trends: result.trends || '',
       recommendations: result.recommendations || [],
       confidence: result.confidence || 'medium',
       timestamp: new Date(),
       isUpgrading: false
     });
     
     state.set('currentStatus', result.status);
     
  } catch (err) {
     console.error(`AI Assessment error (${tier}):`, err);
     logAiError(`Failed to get ${tier} assessment: ${err.message}`, 'error');
     
     // Revert analyzing status to previous state, or clear if there was none
     if (currentAssesment.status && currentAssesment.status !== 'analyzing') {
       state.set('aiAssessment', currentAssesment);
     } else {
       state.set('aiAssessment', null);
     }
  }
}

export function logAiError(message, type = 'error') {
  const errors = [...(state.get('aiErrors') || [])];
  errors.push({ timestamp: new Date(), message, type });
  state.set('aiErrors', errors);
}

function buildPrompt() {
  const readings = state.get('readings') || [];
  const manualValues = state.get('manualValues') || {};
  
  if (readings.length === 0 && !Object.values(manualValues).some(v => v.value)) {
    return null;
  }
  
  // Context Size Optimization
  const cleanHistory = readings.map(r => ({
     time: r.timestamp.toISOString(),
     hr: r.values.hr,
     spo2: r.values.spo2,
     etco2: r.values.etco2,
     rr: r.values.rr,
     temp: r.values.temp,
     sys: r.values.nibp_sys,
     dia: r.values.nibp_dia,
     map: r.values.nibp_map,
     fio2: r.values.fio2
  }));
  
  const species = state.get('species');
  const weight = state.get('weight');
  const bcs = state.get('bcs');
  const comorbidities = state.get('comorbidities');
  const protocol = state.get('protocol');
  const customInstructions = getInstructionsForProtocol(protocol);
  const lang = state.get('lang') === 'en' ? 'English' : 'Swedish';
  
  const prompt = `
You are an experienced, board-certified small animal veterinary anesthesiologist evaluating real-time monitoring data.

Patient Context:
- Species: ${species}
- Weight: ${weight ? weight + 'kg' : 'Unknown'}
- BCS: ${bcs}/9
- Comorbidities: ${comorbidities || 'None reported'}
- Protocol: ${protocol}
${customInstructions ? `- Custom Instructions for this protocol: ${customInstructions}` : ''}

Recent Manual Observations:
${JSON.stringify(manualValues)}

Chronological Monitor Data Log (from induction to present):
${JSON.stringify(cleanHistory)}

Task:
Analyze the complete timeline to identify gradual trends, compensating for the sparsity of manual data entry (readings may be 5-15 mins apart).
- Weigh the raw numbers against the patient's specific species norms, weight, BCS, and recorded comorbidities.
- Artifact Rejection: Recognize common sensor dropouts (e.g., SpO2 instantly dropping to 0 or null while pulse remains strong) vs. actual physiological collapse. Do not flag sensor dropouts as critical emergencies.

Output MUST be strictly generated in the ${lang} language, formatting the final output as a raw JSON string matching this schema EXTREMELY EXACTLY without markdown code block wrapping:
{
  "status": "ok" | "warning" | "critical",
  "summary": "Brief 1-line clinical verdict",
  "details": [
    { "category": "Cardiovascular", "assessment": "...", "severity": "ok|warning|critical" },
    { "category": "Respiratory", "assessment": "...", "severity": "ok|warning|critical" },
    { "category": "Anesthetic Depth / Other", "assessment": "...", "severity": "ok|warning|critical" }
  ],
  "trends": "Analysis of the trajectory over the whole session",
  "recommendations": ["Actionable intervention 1", "Intervention 2"],
  "confidence": "high" | "medium" | "low"
}
`;
  return prompt.trim();
}
