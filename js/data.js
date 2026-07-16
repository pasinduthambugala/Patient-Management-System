/* =====================================================================
   MediCore shared data layer.
   Seeds localStorage with sample data on first run, then every page
   reads/writes through these helpers so state stays in sync across
   pages (booking a slot on one screen shows up on another, etc).

   NOTE: this demo persists in your browser's localStorage. If you are
   previewing inside the Claude chat window the preview frame may not
   keep this between page loads — download the files and open them
   from disk (or host them) for full persistence.
   ===================================================================== */

const DB_KEY = 'medicore_db_v1';
const SESSION_KEY = 'medicore_session_v1';

const SAMPLE_DB = {
  users: [
    { id: 'U-1001', role: 'patient', name: 'Nadeesha Perera', email: 'patient@medicore.lk', password: 'patient123', dob: '1994-03-12', phone: '077 123 4567' },
    { id: 'U-1002', role: 'doctor', name: 'Dr. Ashan Wickramasinghe', email: 'doctor@medicore.lk', password: 'doctor123', dept: 'Cardiology' },
    { id: 'U-1003', role: 'admin', name: 'Ruwani Fernando', email: 'admin@medicore.lk', password: 'admin123' }
  ],

  departments: [
    { id: 'cardio', name: 'Cardiology', doctors: ['Dr. Ashan Wickramasinghe', 'Dr. Ishara Gunasekara'] },
    { id: 'derma', name: 'Dermatology', doctors: ['Dr. Nimali Rathnayake'] },
    { id: 'ortho', name: 'Orthopedics', doctors: ['Dr. Kasun Silva', 'Dr. Lakmini de Zoysa'] },
    { id: 'pedi', name: 'Pediatrics', doctors: ['Dr. Chathurika Jayasuriya'] },
    { id: 'gen', name: 'General Medicine', doctors: ['Dr. Sampath Kumara'] }
  ],

  slots: ['08:30 AM', '09:15 AM', '10:00 AM', '10:45 AM', '11:30 AM', '02:00 PM', '02:45 PM', '03:30 PM', '04:15 PM'],

  appointments: [
    { id: 'APT-3001', patientId: 'U-1001', patient: 'Nadeesha Perera', dept: 'Cardiology', doctor: 'Dr. Ashan Wickramasinghe', date: '2026-07-08', time: '10:00 AM', reason: 'Routine ECG follow-up', status: 'confirmed' },
    { id: 'APT-3002', patientId: 'U-1001', patient: 'Nadeesha Perera', dept: 'General Medicine', doctor: 'Dr. Sampath Kumara', date: '2026-06-18', time: '09:15 AM', reason: 'Fever and fatigue', status: 'completed' },
    { id: 'APT-3003', patientId: 'U-1004', patient: 'Tharindu Bandara', dept: 'Orthopedics', doctor: 'Dr. Kasun Silva', date: '2026-07-03', time: '11:30 AM', reason: 'Knee pain after fall', status: 'pending' }
  ],

  records: [
    {
      id: 'MR-501', patientId: 'U-1001', date: '2026-06-18', doctor: 'Dr. Sampath Kumara', dept: 'General Medicine',
      diagnosis: 'Viral fever', notes: 'Advised rest and fluids, review in 5 days if symptoms persist.',
      prescription: [{ drug: 'Paracetamol 500mg', dose: '1 tablet every 6 hrs', duration: '5 days' }, { drug: 'ORS sachets', dose: '1 sachet as needed', duration: '5 days' }]
    },
    {
      id: 'MR-478', patientId: 'U-1001', date: '2026-04-02', doctor: 'Dr. Ashan Wickramasinghe', dept: 'Cardiology',
      diagnosis: 'Mild hypertension', notes: 'Lifestyle modification advised, monitor BP weekly.',
      prescription: [{ drug: 'Amlodipine 5mg', dose: '1 tablet daily, morning', duration: '30 days' }]
    }
  ],

  labReports: [
    {
      id: 'LAB-901', patientId: 'U-1001', test: 'Full Blood Count', orderedBy: 'Dr. Sampath Kumara', date: '2026-06-18', status: 'ready',
      results: [{ name: 'Hemoglobin', value: '13.8 g/dL', range: '12–16 g/dL' }, { name: 'WBC', value: '9,200 /µL', range: '4,000–11,000 /µL' }]
    },
    { id: 'LAB-915', patientId: 'U-1001', test: 'Lipid Profile', orderedBy: 'Dr. Ashan Wickramasinghe', date: '2026-07-01', status: 'pending', results: [] }
  ],

  invoices: [
    { id: 'INV-7001', patientId: 'U-1001', desc: 'Consultation — General Medicine', date: '2026-06-18', amount: 2500, status: 'paid' },
    { id: 'INV-7002', patientId: 'U-1001', desc: 'Lipid Profile lab test', date: '2026-07-01', amount: 3200, status: 'due' },
    { id: 'INV-7003', patientId: 'U-1001', desc: 'Cardiology consultation (upcoming)', date: '2026-07-08', amount: 4000, status: 'due' }
  ],

  payments: [
    { id: 'PAY-201', patientId: 'U-1001', invoiceId: 'INV-7001', amount: 2500, date: '2026-06-18', method: 'Visa •••• 4242' }
  ]
};

// DataStore object to manage all data operations
const DataStore = {
  // Function to load data from localStorage
  load() {
    let raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      localStorage.setItem(DB_KEY, JSON.stringify(SAMPLE_DB));
      raw = JSON.stringify(SAMPLE_DB);
    }
    try { return JSON.parse(raw); } catch (e) { localStorage.setItem(DB_KEY, JSON.stringify(SAMPLE_DB)); return structuredClone(SAMPLE_DB); }
  },
  // Function to save data to localStorage
  save(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); },
  // Function to reset data to sample data
  reset() { localStorage.setItem(DB_KEY, JSON.stringify(SAMPLE_DB)); },

  // Function to get current logged-in user
  currentUser() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  // Function to login user and save session
  login(user) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); },
  // Function to logout user and redirect to login
  logout() { sessionStorage.removeItem(SESSION_KEY); window.location.href = 'login.html'; },

  // Function to check if user has required role
  requireRole(roles) {
    const u = DataStore.currentUser();
    if (!u || !roles.includes(u.role)) {
      window.location.href = 'login.html';
      return null;
    }
    return u;
  }
};

/* ---------------- Toast helper ---------------- */
// Function to create toast notification region if it doesn't exist
function ensureToastRegion() {
  let region = document.getElementById('toast-region');
  if (!region) {
    region = document.createElement('div');
    region.id = 'toast-region';
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  return region;
}
// Function to show a toast notification message
function showToast(message, type) {
  const region = ensureToastRegion();
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s ease'; setTimeout(() => el.remove(), 250); }, 3200);
}

/* ---------------- Vitals strip (signature ECG divider), injected via JS
   so every page gets it identically without repeating markup ---------------- */
// Function to generate SVG for vitals strip (ECG line)
function vitalsStripSVG() {
  return `<svg class="vitals-strip" viewBox="0 0 600 28" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 14 H210 L225 4 L240 24 L255 14 H600" />
  </svg>`;
}
// Function to mount vitals strips on all elements with data-vitals-strip attribute
function mountVitalsStrips() {
  document.querySelectorAll('[data-vitals-strip]').forEach(el => { el.innerHTML = vitalsStripSVG(); });
}
document.addEventListener('DOMContentLoaded', mountVitalsStrips);

/* ---------------- Small format helpers ---------------- */
// Function to format number as Sri Lankan Rupees
function formatLKR(n) { return 'LKR ' + Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
// Function to format ISO date to readable format
function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
// Function to generate unique ID with prefix
function uid(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(); }