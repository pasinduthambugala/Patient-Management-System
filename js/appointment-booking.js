(function(){
  const user = DataStore.requireRole(['patient']);
  if(!user) return;
  document.getElementById('who-name').textContent = user.name;
  const initials = user.name.split(' ').map(w=>w[0]).slice(0,2).join('');
  document.getElementById('sidebar-avatar-initials').textContent = initials;
  document.getElementById('logout-btn').addEventListener('click', DataStore.logout);

  let db = DataStore.load();
  let selectedSlot = null;

  const deptSelect = document.getElementById('dept');
  const doctorSelect = document.getElementById('doctor');
  const dateInput = document.getElementById('date');
  const slotGrid = document.getElementById('slot-grid');

  db.departments.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id; opt.textContent = d.name;
    deptSelect.appendChild(opt);
  });

  deptSelect.addEventListener('change', () => {
    const dept = db.departments.find(d => d.id === deptSelect.value);
    doctorSelect.innerHTML = '';
    if(!dept){
      doctorSelect.disabled = true;
      doctorSelect.innerHTML = '<option value="">Select a department first</option>';
    } else {
      doctorSelect.disabled = false;
      doctorSelect.innerHTML = '<option value="">Select a doctor</option>' + dept.doctors.map(doc => `<option value="${doc}">${doc}</option>`).join('');
    }
    updateSummary();
    renderSlots();
  });

  [doctorSelect, dateInput].forEach(el => el.addEventListener('change', () => { updateSummary(); renderSlots(); }));

  // Function to render available time slots for booking
  function renderSlots(){
    selectedSlot = null;
    const dept = db.departments.find(d => d.id === deptSelect.value);
    const doctor = doctorSelect.value;
    const date = dateInput.value;
    if(!dept || !doctor || !date){
      slotGrid.innerHTML = '<p class="appt-empty" style="grid-column:1/-1;color:var(--ink-soft);font-size:.85rem;">Choose a department, doctor and date to see available times.</p>';
      return;
    }
    db = DataStore.load();
    const taken = new Set(db.appointments.filter(a => a.doctor === doctor && a.date === date && a.status !== 'cancelled').map(a => a.time));
    slotGrid.innerHTML = db.slots.map(t => `<button type="button" class="slot-btn ${taken.has(t) ? 'taken' : ''}" data-time="${t}" ${taken.has(t) ? 'disabled' : ''} role="radio" aria-checked="false">${t}</button>`).join('');
    slotGrid.querySelectorAll('.slot-btn:not(.taken)').forEach(btn => {
      btn.addEventListener('click', () => {
        slotGrid.querySelectorAll('.slot-btn').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-checked','false'); });
        btn.classList.add('selected'); btn.setAttribute('aria-checked','true');
        selectedSlot = btn.dataset.time;
        updateSummary();
      });
    });
  }

  // Function to update the booking summary display
  function updateSummary(){
    const dept = db.departments.find(d => d.id === deptSelect.value);
    document.getElementById('sum-dept').textContent = dept ? dept.name : '—';
    document.getElementById('sum-doctor').textContent = doctorSelect.value || '—';
    document.getElementById('sum-date').textContent = dateInput.value ? formatDate(dateInput.value) : '—';
    document.getElementById('sum-time').textContent = selectedSlot || '—';
  }

  // Function to set invalid state on form fields
  function setInvalid(fieldId, invalid){ document.getElementById(fieldId).classList.toggle('invalid', invalid); }

  document.getElementById('booking-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const dept = db.departments.find(d => d.id === deptSelect.value);
    const doctor = doctorSelect.value;
    const date = dateInput.value;
    const reason = document.getElementById('reason').value.trim();

    setInvalid('field-dept', !dept);
    setInvalid('field-doctor', !doctor);
    setInvalid('field-date', !date);
    setInvalid('field-time', !selectedSlot);
    setInvalid('field-reason', reason.length < 4);

    if(!dept || !doctor || !date || !selectedSlot || reason.length < 4){
      showToast('Please complete all fields before confirming.', 'error');
      return;
    }

    const dbNow = DataStore.load();
    dbNow.appointments.push({
      id: uid('APT'), patientId:user.id, patient:user.name, dept:dept.name, doctor, date, time:selectedSlot, reason, status:'pending'
    });
    DataStore.save(dbNow);
    db = dbNow;

    showToast(`Appointment booked with ${doctor} on ${formatDate(date)} at ${selectedSlot}.`);
    document.getElementById('booking-form').reset();
    selectedSlot = null;
    doctorSelect.disabled = true;
    doctorSelect.innerHTML = '<option value="">Select a department first</option>';
    updateSummary();
    renderSlots();
    renderMyAppointments();
  });

  // Function to render the user's appointment list
  function renderMyAppointments(){
    db = DataStore.load();
    const rows = db.appointments.filter(a => a.patientId === user.id).sort((a,b) => b.date.localeCompare(a.date));
    document.getElementById('my-appts-body').innerHTML = rows.map(a => {
      const badgeClass = a.status === 'confirmed' || a.status === 'completed' ? 'badge-good' : a.status === 'cancelled' ? 'badge-critical' : 'badge-pending';
      const canCancel = a.status === 'pending' || a.status === 'confirmed';
      return `<tr>
        <td>${a.id}</td><td>${a.doctor}</td><td>${a.dept}</td><td>${formatDate(a.date)}</td><td>${a.time}</td>
        <td><span class="badge ${badgeClass}">${a.status}</span></td>
        <td>${canCancel ? `<button class="btn btn-danger" data-cancel="${a.id}">Cancel</button>` : ''}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="7">You haven't booked any appointments yet.</td></tr>`;

    document.querySelectorAll('[data-cancel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dbNow = DataStore.load();
        const appt = dbNow.appointments.find(a => a.id === btn.dataset.cancel);
        if(appt){ appt.status = 'cancelled'; DataStore.save(dbNow); showToast(`${appt.id} cancelled.`); renderMyAppointments(); renderSlots(); }
      });
    });
  }

  renderSlots();
  renderMyAppointments();
})();