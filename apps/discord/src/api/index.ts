/**
 * Express app for the manager process's HTTP API (health checks only). app.ts
 * hands it to runApp(), which binds it to HOST/PORT.
 */
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import logger from "../utils/logger.js";

import healthRoute from "./routes/health.js";

const app: express.Application = express();

/**
 * The API only serves GET health checks, so no body parsers. `trust proxy` is
 * deliberately unset: the limiter keys on the socket address, and trusting
 * X-Forwarded-For without a known proxy hop would let clients spoof it.
 */
app.use(helmet());

/**
 * Access log through the structured logger (method, path, status only: no
 * client IP or user agent). Successful health checks are skipped as noise.
 * Mounted before the limiter so 429s are logged.
 */
app.use((req, res, next) => {
  // Captured now: routers rewrite req.url while handling, and the query string is dropped.
  const path = req.path;
  res.on("finish", () => {
    if (path.startsWith("/api/health") && res.statusCode < 400) {
      return;
    }
    logger.api.request(req.method, path, res.statusCode);
  });
  next();
});

// In-memory store, so the limit is per manager process (the API only runs there).
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

app.use("/api/health", healthRoute);

export default app;
