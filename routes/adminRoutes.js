import express from "express";
import {
  readTestUser,
  verifyToken,
  requireSuperAdmin,
} from "../middlewares/superadminAuth.js";

import AdminController from "../controllers/adminController.js";

const router = express.Router();

// ------------------------------------
// PUBLIC ROUTE — LOGIN
// ------------------------------------
router.post("/login", AdminController.login);

// ------------------------------------
// TEST MODE
// ------------------------------------
router.use(readTestUser);

// ------------------------------------
// JWT + SUPERADMIN PROTECTION
// ------------------------------------
router.use(verifyToken);
router.use(requireSuperAdmin);

// ------------------------------------
// USER CRUD
// ------------------------------------
router.post("/users", AdminController.createUser);
router.get("/users", AdminController.listUsers);
router.patch("/users/:id", AdminController.updateUser);
router.delete("/users/:id", AdminController.deleteUser);

// ------------------------------------
// DEPARTMENT CRUD
// ------------------------------------
router.post("/departments", AdminController.createDepartment);
router.get("/departments", AdminController.listDepartments);
router.patch("/departments/:id", AdminController.updateDepartment);
router.delete("/departments/:id", AdminController.deleteDepartment);

// ------------------------------------
// AUDIT LOGS
// ------------------------------------
router.get("/audit", AdminController.viewAuditLogs);

export default router;



