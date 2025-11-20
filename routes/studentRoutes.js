// routes/studentRoutes.js

import express from "express";
import {
  getProfile,
  updateProfile,
  submitActivity,
  uploadActivityDocument,
  listActivities,
  getActivity,
  pointsSummary,
  listEvents,
  listNotifications,
  markNotificationRead
} from "../controllers/studentController.js";

import { readTestUser } from "../middlewares/authMiddleware.js";
import { uploadSingle } from "../middlewares/uploadStudent.js";

const router = express.Router();

// All routes must pass user header
router.use(readTestUser);

// PROFILE
router.get("/profile", getProfile);
router.patch("/profile", updateProfile);

// UPLOAD DOCUMENT
router.post(
  "/activities/:activity_id/doc",
  uploadSingle("file"),
  uploadActivityDocument
);

// ACTIVITIES
router.get("/activities", listActivities);
router.get("/activities/:activity_id", getActivity);

// POINTS
router.get("/points", pointsSummary);

// EVENTS
router.get("/events", listEvents);

// NOTIFICATIONS
router.get("/notifications", listNotifications);
router.patch("/notifications/:id/read", markNotificationRead);

export default router;
