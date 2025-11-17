import express from "express";
import AdminController from "../controllers/adminController.js";

const router = express.Router();

// ==============================
// USER CRUD ROUTES
// ==============================
router.post("/users", AdminController.createUser);
router.get("/users", AdminController.listUsers);
router.patch("/users/:id", AdminController.updateUser);
router.delete("/users/:id", AdminController.deleteUser);

// ==============================
// DEPARTMENT CRUD ROUTES
// ==============================
router.post("/departments", AdminController.createDepartment);
router.get("/departments", AdminController.listDepartments);
router.patch("/departments/:id", AdminController.updateDepartment);
router.delete("/departments/:id", AdminController.deleteDepartment);

// ==============================
// AUDIT LOGS
// ==============================
router.get("/audit", AdminController.viewAuditLogs);

export default router;



