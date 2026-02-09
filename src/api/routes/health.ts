import express from "express";

const router: express.Router = express.Router();

router.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
