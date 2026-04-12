import { db } from './firebase.js';
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'vet_case_history';

/**
 * Archive a case to history
 * Unshared cases (no sessionId) go to localStorage
 * Shared cases (has sessionId) go to Firestore
 */
export async function archiveCase(caseData) {
  const isShared = !!caseData.sessionId;
  const historyData = {
    ...caseData,
    archivedAt: new Date().toISOString()
  };

  if (isShared) {
    // Save to Firestore
    try {
      const casesRef = collection(db, 'cases');
      // We don't use serverTimestamp() here because we want a consistent ISO format for sorting/merging with local
      await addDoc(casesRef, historyData);
      console.log('Case archived to Firestore');
    } catch (err) {
      console.error('Failed to archive case to Firestore:', err);
      throw err;
    }
  } else {
    // Save to localStorage
    try {
      historyData.id = 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      let localHistory = [];
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) localHistory = JSON.parse(raw);
      } catch (e) { /* ignore parse error */ }
      
      localHistory.push(historyData);
      
      // Optional: keep only the last 50 local cases to prevent quota issues
      if (localHistory.length > 50) {
        // Sort by archivedAt desc, then slice
        localHistory.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
        localHistory = localHistory.slice(0, 50);
      }
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localHistory));
      console.log('Case archived locally');
    } catch (err) {
      console.error('Failed to archive case locally (quota?):', err);
      throw err;
    }
  }
}

/**
 * Get merged history from both local and remote
 */
export async function getCaseHistory() {
  let localCases = [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      localCases = JSON.parse(raw).map(c => ({...c, _source: 'local'}));
    }
  } catch (e) {
    console.error('Failed to read local history:', e);
  }

  let remoteCases = [];
  try {
    const casesRef = collection(db, 'cases');
    // Order by archivedAt desc, limit 20
    const q = query(casesRef, orderBy('archivedAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    snap.forEach(docSnap => {
      remoteCases.push({
        id: docSnap.id,
        _source: 'remote',
        ...docSnap.data()
      });
    });
  } catch (e) {
    console.error('Failed to fetch remote history:', e);
    // Continue with just local cases if offline/error
  }

  // Merge and sort
  const allCases = [...localCases, ...remoteCases];
  allCases.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));

  return allCases;
}

/**
 * Delete a case from history
 */
export async function deleteCase(caseId, isShared) {
  if (isShared) {
    try {
      await deleteDoc(doc(db, 'cases', caseId));
    } catch (err) {
      console.error('Failed to delete remote case:', err);
      throw err;
    }
  } else {
    try {
      let localHistory = [];
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) localHistory = JSON.parse(raw);
      
      localHistory = localHistory.filter(c => c.id !== caseId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localHistory));
    } catch (err) {
      console.error('Failed to delete local case:', err);
      throw err;
    }
  }
}

/**
 * Fetch a full case by ID (mainly used if we only fetched summaries in getCaseHistory, 
 * but since we store whole documents right now, we might not need an extra fetch for local.
 * For Firestore we fetch it fresh just in case).
 */
export async function getCaseById(caseId, isShared) {
  if (isShared) {
    const docSnap = await getDoc(doc(db, 'cases', caseId));
    if (docSnap.exists()) {
      return { id: docSnap.id, _source: 'remote', ...docSnap.data() };
    }
    throw new Error('Case not found on server');
  } else {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const localHistory = JSON.parse(raw);
        const found = localHistory.find(c => c.id === caseId);
        if (found) return { ...found, _source: 'local' };
      }
      throw new Error('Case not found locally');
    } catch (err) {
      throw err;
    }
  }
}
