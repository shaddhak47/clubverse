import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";               // ⭐ Request logger
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
app.use(morgan("dev"));                   // ⭐ Logs each API request

// ---------------------------------------------------------
// TEST DATABASE CONNECTION (startup check)
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

// HOD module
app.use("/api/hod", hodRoutes);

// SUPERADMIN module
app.use("/api/admin", adminRoutes);

// ---------------------------------------------------------
// DEFAULT ROOT ROUTE
// ---------------------------------------------------------
app.get("/", (req, res) => {
  res.send("Campus Activity Backend Running 🚀");
});

// ---------------------------------------------------------
// NOT FOUND HANDLER
// ---------------------------------------------------------
app.use((req, res, next) => {
  res.status(404).json({
    error: "Route Not Found",
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

