import { state } from '../state.js';
import { t } from '../i18n.js';

export function createJournal(container) {
  const el = document.createElement('div');
  el.className = 'journal-container';
  
  el.innerHTML = `
    <div class="journal-header">
      <h2 data-i18n="tab_journal">${t('tab_journal')}</h2>
      <button class="btn" id="btn-copy-journal" style="padding: 4px 8px; font-size: 0.8rem; border: 1px solid #555; background: transparent;" data-i18n="copy_all">${t('copy_all')}</button>
    </div>
    
    <div class="patient-info-display" style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: var(--sp-sm); background: #111; padding: 4px 8px; border-radius: 4px; border: 1px solid #333;">
      <span id="disp-species"></span> <span id="disp-weight"></span><span id="disp-bcs"></span>
      <div id="disp-comorb" style="font-style: italic; margin-top: 2px;"></div>
    </div>

    <div class="journal-table-wrapper">
      <table class="journal-table" id="journal-table">
        <thead>
          <tr>
            <th>Tid</th>
            <th>Syre/Luft</th>
            <th>Insp gas</th>
            <th>CRT/Slh</th>
            <th>Resp</th>
            <th>EtCO2</th>
            <th>SpO2</th>
            <th>Puls</th>
            <th>Systol</th>
            <th>Diastol</th>
            <th>MAP</th>
            <th>Temp</th>
            <th>Sign</th>
          </tr>
        </thead>
        <tbody id="journal-body">
        </tbody>
      </table>
    </div>
    <div class="journal-notes">
      <h3>Anmärkning</h3>
      <div id="notes-list" class="notes-list"></div>
      <button id="btn-add-note" class="btn btn-muted">+ Add Note</button>
    </div>
  `;
  container.appendChild(el);

  const tbody = el.querySelector('#journal-body');
  const notesList = el.querySelector('#notes-list');
  const btnCopy = el.querySelector('#btn-copy-journal');
  const btnAddNote = el.querySelector('#btn-add-note');

  const dispSpecies = el.querySelector('#disp-species');
  const dispWeight = el.querySelector('#disp-weight');
  const dispBcs = el.querySelector('#disp-bcs');
  const dispComorb = el.querySelector('#disp-comorb');

  function updatePatientInfo() {
    dispSpecies.textContent = state.get('species') === 'Dog' ? t('dog') : t('cat');
    dispWeight.textContent = state.get('weight') ? ` | ${state.get('weight')} kg` : '';
    dispBcs.textContent = state.get('bcs') ? ` | BCS: ${state.get('bcs')}/9` : '';
    dispComorb.textContent = state.get('comorbidities') ? `📝 ${state.get('comorbidities')}` : '';
  }

  state.addEventListener('change', () => {
    updatePatientInfo();
  });
  updatePatientInfo(); // init

  // Copy to clipboard — HTML table (td headers work better than th in ProVetCloud)
  btnCopy.addEventListener('click', () => {
    const entries = state.get('journalEntries');
    const notes   = Array.from(notesList.children).map(n => n.textContent);
    const clean   = (v) => (v && typeof v === 'string' && v.includes('*')) ? v.replace(/\*/g, '') : (v || '');

    const HEADERS = ['Tid','Syre/Luft','Insp gas','CRT/Slh','Resp','EtCO2','SpO2','Puls','Systol','Diastol','MAP','Temp','Sign'];

    const rowArrays = entries.map(entry =>
      Array.isArray(entry) ? entry : [
        entry.tid, entry.flow, entry.gas, entry.crt, entry.resp, entry.etco2,
        entry.spo2, entry.puls, entry.sys, entry.dia, entry.map, entry.temp, entry.sign
      ]
    );

    // Drop columns that are entirely empty across all rows
    const activeCols = HEADERS.map((h, i) => i).filter(i => rowArrays.some(r => clean(r[i]) !== ''));

    const species = state.get('species') === 'Dog' ? 'Hund' : 'Katt';
    const weight  = state.get('weight') ? ` ${state.get('weight')} kg` : '';
    const bcs     = state.get('bcs')    ? ` | BCS ${state.get('bcs')}/9` : '';
    const comorb  = state.get('comorbidities') ? ` | ${state.get('comorbidities')}` : '';
    const dateStr = new Date().toLocaleDateString(state.get('lang') || 'sv', { day: 'numeric', month: 'short', year: 'numeric' });

    const cellStyle = 'padding:4px 10px; border:1px solid #ccc; text-align:center;';

    let html = `<p><b>Narkosjournal \u2014 ${species}${weight}${bcs}${comorb} | ${dateStr}</b></p>`;
    html += '<table cellpadding="4" cellspacing="0" style="border-collapse:collapse; font-size:13px; font-family:sans-serif;">';
    // Header row: use td+b (not th) so the editor spaces them out identically to data cells
    html += '<tr>' + activeCols.map(i => `<td style="${cellStyle} background:#f0f0f0;"><b>${HEADERS[i]}</b></td>`).join('') + '</tr>';
    rowArrays.forEach(row => {
      html += '<tr>' + activeCols.map(i => `<td style="${cellStyle}">${clean(row[i])}</td>`).join('') + '</tr>';
    });
    html += '</table>';
    if (notes.length > 0) {
      html += '<p><b>Anm\u00e4rkning</b></p>' + notes.map(n => `<p>${n}</p>`).join('');
    }

    // Plain text fallback
    const tsv = [HEADERS.filter((_, i) => activeCols.includes(i)).join('\t'),
      ...rowArrays.map(r => activeCols.map(i => clean(r[i])).join('\t'))
    ].join('\n');

    try {
      navigator.clipboard.write([new ClipboardItem({
        'text/html':  new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([tsv],  { type: 'text/plain' })
      })]).then(() => {
        const orig = btnCopy.textContent;
        btnCopy.textContent = '✅ Kopierad!';
        setTimeout(() => { btnCopy.textContent = orig; }, 2000);
      });
    } catch {
      navigator.clipboard.writeText(tsv).then(() => {
        const orig = btnCopy.textContent;
        btnCopy.textContent = '✅ Kopierad!';
        setTimeout(() => { btnCopy.textContent = orig; }, 2000);
      });
    }
  });


  btnAddNote.addEventListener('click', () => {
    const note = prompt('Enter note (e.g. drug administration):');
    if (note) {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const timeStr = `${h}.${m}`;
      
      const noteEl = document.createElement('div');
      noteEl.className = 'note-entry';
      noteEl.textContent = `${timeStr} ${note}`;
      notesList.appendChild(noteEl);
    }
  });

  state.addEventListener('change:journalEntries', (e) => {
    const entries = e.detail.entries;
    if (!entries) return;
    tbody.innerHTML = ''; // clear and re-render
    
    entries.forEach(entry => {
      // entry is usually an array, but defensively handle objects (serialized format)
      const tr = document.createElement('tr');
      const cells = Array.isArray(entry) ? entry : [
        entry.tid, entry.flow, entry.gas, entry.crt, entry.resp, entry.etco2,
        entry.spo2, entry.puls, entry.sys, entry.dia, entry.map, entry.temp, entry.sign
      ];
      
      cells.forEach(cellData => {
        const td = document.createElement('td');
        // Simple check to render italic if we marked it as unconfirmed in our generator
        if (cellData && cellData.includes && cellData.includes('*')) {
            td.innerHTML = `<i>${cellData.replace(/\*/g, '')}</i>`;
        } else {
            td.textContent = cellData || '';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    
    // auto scroll
    const wrapper = el.querySelector('.journal-table-wrapper');
    wrapper.scrollTop = wrapper.scrollHeight;
  });
}
