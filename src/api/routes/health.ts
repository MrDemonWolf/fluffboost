import express from "express";
import logger from "../../utils/logger.js";

const router: express.Router = express.Router();

/**
 * GET /health
 * Returns the health of the bot
 */
router.get("/", async (_req, res) => {
  try {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      version: process.env["npm_package_version"] || "2.2.0",
      timestamp: new Date().toISOString(),
      path: "/api/health",
      method: "GET",
    });
  } catch (err) {
    logger.error("API", "Health endpoint error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
