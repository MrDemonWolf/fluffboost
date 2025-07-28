import express from "express";

const router = express.Router();

/**
 *  @route GET /status
 *  @desc Get status of Discord Bot
 *  @access Public
 *  @returns {object} - Status of Discord Bot
 */
router.get("/", async (req, res) => {
  try {
    res.status(200).json({
      message: "FluffBoost is online!",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.7.0",
      status: "online",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
