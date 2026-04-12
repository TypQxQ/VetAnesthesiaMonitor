// Anesthesia protocol reference ranges
// Each field: [warnLo, warnHi]  — "OK" range is inset ~15% from each side

const DEFAULTS = {
  General: {
    cat:        { hr: [80, 220], spo2: [92, 100], etco2: [20, 55], rr: [5, 35], temp: [35.5, 39.5], nibp: [60, 180] },
    dog_small:  { hr: [40, 180], spo2: [92, 100], etco2: [20, 55], rr: [5, 35], temp: [35.5, 40],   nibp: [60, 180] },
    dog_medium: { hr: [40, 150], spo2: [92, 100], etco2: [20, 55], rr: [5, 30], temp: [35, 40.5],    nibp: [60, 180] },
    dog_large:  { hr: [35, 130], spo2: [92, 100], etco2: [20, 55], rr: [5, 30], temp: [35, 40],      nibp: [60, 170] },
    customAIInstructions: ""
  },
  Dental: {
    cat:        { hr: [80, 220], spo2: [92, 100], etco2: [20, 55], rr: [5, 35], temp: [35.5, 39.5], nibp: [60, 180] },
    dog_small:  { hr: [40, 180], spo2: [92, 100], etco2: [20, 55], rr: [5, 35], temp: [35.5, 40],   nibp: [60, 180] },
    dog_medium: { hr: [40, 150], spo2: [92, 100], etco2: [20, 55], rr: [5, 30], temp: [35, 40.5],   nibp: [60, 180] },
    dog_large:  { hr: [35, 130], spo2: [92, 100], etco2: [20, 55], rr: [5, 30], temp: [35, 40],     nibp: [60, 170] },
    customAIInstructions: "SpO2 sensor often falls off during dentals."
  },
  Kastration: {
    cat:        { hr: [80, 220], spo2: [92, 100], etco2: [20, 55], rr: [5, 35], temp: [35.5, 39.5], nibp: [60, 180] },
    dog_small:  { hr: [40, 180], spo2: [92, 100], etco2: [20, 55], rr: [5, 35], temp: [35.5, 40],   nibp: [60, 180] },
    dog_medium: { hr: [40, 150], spo2: [92, 100], etco2: [20, 55], rr: [5, 30], temp: [35, 40.5],   nibp: [60, 180] },
    dog_large:  { hr: [35, 130], spo2: [92, 100], etco2: [20, 55], rr: [5, 30], temp: [35, 40],     nibp: [60, 170] },
    customAIInstructions: ""
  },
  Ortopedi: {
    cat:        { hr: [80, 220], spo2: [92, 100], etco2: [20, 55], rr: [5, 35], temp: [35, 39.5],   nibp: [60, 180] },
    dog_small:  { hr: [40, 180], spo2: [92, 100], etco2: [20, 55], rr: [5, 35], temp: [35, 40],     nibp: [60, 180] },
    dog_medium: { hr: [40, 150], spo2: [92, 100], etco2: [20, 55], rr: [5, 30], temp: [34.5, 40.5], nibp: [60, 180] },
    dog_large:  { hr: [35, 130], spo2: [92, 100], etco2: [20, 55], rr: [5, 30], temp: [34.5, 40],   nibp: [60, 170] },
    customAIInstructions: ""
  }
};

const LS_KEY = 'vet_protocols';

export function loadProtocols() {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge defaults underneath stored to catch newly added defaults
      const merged = { ...DEFAULTS, ...parsed };
      // Ensure customAIInstructions exists for all protocols
      Object.keys(merged).forEach(k => {
        if (merged[k].customAIInstructions === undefined) {
          merged[k].customAIInstructions = "";
        }
      });
      return merged;
    }
  } catch (e) { /* corrupt data, fall back */ }
  return { ...DEFAULTS };
}

export function saveProtocols(protocols) {
  localStorage.setItem(LS_KEY, JSON.stringify(protocols));
}

export function getProtocolNames() {
  return Object.keys(loadProtocols());
}

export function addProtocol(name, baseProtocol) {
  const all = loadProtocols();
  // Clone ranges from an existing protocol or use General as template
  const base = baseProtocol || all['General'];
  all[name] = JSON.parse(JSON.stringify(base));
  if (all[name].customAIInstructions === undefined) {
    all[name].customAIInstructions = "";
  }
  saveProtocols(all);
  return all;
}

export function deleteProtocol(name) {
  const all = loadProtocols();
  delete all[name];
  saveProtocols(all);
  return all;
}

export function getSizeGroup(species, weight) {
  if (species === 'Cat') return 'cat';
  const w = parseFloat(weight) || 0;
  if (w > 0 && w < 10) return 'dog_small';
  if (w >= 25) return 'dog_large';
  return 'dog_medium';
}

export function getRangesForProtocol(protocolName, species, weight, field) {
  const all = loadProtocols();
  const proto = all[protocolName] || all['General'];
  const group = getSizeGroup(species, weight);
  const ranges = proto[group];
  if (!ranges || !ranges[field]) return null;

  const [warnLo, warnHi] = ranges[field];
  // OK range: inset ~15% from each warn boundary
  const span = warnHi - warnLo;
  const inset = span * 0.15;
  return {
    ok: [warnLo + inset, warnHi - inset],
    warn: [warnLo, warnHi]
  };
}

export function getInstructionsForProtocol(protocolName) {
  const all = loadProtocols();
  const proto = all[protocolName] || all['General'];
  return proto.customAIInstructions || "";
}

// --- Protocol Sharing ---

export function encodeProtocol(name) {
  const all = loadProtocols();
  const data = { name, ranges: all[name] };
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeProtocol(base64str) {
  try {
    const json = decodeURIComponent(escape(atob(base64str)));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export function importProtocol(data, mode = 'add') {
  if (!data || !data.name || !data.ranges) return false;
  const all = loadProtocols();
  const ranges = data.ranges;
  if (ranges.customAIInstructions === undefined) {
    ranges.customAIInstructions = "";
  }
  if (mode === 'replace' || !all[data.name]) {
    all[data.name] = ranges;
  } else {
    // "add" but name exists — append a number
    let n = data.name;
    let i = 2;
    while (all[n]) { n = `${data.name} (${i++})`; }
    all[n] = ranges;
  }
  saveProtocols(all);
  return true;
}

export const FIELDS = ['hr', 'spo2', 'etco2', 'rr', 'temp', 'nibp'];
export const FIELD_LABELS = {
  hr: 'Puls (HR)',
  spo2: 'SpO2 (%)',
  etco2: 'EtCO2',
  rr: 'Resp (RR)',
  temp: 'Temp (°C)',
  nibp: 'SBP (mmHg)'
};
export const SIZE_GROUPS = ['cat', 'dog_small', 'dog_medium', 'dog_large'];
export const SIZE_LABELS = {
  cat: 'Katt',
  dog_small: 'Hund <10kg',
  dog_medium: 'Hund 10-25kg',
  dog_large: 'Hund >25kg'
};
