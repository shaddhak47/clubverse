import express from "express";
import dotenv from 'dotenv';
import cors from "cors";
import morgan from "morgan";
import db from "./config/db.js"; 

// Load environment variables immediately
dotenv.config(); 

// --- ROUTES ---
import adminRoutes from "./routes/adminRoutes.js";
import hodRoutes from "./routes/hodRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import facultyRoutes from "./routes/facultyRoutes.js";
import proctorRoutes from "./routes/proctorRoutes.js";
import legacyRouter from './archived_python_backend_js/router.js';
import authRoutes from './routes/authRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import firebaseAuth from './middlewares/firebaseAuth.js';

// Controllers (instantiate for route factories that expect a controller)
import FacultyController from "./controllers/facultyController.js";
import ProctorController from "./controllers/proctorController.js";

const app = express();
const PORT = process.env.PORT || 5000;

// GLOBAL MIDDLEWARE
// Allow common custom headers used by frontend (Authorization, X-User-Id, X-User-Role)
const corsOptions = {
	origin: true,
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	// use canonical header names; be permissive for development
	allowedHeaders: [
		"Authorization",
		"Content-Type",
		"X-Requested-With",
		"Accept",
		"X-User-Id",
		"X-User-Role"
	],
	credentials: true,
	optionsSuccessStatus: 204
};

// Explicitly handle preflight for all routes using the same options (helps some browsers)
// Use '/*' to match all routes for options (avoids path-to-regexp '*' parsing issue)
app.use(cors(corsOptions));

// Fallback preflight handler for environments where app.options patterns may behave oddly.
// This manually responds to OPTIONS with the CORS headers we expect for development testing.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With, Accept, X-User-Id, X-User-Role');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
// Debug endpoint to echo headers (dev-only) - helps verify what the server actually receives from the browser
app.get('/api/debug/echo-headers', (req, res) => {
	// Return a minimal set to avoid leaking sensitive env info
	const safe = {};
	Object.keys(req.headers).forEach(k => {
		// include only a few headers useful for debugging
		if (['x-user-id', 'x-user-role', 'authorization', 'host', 'origin', 'referer', 'user-agent'].includes(k)) {
			safe[k] = req.headers[k];
		}
	});
	return res.json({ status: 'success', headers: safe });
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// DB CHECK
(async () => {
  try {
    const result = await db.one("SELECT NOW() AS now");
    console.log("✅ Database connected at:", result.now);
	} catch (err) {
		console.error("❌ Database connection failed:", err.message);
		console.warn("Continuing without DB connection (check DB credentials). Some endpoints will fail until DB is available.");
	}
})();

// --- ROUTE REGISTRATION ---
app.use("/api/admin", adminRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/auth", authRoutes);

// Quick Firebase verification endpoint for frontend demo/testing
app.post('/api/auth/firebase/verify', firebaseAuth.verifyFirebaseToken, (req, res) => {
	// returns the mapped internal user object
	try {
		console.log('[/api/auth/firebase/verify] headers:', {
			origin: req.headers.origin,
			referer: req.headers.referer,
			authorization: req.headers.authorization ? '[REDACTED]' : undefined,
		});
		console.log('[/api/auth/firebase/verify] mapped user:', req.user);
		// Suggest a dashboard URL for the frontend to navigate to (helps debugging)
		let dashboard = null;
		if (req.user && req.user.role) {
			const r = (req.user.role || '').toString().toLowerCase();
			if (r === 'student') dashboard = '/student.html';
			else if (r === 'proctor') dashboard = '/proctor.html';
			else if (r === 'hod') dashboard = '/hod.html';
			else if (r === 'faculty') dashboard = '/faculty.html';
			else if (r === 'admin' || r === 'superadmin') dashboard = '/admin.html';
		}
		return res.json({ status: 'success', user: req.user, dashboard });
	} catch (err) {
		console.error('Error in /api/auth/firebase/verify handler:', err);
		return res.status(500).json({ status: 'error', message: 'Server error' });
	}
});

// Debug endpoint: verbose verify diagnostics
app.post('/api/auth/firebase/verify-debug', firebaseAuth.verifyFirebaseToken, (req, res) => {
	try {
		const diagnostics = {
			timestamp: new Date().toISOString(),
			method: req.method,
			url: req.originalUrl,
			headers: {
				origin: req.headers.origin,
				referer: req.headers.referer,
				'content-type': req.headers['content-type'],
				authorization: req.headers.authorization ? 'Bearer [REDACTED ' + req.headers.authorization.substring(0, 20) + '...]' : undefined,
				'x-user-id': req.headers['x-user-id'],
				'x-user-role': req.headers['x-user-role'],
			},
			mappedUser: req.user,
			dashboardSuggestion: null,
			navigationInstructions: 'Client should navigate to the dashboard URL using window.location or form submit',
		};
		if (req.user && req.user.role) {
			const r = (req.user.role || '').toString().toLowerCase();
			if (r === 'student') diagnostics.dashboardSuggestion = '/student.html';
			else if (r === 'proctor') diagnostics.dashboardSuggestion = '/proctor.html';
			else if (r === 'hod') diagnostics.dashboardSuggestion = '/hod.html';
			else if (r === 'faculty') diagnostics.dashboardSuggestion = '/faculty.html';
			else if (r === 'admin' || r === 'superadmin') diagnostics.dashboardSuggestion = '/admin.html';
		}
		console.log('[/api/auth/firebase/verify-debug] diagnostics:', diagnostics);
		return res.json({ status: 'success', diagnostics, user: req.user, dashboard: diagnostics.dashboardSuggestion });
	} catch (err) {
		console.error('Error in verify-debug handler:', err);
		return res.status(500).json({ status: 'error', message: err.message });
	}
});

// Instantiate controllers and pass into route factories
const facultyController = new FacultyController(db);
const proctorController = new ProctorController(db);

app.use("/api/faculty", facultyRoutes(facultyController));
app.use("/api/proctor", proctorRoutes(proctorController));
app.use('/api/qr', qrRoutes);

// Legacy endpoints (converted from archived Python FastAPI)
app.use('/legacy', legacyRouter);

// Temporary debug endpoint to list registered routes (remove when done)
app.get('/__routes', (req, res) => {
	try {
		const routes = [];
		function extract(stack, parentPath = '') {
			stack.forEach((layer) => {
				if (layer.route && layer.route.path) {
					const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
					routes.push({ path: parentPath + layer.route.path, methods });
				} else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
					// mount path may be in layer.regexp
					const mountPath = layer.regexp && layer.regexp.source ? parentPath : parentPath;
					extract(layer.handle.stack, parentPath);
				}
			});
		}
		extract(app._router.stack);
		res.json({ status: 'success', routes });
	} catch (err) {
		res.status(500).json({ status: 'error', message: err.message });
	}
});

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route Not Found",
    path: req.originalUrl,
  });
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: "Internal Server Error" });
});

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});