(function(){
  const user = DataStore.requireRole(['patient']);
  if(!user) return;
  document.getElementById('who-name').textContent = user.name;
  const initials = user.name.split(' ').map(w=>w[0]).slice(0,2).join('');
  document.getElementById('sidebar-avatar-initials').textContent = initials;
  document.getElementById('logout-btn').addEventListener('click', DataStore.logout);

  const db = DataStore.load();
  const myRecords = db.records.filter(r => r.patientId === user.id).sort((a,b) => b.date.localeCompare(a.date));
  const myLabs = db.labReports.filter(l => l.patientId === user.id).sort((a,b) => b.date.localeCompare(a.date));

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      tab.classList.add('active'); tab.setAttribute('aria-selected','true');
      document.getElementById('tab-visits').style.display = tab.dataset.tab === 'visits' ? '' : 'none';
      document.getElementById('tab-labs').style.display = tab.dataset.tab === 'labs' ? '' : 'none';
    });
  });
  if(location.hash === '#labs') document.querySelector('.tab[data-tab="labs"]').click();

  // Function to render medical records with optional filter
  function renderRecords(filter){
    const rows = myRecords.filter(r => !filter || r.diagnosis.toLowerCase().includes(filter) || r.doctor.toLowerCase().includes(filter));
    document.getElementById('records-list').innerHTML = rows.map(r => `
      <div class="record-card" data-record="${r.id}" tabindex="0" role="button" aria-label="View record from ${formatDate(r.date)}">
        <div class="record-icon">🩺</div>
        <div class="record-main">
          <div class="title">${r.diagnosis}</div>
          <div class="meta">${r.doctor} · ${r.dept}</div>
        </div>
        <div class="record-date">${formatDate(r.date)}</div>
      </div>
    `).join('') || '<p style="color:var(--ink-soft);">No matching records found.</p>';

    document.querySelectorAll('[data-record]').forEach(card => {
      const open = () => showRecordDetail(myRecords.find(r => r.id === card.dataset.record));
      card.addEventListener('click', open);
      card.addEventListener('keypress', (e) => { if(e.key === 'Enter') open(); });
    });
  }

  // Function to render lab reports list
  function renderLabs(){
    document.getElementById('labs-list').innerHTML = myLabs.map(l => `
      <div class="record-card" data-lab="${l.id}" tabindex="0" role="button" aria-label="View lab report ${l.test}">
        <div class="record-icon">🧪</div>
        <div class="record-main">
          <div class="title">${l.test}</div>
          <div class="meta">Ordered by ${l.orderedBy}</div>
        </div>
        <span class="badge ${l.status === 'ready' ? 'badge-good' : 'badge-pending'}">${l.status}</span>
        <div class="record-date">${formatDate(l.date)}</div>
      </div>
    `).join('') || '<p style="color:var(--ink-soft);">No lab reports on file.</p>';

    document.querySelectorAll('[data-lab]').forEach(card => {
      card.addEventListener('click', () => showLabDetail(myLabs.find(l => l.id === card.dataset.lab)));
    });
  }

  const dialog = document.getElementById('record-dialog');
  document.getElementById('record-close').addEventListener('click', () => dialog.close());

  // Function to show detailed medical record in dialog
  function showRecordDetail(r){
    document.getElementById('record-dialog-body').innerHTML = `
      <h2>${r.diagnosis}</h2>
      <p class="meta" style="color:var(--ink-soft);margin-bottom:1rem;">${r.doctor} · ${r.dept} · ${formatDate(r.date)}</p>
      <p>${r.notes}</p>
      <table class="rx-table">
        <thead><tr><th>Medicine</th><th>Dosage</th><th>Duration</th></tr></thead>
        <tbody>${r.prescription.map(p => `<tr><td>${p.drug}</td><td>${p.dose}</td><td>${p.duration}</td></tr>`).join('') || '<tr><td colspan="3">No medication prescribed.</td></tr>'}</tbody>
      </table>`;
    dialog.showModal();
  }

  // Function to show detailed lab report in dialog
  function showLabDetail(l){
    const body = l.status === 'ready'
      ? l.results.map(r => `<div class="result-row"><span>${r.name}</span><span>${r.value} <span class="result-range">(${r.range})</span></span></div>`).join('')
      : '<p style="color:var(--ink-soft);">Results are still being processed. You\'ll be notified when they\'re ready.</p>';
    document.getElementById('record-dialog-body').innerHTML = `
      <h2>${l.test}</h2>
      <p class="meta" style="color:var(--ink-soft);margin-bottom:1rem;">Ordered by ${l.orderedBy} · ${formatDate(l.date)}</p>
      ${body}`;
    dialog.showModal();
  }

  document.getElementById('record-search').addEventListener('input', (e) => renderRecords(e.target.value.trim().toLowerCase()));

  renderRecords('');
  renderLabs();
})();