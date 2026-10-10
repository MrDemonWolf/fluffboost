import { z } from "zod";

import { envSchema } from "./envSchema.js";

// Bun loads .env (and .env.<NODE_ENV>, .env.local) into process.env for
// `bun run`, `bun --watch` and `bun test`, and shard processes inherit it,
// so no dotenv call is needed here.
type EnvSchema = z.infer<typeof envSchema>;
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // console.error is intentional: the logger itself depends on validated env,
  // so this failure path must not import it.
  console.error("❌ Invalid environment variables found");
  console.error(JSON.stringify(parsed.error.format(), null, 4));
  process.exit(1);
}

const env: EnvSchema = parsed.data;

export default env;
