document.addEventListener('DOMContentLoaded', () => {
  const out = document.getElementById('out');
  const API_BASE = 'http://localhost:5000/api/student';

  function setOut(data) {
    if (typeof data === 'string') out.textContent = data;
    else out.textContent = JSON.stringify(data, null, 2);
  }

  async function getAuthHeaders() {
    const idToken = document.getElementById('idToken').value;
    const devUser = document.getElementById('devUserId')?.value;
    const headers = {};
    if (devUser) {
      // dev mode: send X-User-Id header (canonical casing) expected by readTestUser middleware
      headers['X-User-Id'] = devUser;
      // default role student unless developer sets role header elsewhere
      headers['X-User-Role'] = 'student';
      return headers;
    }
    if (idToken) headers['Authorization'] = 'Bearer ' + idToken;
    return headers;
  }

  // Append dev_user query param when devUser is present (fallback if headers don't arrive)
  function buildUrl(path) {
    const devUser = document.getElementById('devUserId')?.value;
    if (!devUser) return path;
    const sep = path.includes('?') ? '&' : '?';
    return `${path}${sep}dev_user=${encodeURIComponent(devUser)}`;
  }

  document.getElementById('btnProfile').addEventListener('click', async () => {
    setOut('Fetching profile...');
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(buildUrl(`${API_BASE}/profile`), { headers, mode: 'cors' });
      const json = await resp.json();
      setOut(json);
    } catch (err) {
      setOut('Error: ' + err.message);
    }
  });

  // List events
  document.getElementById('btnListEvents').addEventListener('click', async () => {
    const category = document.getElementById('eventsCategory').value;
    const page = document.getElementById('eventsPage').value || 1;
    const per = document.getElementById('eventsPer').value || 10;
    setOut('Fetching events...');
    try {
      const headers = await getAuthHeaders();
      const q = new URLSearchParams({ category, page, per_page: per });
      const resp = await fetch(buildUrl(`${API_BASE}/events?${q.toString()}`), { headers, mode: 'cors' });
      const json = await resp.json();
      setOut(json);
    } catch (err) {
      setOut('Error: ' + err.message);
    }
  });

  // Get event details
  document.getElementById('btnGetEvent').addEventListener('click', async () => {
    const id = document.getElementById('eventId').value;
    if (!id) return alert('Enter event id');
    setOut('Fetching event...');
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(buildUrl(`${API_BASE}/events/${id}`), { headers, mode: 'cors' });
      const json = await resp.json();
      setOut(json);
    } catch (err) { setOut('Error: ' + err.message); }
  });

  // Register for event
  document.getElementById('btnRegisterEvent').addEventListener('click', async () => {
    const id = document.getElementById('eventId').value;
    if (!id) return alert('Enter event id');
    setOut('Registering...');
    try {
      const headers = await getAuthHeaders();
      headers['Content-Type'] = 'application/json';
      const resp = await fetch(buildUrl(`${API_BASE}/events/${id}/register`), { method: 'POST', headers, mode: 'cors' });
      const json = await resp.json();
      setOut(json);
    } catch (err) { setOut('Error: ' + err.message); }
  });

  // View my events
  document.getElementById('btnMyEvents').addEventListener('click', async () => {
    const semester = document.getElementById('myEventsSemester').value;
    setOut('Fetching my events...');
    try {
      const headers = await getAuthHeaders();
      const q = semester ? `?semester=${encodeURIComponent(semester)}` : '';
      const resp = await fetch(buildUrl(`${API_BASE}/users/me/my-events${q}`), { headers, mode: 'cors' });
      const json = await resp.json();
      setOut(json);
    } catch (err) { setOut('Error: ' + err.message); }
  });

  // Upload proof
  document.getElementById('btnUploadProof').addEventListener('click', async () => {
    const regId = document.getElementById('registrationId').value;
    if (!regId) return alert('Enter registration id');
    const fileInput = document.getElementById('proofFile');
    if (!fileInput.files || fileInput.files.length === 0) return alert('Pick a file');
    const docType = document.getElementById('docType').value;
    setOut('Uploading proof...');
    try {
      const headers = await getAuthHeaders();
      const form = new FormData();
      form.append('file', fileInput.files[0]);
      if (docType) form.append('doc_type', docType);

      const resp = await fetch(buildUrl(`${API_BASE}/registrations/${regId}/upload-proof`), { method: 'POST', headers, body: form, mode: 'cors' });
      const json = await resp.json();
      setOut(json);
    } catch (err) { setOut('Error: ' + err.message); }
  });

  // Points
  document.getElementById('btnPoints').addEventListener('click', async () => {
    const semester = document.getElementById('pointsSemester').value;
    setOut('Fetching points...');
    try {
      const headers = await getAuthHeaders();
      const q = semester ? `?semester=${encodeURIComponent(semester)}` : '';
      const resp = await fetch(buildUrl(`${API_BASE}/users/me/points${q}`), { headers, mode: 'cors' });
      const json = await resp.json();
      setOut(json);
    } catch (err) { setOut('Error: ' + err.message); }
  });
});
