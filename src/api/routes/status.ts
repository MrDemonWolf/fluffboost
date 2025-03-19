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
      status: "online",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
