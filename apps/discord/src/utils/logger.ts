import consola from "consola";
import env from "./env.js";

type LogMetadata = Record<string, unknown>;
type LogError = unknown;
type Level = "success" | "info" | "warn" | "error" | "debug" | "ready";

/**
 * Centralized logger utility with consistent formatting for FluffBoost.
 *
 * Every level renders through emit(), which passes the error and metadata to consola as
 * positional args. consola only prints `args`, so extra keys on a single log object
 * (the previous `{ message, error, metadata }` shape) were silently dropped.
 */

const isProduction = env.NODE_ENV === "production";

// Debug output only in development; info and above everywhere else.
consola.level = env.NODE_ENV === "development" ? 4 : 3;

const REDACTED = "[REDACTED]";
// Embedded URL passwords shorter than this are skipped so common words are not mangled.
const MIN_PASSWORD_LENGTH = 8;

/**
 * Connection strings and the bot token must never reach the logs, even when a driver
 * echoes them back inside an error message, stack, cause, or nested metadata.
 */
function collectSecrets(): string[] {
  const secrets = new Set<string>();
  for (const value of [env.DATABASE_URL, env.REDIS_URL, env.DISCORD_APPLICATION_BOT_TOKEN]) {
    if (value.length === 0) {
      continue;
    }
    secrets.add(value);
    try {
      const { password } = new URL(value);
      if (password.length >= MIN_PASSWORD_LENGTH) {
        secrets.add(password);
        secrets.add(decodeURIComponent(password));
      }
    } catch {
      // Not a URL (the bot token) or a malformed escape; the full value is still redacted.
    }
  }
  // Longest first so a full URL is replaced before the password embedded in it.
  return [...secrets].sort((a, b) => b.length - a.length);
}

const secrets = collectSecrets();

function redact(text: string): string {
  let result = text;
  for (const secret of secrets) {
    result = result.split(secret).join(REDACTED);
  }
  return result;
}

/**
 * Redaction happens at the sink: consola's reporters format every arg (messages, Error
 * stacks and causes, nested metadata, class instances) into one line and write it to
 * options.stdout/stderr. Wrapping those streams redacts exactly what reaches the logs,
 * without copying or inspecting payloads, and callers' errors are never mutated.
 */
function redactingStream(stream: NodeJS.WriteStream): NodeJS.WriteStream {
  // Inherit the TTY properties (columns, isTTY, hasColors) reporters read from the stream.
  const wrapped: NodeJS.WriteStream = Object.create(stream);
  wrapped.write = (chunk: string) => stream.write(redact(chunk));
  return wrapped;
}

consola.options.stdout = redactingStream(process.stdout);
consola.options.stderr = redactingStream(process.stderr);

function emit(level: Level, component: string, message: string, err?: LogError, metadata?: LogMetadata): void {
  const extra: LogError[] = [];
  if (err !== undefined && err !== null) {
    extra.push(err);
  }
  if (metadata) {
    extra.push(metadata);
  }
  consola[level](`[${component}] ${message}`, ...extra);
}

const success = (component: string, message: string, metadata?: LogMetadata) =>
  emit("success", component, message, undefined, metadata);
const info = (component: string, message: string, metadata?: LogMetadata) =>
  emit("info", component, message, undefined, metadata);
const warn = (component: string, message: string, metadata?: LogMetadata) =>
  emit("warn", component, message, undefined, metadata);
const error = (component: string, message: string, err?: LogError, metadata?: LogMetadata) =>
  emit("error", component, message, err, metadata);
// consola.level filters debug outside development.
const debug = (component: string, message: string, metadata?: LogMetadata) =>
  emit("debug", component, message, undefined, metadata);
const ready = (component: string, message: string, metadata?: LogMetadata) =>
  emit("ready", component, message, undefined, metadata);

// Info in production for monitoring, debug elsewhere.
const operational = isProduction ? info : debug;

const commandMeta = (command: string, username: string, id: string, guildId?: string) => ({
  command,
  user: { username, id },
  ...(guildId && { guild: guildId }),
});

/**
 * Application logger with consistent formatting
 */
const logger = {
  success,
  info,
  warn,
  error,
  debug,
  ready,

  /**
   * Log permission violations. All denials share the "Security" component.
   */
  unauthorized: (operation: string, username: string, userId: string, guildId?: string) =>
    warn("Security", `Unauthorized ${operation} attempt`, {
      user: { username, id: userId },
      ...(guildId && { guild: guildId }),
    }),

  /**
   * Log command execution. Routine executing/success lines are debug-only to keep user
   * identifiers out of production logs; warnings and errors keep IDs for incident response.
   */
  commands: {
    executing: (command: string, username: string, id: string, guildId?: string) =>
      debug("Discord - Command", `Executing ${command}`, commandMeta(command, username, id, guildId)),
    success: (command: string, username: string, id: string, guildId?: string) =>
      debug("Discord - Command", `Successfully executed ${command}`, commandMeta(command, username, id, guildId)),
    error: (command: string, username: string, id: string, err?: LogError, guildId?: string) =>
      error("Discord - Command", `Error executing ${command}`, err, commandMeta(command, username, id, guildId)),
    warn: (command: string, username: string, id: string, message?: string, guildId?: string) =>
      warn("Discord - Command", message || `Warning executing ${command}`, commandMeta(command, username, id, guildId)),
    unauthorized: (command: string, username: string, id: string, guildId?: string) =>
      warn("Security", `Unauthorized access to ${command}`, commandMeta(command, username, id, guildId)),
  },

  /**
   * Log database operations
   */
  database: {
    connected: (service: string) => success("Database", `${service} connected`),
    error: (service: string, err: LogError) => error("Database", `${service} connection failed`, err),
    operation: (operation: string, details?: LogMetadata) => operational("Database", operation, details),
  },

  /**
   * Log API operations
   */
  api: {
    // IPv6 literals (e.g. the unspecified "::") need brackets to form a usable URL.
    started: (host: string, port: number) =>
      ready("API", `Server listening on http://${host.includes(":") ? `[${host}]` : host}:${port}`),
    error: (err: LogError) => error("API", "Server error", err),
    request: (method: string, path: string, status: number) =>
      operational("API", `${method} ${path} - ${status}`, { method, path, status }),
  },

  /**
   * Log Discord operations
   */
  discord: {
    shardLaunched: (shardId: number) => success("Discord - Event (Shard Launched)", `Shard ${shardId} launched`),
    shardError: (shardId: number, err: LogError) =>
      error("Discord - Event (Shard Error)", `Shard ${shardId} error`, err),
    ready: (username: string, guildCount: number) =>
      ready("Discord - Event (Ready)", `Bot ready as ${username} in ${guildCount} guilds`, {
        botUsername: username,
        guildCount,
      }),
    guildJoined: (guildName: string, guildId: string, memberCount: number) =>
      info("Discord", `Joined guild: ${guildName}`, { guildId, guildName, memberCount, action: "guild_joined" }),
    guildLeft: (guildName: string, guildId: string) =>
      info("Discord - Event (Guild Delete)", `Left guild: ${guildName}`, { guildId, guildName, action: "guild_left" }),
  },
};

export default logger;
