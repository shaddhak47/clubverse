// middlewares/authMiddleware.js

export const readTestUser = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  const role = req.headers["x-user-role"] || "student";

  if (!userId) {
    return res.status(400).json({ error: "Missing x-user-id" });
  }

  // Student using USN (like 1BM21CS001)
  if (role === "student") {
    req.user = {
      role: "student",
      student_usn: userId,   // always USN
      user_id: userId        // same as USN for uploading
    };
    return next();
  }

  // For HOD / ADMIN → numeric ID
  const numericId = Number(userId);
  if (isNaN(numericId)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid x-user-id – must be a number for admin/hod"
    });
  }

  req.user = {
    role,
    user_id: numericId
  };

  next();
};
