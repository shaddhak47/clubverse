// controllers/hodController.js
import xlsx from "xlsx";
import db from "../config/db.js";
import bcrypt from 'bcryptjs';
/* ======================================================
   ✅ 1. Upload Excel (Students + Proctors)
====================================================== */
export const uploadDeptUserData = async (req, res) => {
  try {
    console.log("📂 HOD Upload Endpoint Hit");

    const { dept_id } = req.params;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // Read Excel from buffer
    const workbook = xlsx.read(file.buffer, { type: "buffer" });
    const sheet = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);

    if (!rows.length)
      return res.status(400).json({ error: "Empty Excel file" });

    console.log("📊 Parsed Excel Rows (first 3):", rows.slice(0, 3));

    let inserted = 0;

    // Ensure students table has a verification_status column (run once)
    await db.none(`ALTER TABLE students ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50)`);

    for (const row of rows) {
        // Support two upload shapes: student rows (Student Name/USN/Email) and role-only rows (Name, Email, Role)
        const roleFromSheet = (row['Role'] || row['role'] || row['ROLE'] || '').toString().trim().toLowerCase() || null;

        const studentName = row['Student Name']?.trim() || row['Name']?.trim() || row['name']?.trim() || null;
        const studentUSN = row['Student USN']?.trim() || row['USN']?.trim() || row['usn']?.trim() || null;
        const studentEmail = row['Student Email']?.trim() || row['Email']?.trim() || row['email']?.trim() || null;
        const semester = row['Semester'] ? parseInt(row['Semester']) : (row['semester'] ? parseInt(row['semester']) : null);
        const proctorName = row['Proctor Name']?.trim() || row['proctor name']?.trim() || row['proctor_name']?.trim() || null;
        const proctorEmail = row['Proctor Email']?.trim() || row['proctor email']?.trim() || row['proctor_email']?.trim() || null;

        // Normalize role: if Role present, honor it; otherwise default to 'student' when Student USN present
        let resolvedRole = roleFromSheet;
        if (!resolvedRole) {
          if (studentUSN) resolvedRole = 'student';
        }

        // Ensure proctor user exists first (so we can reference proctor_id)
        let proctorUserId = null;
        if (proctorEmail) {
          try {
            const existingProctor = await db.oneOrNone(`SELECT user_id, role FROM users WHERE email = $1`, [proctorEmail]);
            if (!existingProctor) {
              const pw = bcrypt.hashSync((proctorEmail || 'import') + Date.now().toString().slice(-6), 10);
              const created = await db.one(
                `INSERT INTO users (name, email, role, is_active, password_hash, provider) VALUES ($1, $2, $3, TRUE, $4, $5) RETURNING user_id`,
                [proctorName || proctorEmail.split('@')[0], proctorEmail, 'proctor', pw, 'import']
              );
              proctorUserId = created.user_id;
              try {
                await db.none(`INSERT INTO proctor_details (user_id, dept_id, proctor_usn) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING`, [proctorUserId, dept_id, null]);
              } catch (innerErr) {
                console.warn('Could not insert into proctor_details:', innerErr.message);
              }
            } else {
              proctorUserId = existingProctor.user_id;
              if (existingProctor.role !== 'proctor') {
                console.log(`Note: existing user ${proctorEmail} has role=${existingProctor.role}; not changing role to 'proctor'.`);
              }
            }
          } catch (err) {
            console.warn('Error ensuring proctor user for', proctorEmail, err.message);
          }
        }

        // Handle different roles
        if (resolvedRole === 'proctor') {
          // Create or update proctor user
          if (!studentEmail && !studentName) {
            // If the row is a role-only row (Name + Email + Role)
            if (!row['Email']) continue;
          }
          try {
            const existing = await db.oneOrNone(`SELECT user_id, role FROM users WHERE email = $1`, [studentEmail]);
            if (!existing) {
              const pw = bcrypt.hashSync((studentEmail || 'import') + Date.now().toString().slice(-6), 10);
              const created = await db.one(
                `INSERT INTO users (name, email, role, is_active, password_hash, provider) VALUES ($1, $2, $3, TRUE, $4, $5) RETURNING user_id`,
                [studentName || studentEmail.split('@')[0], studentEmail, 'proctor', pw, 'import']
              );
              try { await db.none(`INSERT INTO proctor_details (user_id, dept_id) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`, [created.user_id, dept_id]); } catch(e){console.warn(e.message)}
            } else {
              if (existing.role !== 'proctor') console.log(`Note: existing user ${studentEmail} has role=${existing.role}; not changing to proctor.`);
            }
          } catch (err) { console.warn('Error inserting proctor row', err.message); }
          // no student record to insert; continue
          continue;
        }

        if (resolvedRole === 'faculty') {
          // Create or update faculty user
          if (!studentEmail) continue;
          try {
            const existing = await db.oneOrNone(`SELECT user_id, role FROM users WHERE email = $1`, [studentEmail]);
            if (!existing) {
              const pw = bcrypt.hashSync((studentEmail || 'import') + Date.now().toString().slice(-6), 10);
              const created = await db.one(
                `INSERT INTO users (name, email, role, is_active, password_hash, provider) VALUES ($1, $2, $3, TRUE, $4, $5) RETURNING user_id`,
                [studentName || studentEmail.split('@')[0], studentEmail, 'faculty', pw, 'import']
              );
              try { await db.none(`INSERT INTO faculty_details (user_id, dept_id, designation) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING`, [created.user_id, dept_id, null]); } catch(e){console.warn(e.message)}
            } else {
              if (existing.role !== 'faculty') console.log(`Note: existing user ${studentEmail} has role=${existing.role}; not changing to faculty.`);
            }
          } catch (err) { console.warn('Error inserting faculty row', err.message); }
          continue;
        }

        // Default: treat as student row
        if (!studentUSN || !studentName) continue;

        // Ensure a user row exists for the student email (so Firebase auth maps)
        let studentUserId = null;
        if (studentEmail) {
          try {
            const existingUser = await db.oneOrNone(`SELECT user_id, role FROM users WHERE email = $1`, [studentEmail]);
            if (!existingUser) {
              const pw = bcrypt.hashSync((studentEmail || 'import') + Date.now().toString().slice(-6), 10);
              const createdUser = await db.one(
                `INSERT INTO users (name, email, role, is_active, password_hash, provider) VALUES ($1, $2, $3, TRUE, $4, $5) RETURNING user_id`,
                [studentName, studentEmail, 'student', pw, 'import']
              );
              studentUserId = createdUser.user_id;
            } else {
              studentUserId = existingUser.user_id;
              if (existingUser.role !== 'student') console.log(`Note: existing user ${studentEmail} has role=${existingUser.role}; not changing to student.`);
            }
          } catch (err) {
            console.warn('Error ensuring student user for', studentEmail, err.message);
          }
        }

        // Insert/update into students table (existing behaviour)
        await db.none(
          `
          INSERT INTO students 
          (dept_id, proctor_name, proctor_email, student_name, student_usn, student_email, semester, status, verification_status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'inactive', 'pending')
          ON CONFLICT (student_usn)
          DO UPDATE SET
            dept_id = EXCLUDED.dept_id,
            proctor_name = EXCLUDED.proctor_name,
            proctor_email = EXCLUDED.proctor_email,
            student_name = EXCLUDED.student_name,
            student_email = EXCLUDED.student_email,
            semester = EXCLUDED.semester,
            status = 'inactive',
            verification_status = 'pending';
          `,
          [
            dept_id,
            proctorName,
            proctorEmail,
            studentName,
            studentUSN,
            studentEmail,
            semester,
          ]
        );

        inserted++;

        // Maintain canonical student_details linking to users table when possible
        if (studentUserId) {
          try {
            await db.none(`INSERT INTO student_details (user_id, usn, dept_id, semester) VALUES ($1, $2, $3, $4) ON CONFLICT (usn) DO UPDATE SET user_id = EXCLUDED.user_id, dept_id = EXCLUDED.dept_id, semester = EXCLUDED.semester`, [studentUserId, studentUSN, dept_id, semester]);
            // If we have a proctor user id, set proctor_id
            if (proctorUserId) {
              await db.none(`UPDATE student_details SET proctor_id = $1 WHERE usn = $2`, [proctorUserId, studentUSN]);
            }
          } catch (err) {
            console.warn('Could not upsert student_details:', err.message);
          }
        }
    }

    return res.json({ status: 'success', inserted });
  } catch (err) {
    console.error("❌ Upload Failed:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   ✅ 2. Get Department Users
====================================================== */
export const getDepartmentUsers = async (req, res) => {
  try {
    const { dept_id } = req.params;

    const users = await db.manyOrNone(
      `
      SELECT dept_id, proctor_name, proctor_email, student_name, student_usn, student_email, semester, status
      FROM students 
      WHERE dept_id = $1
      ORDER BY semester NULLS LAST, proctor_name, student_name;
      `,
      [dept_id]
    );

    res.json({
      status: "success",
      total: users.length,
      data: users,
    });
  } catch (err) {
    console.error("❌ Fetch Users Failed:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   ✅ 3. Approve Event
====================================================== */
export const approveEvent = async (req, res) => {
  try {
    const { dept_id } = req.params;
    const { event_id } = req.body;
    const hodUserId = req.user?.user_id || 1; // ✅ default to real HOD

    if (!event_id) {
      return res.status(400).json({ error: "Missing event_id in request body" });
    }

    const result = await db.result(
      `
      UPDATE events
      SET hod_status = 'approved',
          hod_approved_on = NOW(),
          hod_approved_by = $1
      WHERE dept_id = $2 AND event_id = $3
      `,
      [hodUserId, dept_id, event_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "failed",
        message: `No matching event found for dept_id=${dept_id} and event_id=${event_id}`,
      });
    }

    res.json({
      status: "success",
      message: `Event ${event_id} approved successfully.`,
    });
  } catch (err) {
    console.error("❌ Approve Event Failed:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   ✅ 4. Approve Activity Points
====================================================== */
export const approveActivityPoints = async (req, res) => {
  try {
    const { student_usn, event_id, hod_remarks } = req.body;
    const dept_id = parseInt(req.params.dept_id);
    const hodUserId = req.user?.user_id || 1; // ✅ use valid HOD

    if (!student_usn || !event_id) {
      return res.status(400).json({ error: "Missing student_usn or event_id" });
    }

    console.log("Approving activity points for:", { student_usn, event_id, dept_id });

    const existing = await db.oneOrNone(
      `
      SELECT points_id, hod_status 
      FROM activity_points
      WHERE student_usn = $1 AND event_id = $2 AND dept_id = $3
      `,
      [student_usn, event_id, dept_id]
    );

    if (!existing) {
      return res.status(404).json({
        status: "failed",
        message: `No activity points record found for student_usn=${student_usn} and event_id=${event_id}`,
      });
    }

    await db.none(
      `
      UPDATE activity_points
      SET hod_status = 'approved',
          hod_remarks = $1,
          hod_approved_by = $2,
          hod_approved_on = NOW()
      WHERE student_usn = $3 AND event_id = $4 AND dept_id = $5
      `,
      [hod_remarks || "Approved by HOD", hodUserId, student_usn, event_id, dept_id]
    );

    res.json({
      status: "success",
      message: `Activity points for ${student_usn} (event ${event_id}) approved successfully.`,
    });
  } catch (err) {
    console.error("❌ Approve Activity Points Failed:", err.message);
    res.status(500).json({ error: err.message });
  }
};


/* ======================================================
   ✅ Approve Document by HOD
====================================================== */
export const approveDocument = async (req, res) => {
  try {
    const deptId = Number(req.params.dept_id);
    const { document_id, hod_approved_by, hod_remarks } = req.body;

    const updated = await db.result(
      `UPDATE documents
       SET hod_status = 'approved',
           hod_approved_by = $1,
           hod_approved_on = NOW(),
           hod_remarks = $2
       WHERE document_id = $3
       RETURNING *`,
      [hod_approved_by, hod_remarks, document_id]
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ status: "failed", message: "Document not found" });
    }

    res.json({ status: "success", message: "Document approved successfully" });
  } catch (err) {
    console.error("❌ Error approving document:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
};


/* ======================================================
   ✅ 6. Approve Event Category
   Route: POST /api/hod/:dept_id/categories/:category_id/approve
   Body: { hod_remarks }
====================================================== */
export const approveCategory = async (req, res) => {
  try {
    const deptId = Number(req.params.dept_id);
    const categoryId = Number(req.params.category_id);
    const hodUserId = req.user?.user_id || 1;
    const { hod_remarks } = req.body;

    if (!categoryId) {
      return res.status(400).json({ error: 'Missing category_id in path' });
    }

    const updated = await db.oneOrNone(
      `UPDATE event_categories
       SET status = 'active', hod_status = 'approved', hod_remarks = $1, hod_approved_by = $2, hod_approved_on = NOW()
       WHERE category_id = $3
       RETURNING category_id, name, max_points, status, proposed_by, hod_status, hod_remarks, hod_approved_by, hod_approved_on`,
      [hod_remarks || null, hodUserId, categoryId]
    );

    if (!updated) {
      return res.status(404).json({ status: 'failed', message: 'Category not found' });
    }

    return res.json({ status: 'success', category: updated, message: 'Category approved' });
  } catch (err) {
    console.error('❌ Error approving category:', err.message);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

/* ======================================================
   7. List Verified Submissions (by Proctor) for HOD Review
   GET /api/hod/:dept_id/documents/verified?semester=...&proctor_email=...
====================================================== */
export const getVerifiedSubmissions = async (req, res) => {
  try {
    const deptId = Number(req.params.dept_id);
    const semester = req.query.semester ? Number(req.query.semester) : null;
    const proctorEmail = req.query.proctor_email || null;

    // Base query: documents where proctor has approved (verification_status = 'approved') and student's dept matches
    let baseQuery = `
      SELECT ad.doc_id, ad.registration_id, ad.uploader_id, ad.file_url, ad.verification_status, ad.verified_by, ad.verified_at, ad.description,
             u.user_id AS student_user_id, u.email AS student_email, u.name AS student_name, sd.semester,
             e.event_id, e.title AS event_title
      FROM activity_docs ad
      JOIN registrations r ON ad.registration_id = r.registration_id
      JOIN events e ON r.event_id = e.event_id
      JOIN users u ON r.user_id = u.user_id
      LEFT JOIN student_details sd ON u.user_id = sd.user_id
      WHERE ad.verification_status = 'approved' AND sd.dept_id = $1
    `;

    const params = [deptId];

    if (semester) {
      params.push(semester);
      baseQuery += ` AND sd.semester = $${params.length}`;
    }

    if (proctorEmail) {
      params.push(proctorEmail);
      baseQuery += ` AND r.user_id IN (SELECT user_id FROM student_details WHERE proctor_id IN (SELECT user_id FROM users WHERE email = $${params.length}))`;
    }

    baseQuery += ` ORDER BY ad.verified_at DESC`;

    const rows = await db.any(baseQuery, params);

    return res.json({ status: 'success', total: rows.length, data: rows });
  } catch (err) {
    console.error('❌ getVerifiedSubmissions error:', err.message);
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
};


/* ======================================================
   8. HOD review / add remarks to a document
   POST /api/hod/:dept_id/documents/:doc_id/review
   body: { hod_status: 'approved'|'rejected', hod_remarks }
====================================================== */
export const reviewDocumentByHod = async (req, res) => {
  try {
    const deptId = Number(req.params.dept_id);
    const docId = Number(req.params.doc_id);
    const hodUserId = req.user?.user_id || 1;
    const { hod_status, hod_remarks } = req.body;

    if (!docId || !hod_status) return res.status(400).json({ error: 'Missing doc_id or hod_status' });

    const valid = ['approved', 'rejected'];
    if (!valid.includes(hod_status)) return res.status(400).json({ error: 'Invalid hod_status' });

    // Ensure activity_docs has hod columns (safe ALTER)
    await db.none(`ALTER TABLE activity_docs ADD COLUMN IF NOT EXISTS hod_status VARCHAR(50)`);
    await db.none(`ALTER TABLE activity_docs ADD COLUMN IF NOT EXISTS hod_remarks TEXT`);
    await db.none(`ALTER TABLE activity_docs ADD COLUMN IF NOT EXISTS hod_reviewed_by INT`);
    await db.none(`ALTER TABLE activity_docs ADD COLUMN IF NOT EXISTS hod_reviewed_at TIMESTAMPTZ`);

    const updated = await db.oneOrNone(
      `UPDATE activity_docs SET hod_status = $1, hod_remarks = $2, hod_reviewed_by = $3, hod_reviewed_at = NOW() WHERE doc_id = $4 RETURNING *`,
      [hod_status, hod_remarks || null, hodUserId, docId]
    );

    if (!updated) return res.status(404).json({ status: 'failed', message: 'Document not found' });

    return res.json({ status: 'success', message: 'HOD review saved', document: updated });
  } catch (err) {
    console.error('❌ reviewDocumentByHod error:', err.message);
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
};


/* ======================================================
   9. Generic HOD Approval endpoint (events or categories)
   POST /api/hod/:dept_id/approval
   body: { type: 'event'|'category', id, action: 'approve'|'reject', hod_remarks }
====================================================== */
export const hodApproval = async (req, res) => {
  try {
    const deptId = Number(req.params.dept_id);
    const { type, id, action, hod_remarks } = req.body;
    const hodUserId = req.user?.user_id || 1;

    if (!type || !id || !action) return res.status(400).json({ error: 'Missing type, id, or action' });

    if (!['event', 'category'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

    if (type === 'category') {
      // approve or reject event_categories
      const newStatus = action === 'approve' ? 'active' : 'rejected';
      const hodStatus = action === 'approve' ? 'approved' : 'rejected';

      const updated = await db.oneOrNone(
        `UPDATE event_categories SET status = $1, hod_status = $2, hod_remarks = $3, hod_approved_by = $4, hod_approved_on = NOW() WHERE category_id = $5 RETURNING *`,
        [newStatus, hodStatus, hod_remarks || null, hodUserId, id]
      );

      if (!updated) return res.status(404).json({ status: 'failed', message: 'Category not found' });

      return res.json({ status: 'success', message: `Category ${action}d`, category: updated });
    }

    // type === 'event'
    // Ensure fields exist
    await db.none(`ALTER TABLE events ADD COLUMN IF NOT EXISTS hod_status VARCHAR(50)`);
    await db.none(`ALTER TABLE events ADD COLUMN IF NOT EXISTS hod_approved_by INT`);
    await db.none(`ALTER TABLE events ADD COLUMN IF NOT EXISTS hod_approved_on TIMESTAMPTZ`);

    const newStatus = action === 'approve' ? 'active' : 'rejected';
    const hodStatus = action === 'approve' ? 'approved' : 'rejected';

    const updatedEvent = await db.oneOrNone(
      `UPDATE events SET status = $1, hod_status = $2, hod_approved_by = $3, hod_approved_on = NOW() WHERE event_id = $4 AND (dept_id = $5 OR dept_id IS NULL) RETURNING *`,
      [newStatus, hodStatus, hodUserId, id, deptId]
    );

    if (!updatedEvent) return res.status(404).json({ status: 'failed', message: 'Event not found or not within your department' });

    return res.json({ status: 'success', message: `Event ${action}d`, event: updatedEvent });
  } catch (err) {
    console.error('❌ hodApproval error:', err.message);
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
};


/* ======================================================
   10. View Department Events (with filters + quick insights)
   GET /api/hod/:dept_id/events?category=...&status=...&semester=...
====================================================== */
export const viewDeptEvents = async (req, res) => {
  try {
    const deptId = Number(req.params.dept_id);
    const category = req.query.category || null;
    const status = req.query.status || null;
    const semester = req.query.semester ? Number(req.query.semester) : null;

    const params = [deptId];
    let where = `WHERE (e.dept_id = $1 OR e.dept_id IS NULL)`;

    if (category) {
      params.push(category);
      where += ` AND e.category = $${params.length}`;
    }
    if (status) {
      params.push(status);
      where += ` AND e.status = $${params.length}`;
    }

    // Base event selection
    const eventsQuery = `
      SELECT e.event_id, e.title, e.category, e.start_at, e.end_at, e.venue, e.dept_id, e.status,
             (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id) AS registered_count,
             (SELECT COUNT(*) FROM registrations r JOIN student_details sd ON r.user_id = sd.user_id WHERE r.event_id = e.event_id ${semester ? `AND sd.semester = ${semester}` : ''}) AS attended_count,
             COALESCE((SELECT SUM(ap.points) FROM activity_points ap WHERE ap.event_id = e.event_id),0) AS total_points_awarded
      FROM events e
      ${where}
      ORDER BY e.start_at DESC
    `;

    const events = await db.any(eventsQuery, params);

    return res.json({ status: 'success', total: events.length, events });
  } catch (err) {
    console.error('❌ viewDeptEvents error:', err.message);
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
};


