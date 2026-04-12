export function assessReading(values, species = 'Dog') {
  const hasAnyValue = ['hr', 'spo2', 'etco2', 'rr', 'temp', 'nibp_sys', 'nibp_dia', 'nibp_map', 'fio2']
    .some(k => values[k] !== null && values[k] !== undefined && values[k] !== '');

  if (!hasAnyValue) {
    return { status: 'idle', notes: [] };
  }

  let status = 'ok';
  const notes = [];

  const ranges = {
    Dog: {
      hr: [60, 140],
      spo2: [95, 100],
      etco2: [35, 45],
      rr: [10, 30],
      temp: [37.5, 39.5]
    },
    Cat: {
      hr: [120, 240], // Cats higher HR
      spo2: [95, 100],
      etco2: [35, 45],
      rr: [20, 40],
      temp: [37.5, 39.5]
    }
  };

  const currentRanges = ranges[species] || ranges.Dog;

  // Helper to check range
  const check = (val, min, max, name) => {
    if (val === null || val === undefined) return;
    if (val < min) {
      status = 'warning';
      notes.push(`${name} is low (${val} < ${min})`);
      if (val < min * 0.8) status = 'critical'; // simple heuristic for critical
    } else if (val > max) {
      status = 'warning';
      notes.push(`${name} is high (${val} > ${max})`);
      if (val > max * 1.2) status = 'critical';
    }
  };

  check(values.hr, currentRanges.hr[0], currentRanges.hr[1], 'Heart Rate');
  check(values.spo2, currentRanges.spo2[0], currentRanges.spo2[1], 'SpO2');
  check(values.etco2, currentRanges.etco2[0], currentRanges.etco2[1], 'EtCO2');
  check(values.rr, currentRanges.rr[0], currentRanges.rr[1], 'Respiratory Rate');
  check(values.temp, currentRanges.temp[0], currentRanges.temp[1], 'Temperature');

  // NIBP is a bit different, MAP generally should be > 60
  if (values.nibp_map && values.nibp_map < 60) {
    status = 'critical';
    notes.push(`Hypotension detected (MAP ${values.nibp_map} < 60)`);
  } else if (values.nibp_map && values.nibp_map < 70) {
    if (status !== 'critical') status = 'warning';
    notes.push(`Low blood pressure (MAP ${values.nibp_map})`);
  }

  return { status, notes };
}
