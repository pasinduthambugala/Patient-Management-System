(function(){
  const user = DataStore.requireRole(['patient']);
  if(!user) return;

  document.getElementById('who-name').textContent = user.name;
  const initials = user.name.split(' ').map(w=>w[0]).slice(0,2).join('');
  document.getElementById('sidebar-avatar-initials').textContent = initials;
  document.getElementById('greeting').textContent = `Welcome back, ${user.name.split(' ')[0]}`;
  document.getElementById('logout-btn').addEventListener('click', DataStore.logout);

  const db = DataStore.load();
  const today = '2026-07-02';

  const myAppts = db.appointments.filter(a => a.patientId === user.id);
  const upcoming = myAppts.filter(a => a.date >= today && a.status !== 'cancelled')
    .sort((a,b) => a.date.localeCompare(b.date));
  const myRecords = db.records.filter(r => r.patientId === user.id);
  const myLabsReady = db.labReports.filter(l => l.patientId === user.id && l.status === 'ready');
  const myInvoicesDue = db.invoices.filter(i => i.patientId === user.id && i.status === 'due');
  const dueTotal = myInvoicesDue.reduce((sum,i) => sum + i.amount, 0);

  document.getElementById('stat-upcoming').textContent = upcoming.length;
  document.getElementById('stat-records').textContent = myRecords.length;
  document.getElementById('stat-labs').textContent = myLabsReady.length;
  document.getElementById('stat-due').textContent = formatLKR(dueTotal);

  const monthShort = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB',{month:'short'}).toUpperCase();
  const dayNum = (iso) => new Date(iso + 'T00:00:00').getDate();

  const list = document.getElementById('upcoming-list');
  if(upcoming.length === 0){
    list.innerHTML = `<p class="appt-empty">No upcoming appointments. <a href="appointment-booking.html">Book one now</a>.</p>`;
  } else {
    list.innerHTML = upcoming.slice(0,4).map(a => `
      <div class="appt-row">
        <div class="appt-date">${monthShort(a.date)}<span class="day">${dayNum(a.date)}</span></div>
        <div class="appt-info">
          <div class="doc">${a.doctor}</div>
          <div class="meta">${a.dept} · ${a.time} · ${a.reason}</div>
        </div>
        <span class="badge ${a.status === 'confirmed' ? 'badge-good' : 'badge-pending'}">${a.status}</span>
      </div>
    `).join('');
  }

  const activity = [];
  myRecords.forEach(r => activity.push({ date:r.date, text:`New medical record added by ${r.doctor} — ${r.diagnosis}` }));
  db.labReports.filter(l => l.patientId === user.id).forEach(l => activity.push({ date:l.date, text:`Lab report "${l.test}" is ${l.status === 'ready' ? 'ready to view' : 'pending results'}` }));
  myAppts.forEach(a => activity.push({ date:a.date, text:`Appointment with ${a.doctor} — ${a.status}` }));
  activity.sort((a,b) => b.date.localeCompare(a.date));

  document.getElementById('activity-list').innerHTML = activity.slice(0,6).map(a => `
    <div class="activity-row">
      <span class="activity-dot"></span>
      <div>${a.text}<span class="when">${formatDate(a.date)}</span></div>
    </div>
  `).join('') || '<p class="appt-empty">No recent activity.</p>';
})();