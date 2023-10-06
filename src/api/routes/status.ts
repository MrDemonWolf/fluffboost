import express from "express";
import client from "../../bot";

const router = express.Router();

/**
 *  @route GET /status
 *  @desc Get status of Discord Bot
 *  @access Public
 *  @returns {object} - Status of Discord Bot
 */
router.get("/", async (req, res) => {
  try {
    // check if bot is ready and connected to Discord API Gateway

    const isDiscordAPIReady = client.ws.status === 0;
    const isClientReady = client.isReady();
    const isOnline = isDiscordAPIReady || isClientReady;

    if (!isOnline) {
      return res.status(503).json({ status: "Offline" });
    }

    res.status(200).json({
      status: "Online",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
