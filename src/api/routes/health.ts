import express from "express";
import logger from "../../utils/logger.js";

const router: express.Router = express.Router();

/**
 * GET /heatlh
 * Returns the heatlh of the bot
 */
router.get("/", async (_req, res) => {
  try {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      version: process.env["npm_package_version"] || "1.7.0",
      timestamp: new Date().toISOString(),
      path: "/api/heatlh",
      method: "GET",
    });
  } catch (err) {
    logger.error("API", "Status endpoint error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
