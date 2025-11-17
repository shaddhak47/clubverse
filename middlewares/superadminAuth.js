import dotenv from "dotenv";
dotenv.config();

/**
 * -------------------------------------------------
 * 1) TEST MODE — USE ONLY x-user-id (NO LOGIN)
 * -------------------------------------------------
 * If x-user-id is present, treat user as superadmin.
 * This completely removes JWT and password checks.
 */
export const readTestUser = (req, res, next) => {
  const testUserId = req.header("x-user-id");

  if (!testUserId) {
    return res.status(401).json({
      error: "Missing x-user-id header. Provide user id in header.",
    });
  }

  // Force every request to act as superadmin
  req.user = {
    user_id: Number(testUserId),
    role: "superadmin",
  };

  next();
};

/**
 * -------------------------------------------------
 * 2) BYPASS JWT Verification
 * -------------------------------------------------
 * This now does nothing and automatically passes.
 */
export const verifyToken = (req, res, next) => {
  // Since we removed JWT logic, just move ahead
  next();
};

/**
 * -------------------------------------------------
 * 3) REQUIRE SUPERADMIN ROLE
 * -------------------------------------------------
 * This ensures request has req.user from test mode.
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "superadmin") {
    return res
      .status(403)
      .json({ error: "Access denied. SuperAdmin only." });
  }

  next();
};
