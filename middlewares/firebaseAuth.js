import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import db from '../config/db.js';

// Initialize firebase-admin once
let firebaseApp;
function initFirebase() {
  if (firebaseApp) return firebaseApp;
  const servicePath = process.env.FIREBASE_SERVICE_ACCOUNT || path.join(process.cwd(), 'config', 'firebaseServiceAccount.json');
  if (!fs.existsSync(servicePath)) {
    throw new Error('Firebase service account file not found at: ' + servicePath);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(servicePath, 'utf8'));
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  return firebaseApp;
}

initFirebase();

// Middleware: verify Firebase ID token and attach req.user
export async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header with Bearer token' });
  }

  const idToken = authHeader.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    // decoded contains uid, email, name, and custom claims
    // Map to internal user: find users.firebase_uid == uid or create one
    let internal = await db.oneOrNone('SELECT user_id, role, email, name FROM users WHERE firebase_uid = $1', [decoded.uid]);

    if (!internal) {
      // Try to find by email
      if (decoded.email) {
        internal = await db.oneOrNone('SELECT user_id, role, email, name FROM users WHERE email = $1', [decoded.email]);
      }
    }

    if (!internal) {
      // Do NOT auto-create users from arbitrary Firebase tokens.
      // Reject sign-in for emails that are not already present in the `users` table.
      console.warn(`Signin attempt for unknown email/uid: uid=${decoded.uid} email=${decoded.email}`);
      return res.status(403).json({ error: 'Email not registered. Contact administrator to register your account.' });
    } else {
      // Ensure firebase_uid is set on existing user
      await db.none('UPDATE users SET firebase_uid = $1 WHERE user_id = $2', [decoded.uid, internal.user_id]);
    }

    // Attach a minimal req.user with both firebase and internal mapping
    req.user = {
      firebase_uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      role: internal.role || 'student',
      user_id: internal.user_id,
    };

    next();
  } catch (err) {
    console.error('Firebase token verification failed:', err);
    return res.status(401).json({ error: 'Invalid or expired Firebase ID token' });
  }
}

export default { verifyFirebaseToken };
