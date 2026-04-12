import { state } from '../state.js';

// Rough cost estimates per 1M tokens (USD)
const PRICING = {
  'gemini-3.1-flash-lite-preview': { input: 0.075, output: 0.30 },
  'gemini-3.1-pro-preview': { input: 1.25, output: 5.00 },
  'fallback': { input: 0.10, output: 0.40 }
};

function trackApiCost(modelName, usageMetadata) {
  if (!usageMetadata) return;
  const rates = PRICING[modelName] || PRICING.fallback;
  const inCost = (usageMetadata.promptTokenCount || 0) * (rates.input / 1000000);
  const outCost = (usageMetadata.candidatesTokenCount || 0) * (rates.output / 1000000);
  const total = inCost + outCost;
  
  if (total > 0) {
    const current = state.get('totalSessionCost') || 0;
    state.set('totalSessionCost', current + total);
  }
}

export async function analyzeMonitorImage(base64Image) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('API Key is missing from .env');
  }

  // base64Image comes as "data:image/jpeg;base64,...", so we need to strip the prefix
  const base64Data = base64Image.split(',')[1];

  const promptText = `
    Analyze this veterinary anesthesia monitor. Extract the physiological values shown.
    If a value is not visible or cannot be determined with high confidence, return null for that field.
    
    Return a strictly formatted JSON object matching exactly this schema:
    {
      "hr": number | null, // Heart Rate / Puls
      "spo2": number | null, // SpO2 percentage
      "etco2": number | null, // End-Tidal CO2
      "rr": number | null, // Respiratory Rate (awRR)
      "nibp_sys": number | null, // Non-Invasive Blood Pressure Systolic
      "nibp_dia": number | null, // Non-Invasive Blood Pressure Diastolic
      "nibp_map": number | null, // Non-Invasive Blood Pressure Mean Arterial Pressure
      "temp": number | null, // Temperature (Celsius)
      "fio2": number | null, // Fraction of Inspired Oxygen (if visible)
      "detected_species": string | null, // Exact string "Dog" or "Cat" if visible on the patient info screen
      "detected_weight": number | null, // Weight in kg if visible on the patient info screen
      "alarms": string[], // Any alarm text or warnings visible on screen
      "monitor_model": string // Model of the monitor if identifiable
    }
  `;

  const requestBody = {
    contents: [{
      parts: [
        { text: promptText },
        {
          inline_data: {
            mime_type: "image/jpeg",
            data: base64Data
          }
        }
      ]
    }],
    generationConfig: {
      temperature: 0.1, // low temp for extraction
      response_mime_type: "application/json",
    }
  };

  const modelName = 'gemini-3.1-flash-lite-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const textResponse = data.candidates[0].content.parts[0].text;
  
  trackApiCost(modelName, data.usageMetadata);
  
  try {
    const parsed = JSON.parse(textResponse);
    return parsed;
  } catch (e) {
    console.error("Failed to parse Gemini JSON output", textResponse);
    throw new Error("Invalid output format from AI");
  }
}

export async function queryGeminiText(promptText, modelName = 'gemini-3.1-flash-lite-preview') {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('API Key is missing from .env');
  }

  const requestBody = {
    contents: [{
      parts: [
        { text: promptText }
      ]
    }],
    generationConfig: {
      temperature: 0.2, // low temp for clinical assessment
      response_mime_type: "application/json",
    }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const textResponse = data.candidates[0].content.parts[0].text;
  
  trackApiCost(modelName, data.usageMetadata);
  
  try {
    const parsed = JSON.parse(textResponse);
    return parsed;
  } catch (e) {
    console.error("Failed to parse Gemini JSON output", textResponse);
    throw new Error("Invalid output format from AI Assessment");
  }
}
