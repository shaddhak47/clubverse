// middlewares/authMiddleware.js
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";

/**
 * readTestUser: development helper to read x-user-id header.
 * Attaches req.user = { user_id, role } when header present.
 * This keeps your existing HOD workflows that used x-user-id working.
 */
export const readTestUser = async (req, res, next) => {
  const header = req.header("x-user-id");
  if (!header) {
    req.user = null;
    return next();
  }

  const id = Number(header);
  if (Number.isNaN(id)) {
    req.user = null;
    return next();
  }

  try {
    // fetch minimal user info if exists
    const u = await db.oneOrNone("SELECT user_id, name, email, role FROM users WHERE user_id = $1", [id]);
    if (u) req.user = { id: u.user_id, name: u.name, email: u.email, role: u.role };
    else req.user = { id }; // fallback
  } catch (err) {
    console.warn("readTestUser db error:", err.message);
    req.user = { id };
  }
  next();
};

/**
 * verifyToken: production JWT auth middleware.
 * Looks for Authorization: Bearer <token>
 * If valid sets req.user = { id, role, name, email }
 */
export const verifyToken = async (req, res, next) => {
  try {
    const auth = req.header("Authorization") || req.header("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ status: "error", message: "Missing Authorization header" });
    }
    const token = auth.replace(/^Bearer\s+/, "");
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.id || payload.user_id || payload.sub;
    if (!userId) return res.status(401).json({ status: "error", message: "Invalid token payload" });

    // fetch user from DB
    const u = await db.oneOrNone("SELECT user_id, name, email, role FROM users WHERE user_id = $1", [userId]);
    if (!u) return res.status(401).json({ status: "error", message: "User not found" });

    req.user = { id: u.user_id, name: u.name, email: u.email, role: u.role };
    next();
  } catch (err) {
    console.error("verifyToken error:", err.message);
    return res.status(401).json({ status: "error", message: "Invalid or expired token" });
  }
};

/**
 * requireRole(role) returns middleware that checks req.user.role
 * Works both when using readTestUser (dev) or verifyToken (prod)
 */
export const requireRole = (role) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ status: "error", message: "Forbidden: missing user role" });
  }
  if (req.user.role.toLowerCase() !== role.toLowerCase()) {
    return res.status(403).json({ status: "error", message: `Forbidden: requires ${role}` });
  }
  next();
};

export const requireSuperAdmin = requireRole("superadmin");

