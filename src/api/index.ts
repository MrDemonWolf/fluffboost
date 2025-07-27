import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";

import env from "../utils/env";

/**
 * Import all routes
 */
import statusRoute from "./routes/status";

const app = express();
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
app.set("x-powered-by", "Fluffboost");

/**
 * Use verbose logs in development, concise logs in production
 */
if (env.NODE_ENV === "production") {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}

/**
 * Set express variables
 * @param {string} host - Hostname
 * @param {number} port - Port
 */
app.set("host", env.HOST || "localhost");
app.set("port", env.PORT || 8080);

/**
 * Initialize routes
 */
app.use("/api/status", statusRoute);

export default app;
