// src/middleware/authStub.js
import db from "../config/db.js";

/**
 * Test auth middleware. For testing only!
 * Send header: x-user-id: <user_id>
 */
export default async function authStub(req, res, next) {
  const userId = req.header("x-user-id");
  if (!userId) {
    // not authenticated but for HOD actions we need user. let it continue as guest.
    req.user = null;
    return next();
  }
  try {
    const user = await db.oneOrNone("SELECT user_id, name, email, role FROM users WHERE user_id = $1", [userId]);
    req.user = user || null;
    next();
  } catch (err) {
    console.error("authStub error:", err);
    req.user = null;
    next();
  }
}
