(function(){
  const roleTabs = document.querySelectorAll('.role-tab');
  let selectedRole = 'patient';
  roleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      roleTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      tab.classList.add('active'); tab.setAttribute('aria-selected','true');
      selectedRole = tab.dataset.role;
    });
  });

  const togglePass = document.getElementById('toggle-pass');
  const passInput = document.getElementById('password');
  togglePass.addEventListener('click', () => {
    const showing = passInput.type === 'text';
    passInput.type = showing ? 'password' : 'text';
    togglePass.textContent = showing ? 'Show' : 'Hide';
    togglePass.setAttribute('aria-pressed', String(!showing));
  });

  document.querySelectorAll('.cred').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('email').value = btn.dataset.email;
      document.getElementById('password').value = btn.dataset.password;
      const role = btn.dataset.email.startsWith('doctor') ? 'doctor' : btn.dataset.email.startsWith('admin') ? 'admin' : 'patient';
      roleTabs.forEach(t => {
        const match = t.dataset.role === role;
        t.classList.toggle('active', match);
        t.setAttribute('aria-selected', String(match));
      });
      selectedRole = role;
      document.getElementById('email').focus();
    });
  });

  // Function to set invalid state on form fields
  function setInvalid(fieldId, invalid){
    document.getElementById(fieldId).classList.toggle('invalid', invalid);
  }

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const emailOk = /^\S+@\S+\.\S+$/.test(email);
    setInvalid('field-email', !emailOk);
    setInvalid('field-password', password.length === 0);
    if(!emailOk || password.length === 0) return;

    const db = DataStore.load();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

    if(!user){
      showToast('Email or password is incorrect.', 'error');
      setInvalid('field-password', true);
      document.getElementById('field-password').querySelector('.error').textContent = 'That email and password combination doesn\u2019t match our records.';
      return;
    }
    if(user.role !== selectedRole && !(selectedRole === 'doctor' && user.role === 'admin')){
      showToast(`That account is registered as ${user.role}. Switch tabs to sign in.`, 'warn');
      return;
    }

    DataStore.login(user);
    showToast(`Welcome back, ${user.name.split(' ')[0]}.`);
    setTimeout(() => {
      window.location.href = (user.role === 'patient') ? 'patient-dashboard.html' :
        (user.role === 'admin') ? 'admin-dashboard.html' : 'admin-dashboard.html';
    }, 450);
  });

  /* Register dialog */
  const dialog = document.getElementById('register-dialog');
  document.getElementById('register-link').addEventListener('click', (e) => { e.preventDefault(); dialog.showModal(); });
  document.getElementById('register-cancel').addEventListener('click', () => dialog.close());
  document.getElementById('forgot-link').addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Password reset link sent — check your inbox (demo only).');
  });

  document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('r-name');
    const email = document.getElementById('r-email');
    const phone = document.getElementById('r-phone');
    const pass = document.getElementById('r-password');

    const nameOk = name.value.trim().length > 1;
    const emailOk = /^\S+@\S+\.\S+$/.test(email.value.trim());
    const phoneOk = /^0\d{9}$/.test(phone.value.replace(/\s+/g,''));
    const passOk = pass.value.length >= 8;

    [[name,nameOk],[email,emailOk],[phone,phoneOk],[pass,passOk]].forEach(([el, ok]) => {
      el.closest('.field').classList.toggle('invalid', !ok);
    });
    if(!nameOk || !emailOk || !phoneOk || !passOk) return;

    const db = DataStore.load();
    if(db.users.some(u => u.email.toLowerCase() === email.value.trim().toLowerCase())){
      showToast('An account with that email already exists.', 'error');
      return;
    }
    const newUser = { id: uid('U'), role:'patient', name:name.value.trim(), email:email.value.trim(), password:pass.value, phone:phone.value.trim() };
    db.users.push(newUser);
    DataStore.save(db);
    dialog.close();
    showToast('Account created — you can now sign in.');
    document.getElementById('email').value = newUser.email;
    document.getElementById('password').value = newUser.password;
  });
})();