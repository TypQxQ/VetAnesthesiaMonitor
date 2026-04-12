// Simple reactive state store using EventTarget

const SESSION_KEY = 'vet_monitor_session';

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Rehydrate Date objects
    if (data.caseStartTime) data.caseStartTime = new Date(data.caseStartTime);
    if (data.lastInputTime) data.lastInputTime = new Date(data.lastInputTime);
    if (data.readings) {
      data.readings = data.readings.map(r => ({ ...r, timestamp: new Date(r.timestamp) }));
    }
    return data;
  } catch { return null; }
}

function saveSession(state) {
  try {
    const toSave = {
      caseActive: state.caseActive,
      caseStartTime: state.caseStartTime,
      lastInputTime: state.lastInputTime,
      species: state.species,
      weight: state.weight,
      bcs: state.bcs,
      comorbidities: state.comorbidities,
      protocol: state.protocol,
      currentStatus: state.currentStatus,
      readings: state.readings,
      journalEntries: state.journalEntries,
      manualValues: state.manualValues,
      sessionId: state.sessionId,
      hasSeenOnboarding: state.hasSeenOnboarding,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
  } catch { /* quota exceeded or private mode */ }
}


class AppState extends EventTarget {
  constructor() {
    super();
    const saved = loadSession();
    this.state = {
      caseActive: saved?.caseActive ?? false,
      caseStartTime: saved?.caseStartTime ?? null,
      captureMode: 'manual',
      captureInterval: parseInt(localStorage.getItem('capture_interval'), 10) || 5, // minutes
      layoutReversed: localStorage.getItem('layoutReversed') === 'true',
      species: saved?.species ?? 'Dog',
      lang: localStorage.getItem('lang') || 'sv',
      weight: saved?.weight ?? '',
      bcs: saved?.bcs ?? '6',
      comorbidities: saved?.comorbidities ?? '',
      nurseSign: localStorage.getItem('nurse_sign') || '?',
      readings: saved?.readings ?? [],
      journalEntries: saved?.journalEntries ?? [],
      currentStatus: saved?.currentStatus ?? 'idle',
      lastInputTime: saved?.lastInputTime ?? null,
      protocol: saved?.protocol ?? 'General',
      sessionId: saved?.sessionId ?? null,
      connectedUsersCount: 1,
      hasSeenOnboarding: localStorage.getItem('hasSeenOnboarding') === 'true',
      
      aiAssessment: saved?.aiAssessment ?? null,
      totalSessionCost: saved?.totalSessionCost ?? 0,
      aiErrors: saved?.aiErrors ?? [],
      
      // Carry-forward manual values
      manualValues: saved?.manualValues ?? {
        'Syre': { value: '', confirmed: false, confirmedAt: 0 },
        'Luft': { value: '', confirmed: false, confirmedAt: 0 },
        'Insp gas': { value: '', confirmed: false, confirmedAt: 0 },
        'CRT': { value: '', confirmed: false, confirmedAt: 0 },
        'SLH': { value: '', confirmed: false, confirmedAt: 0 }
      }
    };

    // Device identification to avoid sync loops
    this.deviceId = localStorage.getItem('device_id');
    if (!this.deviceId) {
      this.deviceId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('device_id', this.deviceId);
    }

    window.addEventListener('manual-override', () => {
      this.set('lastInputTime', new Date());
    });
  }

  hydrateFromRemote(data) {
    // Bulk update without triggering push-back loops
    Object.assign(this.state, data);
    
    // Trigger UI updates for all keys, using the correct event detail format
    Object.keys(data).forEach(key => {
      let detail;
      switch (key) {
        case 'readings':
          detail = { readings: this.state.readings };
          break;
        case 'journalEntries':
          detail = { entries: this.state.journalEntries };
          break;
        case 'manualValues':
          detail = { values: this.state.manualValues };
          break;
        default:
          detail = { value: this.state[key] };
      }
      this.dispatchEvent(new CustomEvent(`change:${key}`, { detail }));
    });
    this.dispatchEvent(new CustomEvent('change', { detail: { isRemote: true } }));
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    if (this.state[key] !== value) {
      this.state[key] = value;
      this.dispatchEvent(new CustomEvent('change', { detail: { key, value } }));
      this.dispatchEvent(new CustomEvent(`change:${key}`, { detail: { value } }));
      
      if (key === 'nurseSign') {
        localStorage.setItem('nurse_sign', value);
      }
      if (key === 'lang') {
        localStorage.setItem('lang', value);
      }
      if (key === 'layoutReversed') {
        localStorage.setItem('layoutReversed', value);
      }
      if (key === 'captureInterval') {
        localStorage.setItem('capture_interval', value);
      }
      // Persist session-relevant fields
      const sessionKeys = ['caseActive','caseStartTime','lastInputTime','species','weight',
        'bcs','comorbidities','protocol','currentStatus','sessionId','aiAssessment','totalSessionCost','aiErrors', 'hasSeenOnboarding'];
      if (sessionKeys.includes(key)) {
        saveSession(this.state);
      }
      if (key === 'hasSeenOnboarding') {
        localStorage.setItem('hasSeenOnboarding', value);
      }
    }
  }

  updateManualValue(field, value, confirmed = true) {
    this.state.manualValues[field] = { value, confirmed, confirmedAt: Date.now() };
    this.dispatchEvent(new CustomEvent('change:manualValues', { detail: { values: this.state.manualValues } }));
    this.set('lastInputTime', new Date());
    saveSession(this.state);
  }

  unconfirmManualValues() {
    for (const key in this.state.manualValues) {
      this.state.manualValues[key].confirmed = false;
    }
    this.dispatchEvent(new CustomEvent('change:manualValues', { detail: { values: this.state.manualValues } }));
  }

  addReading(reading) {
    this.state.readings.push({ timestamp: new Date(), ...reading });
    this.dispatchEvent(new CustomEvent('change:readings', { detail: { readings: this.state.readings } }));
    this.set('lastInputTime', new Date());
    saveSession(this.state);
  }

  addJournalEntry(entry) {
    this.state.journalEntries.push(entry);
    this.dispatchEvent(new CustomEvent('change:journalEntries', { detail: { entries: this.state.journalEntries } }));
    saveSession(this.state);
  }

  updateLastRecord(values, status, notes, journalEntry) {
    const lastR = this.state.readings[this.state.readings.length - 1];
    if (lastR) {
      lastR.values = values;
      lastR.status = status;
      lastR.assessmentNotes = notes;
      this.dispatchEvent(new CustomEvent('change:readings', { detail: { readings: this.state.readings } }));
    }
    const lastJ = this.state.journalEntries[this.state.journalEntries.length - 1];
    if (lastJ) {
      this.state.journalEntries[this.state.journalEntries.length - 1] = journalEntry;
      this.dispatchEvent(new CustomEvent('change:journalEntries', { detail: { entries: this.state.journalEntries } }));
    }
    this.set('lastInputTime', new Date());
    saveSession(this.state);
  }

  restoreCase(archiveData) {
    // Hydrate everything from archiveData
    this.hydrateFromRemote({
      caseActive: true,
      caseStartTime: archiveData.caseStartTime ? new Date(archiveData.caseStartTime) : new Date(),
      species: archiveData.species || 'Dog',
      weight: archiveData.weight || '',
      bcs: archiveData.bcs || '6',
      comorbidities: archiveData.comorbidities || '',
      protocol: archiveData.protocol || 'General',
      // readings dates need rehydration
      readings: (archiveData.readings || []).map(r => ({
        ...r,
        timestamp: new Date(r.timestamp)
      })),
      journalEntries: archiveData.journalEntries || [],
      // Session ID is critical for shared cases
      sessionId: archiveData.sessionId || null,
      currentStatus: 'idle',
      aiAssessment: archiveData.aiAssessment || null,
      totalSessionCost: archiveData.totalSessionCost || 0,
      aiErrors: archiveData.aiErrors || []
    });
    // We intentionally don't restore manualValues, let those start fresh on resume
    
    // Save state immediately
    saveSession(this.state);
  }

  resetCase() {
    this.state.readings = [];
    this.state.journalEntries = [];
    this.state.currentStatus = 'idle';
    this.state.lastInputTime = null;
    this.state.caseStartTime = null;
    this.state.sessionId = null;
    this.state.connectedUsersCount = 1;
    this.state.aiAssessment = null;
    this.state.totalSessionCost = 0;
    this.state.aiErrors = [];
    this.state.protocol = 'General';
    this.state.weight = '';
    this.state.bcs = '6';
    this.state.comorbidities = '';
    this.state.manualValues = {
        'Syre': { value: '', confirmed: false, confirmedAt: 0 },
        'Luft': { value: '', confirmed: false, confirmedAt: 0 },
        'Insp gas': { value: '', confirmed: false, confirmedAt: 0 },
        'CRT': { value: '', confirmed: false, confirmedAt: 0 },
        'SLH': { value: '', confirmed: false, confirmedAt: 0 }
    };
    
    // Trigger UI updates
    this.dispatchEvent(new CustomEvent('change:readings', { detail: { readings: this.state.readings } }));
    this.dispatchEvent(new CustomEvent('change:journalEntries', { detail: { entries: this.state.journalEntries } }));
    this.set('currentStatus', 'idle');
    this.dispatchEvent(new CustomEvent('change:aiAssessment', { detail: { value: this.state.aiAssessment } }));
    this.dispatchEvent(new CustomEvent('change:totalSessionCost', { detail: { value: this.state.totalSessionCost } }));
    this.dispatchEvent(new CustomEvent('change:aiErrors', { detail: { errors: this.state.aiErrors } }));
    this.dispatchEvent(new CustomEvent('change:manualValues', { detail: { values: this.state.manualValues } }));
    
    // Dispatch special event so ValuesTable knows to clear AI values
    window.dispatchEvent(new Event('case-reset'));
    saveSession(this.state);
  }

}

export const state = new AppState();
