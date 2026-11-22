#!/usr/bin/env node
// Runs supabase/tests/*.sql against the project (each test rolls itself back).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ref = process.env.SUPABASE_PROJECT_REF ?? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://x.invalid").hostname.split(".")[0];
const token = process.env.SUPABASE_ACCESS_TOKEN ?? "proxy-injected";
const dir = path.resolve("supabase/tests");
let failed = 0;
for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
  const query = `begin;\n${await readFile(path.join(dir, file), "utf8")}\nrollback;`;
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (text.includes("ALL_TESTS_PASSED")) console.log(`✓ ${file}`);
  else { failed++; console.error(`✗ ${file}\n${text.slice(0, 2000)}`); }
}
process.exit(failed ? 1 : 0);
