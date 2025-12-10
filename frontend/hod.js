// frontend/hod.js
// Simple HOD dashboard client for development/testing

const $ = id => document.getElementById(id);

// Backend base URL (adjust if your API runs on a different host/port)
const API_BASE = window.API_BASE || 'http://localhost:5000';

console.log('[HOD UI] hod.js loaded — API_BASE=' + API_BASE);

function devHeaders() {
  const userId = $('hodUserId').value || '2';
  return {
    'x-user-id': String(userId),
    'x-user-role': 'hod'
  };
}

function showResult(obj) {
  try {
    $('result').textContent = JSON.stringify(obj, null, 2);
  } catch (err) {
    $('result').textContent = String(obj);
  }
}

async function safeParseResponse(resp) {
  try { return await resp.json(); } catch (e) { return await resp.text(); }
}

async function fetchUsers() {
  const dept = $('deptId').value;
  const semester = $('semester').value;
  const q = semester ? `?semester=${encodeURIComponent(semester)}` : '';
  const url = `${API_BASE}/api/hod/${dept}/users${q}`;
  try {
    const resp = await fetch(url, { headers: devHeaders() });
    const body = await safeParseResponse(resp);
    showResult({ url, status: resp.status, body });
  } catch (err) {
    console.error('[HOD UI] fetchUsers error', err);
    showResult({ error: String(err) });
  }
}

async function uploadUsers() {
  const dept = $('deptId').value;
  const fileEl = $('usersFile');
  if (!fileEl.files || fileEl.files.length === 0) return alert('Choose an Excel file first');
  const file = fileEl.files[0];
  const fd = new FormData();
  fd.append('file', file);
  const url = `${API_BASE}/api/hod/${dept}/users/upload`;
  try {
    const resp = await fetch(url, { method: 'POST', headers: devHeaders(), body: fd });
    const body = await safeParseResponse(resp);
    showResult({ url, status: resp.status, body });
  } catch (err) {
    console.error('[HOD UI] uploadUsers error', err);
    showResult({ error: String(err) });
  }
}

async function fetchVerified() {
  const dept = $('deptId').value;
  const semester = $('semester').value;
  const q = semester ? `?semester=${encodeURIComponent(semester)}` : '';
  const url = `${API_BASE}/api/hod/${dept}/documents/verified${q}`;
  try {
    const resp = await fetch(url, { headers: devHeaders() });
    const body = await safeParseResponse(resp);
    showResult({ url, status: resp.status, body });
  } catch (err) {
    console.error('[HOD UI] fetchVerified error', err);
    showResult({ error: String(err) });
  }
}

async function submitApproval() {
  const dept = $('deptId').value;
  const type = $('approvalType').value;
  const id = Number($('approvalId').value);
  const action = $('approvalAction').value;
  const hod_remarks = $('approvalRemarks').value || null;
  if (!type || !id || !action) return alert('Type, id and action required');
  const url = `${API_BASE}/api/hod/${dept}/approval`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, devHeaders()),
      body: JSON.stringify({ type, id, action, hod_remarks })
    });
    const body = await safeParseResponse(resp);
    showResult({ url, status: resp.status, body });
  } catch (err) {
    console.error('[HOD UI] submitApproval error', err);
    showResult({ error: String(err) });
  }
}

async function approveEventSimple() {
  const dept = $('deptId').value;
  const eventId = Number($('approvalId').value);
  if (!eventId) return alert('Set event id in the ID field');
  const url = `${API_BASE}/api/hod/${dept}/events/approve`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, devHeaders()),
      body: JSON.stringify({ event_id: eventId })
    });
    const body = await safeParseResponse(resp);
    showResult({ url, status: resp.status, body });
  } catch (err) {
    console.error('[HOD UI] approveEventSimple error', err);
    showResult({ error: String(err) });
  }
}

async function viewEvents() {
  const dept = $('deptId').value;
  const category = encodeURIComponent($('eventsCategory').value || '');
  const status = encodeURIComponent($('eventsStatus').value || '');
  const semester = $('semester').value || '';
  const q = [];
  if (category) q.push(`category=${category}`);
  if (status) q.push(`status=${status}`);
  if (semester) q.push(`semester=${encodeURIComponent(semester)}`);
  const qs = q.length ? `?${q.join('&')}` : '';
  const url = `${API_BASE}/api/hod/${dept}/events${qs}`;
  try {
    const resp = await fetch(url, { headers: devHeaders() });
    const body = await safeParseResponse(resp);
    showResult({ url, status: resp.status, body });
  } catch (err) {
    console.error('[HOD UI] viewEvents error', err);
    showResult({ error: String(err) });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('btnFetchUsers').addEventListener('click', fetchUsers);
  $('btnUploadUsers').addEventListener('click', uploadUsers);
  $('btnFetchVerified').addEventListener('click', fetchVerified);
  $('btnApprove').addEventListener('click', submitApproval);
  $('btnApproveEvent').addEventListener('click', approveEventSimple);
  $('btnViewEvents').addEventListener('click', viewEvents);
});

// Expose helpers for console testing
window.hodClient = { fetchUsers, uploadUsers, fetchVerified, submitApproval, approveEventSimple, viewEvents };
