#!/usr/bin/env node
// Applies supabase/migrations/*.sql in order through the Supabase Management API.
// Auth: the Supabase access token is injected by the environment's network proxy, or read
// from SUPABASE_ACCESS_TOKEN when running elsewhere. Never commit a token.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const ref = process.env.SUPABASE_PROJECT_REF ?? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://x.invalid").hostname.split(".")[0];
const token = process.env.SUPABASE_ACCESS_TOKEN ?? "proxy-injected";
const dir = path.resolve("supabase/migrations");
const dryRun = process.argv.includes("--dry-run");

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

const lit = (s) => `'${s.replaceAll("'", "''")}'`;

await sql(`create schema if not exists private;
  create table if not exists private.schema_migrations (version text primary key, checksum text not null, applied_at timestamptz not null default now());`);
const applied = new Map((await sql("select version, checksum from private.schema_migrations")).map((r) => [r.version, r.checksum]));
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  const body = await readFile(path.join(dir, file), "utf8");
  const checksum = createHash("sha256").update(body).digest("hex");
  if (applied.has(file)) {
    if (applied.get(file) !== checksum) console.warn(`! ${file} changed after being applied — create a new migration instead`);
    continue;
  }
  console.log(`→ ${file}${dryRun ? " (dry run)" : ""}`);
  if (dryRun) continue;
  await sql(`begin;\n${body}\n;insert into private.schema_migrations (version, checksum) values (${lit(file)}, ${lit(checksum)});\ncommit;`);
}
console.log(`✓ database up to date (${files.length} migrations)`);
