import { build } from "esbuild";
import { existsSync, writeFileSync } from "node:fs";
if (existsSync(".env") && process.loadEnvFile) process.loadEnvFile(".env");
const url = process.env.PUBLIC_SUPABASE_URL?.trim() || "";
const key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || "";
const demo = process.env.PUBLIC_DEMO_MODE === "true";
if (Boolean(url) !== Boolean(key))
  throw Error(
    "Set both PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
if (url && new URL(url).protocol !== "https:")
  throw Error("Supabase URL must use HTTPS.");
if (key) {
  let valid = key.startsWith("sb_publishable_");
  if (!valid) {
    try {
      valid =
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role === "anon";
    } catch {}
  }
  if (!valid)
    throw Error(
      "Use a Supabase publishable key or legacy anon key. Secret/service-role keys must never be bundled.",
    );
}
if (demo && url)
  throw Error("Disable PUBLIC_DEMO_MODE when connecting a Supabase project.");
writeFileSync(
  "dist/config.js",
  "window.FRA_CONFIG=" +
    JSON.stringify({ supabaseUrl: url, supabaseKey: key, demo }) +
    ";\n",
);
await build({
  entryPoints: ["src/app.js"],
  bundle: true,
  minify: true,
  outfile: "dist/app.js",
  target: ["es2022"],
});
console.log(
  `Built FRA (${url ? "Supabase" : demo ? "explicit demo" : "awaiting configuration"}).`,
);
