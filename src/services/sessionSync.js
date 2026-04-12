import { db } from './firebase.js';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp, getDoc, collection, deleteDoc } from 'firebase/firestore';
import { state } from '../state.js';

let unsubscribe = null;
let presenceUnsubscribe = null;
let heartbeatInterval = null;
let isUpdatingFromRemote = false;

/**
 * Generate a random short ID for the session
 */
function generateShortId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Create a session SYNCHRONOUSLY — returns session ID immediately.
 * Firestore write and sync subscription happen in the background.
 * This is critical for iOS Safari, which requires navigator.share()
 * to be called in the same synchronous tick as the user gesture.
 */
export function createSessionSync() {
  const sessionId = generateShortId();
  state.set('sessionId', sessionId);

  // Fire-and-forget: write to Firestore + start listening
  _writeSessionToFirestore(sessionId).catch(err => {
    console.error('Failed to write session to Firestore:', err);
  });

  return sessionId;
}

async function _writeSessionToFirestore(sessionId) {
  const sessionRef = doc(db, 'sessions', sessionId);

  const initialData = {
    createdAt: serverTimestamp(),
    caseStartTime: state.get('caseStartTime') ? state.get('caseStartTime').toISOString() : new Date().toISOString(),
    species: state.get('species'),
    weight: state.get('weight'),
    bcs: state.get('bcs'),
    comorbidities: state.get('comorbidities'),
    protocol: state.get('protocol'),
    captureMode: state.get('captureMode'),
    captureInterval: state.get('captureInterval'),
    readings: state.get('readings').map(r => ({ 
      ...r, 
      timestamp: r.timestamp.toISOString(),
      // Firestore does not allow arrays nested inside arrays
      assessmentNotes: Array.isArray(r.assessmentNotes) ? r.assessmentNotes.join('\n') : (r.assessmentNotes || '')
    })),
    journalEntries: serializeJournal(state.get('journalEntries') || []),
    manualValues: state.get('manualValues'),
    currentStatus: state.get('currentStatus'),
    aiAssessment: state.get('aiAssessment'),
    totalSessionCost: state.get('totalSessionCost'),
    aiErrors: state.get('aiErrors'),
    lastNurseSign: state.get('nurseSign'),
    lastUpdatedBy: state.deviceId
  };

  await setDoc(sessionRef, initialData);
  startSync(sessionId);
}

/**
 * Join an existing session
 */
export async function joinSession(sessionId) {
  const sessionRef = doc(db, 'sessions', sessionId);
  const snap = await getDoc(sessionRef);
  
  if (!snap.exists()) {
    throw new Error('Session not found');
  }

  // Initial hydration
  const data = snap.data();
  hydrateState(data);
  
  state.set('sessionId', sessionId);
  startSync(sessionId);
}

/**
 * Stop syncing
 */
export async function leaveSession() {
  const sessionId = state.get('sessionId');
  if (sessionId) {
    try {
      const presenceRef = doc(db, 'sessions', sessionId, 'presence', state.deviceId);
      await deleteDoc(presenceRef);
    } catch (err) {
      console.error('Failed to remove presence on leave:', err);
    }
  }

  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (presenceUnsubscribe) {
    presenceUnsubscribe();
    presenceUnsubscribe = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  state.set('sessionId', null);
}

/**
 * Start presence heartbeat and tracking
 */
function startPresenceSync(sessionId) {
  if (presenceUnsubscribe) presenceUnsubscribe();
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  const presenceRef = doc(db, 'sessions', sessionId, 'presence', state.deviceId);
  const presenceCollectionRef = collection(db, 'sessions', sessionId, 'presence');

  // Heartbeat function
  const updatePresence = async () => {
    try {
      await setDoc(presenceRef, {
        lastSeen: Date.now(),
        deviceId: state.deviceId
      }, { merge: true });
    } catch (err) {
      console.error('Heartbeat failed:', err);
    }
  };

  // Initial heartbeat
  updatePresence();
  heartbeatInterval = setInterval(updatePresence, 30000); // Every 30s

  // Listen to all presence docs
  presenceUnsubscribe = onSnapshot(presenceCollectionRef, (snapshot) => {
    const now = Date.now();
    const activeThreshold = 60000; // 1 minute
    let count = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.lastSeen && (now - data.lastSeen) < activeThreshold) {
        count++;
      }
    });
    
    // Ensure we count ourselves if we are connected but heartbeat hasn't fired yet or whatever
    if (count === 0 && sessionId === state.get('sessionId')) count = 1;

    state.set('connectedUsersCount', count);
  });
}

/**
 * Subscribe to real-time updates
 */
function startSync(sessionId) {
  if (unsubscribe) unsubscribe();
  
  startPresenceSync(sessionId);

  const sessionRef = doc(db, 'sessions', sessionId);
  unsubscribe = onSnapshot(sessionRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      // Only update if someone else changed it
      if (data.lastUpdatedBy !== state.deviceId) {
        hydrateState(data);
      }
    }
  });
}

/**
 * Bulk update local state from remote data
 */
function hydrateState(data) {
  isUpdatingFromRemote = true;
  try {
    // Ensure manualValues has all expected keys with defaults
    const defaultManualValues = {
      'Syre': { value: '', confirmed: false, confirmedAt: 0 },
      'Luft': { value: '', confirmed: false, confirmedAt: 0 },
      'Insp gas': { value: '', confirmed: false, confirmedAt: 0 },
      'CRT': { value: '', confirmed: false, confirmedAt: 0 },
      'SLH': { value: '', confirmed: false, confirmedAt: 0 }
    };
    const remoteManual = data.manualValues || {};
    const mergedManual = { ...defaultManualValues, ...remoteManual };

    state.hydrateFromRemote({
      caseActive: true, // Any session in Firestore is an active case
      caseStartTime: data.caseStartTime ? new Date(data.caseStartTime) : null,
      species: data.species || 'Dog',
      weight: data.weight || '',
      bcs: data.bcs || '6',
      comorbidities: data.comorbidities || '',
      protocol: data.protocol || 'General',
      captureMode: data.captureMode || 'manual',
      captureInterval: data.captureInterval || 5,
      readings: (data.readings || []).map(r => ({ 
        ...r, 
        timestamp: new Date(r.timestamp),
        // Deserialize assessmentNotes: Convert string back to array if needed
        assessmentNotes: typeof r.assessmentNotes === 'string' ? r.assessmentNotes.split('\n').filter(n => n) : (r.assessmentNotes || [])
      })),
      journalEntries: deserializeJournal(data.journalEntries || []),
      manualValues: mergedManual,
      currentStatus: data.currentStatus || 'ok',
      aiAssessment: data.aiAssessment || null,
      totalSessionCost: data.totalSessionCost || 0,
      aiErrors: data.aiErrors || [],
      nurseSign: data.lastNurseSign || '?'
    });
  } finally {
    isUpdatingFromRemote = false;
  }
}

/**
 * Global initialization for session syncing
 */
export function initSessionSync() {
  state.addEventListener('change', (e) => {
    // Only push if we have an active session AND this change wasn't triggered by a remote sync
    if (state.get('sessionId') && !e.detail?.isRemote) {
      if (e.detail?.key) {
        pushStateToFirestore(e.detail.key, e.detail.value);
      } else {
        // Handle bulk changes or special cases if needed
        // For now, most state changes pass key/value in detail via state.set()
      }
    }
  });

  // Listen for special sync points
  state.addEventListener('change:readings', (e) => {
    if (state.get('sessionId') && !isUpdatingFromRemote) {
      pushStateToFirestore('readings', e.detail.readings);
    }
  });

  state.addEventListener('change:journalEntries', (e) => {
    if (state.get('sessionId') && !isUpdatingFromRemote) {
      pushStateToFirestore('journalEntries', e.detail.entries);
    }
  });

  state.addEventListener('change:manualValues', (e) => {
    if (state.get('sessionId') && !isUpdatingFromRemote) {
      pushStateToFirestore('manualValues', e.detail.values);
    }
  });

  state.addEventListener('change:aiErrors', (e) => {
    if (state.get('sessionId') && !isUpdatingFromRemote) {
      pushStateToFirestore('aiErrors', e.detail.errors);
    }
  });

  // Cleanup on window close
  window.addEventListener('beforeunload', () => {
    const sessionId = state.get('sessionId');
    if (sessionId) {
      const presenceRef = doc(db, 'sessions', sessionId, 'presence', state.deviceId);
      // We use deleteDoc but since it's an async call in beforeunload it might not finish.
      // However, Firestore's offline persistence or just the heartbeat timeout will eventually clean it up.
      // In modern browsers, we should ideally use navigator.sendBeacon if it was an HTTP call, 
      // but for Firestore we just fire and forget.
      deleteDoc(presenceRef).catch(() => {});
    }
  });
}

/**
 * Push a change to Firestore
 */
export async function pushStateToFirestore(key, value) {
  const sessionId = state.get('sessionId');
  if (!sessionId || isUpdatingFromRemote) return;

  // These keys are local-only and should NOT be pushed to Firestore
  const skipKeys = ['sessionId', 'layoutReversed', 'lang', 'lastInputTime'];
  if (skipKeys.includes(key)) return;

  const sessionRef = doc(db, 'sessions', sessionId);
  
  const updateMap = {
    lastUpdatedBy: state.deviceId,
    lastUpdateAt: serverTimestamp()
  };

  // Map state keys to Firestore fields
  switch (key) {
    case 'readings':
      updateMap.readings = value.map(r => ({ 
        ...r, 
        timestamp: r.timestamp.toISOString(),
        // Serialize assessmentNotes: Firestore does not allow arrays nested inside arrays
        assessmentNotes: Array.isArray(r.assessmentNotes) ? r.assessmentNotes.join('\n') : (r.assessmentNotes || '')
      }));
      break;
    case 'journalEntries':
      updateMap.journalEntries = serializeJournal(value);
      break;
    case 'manualValues':
      updateMap.manualValues = value;
      break;
    case 'nurseSign':
      updateMap.lastNurseSign = value;
      break;
    default:
      updateMap[key] = value;
  }

  try {
    await updateDoc(sessionRef, updateMap);
  } catch (err) {
    console.error('Firestore push failed:', err);
  }
}

// Firestore doesn't support nested arrays, so we serialize journal entries (array of arrays)
// into an array of simple objects with named keys.
function serializeJournal(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map(row => {
    // If it's already an object (defensive), return it
    if (row && typeof row === 'object' && !Array.isArray(row)) return row;
    // Otherwise it's an array, map columns to keys
    return {
      tid: row[0] || '',
      flow: row[1] || '',
      gas: row[2] || '',
      crt: row[3] || '',
      resp: row[4] || '',
      etco2: row[5] || '',
      spo2: row[6] || '',
      puls: row[7] || '',
      sys: row[8] || '',
      dia: row[9] || '',
      map: row[10] || '',
      temp: row[11] || '',
      sign: row[12] || ''
    };
  });
}

function deserializeJournal(entries) {
  return entries.map(obj => [
    obj.tid, obj.flow, obj.gas, obj.crt, obj.resp, obj.etco2, 
    obj.spo2, obj.puls, obj.sys, obj.dia, obj.map, obj.temp, obj.sign
  ]);
}
