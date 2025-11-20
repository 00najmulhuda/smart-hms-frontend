const API_BASE = "https://smartcare-hms-hospital-management-system.onrender.com/api";
// - helper for API calls (sends token if exists) ---
async function apiFetch(path, opts = {}) {
  const url = API_BASE + path;
  const headers = opts.headers || {};
  headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = 'Bearer ' + token;
  opts.headers = headers;
  try {
    const r = await fetch(url, opts);
    const json = await r.json().catch(()=> ({}));
    return { ok: r.ok, status: r.status, data: json };
  } catch (err) {
    return { ok: false, status: 0, error: err };
  }
}

// --- AUTH ---
async function loginUser(email, password) {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (res.ok) {
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('currentUser', JSON.stringify(res.data.user));
    return { ok:true, user: res.data.user };
  }
  return { ok:false, message: res.data?.message || 'Login failed' };
}

async function registerUser(name, email, password, role='patient') {
  const res = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role })
  });
  if (res.ok) return { ok:true };
  return { ok:false, message: res.data?.message || 'Register failed' };
}

// --- DOCTORS ---
async function loadDoctorsFromServer() {
  const res = await apiFetch('/doctors', { method: 'GET' });
  if (res.ok && Array.isArray(res.data)) return res.data;

  return [
    { id:'d1', name:'Dr. A. Sharma', specialization:'Cardiologist', experience:8 },
    { id:'d2', name:'Dr. Priya Mehta', specialization:'Dermatologist', experience:5 },
    { id:'d3', name:'Dr. R. Khan', specialization:'Neurologist', experience:10 }
  ];
}

// FINAL FIX: ALWAYS RETURN d.id (NOT d._id)
async function getDoctors() {
  const docs = await loadDoctorsFromServer();
  return docs.map(d => ({
    id: d.id || d._id,
    name: d.name,
    specialization: d.specialization || '',
    experience: d.experience || 0
  }));
}

// --- APPOINTMENTS ---
async function createAppointmentServer({ patientName, doctorName, date, time }) {
  const res = await apiFetch('/appointments', {
    method: 'POST',
    body: JSON.stringify({ patientName, doctorName, date, time })
  });
  if (res.ok) return { ok:true, data: res.data };
  return { ok:false, message: res.data?.message || 'Create failed' };
}

async function loadAppointmentsFromServer() {
  const res = await apiFetch('/appointments', { method: 'GET' });
  if (res.ok && Array.isArray(res.data)) return res.data;
  return JSON.parse(localStorage.getItem('appointments') || '[]');
}

async function loadAppointments() {
  const list = await loadAppointmentsFromServer();
  return list.map(a => ({
    id: a._id || a.id,
    patientName: a.patientName || a.patient || 'Unknown',
    doctorName: a.doctorName || a.doctor || 'Unknown',
    datetime: (a.date ? (a.date + 'T' + (a.time || '00:00')) : (a.datetime || new Date().toISOString())),
    token: a.token || '',
    status: a.status || 'booked',
    createdAt: a.createdAt
  }));
}

function saveLocalAppointment(appt) {
  const all = JSON.parse(localStorage.getItem('appointments')||'[]');
  all.push(appt);
  localStorage.setItem('appointments', JSON.stringify(all));
}

async function createAppointment({ doctorId, datetime, reason }) {
  const doctors = await getDoctors();
  const doc = doctors.find(d => d.id === doctorId);
  const user = JSON.parse(localStorage.getItem('currentUser') || 'null') || { name: 'Guest', email: 'guest@example.com', id: 'p-demo' };

  const date = datetime.split('T')[0];
  const time = datetime.split('T')[1] ? datetime.split('T')[1].slice(0,5) : '00:00';

  const res = await createAppointmentServer({ patientName: user.name, doctorName: doc?.name || 'Unknown', date, time });
  if (res.ok) {
    const saved = res.data;
    return { ok:true, token: saved.token || (Math.floor(Math.random()*90)+10), eta:15 * (Math.floor(Math.random()*6)+1) };
  } else {
    const all = JSON.parse(localStorage.getItem('appointments') || '[]');
    const token = (all.filter(a=>a.doctorId===doctorId).length + 1).toString().padStart(2,'0');
    const appt = { id:'a'+Date.now().toString().slice(-5), patientId:user.id || 'p'+Math.random().toString(36).slice(2,6), patientName:user.name, doctorId, doctorName: doc?.name || 'Unknown', datetime, reason, token, status:'booked', reminderSent:false };
    saveLocalAppointment(appt);
    return { ok:true, token, eta: token*15 };
  }
}

async function getMyAppointments() {
  const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
  const all = await loadAppointments();
  if (!user) return all;
  return all.filter(a => (a.patientName === user.name) || (a.patientEmail === user.email));
}

function showAlert(msg) { alert(msg); }
