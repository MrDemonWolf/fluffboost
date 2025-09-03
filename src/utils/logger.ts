import consola from "consola";
import env from "./env";

/**
 * Centralized logger utility with consistent formatting for FluffBoost
 * Provides structured logging for different contexts with environment-aware configuration
 */

// Configure consola based on environment
const isDevelopment = env.NODE_ENV === "development";
const isProduction = env.NODE_ENV === "production";

// Set log level based on environment
consola.level = isProduction ? 1 : isDevelopment ? 4 : 3; // Error only in prod, Debug in dev, Info otherwise

/**
 * Application logger with consistent formatting
 */
export const logger = {
  /**
   * Log successful operations
   */
  success: (component: string, message: string, metadata?: any) => {
    consola.success({
      message: `[${component}] ${message}`,
      ...(metadata && { metadata }),
      badge: true,
    });
  },

  /**
   * Log informational messages
   */
  info: (component: string, message: string, metadata?: any) => {
    consola.info({
      message: `[${component}] ${message}`,
      ...(metadata && { metadata }),
      badge: true,
    });
  },

  /**
   * Log warnings
   */
  warn: (component: string, message: string, metadata?: any) => {
    consola.warn({
      message: `[${component}] ${message}`,
      ...(metadata && { metadata }),
      badge: true,
    });
  },

  /**
   * Log errors with proper error handling
   */
  error: (component: string, message: string, error?: any, metadata?: any) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    consola.error({
      message: `[${component}] ${message}`,
      ...(errorMessage && { error: errorMessage }),
      ...(errorStack && isDevelopment && { stack: errorStack }),
      ...(metadata && { metadata }),
      badge: true,
    });
  },

  /**
   * Log debug information (only in development)
   */
  debug: (component: string, message: string, metadata?: any) => {
    if (isDevelopment) {
      consola.debug({
        message: `[${component}] ${message}`,
        ...(metadata && { metadata }),
        badge: true,
      });
    }
  },

  /**
   * Log when services are ready
   */
  ready: (component: string, message: string, metadata?: any) => {
    consola.ready({
      message: `[${component}] ${message}`,
      ...(metadata && { metadata }),
      badge: true,
    });
  },

  /**
   * Log command execution for audit trail
   */
  command: (
    commandName: string,
    username: string,
    userId: string,
    guildId?: string
  ) => {
    logger.info("Command", `${commandName} executed`, {
      user: { username, id: userId },
      ...(guildId && { guild: guildId }),
    });
  },

  /**
   * Log permission violations
   */
  unauthorized: (
    operation: string,
    username: string,
    userId: string,
    guildId?: string
  ) => {
    logger.warn("Security", `Unauthorized ${operation} attempt`, {
      user: { username, id: userId },
      ...(guildId && { guild: guildId }),
    });
  },

  /**
   * Log database operations
   */
  database: {
    connected: (service: string) =>
      logger.success("Database", `${service} connected`),
    error: (service: string, error: any) =>
      logger.error("Database", `${service} connection failed`, error),
    operation: (operation: string, details?: any) =>
      logger.debug("Database", operation, details),
  },

  /**
   * Log API operations
   */
  api: {
    started: (host: string, port: number) =>
      logger.ready("API", `Server listening on http://${host}:${port}`),
    error: (error: any) => logger.error("API", "Server error", error),
    request: (method: string, path: string, status: number) =>
      logger.debug("API", `${method} ${path} - ${status}`),
  },

  /**
   * Log Discord operations
   */
  discord: {
    shardLaunched: (shardId: number) =>
      logger.success("Discord", `Shard ${shardId} launched`),
    shardError: (shardId: number, error: any) =>
      logger.error("Discord", `Shard ${shardId} error`, error),
    ready: (username: string, guildCount: number) =>
      logger.ready(
        "Discord",
        `Bot ready as ${username} in ${guildCount} guilds`
      ),
    guildJoined: (guildName: string, guildId: string, memberCount: number) =>
      logger.info("Discord", `Joined guild: ${guildName}`, {
        guildId,
        memberCount,
      }),
    guildLeft: (guildName: string, guildId: string) =>
      logger.info("Discord", `Left guild: ${guildName}`, { guildId }),
  },
};

export default logger;
