document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file');
  const btn = document.getElementById('btnUpload');
  const result = document.getElementById('result');

  btn.addEventListener('click', async () => {
    const f = fileInput.files[0];
    if (!f) return alert('Select a file');
    const fd = new FormData();
    fd.append('file', f);

    // Ask user to provide an admin ID token (simpler UX: use prompt)
    const idToken = prompt('Paste your Firebase ID token (get it from the demo page)');
    if (!idToken) return alert('ID token required');

    result.textContent = 'Uploading...';
    try {
      const resp = await fetch('http://localhost:5000/api/admin/upload-hods', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + idToken },
        body: fd
      });
      const json = await resp.json();
      result.textContent = JSON.stringify(json, null, 2);
    } catch (err) {
      result.textContent = 'Error: ' + err.message;
    }
  });
});
