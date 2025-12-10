# Frontend demo

This is a minimal static demo for Clubverse showing:

- Firebase email/password signup and login
- Show ID token
- Call `POST /api/auth/firebase/verify` with the ID token
- Call protected `GET /api/student/profile` with the ID token

How to run

1. Make sure your backend is running on `http://localhost:5000`.
2. Open `frontend/index.html` in a browser (you can open the file directly or serve it using a local static server).

Examples (serve with Python):

```bash
# from repo root
python3 -m http.server --directory frontend 8000
# then open http://localhost:8000 in your browser
```

Workflow

1. Enter an email & password and click "Sign up" (or use an existing account and "Sign in").
2. Click "Get ID Token" to display the current ID token.
3. Click "Call /api/auth/firebase/verify" to see the backend mapping result.
4. Click "Call /api/student/profile" to call a protected endpoint; ensure the user has a mapped student record in DB (or create via admin routes).
