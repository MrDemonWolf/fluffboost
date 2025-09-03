import logger from "./logger";

export function info(command: string, username: string, id: string) {
  logger.info("Command", `Executing ${command}`, {
    command,
    user: { username, id },
  });
}

export function success(command: string, username: string, id: string) {
  logger.success("Command", `Successfully executed ${command}`, {
    command,
    user: { username, id },
  });
}

export function error(command: string, username: string, id: string) {
  logger.error("Command", `Error executing ${command}`, undefined, {
    command,
    user: { username, id },
  });
}

export function warn(command: string, username: string, id: string) {
  logger.warn("Command", `Warning executing ${command}`, {
    command,
    user: { username, id },
  });
}
