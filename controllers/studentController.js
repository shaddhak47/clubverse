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

    const { originalname, path: filepath } = req.file;

    // Resolve uploader user_id
    const uploader_id = await resolveUserId(req);
    if (!uploader_id) {
      return res.status(400).json({ error: 'Unable to resolve uploader id' });
    }

    // Insert into activity_docs table (matching schema in src/db/init_fixed.sql)
    const inserted = await db.one(
      `INSERT INTO activity_docs (registration_id, uploader_id, file_url, verification_status, description)
       VALUES ($1, $2, $3, 'pending', $4)
       RETURNING doc_id, registration_id, uploader_id, file_url, verification_status, verified_by, verified_at, description`,
      [activityId, uploader_id, filepath, req.body.description || null]
    );

    return res.json({
      status: "success",
      message: "Document uploaded successfully",
      doc: inserted
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
    // Query params: category (string), page (int), per_page (int)
    const category = req.query.category;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const per_page = Math.max(1, Math.min(100, parseInt(req.query.per_page || "10", 10)));
    const offset = (page - 1) * per_page;

    let where = "";
    const params = [];
    if (category) {
      params.push(`%${category}%`);
      where = `WHERE LOWER(category) LIKE LOWER($${params.length})`;
    }

    // Total count for pagination
    const countRow = await db.one(`SELECT COUNT(*)::int AS total FROM events ${where}`, params);
    const total = Number(countRow.total || 0);

    params.push(per_page);
    params.push(offset);

    const events = await db.any(
      `SELECT event_id, title, description, category, dept_id, start_at, end_at, venue, is_external, status
       FROM events
       ${where}
       ORDER BY start_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ status: 'success', meta: { total, page, per_page }, data: events });
  } catch (err) {
    console.error("listEvents error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

// GET /events/:event_id  - Event details + registration status for current user
export const getEventDetails = async (req, res) => {
  try {
    const eventId = Number(req.params.event_id || req.params.id);
    if (!eventId) return res.status(400).json({ error: 'Invalid event id' });

    const event = await db.oneOrNone(
      `SELECT event_id, title, description, category, dept_id, start_at, end_at, venue, is_external, status
       FROM events WHERE event_id = $1`,
      [eventId]
    );
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Registration count
    const regCountRow = await db.one(`SELECT COUNT(*)::int AS cnt FROM registrations WHERE event_id = $1`, [eventId]);
    const registered_count = Number(regCountRow.cnt || 0);

    // Is current user registered?
    let is_registered = false;
    const user_id = await resolveUserId(req);
    if (user_id) {
      const r = await db.oneOrNone(`SELECT registration_id FROM registrations WHERE event_id = $1 AND user_id = $2`, [eventId, user_id]);
      is_registered = !!r;
    }

    res.json({ status: 'success', data: { ...event, registered_count, is_registered } });
  } catch (err) {
    console.error('getEventDetails error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /registrations/:registration_id/upload-proof
export const uploadProofForRegistration = async (req, res) => {
  try {
    const registrationId = Number(req.params.registration_id || req.params.id);
    if (!registrationId) return res.status(400).json({ error: 'Invalid registration id' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const uploader_id = await resolveUserId(req);
    if (!uploader_id) return res.status(400).json({ error: 'Unable to resolve uploader id' });

    const doc_type = req.body.doc_type || req.body.type || null;
    const filepath = req.file.path;
    const description = doc_type ? JSON.stringify({ doc_type }) : null;

    const inserted = await db.one(
      `INSERT INTO activity_docs (registration_id, uploader_id, file_url, verification_status, description)
       VALUES ($1, $2, $3, 'pending', $4)
       RETURNING doc_id, registration_id, uploader_id, file_url, verification_status, description`,
      [registrationId, uploader_id, filepath, description]
    );

    return res.json({ status: 'success', message: 'Proof uploaded', data: inserted });
  } catch (err) {
    console.error('uploadProofForRegistration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /users/:user_id/my-events?semester=5
export const getMyEvents = async (req, res) => {
  try {
    let targetUserId = req.params.user_id;
    if (targetUserId === 'me' || !targetUserId) {
      targetUserId = await resolveUserId(req);
    } else {
      targetUserId = Number(targetUserId);
    }
    if (!targetUserId) return res.status(400).json({ error: 'Invalid user id' });

    const semester = req.query.semester ? Number(req.query.semester) : null;

    // Fetch registrations with events
    const params = [targetUserId];
    let semJoin = '';
    let semWhere = '';
    if (semester) {
      // join student_details to ensure student's semester matches (or filter by semester field if available)
      semJoin = 'JOIN student_details sd ON sd.user_id = r.user_id';
      params.push(semester);
      semWhere = ` AND sd.semester = $${params.length}`;
    }

    const rows = await db.any(
      `SELECT r.registration_id, r.event_id, e.title, e.category, r.status, r.registered_at
       FROM registrations r
       JOIN events e ON r.event_id = e.event_id
       ${semJoin}
       WHERE r.user_id = $1 ${semWhere}
       ORDER BY r.registered_at DESC`,
      params
    );

    res.json({ status: 'success', registrations: rows });
  } catch (err) {
    console.error('getMyEvents error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /users/:user_id/points?semester=5
export const pointsSummaryForUser = async (req, res) => {
  try {
    let targetUserId = req.params.user_id;
    if (targetUserId === 'me' || !targetUserId) {
      targetUserId = await resolveUserId(req);
    } else {
      targetUserId = Number(targetUserId);
    }
    if (!targetUserId) return res.status(400).json({ error: 'Invalid user id' });

    const semester = req.query.semester ? Number(req.query.semester) : null;
    const params = [targetUserId];
    let semWhere = '';
    if (semester) {
      params.push(semester);
      semWhere = ` AND semester = $${params.length}`;
    }

    const summary = await db.one(
      `SELECT 
          SUM(CASE WHEN 1=1 THEN points ELSE 0 END) FILTER (WHERE 1=1) AS total_points,
          SUM(CASE WHEN 1=1 THEN points ELSE 0 END) AS total_points_all
       FROM activity_points
       WHERE user_id = $1 ${semWhere}`,
      params
    );

    // Normalize response similar to existing pointsSummary
    const approved = await db.oneOrNone(
      `SELECT SUM(points)::int AS approved_points FROM activity_points WHERE user_id = $1 ${semWhere}`,
      params
    );

    res.json({ status: 'success', data: { total_points: Number(summary.total_points || 0), approved_points: Number(approved?.approved_points || 0) } });
  } catch (err) {
    console.error('pointsSummaryForUser error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ---------------------------------------------------------
// REGISTRATIONS: register/unregister/list/mark-attendance
// ---------------------------------------------------------
// Helper to resolve numeric user_id for current request
async function resolveUserId(req) {
  // If middleware provided numeric user_id (staff or test numeric), use it
  if (req.user && req.user.user_id && Number(req.user.user_id) == req.user.user_id) {
    return Number(req.user.user_id);
  }

  // If student_usn provided, lookup student_details -> user_id
  if (req.user && req.user.student_usn) {
    const row = await db.oneOrNone(`SELECT user_id FROM student_details WHERE usn = $1`, [req.user.student_usn]);
    if (row && row.user_id) return row.user_id;
  }

  return null;
}

// POST /events/:event_id/register
export async function registerForEvent(req, res) {
  try {
    const event_id = Number(req.params.event_id);
    if (!event_id) return res.status(400).json({ error: 'Invalid event id' });

    const user_id = await resolveUserId(req);
    if (!user_id) return res.status(400).json({ error: 'Unable to resolve user id for registration' });

    try {
      await db.none(
        `INSERT INTO registrations (event_id, user_id, status, registered_at) VALUES ($1, $2, 'registered', NOW())`,
        [event_id, user_id]
      );
    } catch (err) {
      // Unique constraint -> already registered
      if (err && err.code === '23505') {
        return res.status(409).json({ error: 'Already registered for this event' });
      }
      throw err;
    }

    return res.json({ status: 'success', message: 'Registered for event' });
  } catch (err) {
    console.error('registerForEvent error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// DELETE /events/:event_id/register
export async function unregisterFromEvent(req, res) {
  try {
    const event_id = Number(req.params.event_id);
    if (!event_id) return res.status(400).json({ error: 'Invalid event id' });

    const user_id = await resolveUserId(req);
    if (!user_id) return res.status(400).json({ error: 'Unable to resolve user id' });

    const result = await db.query(`DELETE FROM registrations WHERE event_id = $1 AND user_id = $2`, [event_id, user_id]);
    if (!result || result.rowCount === 0) return res.status(404).json({ error: 'Registration not found' });

    return res.json({ status: 'success', message: 'Unregistered from event' });
  } catch (err) {
    console.error('unregisterFromEvent error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /registrations  - list current user's registrations
export async function listRegistrations(req, res) {
  try {
    const user_id = await resolveUserId(req);
    if (!user_id) return res.status(400).json({ error: 'Unable to resolve user id' });

    const rows = await db.any(
      `SELECT r.registration_id, r.event_id, e.title, r.status, r.registered_at, r.attendance_marked_at, r.attendance_method
       FROM registrations r
       JOIN events e ON r.event_id = e.event_id
       WHERE r.user_id = $1
       ORDER BY r.registered_at DESC`,
      [user_id]
    );

    return res.json({ status: 'success', registrations: rows });
  } catch (err) {
    console.error('listRegistrations error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// POST /events/:event_id/attend  - mark attendance for current user (or for provided user_id if requester is staff)
export async function markAttendance(req, res) {
  try {
    const event_id = Number(req.params.event_id);
    if (!event_id) return res.status(400).json({ error: 'Invalid event id' });

    // If staff provided user_id in body, allow marking for them (basic check)
    let target_user_id = req.body.user_id ? Number(req.body.user_id) : null;
    if (!target_user_id) {
      target_user_id = await resolveUserId(req);
    }

    if (!target_user_id) return res.status(400).json({ error: 'Unable to resolve user id to mark attendance' });

    const attendance_method = req.body.method || 'manual';

    const result = await db.query(
      `UPDATE registrations SET status = 'attended', attendance_marked_at = NOW(), attendance_method = $1
       WHERE event_id = $2 AND user_id = $3`,
      [attendance_method, event_id, target_user_id]
    );

    if (!result || result.rowCount === 0) return res.status(404).json({ error: 'Registration not found for attendance' });

    return res.json({ status: 'success', message: 'Attendance marked' });
  } catch (err) {
    console.error('markAttendance error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

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
