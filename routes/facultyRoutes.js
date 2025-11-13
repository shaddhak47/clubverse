import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.send("FACULTY route working ✅");
});

export default router;
