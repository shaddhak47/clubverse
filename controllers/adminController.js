import db from "../config/db.js";
import xlsx from 'xlsx';
import bcrypt from 'bcryptjs';

const AdminController = {

  // ============================
  // USERS CRUD
  // ============================

  async createUser(req, res) {
    try {
      const { name, email, role } = req.body;

      if (!name || !email || !role) {
        return res.status(400).json({ error: "Name, email, and role are required" });
      }

      const user = await db.one(
        `INSERT INTO users (name, email, role, is_active)
         VALUES ($1, $2, $3, TRUE)
         RETURNING user_id, name, email, role, is_active, created_at, last_login`,
        [name, email, role]
      );

      return res.json({ status: "success", user });

    } catch (err) {
      console.error("❌ Error creating user:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async listUsers(req, res) {
    try {
      const users = await db.any(
        `SELECT user_id, name, email, role, is_active, created_at, last_login
         FROM users
         ORDER BY user_id`
      );

      return res.json({ status: "success", users });

    } catch (err) {
      console.error("❌ Error listing users:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, role } = req.body;

      const updatedUser = await db.one(
        `UPDATE users
         SET name = $1, email = $2, role = $3
         WHERE user_id = $4
         RETURNING user_id, name, email, role, is_active, created_at, last_login`,
        [name, email, role, id]
      );

      return res.json({ status: "success", updatedUser });

    } catch (err) {
      console.error("❌ Error updating user:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      await db.none(`DELETE FROM users WHERE user_id = $1`, [id]);

      return res.json({ status: "success", message: "User deleted" });

    } catch (err) {
      console.error("❌ Error deleting user:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  // ============================
  // DEPARTMENTS CRUD
  // ============================

  async createDepartment(req, res) {
    try {
      const { name, code } = req.body;

      if (!name || !code) {
        return res.status(400).json({ error: "Department name and code are required" });
      }

      const dept = await db.one(
        `INSERT INTO departments (name, code)
         VALUES ($1, $2)
         RETURNING dept_id, name, code`,
        [name, code]
      );

      return res.json({ status: "success", dept });

    } catch (err) {
      console.error("❌ Error creating department:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async listDepartments(req, res) {
    try {
      const depts = await db.any(
        `SELECT dept_id, name, code 
         FROM departments 
         ORDER BY dept_id`
      );

      return res.json({ status: "success", depts });

    } catch (err) {
      console.error("❌ Error listing departments:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateDepartment(req, res) {
    try {
      const { id } = req.params;
      const { name, code } = req.body;

      const dept = await db.one(
        `UPDATE departments
         SET name = $1, code = $2
         WHERE dept_id = $3
         RETURNING dept_id, name, code`,
        [name, code, id]
      );

      return res.json({ status: "success", dept });

    } catch (err) {
      console.error("❌ Error updating department:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteDepartment(req, res) {
    try {
      const { id } = req.params;

      await db.none(`DELETE FROM departments WHERE dept_id = $1`, [id]);

      return res.json({ status: "success", message: "Department deleted" });

    } catch (err) {
      console.error("❌ Error deleting department:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  // ============================
  // AUDIT LOGS
  // ============================

  async viewAuditLogs(req, res) {
    try {
      const logs = await db.any(`SELECT * FROM audit_logs ORDER BY id DESC`);

      return res.json({ status: "success", logs });

    } catch (err) {
      console.error("❌ Error fetching logs:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  // Upload and process an Excel sheet of HODs
  async uploadHods(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });

      const results = [];

      for (const row of rows) {
        // Normalize possible header names
        const email = row.email || row.Email || row.EMail || row.E_mail;
        const name = row.name || row.Name || row.full_name || row.FullName;
        const dept_code = row.dept_code || row.dept || row.department_code || row.Department;

        if (!email) {
          results.push({ email: null, status: 'skipped', reason: 'missing email' });
          continue;
        }

        // Find or create department
        let dept = null;
        if (dept_code) {
          dept = await db.oneOrNone('SELECT dept_id FROM departments WHERE code = $1', [String(dept_code)]);
        }
        if (!dept && dept_code) {
          const created = await db.one('INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING dept_id', [String(dept_code), String(dept_code)]);
          dept = created;
        }

        // Check existing user
        let user = await db.oneOrNone('SELECT user_id, role FROM users WHERE email = $1', [email]);
        if (!user) {
          const pw = bcrypt.hashSync(email + Date.now().toString().slice(-6), 10);
          const created = await db.one(
            `INSERT INTO users (name, email, role, is_active, password_hash, provider)
             VALUES ($1, $2, $3, TRUE, $4, 'import') RETURNING user_id`,
            [name || email.split('@')[0], email, 'hod', pw]
          );
          user = { user_id: created.user_id, role: 'hod' };
        } else {
          // ensure role is hod
          if (user.role !== 'hod') {
            await db.none('UPDATE users SET role = $1 WHERE user_id = $2', ['hod', user.user_id]);
          }
        }

        // Create or update hod_details
        const deptId = dept ? dept.dept_id : null;

        if (deptId) {
          // If there is already a HOD assigned to this department, reassign it to this user
          const existingByDept = await db.oneOrNone('SELECT hod_id, user_id FROM hod_details WHERE dept_id = $1', [deptId]);
          if (existingByDept) {
            if (existingByDept.user_id !== user.user_id) {
              // Reassign department to the new HOD user (update the existing record)
              await db.none('UPDATE hod_details SET user_id = $1 WHERE hod_id = $2', [user.user_id, existingByDept.hod_id]);
            }
          } else {
            // No HOD exists for this department; attach this user (insert or update by user)
            const existingByUser = await db.oneOrNone('SELECT hod_id FROM hod_details WHERE user_id = $1', [user.user_id]);
            if (!existingByUser) {
              await db.none('INSERT INTO hod_details (user_id, dept_id) VALUES ($1, $2)', [user.user_id, deptId]);
            } else {
              await db.none('UPDATE hod_details SET dept_id = $1 WHERE user_id = $2', [deptId, user.user_id]);
            }
          }
        } else {
          // No department specified: ensure a hod_details row exists for the user
          const existingByUser = await db.oneOrNone('SELECT hod_id FROM hod_details WHERE user_id = $1', [user.user_id]);
          if (!existingByUser) {
            await db.none('INSERT INTO hod_details (user_id, dept_id) VALUES ($1, NULL)', [user.user_id]);
          } else {
            await db.none('UPDATE hod_details SET dept_id = NULL WHERE user_id = $1', [user.user_id]);
          }
        }

        results.push({ email, user_id: user.user_id, status: 'created_or_updated' });
      }

      return res.json({ status: 'success', processed: results.length, results });
    } catch (err) {
      console.error('uploadHods error:', err);
      return res.status(500).json({ error: 'Server error', details: err.message });
    }
  }
};

export default AdminController;









