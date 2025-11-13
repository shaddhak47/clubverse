import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.send("PROCTOR route working ✅");
});

export default router;
