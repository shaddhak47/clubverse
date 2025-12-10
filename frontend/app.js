// Minimal frontend demo for Clubverse
// Edit the firebaseConfig below if you need to change project details.
const firebaseConfig = {
  apiKey: "AIzaSyDTNrVrY4sNn6LpUV9-kJfd6t8Ms03v9MU",
  authDomain: "eventmanagement-tracker.firebaseapp.com",
  projectId: "eventmanagement-tracker",
  storageBucket: "eventmanagement-tracker.firebasestorage.app",
  messagingSenderId: "604001930407",
  appId: "1:604001930407:web:5dc6871b9397ebe68f9f82",
  measurementId: "G-7P86NT2DSN"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const $ = id => document.getElementById(id);

function logToPage(msg) {
  try {
    const id = 'clientDebug';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('pre');
      el.id = id;
      el.style.background = '#f0f7ff';
      el.style.padding = '8px';
      el.style.border = '1px solid #d0e6ff';
      el.style.marginTop = '8px';
      el.style.maxHeight = '200px';
      el.style.overflow = 'auto';
      const container = document.querySelector('.box') || document.body;
      container.parentNode.insertBefore(el, container.nextSibling);
    }
    const ts = new Date().toISOString();
    el.textContent += `[${ts}] ${msg}\n`;
  } catch (e) { console.warn('logToPage failed', e); }
}

async function signup() {
  const email = $('email').value.trim();
  const password = $('password').value;
  try {
    const u = await auth.createUserWithEmailAndPassword(email, password);
    alert('Signed up: ' + (u.user.email || ''));
  } catch (err) {
    alert('Signup error: ' + err.message);
  }
}

async function login() {
  const email = $('email').value.trim();
  const password = $('password').value;
  try {
    const u = await auth.signInWithEmailAndPassword(email, password);
    alert('Signed in: ' + (u.user.email || ''));
  } catch (err) {
    alert('Login error: ' + err.message);
  }
}

function signout() {
  auth.signOut();
  $('idToken').textContent = '(empty)';
  $('backendResp').textContent = '(no response yet)';
}

async function showIdToken() {
  const user = auth.currentUser;
  if (!user) return alert('Not signed in');
  const idToken = await user.getIdToken();
  $('idToken').textContent = idToken;
}

async function callVerify() {
  const user = auth.currentUser;
  if (!user) return alert('Not signed in');
  const idToken = await user.getIdToken();
  console.log('callVerify: about to POST /api/auth/firebase/verify with idToken length', (idToken||'').length);
  logToPage('callVerify: starting POST /api/auth/firebase/verify — idToken length ' + (idToken||'').length);
  let resp, json;
  try {
    resp = await fetch('http://localhost:5000/api/auth/firebase/verify', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + idToken,
        'Content-Type': 'application/json'
      }
    });
  } catch (networkErr) {
    console.error('callVerify: network/fetch error', networkErr);
    $('backendResp').textContent = 'Network error calling /api/auth/firebase/verify: ' + (networkErr && networkErr.message ? networkErr.message : networkErr);
    return;
  }

  console.log('callVerify: verify response status', resp.status, resp.statusText);
  logToPage('callVerify: verify response status ' + resp.status + ' ' + resp.statusText);
  try {
    json = await resp.json();
  } catch (parseErr) {
    const txt = await resp.text().catch(() => '(failed to read body)');
    console.error('callVerify: failed to parse JSON, response text:', txt, parseErr);
    $('backendResp').textContent = 'Invalid JSON response from verify: ' + txt;
    return;
  }
  $('backendResp').textContent = JSON.stringify(json, null, 2);
  logToPage('callVerify: parsed JSON response — user role: ' + (json && json.user && json.user.role));
  
  console.log('RAW JSON:', json);
  console.log('json.user:', json.user);
  console.log('json.dashboard:', json.dashboard);
  
  // For debugging: show mapped role instead of redirecting automatically.
  if (json && json.user) {
    const role = json.user.role;
    console.log('ROLE DETECTED:', role);
    logToPage('ROLE DETECTED: ' + role);
    
    const info = `Mapped role: ${role || '(none)'}\nemail: ${json.user.email || '(none)'}\nuser_id: ${json.user.user_id || '(none)'}\nfirebase_uid: ${json.user.firebase_uid || '(none)'}\n`;
    // Append role info to backendResp so it's obvious
    $('backendResp').textContent = JSON.stringify(json, null, 2) + "\n\n" + info;
    // Redirect to role-specific dashboard (if applicable)
    try {
      const normalized = (role || '').toString().toLowerCase().trim();
      console.log('NORMALIZED ROLE:', normalized);
      logToPage('NORMALIZED ROLE: ' + normalized);
      
      let target = null;
      if (normalized === 'student') target = 'student.html';
      else if (normalized === 'proctor') target = 'proctor.html';
      else if (normalized === 'hod') target = 'hod.html';
      else if (normalized === 'faculty') target = 'faculty.html';
      else if (normalized === 'admin' || normalized === 'superadmin') target = 'admin.html';

      // If backend provided a recommended dashboard path, prefer it
      if (json.dashboard) {
        console.log('BACKEND PROVIDED DASHBOARD:', json.dashboard);
        logToPage('BACKEND PROVIDED DASHBOARD: ' + json.dashboard);
        target = json.dashboard.replace(/^[^/]/, s => s);
      }
      
      console.log('TARGET DETERMINED:', target);
      logToPage('TARGET DETERMINED: ' + target);

      if (target) {
        // store mapped user for landing page to read (optional)
        try { 
          localStorage.setItem('clubverse_user', JSON.stringify(json.user)); 
          console.log('SAVED TO LOCALSTORAGE');
          logToPage('SAVED TO LOCALSTORAGE');
        } catch(e) { 
          console.warn('localStorage write failed', e.message); 
          logToPage('localStorage write failed: ' + e.message);
        }

        const absoluteTarget = `${window.location.origin}/${target.replace(/^\//, '')}`;
        console.log('ABSOLUTE TARGET:', absoluteTarget);
        logToPage('ABSOLUTE TARGET: ' + absoluteTarget);
        
        console.log('NAVIGATING NOW to', absoluteTarget, 'for role', normalized);
        logToPage('NAVIGATING NOW to ' + absoluteTarget + ' for role ' + normalized);
        
        alert('About to navigate to: ' + absoluteTarget + '\nIf navigation does not happen, check browser console for errors.');
        
        // Immediate, direct navigation - no delays, no conditionals
        try {
          window.location.href = absoluteTarget;
          console.log('window.location.href assigned successfully');
          logToPage('window.location.href assigned successfully');
        } catch (navErr) {
          console.error('NAVIGATION ERROR:', navErr);
          logToPage('NAVIGATION ERROR: ' + navErr.message);
          alert('Navigation failed: ' + navErr.message);
        }
      } else {
        console.warn('NO TARGET DETERMINED - role was:', normalized);
        logToPage('NO TARGET DETERMINED - role was: ' + normalized);
        alert('No dashboard target determined for role: ' + normalized);
      }
    } catch (e) {
      console.warn('Redirect failed:', e && e.message ? e.message : e);
    }
  }
}

async function callProfile() {
  const user = auth.currentUser;
  if (!user) return alert('Not signed in');
  const idToken = await user.getIdToken();
  const resp = await fetch('http://localhost:5000/api/student/profile', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + idToken }
  });
  const txt = await resp.text();
  $('backendResp').textContent = txt;
}

async function callVerifyDebug() {
  const user = auth.currentUser;
  if (!user) return alert('Not signed in');
  const idToken = await user.getIdToken();
  console.log('callVerifyDebug: about to POST /api/auth/firebase/verify-debug');
  logToPage('callVerifyDebug: starting POST /api/auth/firebase/verify-debug');
  let resp, json;
  try {
    resp = await fetch('http://localhost:5000/api/auth/firebase/verify-debug', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + idToken,
        'Content-Type': 'application/json'
      }
    });
  } catch (networkErr) {
    console.error('callVerifyDebug: network error', networkErr);
    logToPage('callVerifyDebug: network error - ' + (networkErr && networkErr.message ? networkErr.message : networkErr));
    $('backendResp').textContent = 'Network error: ' + (networkErr && networkErr.message ? networkErr.message : networkErr);
    return;
  }
  console.log('callVerifyDebug: response status', resp.status, resp.statusText);
  logToPage('callVerifyDebug: response status ' + resp.status + ' ' + resp.statusText);
  try {
    json = await resp.json();
  } catch (parseErr) {
    const txt = await resp.text().catch(() => '(failed to read body)');
    console.error('callVerifyDebug: JSON parse error', parseErr, txt);
    logToPage('callVerifyDebug: JSON parse error - ' + txt);
    $('backendResp').textContent = 'Invalid JSON: ' + txt;
    return;
  }
  console.log('callVerifyDebug: full response JSON:', json);
  logToPage('callVerifyDebug: diagnostics returned - see console and backendResp for details');
  $('backendResp').textContent = JSON.stringify(json, null, 2);
  if (json && json.diagnostics) {
    logToPage('Diagnostics summary: user=' + (json.user ? json.user.email : 'none') + ', role=' + (json.user ? json.user.role : 'none') + ', dashboard=' + (json.dashboard || 'none'));
  }
  alert('Debug response logged to console and page. Check backendResp area and console for details.');
}

document.addEventListener('DOMContentLoaded', () => {
  $('btnSignup').addEventListener('click', signup);
  $('btnLogin').addEventListener('click', login);
  $('btnSignOut').addEventListener('click', signout);
  $('btnShowIdToken').addEventListener('click', showIdToken);
  $('btnVerify').addEventListener('click', callVerify);
  $('btnVerifyDebug').addEventListener('click', callVerifyDebug);
  $('btnProfile').addEventListener('click', callProfile);
  
  auth.onAuthStateChanged(u => {
    if (u) {
      console.log('User signed in', u.uid, u.email);
    } else {
      console.log('Signed out');
    }
  });
});
