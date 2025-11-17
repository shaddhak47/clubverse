// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";                 // API request logger
import db from "./config/db.js";

// ROUTES
import hodRoutes from "./routes/hodRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------
// GLOBAL MIDDLEWARE
// ---------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));                      // Logs each API request

// ---------------------------------------------------------
// TEST DATABASE CONNECTION ON STARTUP
// ---------------------------------------------------------
(async () => {
  try {
    const result = await db.one("SELECT NOW() AS now");
    console.log("✅ Database connected at:", result.now);
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1); // Stop server if DB is dead
  }
})();

// ---------------------------------------------------------
// ROUTES
// ---------------------------------------------------------

// HOD module (x-user-id required inside route files)
app.use("/api/hod", hodRoutes);

// SUPERADMIN module (x-user-id required)
app.use("/api/admin", adminRoutes);

// ---------------------------------------------------------
// ROOT CHECK ROUTE
// ---------------------------------------------------------
app.get("/", (req, res) => {
  res.send("Campus Activity Backend Running 🚀");
});

// ---------------------------------------------------------
// 404 HANDLER
// ---------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route Not Found",
    path: req.originalUrl,
  });
});

// ---------------------------------------------------------
// GLOBAL ERROR HANDLER
// ---------------------------------------------------------
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);

  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});

// ---------------------------------------------------------
// START SERVER
// ---------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

