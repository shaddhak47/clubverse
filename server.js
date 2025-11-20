// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import db from "./config/db.js";

// ROUTES
import adminRoutes from "./routes/adminRoutes.js";
import hodRoutes from "./routes/hodRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// GLOBAL MIDDLEWARE
app.use(cors());
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
    process.exit(1);
  }
})();

// ROUTES
app.use("/api/admin", adminRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/student", studentRoutes);

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
  console.error("🔥 Server Error:", err);

  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
