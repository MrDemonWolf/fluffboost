import { defineDocs, defineConfig } from "fumadocs-mdx/config";

// Two independent docs trees: one for server owners / community members, one
// for developers who run or contribute to the bot.
export const user = defineDocs({
  dir: "content/user",
});

export const developer = defineDocs({
  dir: "content/developer",
});

export default defineConfig();
