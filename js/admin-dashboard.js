(function(){
  const user = DataStore.requireRole(['admin','doctor']);
  if(!user) return;

  // Populate name
  document.getElementById('who-name').textContent = user.name;

  // Role tag — doctor shows dept
  const roleTag = document.getElementById('who-role');
  if(user.role === 'doctor'){
    roleTag.textContent = `Doctor · ${user.dept}`;
  } else {
    roleTag.textContent = 'Administrator';
  }

  // Avatar initials
  const initials = user.name.split(' ').map(w=>w[0]).slice(0,2).join('');
  document.getElementById('sidebar-avatar-initials').textContent = initials;

  // Greeting
  document.getElementById('greeting').textContent = user.role === 'doctor' ? `Welcome, ${user.name}` : 'Hospital overview';

  // Live date subtitle
  const sub = document.getElementById('topbar-sub');
  if(sub){
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    sub.textContent = `${dateStr} · Live snapshot of hospital activity`;
  }

  document.getElementById('logout-btn').addEventListener('click', DataStore.logout);

  let db = DataStore.load();
  const today = '2026-07-02';

  // Function to render the dashboard with all data
  function render(){
    db = DataStore.load();
    const patients = db.users.filter(u => u.role === 'patient');
    const doctors = db.users.filter(u => u.role === 'doctor');
    const appts = db.appointments;
    const todaysAppts = appts.filter(a => a.date === today);
    const revenue = db.invoices.filter(i => i.status === 'paid').reduce((s,i) => s + i.amount, 0);

    document.getElementById('stat-patients').textContent = patients.length;
    document.getElementById('stat-doctors').textContent = doctors.length;
    document.getElementById('stat-today').textContent = todaysAppts.length;
    document.getElementById('stat-revenue').textContent = formatLKR(revenue);

    // department bar chart
    const byDept = {};
    appts.forEach(a => { byDept[a.dept] = (byDept[a.dept] || 0) + 1; });
    const maxCount = Math.max(1, ...Object.values(byDept));
    const deptEl = document.getElementById('dept-chart');
    deptEl.innerHTML = db.departments.map(d => {
      const count = byDept[d.name] || 0;
      return `<div class="bar-row">
        <span class="name">${d.name}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(count/maxCount)*100}%"></div></div>
        <span class="count">${count}</span>
      </div>`;
    }).join('');

    // status breakdown
    const statuses = ['pending','confirmed','completed','cancelled'];
    const statusEl = document.getElementById('status-chart');
    statusEl.innerHTML = statuses.map(s => {
      const count = appts.filter(a => a.status === s).length;
      const badgeClass = s === 'confirmed' || s === 'completed' ? 'badge-good' : s === 'cancelled' ? 'badge-critical' : 'badge-pending';
      return `<div class="status-row"><span class="badge ${badgeClass}">${s}</span><strong>${count}</strong></div>`;
    }).join('');

    renderApptTable(document.getElementById('appt-search').value.trim().toLowerCase());

    document.getElementById('patients-table-body').innerHTML = patients.map(p => `
      <tr><td>${p.id}</td><td>${p.name}</td><td>${p.email}</td><td>${p.phone || '—'}</td></tr>
    `).join('') || `<tr><td colspan="4">No patients registered yet.</td></tr>`;

    document.getElementById('doctors-table-body').innerHTML = doctors.map(d => `
      <tr><td>${d.id}</td><td>${d.name}</td><td>${d.email}</td><td>${d.dept || '—'}</td></tr>
    `).join('') || `<tr><td colspan="4">No doctors registered yet.</td></tr>`;

    document.getElementById('invoices-table-body').innerHTML = db.invoices.map(inv => {
      const patient = db.users.find(u => u.id === inv.patientId);
      const badgeClass = inv.status === 'paid' ? 'badge-good' : 'badge-pending';
      return `<tr><td>${inv.id}</td><td>${patient ? patient.name : '—'}</td><td>${inv.desc}</td><td>${formatLKR(inv.amount)}</td><td><span class="badge ${badgeClass}">${inv.status}</span></td></tr>`;
    }).join('');
  }

  // Function to render the appointment table with optional filter
  function renderApptTable(filter){
    const rows = db.appointments.filter(a => !filter || a.patient.toLowerCase().includes(filter) || a.doctor.toLowerCase().includes(filter));
    document.getElementById('appt-table-body').innerHTML = rows.map(a => `
      <tr data-id="${a.id}">
        <td>${a.id}</td><td>${a.patient}</td><td>${a.doctor}</td><td>${formatDate(a.date)}</td><td>${a.time}</td>
        <td>
          <select class="status-select" data-id="${a.id}">
            ${['pending','confirmed','completed','cancelled'].map(s => `<option value="${s}" ${a.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
        <td class="row-actions"><button class="btn btn-danger" data-delete="${a.id}">Remove</button></td>
      </tr>
    `).join('') || `<tr><td colspan="7">No appointments match your search.</td></tr>`;

    document.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const dbNow = DataStore.load();
        const appt = dbNow.appointments.find(a => a.id === sel.dataset.id);
        if(appt){ appt.status = sel.value; DataStore.save(dbNow); showToast(`${appt.id} marked ${sel.value}.`); render(); }
      });
    });
    document.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dbNow = DataStore.load();
        dbNow.appointments = dbNow.appointments.filter(a => a.id !== btn.dataset.delete);
        DataStore.save(dbNow);
        showToast('Appointment removed.');
        render();
      });
    });
  }

  document.getElementById('appt-search').addEventListener('input', (e) => renderApptTable(e.target.value.trim().toLowerCase()));

  // Modal functionality
  const patientModal = document.getElementById('patient-modal');
  const doctorModal = document.getElementById('doctor-modal');
  const addPatientBtn = document.getElementById('add-patient-btn');
  const addDoctorBtn = document.getElementById('add-doctor-btn');
  const closePatientModal = document.getElementById('close-patient-modal');
  const closeDoctorModal = document.getElementById('close-doctor-modal');
  const cancelPatient = document.getElementById('cancel-patient');
  const cancelDoctor = document.getElementById('cancel-doctor');

  // Open modals
  addPatientBtn.addEventListener('click', () => {
    patientModal.classList.add('active');
  });

  addDoctorBtn.addEventListener('click', () => {
    doctorModal.classList.add('active');
  });

  // Function to close all modal dialogs
  function closeAllModals() {
    patientModal.classList.remove('active');
    doctorModal.classList.remove('active');
  }

  closePatientModal.addEventListener('click', closeAllModals);
  closeDoctorModal.addEventListener('click', closeAllModals);
  cancelPatient.addEventListener('click', closeAllModals);
  cancelDoctor.addEventListener('click', closeAllModals);

  // Close modal when clicking outside
  patientModal.addEventListener('click', (e) => {
    if (e.target === patientModal) closeAllModals();
  });
  doctorModal.addEventListener('click', (e) => {
    if (e.target === doctorModal) closeAllModals();
  });

  // Handle patient form submission
  document.getElementById('patient-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const dbNow = DataStore.load();
    
    const newPatient = {
      id: uid('U'),
      role: 'patient',
      name: document.getElementById('patient-name').value,
      email: document.getElementById('patient-email').value,
      password: document.getElementById('patient-password').value,
      dob: document.getElementById('patient-dob').value,
      phone: document.getElementById('patient-phone').value
    };

    dbNow.users.push(newPatient);
    DataStore.save(dbNow);
    
    showToast('Patient added successfully!');
    closeAllModals();
    document.getElementById('patient-form').reset();
    render();
  });

  // Handle doctor form submission
  document.getElementById('doctor-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const dbNow = DataStore.load();
    
    const newDoctor = {
      id: uid('U'),
      role: 'doctor',
      name: document.getElementById('doctor-name').value,
      email: document.getElementById('doctor-email').value,
      password: document.getElementById('doctor-password').value,
      dept: document.getElementById('doctor-dept').value
    };

    dbNow.users.push(newDoctor);
    
    // Add doctor to the corresponding department
    const dept = dbNow.departments.find(d => d.name === newDoctor.dept);
    if (dept && !dept.doctors.includes(newDoctor.name)) {
      dept.doctors.push(newDoctor.name);
    }
    
    DataStore.save(dbNow);
    
    showToast('Doctor added successfully!');
    closeAllModals();
    document.getElementById('doctor-form').reset();
    render();
  });

  render();
})();