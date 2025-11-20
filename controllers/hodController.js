// controllers/hodController.js
import xlsx from "xlsx";
import db from "../config/db.js";
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

    for (const row of rows) {
      const studentName = row["Student Name"]?.trim();
      const studentUSN = row["Student USN"]?.trim();
      const studentEmail = row["Student Email"]?.trim();
      const semester = row["Semester"] ? parseInt(row["Semester"]) : null;
      const proctorName = row["Proctor Name"]?.trim() || null;
      const proctorEmail = row["Proctor Email"]?.trim() || null;

      if (!studentUSN || !studentName) continue;

      await db.none(
        `
        INSERT INTO students 
        (dept_id, proctor_name, proctor_email, student_name, student_usn, student_email, semester, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'inactive')
        ON CONFLICT (student_usn)
        DO UPDATE SET
          dept_id = EXCLUDED.dept_id,
          proctor_name = EXCLUDED.proctor_name,
          proctor_email = EXCLUDED.proctor_email,
          student_name = EXCLUDED.student_name,
          student_email = EXCLUDED.student_email,
          semester = EXCLUDED.semester,
          status = 'inactive';
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
    }

    res.json({
      status: "success",
      summary: {
        total_rows: rows.length,
        inserted_or_updated: inserted,
        skipped: rows.length - inserted,
      },
    });
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


