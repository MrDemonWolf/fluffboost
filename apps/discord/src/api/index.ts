import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import env from "../utils/env.js";
import logger from "../utils/logger.js";

/**
 * Import all routes
 */
import healthRoute from "./routes/health.js";

const app: express.Application = express();

/**
 * The rate limiter keys on `req.ip`. Behind Dokploy's Traefik every request
 * arrives from the proxy's address, so without `trust proxy` all clients would
 * share one bucket. Trust exactly TRUST_PROXY_HOPS hops (default 1: Traefik),
 * so `req.ip` is the address that proxy saw. Never `true`: that trusts every
 * X-Forwarded-For entry, which any client can forge. Set 0 when the port is
 * reachable without a proxy in front of it.
 */
if (env.TRUST_PROXY_HOPS > 0) {
  app.set("trust proxy", env.TRUST_PROXY_HOPS);
}

/**
 * The API only serves GET health checks, so no body parsers.
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

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

/**
 * Initialize routes
 */
app.use("/api/health", healthRoute);

export default app;
