// routes/hodRoutes.js
import express from "express";
import multer from "multer";
import { readTestUser } from "../middlewares/authMiddleware.js";
import * as HODController from "../controllers/hodController.js";

const router = express.Router();

// ✅ Mock Authentication Middleware
router.use(readTestUser);

// ✅ Multer setup (Excel file upload)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed =
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel";
    if (allowed) cb(null, true);
    else cb(new Error("Only Excel files are allowed!"));
  },
});

// =====================================================
// ✅ ROUTES
// =====================================================

// 1️⃣ Upload Excel (Students + Proctors)
router.post(
  "/:dept_id/users/upload",
  upload.single("file"),
  (req, res, next) => {
    console.log(`📤 Upload route hit for department ${req.params.dept_id}`);
    next();
  },
  HODController.uploadDeptUserData
);

// 2️⃣ Fetch Department Users (Students + Proctors)
router.get(
  "/:dept_id/users",
  (req, res, next) => {
    console.log(`📥 Fetching users for department ${req.params.dept_id}`);
    next();
  },
  HODController.getDepartmentUsers
);

// 2.1️⃣ Fetch Verified Submissions (by Proctor) for HOD review
router.get(
  "/:dept_id/documents/verified",
  (req, res, next) => {
    console.log(`📄 Fetching verified submissions for dept ${req.params.dept_id}`);
    next();
  },
  HODController.getVerifiedSubmissions
);

// 2.2️⃣ HOD reviews a document (add remarks / approve/reject)
router.post(`/:dept_id/documents/:doc_id/review`, HODController.reviewDocumentByHod);

// 3️⃣ Approve Event
router.post(
  "/:dept_id/events/approve",
  (req, res, next) => {
    console.log(`📋 Approving event for department ${req.params.dept_id}`);
    next();
  },
  HODController.approveEvent
);

// 3.1️⃣ Generic approval endpoint (event/category)
router.post(`/:dept_id/approval`, (req, res, next) => {
  console.log(`🛠️ Generic HOD approval for dept ${req.params.dept_id}`);
  next();
}, HODController.hodApproval);

// 4️⃣ Approve Activity Points
router.post(
  "/:dept_id/points/approve",
  (req, res, next) => {
    console.log(`🏅 Approving activity points for department ${req.params.dept_id}`);
    next();
  },
  HODController.approveActivityPoints
);

// 5️⃣ Approve Documents
router.post("/:dept_id/documents/approve", HODController.approveDocument,

  (req, res, next) => {
    console.log(`📑 Approving documents for department ${req.params.dept_id}`);
    next();
  },
  HODController.approveDocument
);

// 6️⃣ Approve Category (HOD approves categories proposed by proctors)
router.post('/:dept_id/categories/:category_id/approve', (req, res, next) => {
  console.log(`🔖 Approving category ${req.params.category_id} for dept ${req.params.dept_id}`);
  next();
}, HODController.approveCategory);

// 7️⃣ View Department Events (with filters)
router.get('/:dept_id/events', (req, res, next) => {
  console.log(`📅 HOD view events for dept ${req.params.dept_id}`);
  next();
}, HODController.viewDeptEvents);

export default router;

