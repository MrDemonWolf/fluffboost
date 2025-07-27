import Redis from "ioredis";
import consola from "consola";

import env from "../utils/env";

const redisClient = new Redis(env.REDIS_URL || "redis://localhost:6379/0");

export default redisClient;
