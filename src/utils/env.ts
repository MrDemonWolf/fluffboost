import { z } from "zod";
import dotenv from "dotenv";

import { envSchema } from "./envSchema.js";

dotenv.config();

type EnvSchema = z.infer<typeof envSchema>;
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables found");
  console.error(JSON.stringify(parsed.error.format(), null, 4));
  process.exit(1);
}

const env: EnvSchema = parsed.data;

export { envSchema };
export default env;
