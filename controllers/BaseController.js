// src/controllers/BaseController.js
export default class BaseController {
  constructor(db) {
    this.db = db;
  }

  success(res, data = {}, message = "Success", code = 200) {
    return res.status(code).json({
      status: "success",
      data,
      message
    });
  }

  error(res, message = "Error", code = 400) {
    return res.status(code).json({
      status: "error",
      message
    });
  }

  authorizeRole(userRole, allowedRoles = []) {
    return allowedRoles.includes(userRole);
  }
}
