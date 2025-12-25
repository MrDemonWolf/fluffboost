import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";

import env from "../utils/env.js";

/**
 * Import all routes
 */
import heatlhRoute from "./routes/health.js";

const app: express.Application = express();
/**
 * Express configuration (express.json, express.urlencoded, helmet, morgan, cors)
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(
  cors({
    origin:
      env.NODE_ENV === "production"
        ? env.CORS_ORIGIN // e.g. "https://app.example.com"
        : "*",
  })
);
app.set("x-powered-by", "MrDemonWolf, Inc., Community Bot");

/**
 * Use verbose logs in development, concise logs in production
 * Skip logging for health check requests from Coolify (curl/*), Pulsetic monitoring, and localhost IPs
 */
const skipHealthChecks = (req: express.Request) => {
  const userAgent = req.get("User-Agent") || "";
  const clientIP = req.ip || req.socket.remoteAddress || "";

  // Skip if User-Agent starts with curl/ (Coolify health checks)
  if (userAgent.startsWith("curl/")) {
    return true;
  }

  // Skip if User-Agent contains pulsetic (Pulsetic monitoring)
  if (userAgent.toLowerCase().includes("pulsetic")) {
    return true;
  }

  // Skip if request is from localhost (IPv4 or IPv6)
  if (
    clientIP === "127.0.0.1" ||
    clientIP === "::1" ||
    clientIP === "::ffff:127.0.0.1"
  ) {
    return true;
  }

  return false;
};

if (env.NODE_ENV === "production") {
  app.use(morgan("combined", { skip: skipHealthChecks }));
} else {
  app.use(morgan("dev", { skip: skipHealthChecks }));
}

/**
 * Set express variables
 * @param {string} host - Hostname
 * @param {number} port - Port
 */
app.set("host", env.HOST || "localhost");
app.set("port", env.PORT || 3000);

/**
 * Initialize routes
 */
app.use("/api/health", heatlhRoute);

export default app;
