(function(){
  const user = DataStore.requireRole(['patient']);
  if(!user) return;
  document.getElementById('who-name').textContent = user.name;
  const initials = user.name.split(' ').map(w=>w[0]).slice(0,2).join('');
  document.getElementById('sidebar-avatar-initials').textContent = initials;
  document.getElementById('logout-btn').addEventListener('click', DataStore.logout);

  let selectedInvoiceId = null;

  function render(){
    const db = DataStore.load();
    const myInvoices = db.invoices.filter(i => i.patientId === user.id).sort((a,b) => b.date.localeCompare(a.date));
    const due = myInvoices.filter(i => i.status === 'due');
    document.getElementById('due-total').textContent = formatLKR(due.reduce((s,i) => s + i.amount, 0));

    document.getElementById('invoice-list').innerHTML = myInvoices.map(inv => `
      <div class="invoice-row ${inv.status === 'paid' ? 'paid' : ''} ${inv.id === selectedInvoiceId ? 'selected' : ''}" data-inv="${inv.id}" ${inv.status === 'paid' ? '' : 'tabindex="0" role="button"'}>
        <div class="invoice-main">
          <div class="desc">${inv.desc}</div>
          <div class="meta">${inv.id} · ${formatDate(inv.date)}</div>
        </div>
        <span class="badge ${inv.status === 'paid' ? 'badge-good' : 'badge-pending'}">${inv.status}</span>
        <div class="invoice-amount">${formatLKR(inv.amount)}</div>
      </div>
    `).join('') || '<p style="color:var(--ink-soft);">No invoices on file.</p>';

    document.querySelectorAll('.invoice-row:not(.paid)').forEach(row => {
      row.addEventListener('click', () => selectInvoice(row.dataset.inv));
    });

    const history = db.payments.filter(p => p.patientId === user.id).sort((a,b) => b.date.localeCompare(a.date));
    document.getElementById('history-body').innerHTML = history.map(p => {
      const inv = db.invoices.find(i => i.id === p.invoiceId);
      return `<tr><td>${p.id}</td><td>${inv ? inv.desc : '—'}</td><td>${formatLKR(p.amount)}</td><td>${p.method}</td><td>${formatDate(p.date)}</td></tr>`;
    }).join('') || `<tr><td colspan="5">No payments made yet.</td></tr>`;
  }

  function selectInvoice(id){
    selectedInvoiceId = id;
    const db = DataStore.load();
    const inv = db.invoices.find(i => i.id === id);
    document.getElementById('pay-target-label').textContent = `Paying ${inv.desc} — ${formatLKR(inv.amount)}`;
    document.getElementById('pay-btn').disabled = false;
    document.getElementById('pay-btn').textContent = `Pay ${formatLKR(inv.amount)}`;
    render();
    document.querySelectorAll('.invoice-row').forEach(r => r.classList.toggle('selected', r.dataset.inv === id));
  }

  const cardNumber = document.getElementById('card-number');
  cardNumber.addEventListener('input', () => {
    let digits = cardNumber.value.replace(/\D/g,'').slice(0,16);
    cardNumber.value = digits.replace(/(.{4})/g,'$1 ').trim();
  });

  const expiry = document.getElementById('expiry');
  expiry.addEventListener('input', () => {
    let digits = expiry.value.replace(/\D/g,'').slice(0,4);
    expiry.value = digits.length > 2 ? digits.slice(0,2) + '/' + digits.slice(2) : digits;
  });

  document.getElementById('cvv').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g,'').slice(0,3); });

  function setInvalid(fieldId, invalid){ document.getElementById(fieldId).classList.toggle('invalid', invalid); }

  document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if(!selectedInvoiceId){ showToast('Select an invoice to pay first.', 'error'); return; }

    const name = document.getElementById('card-name').value.trim();
    const number = cardNumber.value.replace(/\s/g,'');
    const exp = expiry.value;
    const cvv = document.getElementById('cvv').value;

    const nameOk = name.length > 1;
    const numberOk = /^\d{16}$/.test(number);
    const expOk = /^\d{2}\/\d{2}$/.test(exp) && Number(exp.slice(0,2)) >= 1 && Number(exp.slice(0,2)) <= 12;
    const cvvOk = /^\d{3}$/.test(cvv);

    setInvalid('field-card-name', !nameOk);
    setInvalid('field-card-number', !numberOk);
    setInvalid('field-expiry', !expOk);
    setInvalid('field-cvv', !cvvOk);
    if(!nameOk || !numberOk || !expOk || !cvvOk){ showToast('Check the highlighted card details.', 'error'); return; }

    const db = DataStore.load();
    const inv = db.invoices.find(i => i.id === selectedInvoiceId);
    inv.status = 'paid';
    const payment = { id: uid('PAY'), patientId:user.id, invoiceId:inv.id, amount:inv.amount, date:'2026-07-02', method:`Visa •••• ${number.slice(-4)}` };
    db.payments.push(payment);
    DataStore.save(db);

    document.getElementById('receipt-text').textContent = `${formatLKR(inv.amount)} paid for ${inv.desc}. Receipt ${payment.id}.`;
    document.getElementById('receipt-dialog').showModal();

    document.getElementById('payment-form').reset();
    selectedInvoiceId = null;
    document.getElementById('pay-btn').disabled = true;
    document.getElementById('pay-btn').textContent = 'Select an invoice first';
    document.getElementById('pay-target-label').textContent = 'Select an invoice to pay.';
    render();
  });

  document.getElementById('receipt-close').addEventListener('click', () => document.getElementById('receipt-dialog').close());

  render();
})();