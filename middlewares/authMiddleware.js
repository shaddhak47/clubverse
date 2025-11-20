// middlewares/authMiddleware.js
import db from "../config/db.js";
/**
 * --------------------------------------------------------
 * readTestUser: REQUIRED (NO LOGIN, NO PASSWORD, NO JWT)
 * --------------------------------------------------------
 * We ONLY use x-user-id header.
 * If present → fetch user from DB and attach to req.user.
 * If not present → reject request.
 * 
 * This ensures all API calls work without login.
 */
export const readTestUser = async (req, res, next) => {
  const header = req.header("x-user-id");

  if (!header) {
    return res.status(401).json({
      status: "error",
      message: "Missing x-user-id header",
    });
  }

  const id = Number(header);
  if (Number.isNaN(id)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid x-user-id format. Must be a number.",
    });
  }

  try {
    // Fetch user for accuracy
    const u = await db.oneOrNone(
      `SELECT user_id, name, email, role FROM users WHERE user_id = $1`,
      [id]
    );

    if (u) {
      req.user = {
        id: u.user_id,
        name: u.name,
        email: u.email,
        role: u.role,
      };
    } else {
      // If user not in DB → fallback but still allow (dev mode)
      req.user = { id, role: "superadmin" };
    }

    next();
  } catch (err) {
    console.error("readTestUser error:", err.message);
    return res.status(500).json({
      status: "error",
      message: "Server error reading x-user-id",
    });
  }
};

/**
 * --------------------------------------------------------
 * verifyToken: DISABLED (NO JWT NOW)
 * --------------------------------------------------------
 * This middleware now just passes request through.
 * Kept for compatibility with existing route structure.
 */
export const verifyToken = (req, res, next) => {
  // Since login + JWT are removed, simply continue
  next();
};

/**
 * --------------------------------------------------------
 * requireRole: Generic role guard (superadmin, admin, hod, etc.)
 * --------------------------------------------------------
 * Uses req.user.role populated from x-user-id.
 */
export const requireRole = (role) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({
      status: "error",
      message: "Forbidden: user role missing",
    });
  }

  if (req.user.role.toLowerCase() !== role.toLowerCase()) {
    return res.status(403).json({
      status: "error",
      message: `Forbidden: requires ${role}`,
    });
  }

  next();
};

// Specific version used in admin routes
export const requireSuperAdmin = requireRole("superadmin");


