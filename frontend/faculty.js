// Faculty Dashboard Client Script

const API_BASE = 'http://localhost:5000';
const $ = id => document.getElementById(id);

// Helper: Get dev user ID for header-based auth
function getDevUserId() {
  return $('devUserId').value.trim() || '3';
}

// Helper: Fetch with dev auth headers
async function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': getDevUserId(),
    'X-User-Role': 'faculty',
    ...(options.headers || {})
  };
  const response = await fetch(url, { ...options, headers });
  return response;
}

// 1️⃣ CREATE EVENT
async function createEvent() {
  try {
    const body = {
      title: $('eventTitle').value.trim(),
      description: $('eventDescription').value.trim(),
      category: $('eventCategory').value.trim(),
      start_at: $('eventStartAt').value,
      end_at: $('eventEndAt').value,
      venue: $('eventVenue').value.trim(),
      is_external: $('eventIsExternal').value === 'true',
      payment: {
        amount: parseFloat($('eventPaymentAmount').value) || 0,
        options: $('eventPaymentOptions').value.trim()
      },
      created_by: parseInt(getDevUserId()),
      dept_id: parseInt($('eventDeptId').value) || 1
    };

    if (!body.title || !body.start_at || !body.end_at) {
      alert('Please fill in title, start date, and end date');
      return;
    }

    const resp = await apiFetch(`${API_BASE}/api/faculty/events`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    const json = await resp.json();
    $('outCreateEvent').textContent = JSON.stringify(json, null, 2);
  } catch (err) {
    $('outCreateEvent').textContent = 'Error: ' + err.message;
  }
}

// 2️⃣ ASSIGN ROLE
async function assignRole() {
  try {
    const eventId = $('assignEventId').value.trim();
    if (!eventId) {
      alert('Please enter Event ID');
      return;
    }

    const body = {
      user_id: parseInt($('assignUserId').value),
      role: $('assignRole').value.trim() || 'volunteer',
      assigned_by: parseInt($('assignedBy').value) || parseInt(getDevUserId()),
      start_at: $('assignStartAt').value || null,
      end_at: $('assignEndAt').value || null
    };

    const resp = await apiFetch(`${API_BASE}/api/faculty/events/${eventId}/assign-role`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    const json = await resp.json();
    $('outAssignRole').textContent = JSON.stringify(json, null, 2);
  } catch (err) {
    $('outAssignRole').textContent = 'Error: ' + err.message;
  }
}

// 3️⃣ GET PARTICIPANT LIST
async function getParticipants() {
  try {
    const eventId = $('participantsEventId').value.trim();
    if (!eventId) {
      alert('Please enter Event ID');
      return;
    }

    const resp = await apiFetch(`${API_BASE}/api/faculty/events/${eventId}/participants`);
    const json = await resp.json();
    $('outParticipants').textContent = JSON.stringify(json, null, 2);
  } catch (err) {
    $('outParticipants').textContent = 'Error: ' + err.message;
  }
}

// 4️⃣ GENERATE QR
async function generateQR() {
  try {
    const eventId = $('qrEventId').value.trim();
    if (!eventId) {
      alert('Please enter Event ID');
      return;
    }

    const body = {
      expires_in_seconds: parseInt($('qrExpiresIn').value) || 300
    };

    const resp = await apiFetch(`${API_BASE}/api/faculty/events/${eventId}/generate-qr`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    const json = await resp.json();
    $('outQR').textContent = JSON.stringify(json, null, 2);
  } catch (err) {
    $('outQR').textContent = 'Error: ' + err.message;
  }
}

// 5️⃣ GET ALL EVENTS (Browse)
async function browseEvents() {
  try {
    const params = new URLSearchParams();
    const deptId = $('browseEventsDeptId').value.trim();
    const category = $('browseEventsCategory').value.trim();
    const semester = $('browseEventsSemester').value.trim();

    if (deptId) params.append('dept_id', deptId);
    if (category) params.append('category', category);
    if (semester) params.append('semester', semester);

    const resp = await apiFetch(`${API_BASE}/api/faculty/events?${params.toString()}`);
    const json = await resp.json();
    $('outBrowseEvents').textContent = JSON.stringify(json, null, 2);
  } catch (err) {
    $('outBrowseEvents').textContent = 'Error: ' + err.message;
  }
}

// 6️⃣ GET CREATED EVENTS (My Events)
async function getCreatedEvents() {
  try {
    const facultyId = getDevUserId();
    const status = $('createdEventsStatus').value.trim();
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const resp = await apiFetch(`${API_BASE}/api/faculty/${facultyId}/events?${params.toString()}`);
    const json = await resp.json();
    
    // Display as event cards for better UX
    const container = $('outCreatedEvents');
    if (json.data && Array.isArray(json.data)) {
      if (json.data.length === 0) {
        container.innerHTML = '<p>No events found.</p>';
      } else {
        let html = '';
        json.data.forEach(evt => {
          const statusClass = evt.status === 'active' ? 'status-active' : 'status-cancelled';
          html += `
            <div class="event-card">
              <h4>${evt.title || 'Untitled'} (ID: ${evt.event_id})</h4>
              <p><strong>Category:</strong> ${evt.category || 'N/A'}</p>
              <p><strong>Venue:</strong> ${evt.venue || 'N/A'}</p>
              <p><strong>Start:</strong> ${evt.start_at ? new Date(evt.start_at).toLocaleString() : 'N/A'}</p>
              <p><strong>End:</strong> ${evt.end_at ? new Date(evt.end_at).toLocaleString() : 'N/A'}</p>
              <p><strong>Status:</strong> <span class="${statusClass}">${evt.status}</span></p>
              <p><strong>Participants:</strong> ${evt.participants_count || 0}</p>
            </div>
          `;
        });
        container.innerHTML = html;
      }
    } else {
      container.innerHTML = '<pre>' + JSON.stringify(json, null, 2) + '</pre>';
    }
  } catch (err) {
    $('outCreatedEvents').innerHTML = '<p style="color:red;">Error: ' + err.message + '</p>';
  }
}

// Attach event listeners
document.addEventListener('DOMContentLoaded', () => {
  $('btnCreateEvent').addEventListener('click', createEvent);
  $('btnAssignRole').addEventListener('click', assignRole);
  $('btnGetParticipants').addEventListener('click', getParticipants);
  $('btnGenerateQR').addEventListener('click', generateQR);
  $('btnBrowseEvents').addEventListener('click', browseEvents);
  $('btnGetCreatedEvents').addEventListener('click', getCreatedEvents);
});
