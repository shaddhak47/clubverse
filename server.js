import express from "express";
import dotenv from 'dotenv/config'; // <-- This should load the variablesimport cors from "cors";
import cors from "cors";
import db from "./config/db.js"; // Corrected named import
import FacultyController from "./controllers/facultyController.js"; // Use correct casing for controllers folder
import ProctorController from "./controllers/ProctorController.js"; 
import facultyRoutes from "./routes/facultyRoutes.js";
import proctorRoutes from "./routes/proctorRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Controllers (passing the db instance)
const facultyController = new FacultyController(db);
const proctorController = new ProctorController(db);

// --- API Routes ---
app.get("/", (req, res) => {
  res.send("Activity Points Management API Running");
});

app.use("/api/faculty", (req, res, next) => facultyRoutes(facultyController)(req, res, next));
app.use("/api/proctor", (req, res, next) => proctorRoutes(proctorController)(req, res, next));

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: "Internal Server Error" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});