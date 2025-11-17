import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// ------------------------------------
// 1) TEST MODE FOR POSTMAN (x-user-id)
// ------------------------------------
export const readTestUser = (req, res, next) => {
  const testUserId = req.header("x-user-id");

  if (testUserId) {
    req.user = { user_id: Number(testUserId), role: "superadmin" };
  }

  next();
};

// ------------------------------------
// 2) NORMAL JWT VERIFICATION
// ------------------------------------
export const verifyToken = (req, res, next) => {
  // If test header exists → skip JWT
  if (req.user) return next();

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token missing. Please login." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user to request
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid / Expired Token" });
  }
};

// ------------------------------------
// 3) ONLY SUPERADMIN CAN ACCESS
// ------------------------------------
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Access denied. SuperAdmin only." });
  }
  next();
};

