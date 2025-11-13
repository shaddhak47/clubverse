// middlewares/authMiddleware.js

/**
 * Middleware to verify or read test user.
 * Reads x-user-id from headers and attaches it to req.user.
 * Used for development & testing before full authentication is implemented.
 */

export const verifyUser = (req, res, next) => {
  const userId = req.header("x-user-id");

  if (!userId) {
    console.warn("⚠️ No x-user-id header provided — proceeding as unauthenticated.");
    req.user = null;
    return next(); // still allow request for testing routes
  }

  req.user = { id: Number(userId) }; // attach user info
  next();
};

/**
 * Alias middleware (for compatibility with existing routes).
 * Does the same thing as verifyUser().
 */
export const readTestUser = (req, res, next) => {
  const userId = req.header("x-user-id");

  if (!userId) {
    console.warn("⚠️ No x-user-id header provided — proceeding as unauthenticated.");
    req.user = null;
    return next();
  }

  req.user = { id: Number(userId) };
  next();
};

