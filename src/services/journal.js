import { state } from '../state.js';

export function formatJournalEntry(timestamp, values, manualValues) {
  // Column order matching NARKOSJOURNAL:
  // Tid, Syre/Luft, Insp gas, CRT/Slh, Resp, EtCO2, SpO2, Puls, Systol, Diastol, MAP, Temp, Sign
  
  const h = String(timestamp.getHours()).padStart(2, '0');
  const m = String(timestamp.getMinutes()).padStart(2, '0');
  const timeStr = `${h}.${m}`;

  // Helper to append * if unconfirmed (inherited)
  const formatManual = (field) => {
    const obj = manualValues[field];
    if (!obj || !obj.value) return '--';
    
    // Freshness check: only include if confirmed within the last 60s of the entry timestamp
    const isFresh = (timestamp - obj.confirmedAt) < 60000;
    if (!isFresh) return '--';
    
    return obj.confirmed ? obj.value : `*${obj.value}*`;
  };

  // Helper: use AI value first, fallback to manualValues
  const valOrManual = (aiVal, manualField) => {
    if (aiVal !== null && aiVal !== undefined && aiVal !== '') return aiVal;
    const obj = manualValues[manualField];
    if (obj?.value) {
      const isFresh = (timestamp - obj.confirmedAt) < 60000;
      if (isFresh) return obj.confirmed ? obj.value : `*${obj.value}*`;
    }
    return '';
  };

  const syreStr = formatManual('Syre');
  const luftStr = formatManual('Luft');
  const crtStr = formatManual('CRT');
  const slhStr = formatManual('SLH');

  const row = [
    timeStr,
    `${syreStr}/${luftStr}`,
    formatManual('Insp gas'),
    `${crtStr}/${slhStr}`,
    valOrManual(values.rr, 'Resp'),
    valOrManual(values.etco2, 'EtCO2'),
    valOrManual(values.spo2, 'SpO2'),
    valOrManual(values.hr, 'Puls'),
    valOrManual(values.nibp_sys, 'NIBP_SYS'),
    valOrManual(values.nibp_dia, 'NIBP_DIA'),
    valOrManual(values.nibp_map, 'NIBP_MAP'),
    valOrManual(values.temp, 'Temp'),
    state.get('nurseSign')
  ];

  return row;
}
