import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import consola from "consola";

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
app.use(morgan("tiny"));
app.use(
  cors({
    origin: "*", // Be sure to switch to your production domain
  })
);

/**
 * Set express variables
 * @param {string} host - Hostname
 * @param {number} port - Port
 */
app.set("host", process.env.HOST || "localhost");
app.set("port", process.env.PORT || 8080);

/**
 * Initialize routes
 */
app.use("/status", statusRoute);

/**
 * Start API server.
 */
app.listen(app.get("port"), () => {
  consola.success({
    message: `API: Listenings at http://${app.get("host")}:${app.get("port")}`,
    badge: true,
  });
});

app.on("error", (err) => {
  consola.error({
    message: `API: Error: ${err}`,
    badge: true,
  });
  process.exit(1);
});

export default app;
