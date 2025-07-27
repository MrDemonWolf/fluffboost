import consola from "consola";

export function info(command: string, username: string, id: string) {
  consola.info({
    message: `* Executing command ${command} from ${username} (${id})`,
    badge: true,
    timestamp: new Date(),
  });
}
export function success(command: string, username: string, id: string) {
  consola.success({
    message: `* Successfully executed comand ${command} from ${username} (${id})`,
    badge: true,
    timestamp: new Date(),
  });
}

export function error(command: string, username: string, id: string) {
  consola.error({
    message: `* Error executing command ${command} from ${username} (${id})`,
    badge: true,
    timestamp: new Date(),
  });
}
export function warn(command: string, username: string, id: string) {
  consola.warn({
    message: `* Warning executing command ${command} from ${username} (${id})`,
    badge: true,
    timestamp: new Date(),
  });
}
