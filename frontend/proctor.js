// frontend/proctor.js
// Proctor dashboard client hooks for development/testing

const $p = id => document.getElementById(id);
const API_BASE = window.API_BASE || 'http://localhost:5000';

function devHeaders() {
  const proctorId = $p('proctorId')?.value || '9';
  return {
    'x-user-id': String(proctorId),
    'x-user-role': 'proctor'
  };
}

function show(obj){
  try { $p('result').textContent = JSON.stringify(obj, null, 2); } catch(e){ $p('result').textContent = String(obj); }
}

async function safeParse(resp){ try { return await resp.json(); } catch(e) { return await resp.text(); } }

async function fetchProctees(){
  const proctorId = $p('proctorId').value;
  const semester = $p('semester').value;
  if (!proctorId || !semester) return alert('Proctor ID and semester required');
  const url = `${API_BASE}/api/proctor/${encodeURIComponent(proctorId)}/students?semester=${encodeURIComponent(semester)}`;
  try {
    const resp = await fetch(url, { headers: devHeaders() });
    const body = await safeParse(resp);
    show({ url, status: resp.status, body });
  } catch (err) { show({ error: String(err) }); }
}

async function fetchEvents(){
  const proctorId = $p('proctorId').value;
  const category = $p('eventsCategory').value;
  const dept = $p('eventsDept').value;
  const semester = $p('eventsSemester').value;
  const qs = [];
  if (category) qs.push(`category=${encodeURIComponent(category)}`);
  if (dept) qs.push(`dept_id=${encodeURIComponent(dept)}`);
  if (semester) qs.push(`semester=${encodeURIComponent(semester)}`);
  const q = qs.length ? `?${qs.join('&')}` : '';
  const url = `${API_BASE}/api/proctor/${encodeURIComponent(proctorId)}/events${q}`;
  try {
    const resp = await fetch(url, { headers: devHeaders() });
    const body = await safeParse(resp);
    show({ url, status: resp.status, body });
  } catch (err) { show({ error: String(err) }); }
}

async function awardPoints(){
  const user_id = Number($p('awardUserId').value);
  const event_id = $p('awardEventId').value ? Number($p('awardEventId').value) : null;
  const points = Number($p('awardPoints').value);
  const category = $p('awardCategory').value;
  const semester = Number($p('eventsSemester').value || $p('semester').value || 0);
  const awarded_by = Number($p('proctorId').value);
  if (!user_id || !points || !category || !semester) return alert('user_id, points, category and semester required');
  const url = `${API_BASE}/api/proctor/activity_points/award`;
  try {
    const resp = await fetch(url, { method: 'POST', headers: Object.assign({'Content-Type':'application/json'}, devHeaders()), body: JSON.stringify({ user_id, event_id, points, category, semester, awarded_by }) });
    const body = await safeParse(resp);
    show({ url, status: resp.status, body });
  } catch (err) { show({ error: String(err) }); }
}

async function verifyDoc(){
  const registrationId = $p('verifyRegistrationId').value;
  const verified_by = Number($p('verifyBy').value || $p('proctorId').value);
  const verification_status = $p('verifyStatus').value;
  const remarks = '';
  if (!registrationId || !verified_by) return alert('registration id and verifier id required');
  const url = `${API_BASE}/api/proctor/registrations/${encodeURIComponent(registrationId)}/verify-doc`;
  try {
    const resp = await fetch(url, { method: 'POST', headers: Object.assign({'Content-Type':'application/json'}, devHeaders()), body: JSON.stringify({ verification_status, verified_by, remarks }) });
    const body = await safeParse(resp);
    show({ url, status: resp.status, body });
  } catch (err) { show({ error: String(err) }); }
}

async function addCategory(){
  const name = $p('newCategoryName').value;
  const max_points = Number($p('newCategoryPoints').value || 0);
  const proposed_by = Number($p('proctorId').value);
  if (!name || !max_points) return alert('category name and max points required');
  const url = `${API_BASE}/api/proctor/categories`;
  try {
    const resp = await fetch(url, { method: 'POST', headers: Object.assign({'Content-Type':'application/json'}, devHeaders()), body: JSON.stringify({ category_name: name, max_points, proposed_by }) });
    const body = await safeParse(resp);
    show({ url, status: resp.status, body });
  } catch (err) { show({ error: String(err) }); }
}

async function getCategories(){
  const qs = '?status=approved';
  const url = `${API_BASE}/api/proctor/categories${qs}`;
  try {
    const resp = await fetch(url, { headers: devHeaders() });
    const body = await safeParse(resp);
    show({ url, status: resp.status, body });
  } catch (err) { show({ error: String(err) }); }
}

document.addEventListener('DOMContentLoaded', () => {
  $p('btnFetchProctees').addEventListener('click', fetchProctees);
  $p('btnFetchEvents').addEventListener('click', fetchEvents);
  $p('btnAwardPoints').addEventListener('click', awardPoints);
  $p('btnVerifyDoc').addEventListener('click', verifyDoc);
  $p('btnAddCategory').addEventListener('click', addCategory);
  $p('btnGetCategories').addEventListener('click', getCategories);
});

// Expose for console
window.proctorClient = { fetchProctees, fetchEvents, awardPoints, verifyDoc, addCategory, getCategories };
