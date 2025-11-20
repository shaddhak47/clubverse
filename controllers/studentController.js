// controllers/studentController.js

import db from "../config/db.js";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------
// 1. VIEW PROFILE
// ---------------------------------------------------------
export async function getProfile(req, res) {
  try {
    const usn = req.user?.student_usn;
    if (!usn) return res.status(400).json({ error: "Missing student_usn" });

    const student = await db.oneOrNone(
      `SELECT id, dept_id, proctor_name, proctor_email,
              student_name, student_usn, student_email, semester, status
       FROM students
       WHERE student_usn = $1`,
      [usn]
    );

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    return res.json({ status: "success", data: student });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ---------------------------------------------------------
// 2. UPDATE PROFILE
// ---------------------------------------------------------
export async function updateProfile(req, res) {
  try {
    const usn = req.user?.student_usn;
    if (!usn) return res.status(400).json({ error: "Missing student_usn" });

    const { semester, dept_id, student_email, proctor_name, proctor_email } =
      req.body;

    await db.none(
      `UPDATE students SET
          semester = COALESCE($1, semester),
          dept_id = COALESCE($2, dept_id),
          student_email = COALESCE($3, student_email),
          proctor_name = COALESCE($4, proctor_name),
          proctor_email = COALESCE($5, proctor_email)
       WHERE student_usn = $6`,
      [semester, dept_id, student_email, proctor_name, proctor_email, usn]
    );

    return res.json({ status: "success", message: "Profile updated" });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ---------------------------------------------------------
// 3. SUBMIT ACTIVITY
// ---------------------------------------------------------
export async function submitActivity(req, res) {
  try {
    const usn = req.user?.student_usn;
    if (!usn) return res.status(400).json({ error: "Missing student_usn" });

    const { event_id, points, category, semester, dept_id } = req.body;

    const activity = await db.one(
      `INSERT INTO activity_points 
        (student_usn, event_id, points, category, semester, dept_id, hod_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING points_id`,
      [usn, event_id, points || 0, category, semester, dept_id]
    );

    const activityId = activity.points_id;

    return res.json({
      status: "success",
      message: "Activity submitted",
      data: { activity_id: activityId }
    });
  } catch (err) {
    console.error("submitActivity error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ---------------------------------------------------------
// 4. DOCUMENT UPLOAD (Correct + Clean)
// ---------------------------------------------------------
export const uploadActivityDocument = async (req, res) => {
  try {
    const activityId = req.params.activity_id;
    const studentUsn = req.user?.student_usn;

    if (!studentUsn) {
      return res
        .status(400)
        .json({ error: "User not identified (no student_usn)" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { originalname, path: filepath, mimetype } = req.file;

    await db.none(
      `INSERT INTO activity_documents
        (activity_id, student_usn, file_name, file_path, mime_type, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [activityId, studentUsn, originalname, filepath, mimetype]
    );

    return res.json({
      status: "success",
      message: "Document uploaded successfully"
    });
  } catch (err) {
    console.error("uploadActivityDocument error:", err);
    return res.status(500).json({ error: "Server Error", details: err.message });
  }
};

// ---------------------------------------------------------
// 5. LIST ACTIVITIES
// ---------------------------------------------------------
export async function listActivities(req, res) {
  try {
    const usn = req.user?.student_usn;

    const rows = await db.any(
      `SELECT p.*,
          COALESCE(
            json_agg(d.*) FILTER (WHERE d.document_id IS NOT NULL),
            '[]'
          ) AS documents
       FROM activity_points p
       LEFT JOIN activity_documents d 
            ON d.activity_id = p.points_id
       WHERE p.student_usn = $1
       GROUP BY p.points_id
       ORDER BY p.points_id DESC`,
      [usn]
    );

    return res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("listActivities error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ---------------------------------------------------------
// 6. GET SINGLE ACTIVITY
// ---------------------------------------------------------
export async function getActivity(req, res) {
  try {
    const activityId = req.params.activity_id;

    const row = await db.oneOrNone(
      `SELECT p.*,
          COALESCE(
            json_agg(d.*) FILTER (WHERE d.document_id IS NOT NULL),
            '[]'
          ) AS documents
       FROM activity_points p
       LEFT JOIN activity_documents d 
            ON d.activity_id = p.points_id
       WHERE p.points_id = $1
       GROUP BY p.points_id`,
      [activityId]
    );

    if (!row)
      return res.status(404).json({ error: "Activity not found" });

    return res.json({ status: "success", data: row });
  } catch (err) {
    console.error("getActivity error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ---------------------------------------------------------
// 7. POINTS SUMMARY
// ---------------------------------------------------------
export const pointsSummary = async (req, res) => {
  try {
    const usn = req.user?.student_usn;

    const summary = await db.one(
      `SELECT 
          SUM(CASE WHEN hod_status='approved' THEN points ELSE 0 END) AS approved_points,
          SUM(CASE WHEN hod_status='pending' THEN points ELSE 0 END) AS pending_points,
          SUM(points) AS total_points
       FROM activity_points
       WHERE student_usn = $1`,
      [usn]
    );

    res.json(summary);
  } catch (err) {
    console.error("pointsSummary error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

// ---------------------------------------------------------
// 8. LIST EVENTS
// ---------------------------------------------------------
export const listEvents = async (req, res) => {
  try {
    const events = await db.any(
      `SELECT event_id, title, description, dept_id, start_at, end_at 
       FROM events
       ORDER BY start_at DESC`
    );

    res.json(events);
  } catch (err) {
    console.error("listEvents error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

// ---------------------------------------------------------
// 9. NOTIFICATIONS
// ---------------------------------------------------------
export const listNotifications = async (req, res) => {
  try {
    const userId = req.user?.user_id || null;

    const rows = await db.any(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("listNotifications error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

// ---------------------------------------------------------
// 10. MARK NOTIFICATION READ
// ---------------------------------------------------------
export const markNotificationRead = async (req, res) => {
  try {
    const notifId = req.params.id;
    const userId = req.user.user_id;

    const result = await db.result(
      `UPDATE notifications 
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2`,
      [notifId, userId]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Notification not found" });

    res.json({ message: "Marked as read" });
  } catch (err) {
    console.error("markNotificationRead error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};
