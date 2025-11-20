import db from "../config/db.js";
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
  }
};

export default AdminController;









