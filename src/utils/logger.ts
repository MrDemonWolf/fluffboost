import consola from "consola";
import env from "./env";

/**
 * Type definitions for logger methods
 */
type LogMetadata = Record<string, unknown>;
type LogError = Error | string | unknown;

interface CommandLogger {
  executing: (
    command: string,
    username: string,
    id: string,
    guildId?: string
  ) => void;
  success: (
    command: string,
    username: string,
    id: string,
    guildId?: string
  ) => void;
  error: (
    command: string,
    username: string,
    id: string,
    error?: LogError,
    guildId?: string
  ) => void;
  warn: (
    command: string,
    username: string,
    id: string,
    message?: string,
    guildId?: string
  ) => void;
  unauthorized: (
    command: string,
    username: string,
    id: string,
    guildId?: string
  ) => void;
}

interface DatabaseLogger {
  connected: (service: string) => void;
  error: (service: string, error: LogError) => void;
  operation: (operation: string, details?: LogMetadata) => void;
}

interface ApiLogger {
  started: (host: string, port: number) => void;
  error: (error: LogError) => void;
  request: (method: string, path: string, status: number) => void;
}

interface DiscordLogger {
  shardLaunched: (shardId: number) => void;
  shardError: (shardId: number, error: LogError) => void;
  ready: (username: string, guildCount: number) => void;
  guildJoined: (
    guildName: string,
    guildId: string,
    memberCount: number
  ) => void;
  guildLeft: (guildName: string, guildId: string) => void;
}

interface Logger {
  success: (component: string, message: string, metadata?: LogMetadata) => void;
  info: (component: string, message: string, metadata?: LogMetadata) => void;
  warn: (component: string, message: string, metadata?: LogMetadata) => void;
  error: (
    component: string,
    message: string,
    error?: LogError,
    metadata?: LogMetadata
  ) => void;
  debug: (component: string, message: string, metadata?: LogMetadata) => void;
  ready: (component: string, message: string, metadata?: LogMetadata) => void;
  unauthorized: (
    operation: string,
    username: string,
    userId: string,
    guildId?: string
  ) => void;
  commands: CommandLogger;
  database: DatabaseLogger;
  api: ApiLogger;
  discord: DiscordLogger;
}

/**
 * Centralized logger utility with consistent formatting for FluffBoost
 * Provides structured logging for different contexts with environment-aware configuration
 */

// Configure consola based on environment
const isDevelopment = env.NODE_ENV === "development";
const isProduction = env.NODE_ENV === "production";

// Set log level based on environment - more verbose in production for monitoring
consola.level = isProduction ? 3 : isDevelopment ? 4 : 3; // Info level in prod, Debug in dev

/**
 * Application logger with consistent formatting
 */
export const logger: Logger = {
  /**
   * Log successful operations
   */
  success: (component: string, message: string, metadata?: LogMetadata) => {
    consola.success({
      message: `[${component}] ${message}`,
      ...(metadata && { metadata }),
      badge: true,
    });
  },

  /**
   * Log informational messages
   */
  info: (component: string, message: string, metadata?: LogMetadata) => {
    consola.info({
      message: `[${component}] ${message}`,
      ...(metadata && { metadata }),
      badge: true,
    });
  },

  /**
   * Log warnings
   */
  warn: (component: string, message: string, metadata?: LogMetadata) => {
    consola.warn({
      message: `[${component}] ${message}`,
      ...(metadata && { metadata }),
      badge: true,
    });
  },

  /**
   * Log errors with proper error handling
   */
  error: (component: string, message: string, error?: LogError, metadata?: LogMetadata) => {
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
  debug: (component: string, message: string, metadata?: LogMetadata) => {
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
  ready: (component: string, message: string, metadata?: LogMetadata) => {
    consola.ready({
      message: `[${component}] ${message}`,
      ...(metadata && { metadata }),
      badge: true,
    });
  },

  /**
   * Log permission violations
   */
  unauthorized: (
    operation: string,
    username: string,
    userId: string,
    guildId?: string,
  ) => {
    logger.warn("Security", `Unauthorized ${operation} attempt`, {
      user: { username, id: userId },
      ...(guildId && { guild: guildId }),
    });
  },

  /**
   * Log command operations and execution tracking
   */
  commands: {
    executing: (
      command: string,
      username: string,
      id: string,
      guildId?: string,
    ) => {
      // Always log command execution in production for monitoring
      const logMethod = isProduction ? logger.info : logger.debug;
      logMethod("Command", `Executing ${command}`, {
        command,
        user: { username, id },
        ...(guildId && { guild: guildId }),
      });
    },
    success: (
      command: string,
      username: string,
      id: string,
      guildId?: string,
    ) => {
      // Always log successful commands in production
      logger.success("Command", `Successfully executed ${command}`, {
        command,
        user: { username, id },
        ...(guildId && { guild: guildId }),
      });
    },
    error: (
      command: string,
      username: string,
      id: string,
      error?: LogError,
      guildId?: string,
    ) => {
      logger.error("Command", `Error executing ${command}`, error, {
        command,
        user: { username, id },
        ...(guildId && { guild: guildId }),
      });
    },
    warn: (
      command: string,
      username: string,
      id: string,
      message?: string,
      guildId?: string,
    ) => {
      logger.warn("Command", message || `Warning executing ${command}`, {
        command,
        user: { username, id },
        ...(guildId && { guild: guildId }),
      });
    },
    unauthorized: (
      command: string,
      username: string,
      id: string,
      guildId?: string,
    ) => {
      logger.warn("Command", `Unauthorized access to ${command}`, {
        command,
        user: { username, id },
        ...(guildId && { guild: guildId }),
      });
    },
  },

  /**
   * Log database operations
   */
  database: {
    connected: (service: string) =>
      logger.success("Database", `${service} connected`),
    error: (service: string, error: LogError) =>
      logger.error("Database", `${service} connection failed`, error),
    operation: (operation: string, details?: LogMetadata) => {
      // Log important database operations in production
      const logMethod = isProduction ? logger.info : logger.debug;
      logMethod("Database", operation, details);
    },
  },

  /**
   * Log API operations
   */
  api: {
    started: (host: string, port: number) =>
      logger.ready("API", `Server listening on http://${host}:${port}`),
    error: (error: LogError) => logger.error("API", "Server error", error),
    request: (method: string, path: string, status: number) => {
      // Log all API requests in production for monitoring
      const logMethod = isProduction ? logger.info : logger.debug;
      logMethod("API", `${method} ${path} - ${status}`, {
        method,
        path,
        status,
        timestamp: new Date().toISOString(),
      });
    },
  },

  /**
   * Log Discord operations
   */
  discord: {
    shardLaunched: (shardId: number) =>
      logger.success("Discord", `Shard ${shardId} launched`),
    shardError: (shardId: number, error: LogError) =>
      logger.error("Discord", `Shard ${shardId} error`, error),
    ready: (username: string, guildCount: number) =>
      logger.ready(
        "Discord",
        `Bot ready as ${username} in ${guildCount} guilds`,
        {
          botUsername: username,
          guildCount,
          timestamp: new Date().toISOString(),
        },
      ),
    guildJoined: (guildName: string, guildId: string, memberCount: number) =>
      logger.info("Discord", `Joined guild: ${guildName}`, {
        guildId,
        guildName,
        memberCount,
        action: "guild_joined",
        timestamp: new Date().toISOString(),
      }),
    guildLeft: (guildName: string, guildId: string) =>
      logger.info("Discord", `Left guild: ${guildName}`, {
        guildId,
        guildName,
        action: "guild_left",
        timestamp: new Date().toISOString(),
      }),
  },
};

export default logger;
