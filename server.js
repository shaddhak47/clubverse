import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import db from "./config/db.js";
import hodRoutes from "./routes/hodRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Check PostgreSQL connection (pg-promise compatible)
(async () => {
  try {
    const result = await db.one("SELECT NOW() AS now");
    console.log("✅ Database connected successfully at:", result.now);
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
})();

// ✅ Routes
app.use("/hod", hodRoutes);

// ✅ Root test
app.get("/", (req, res) => {
  res.send("Campus Activity Backend Running 🚀");
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error("🔥 Error caught by middleware:", err.stack);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


