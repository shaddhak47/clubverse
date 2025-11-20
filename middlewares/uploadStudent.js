// middlewares/uploadStudent.js

import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const usn = req.user.student_usn;
    const dir = path.join("uploads", "student", usn);

    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },

  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}_${file.originalname}`);
  }
});

export const uploadSingle = (fieldName) =>
  multer({ storage }).single(fieldName);
