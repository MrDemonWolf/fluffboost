import { Router } from "express";
import logger from "../../utils/logger";

const router = Router();

/**
 * GET /status
 * Returns the status of the API
 */
router.get("/", async (req, res) => {
  try {
    res.json({
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.7.0",
      status: "online",
    });
  } catch (err) {
    logger.error("API", "Status endpoint error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
