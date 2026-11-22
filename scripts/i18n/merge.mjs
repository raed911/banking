// Usage: node scripts/i18n/merge.mjs <namespace> <file.json>  (file has {fr:{…},en:{…},ar:{…}})
import { readFileSync, writeFileSync } from "node:fs";
const [ns, file] = process.argv.slice(2);
const data = JSON.parse(readFileSync(file, "utf8"));
for (const locale of ["fr", "en", "ar"]) {
  if (!data[locale]) throw new Error(`missing ${locale}`);
  const p = `src/messages/${locale}.json`;
  const msgs = JSON.parse(readFileSync(p, "utf8"));
  msgs[ns] = data[locale];
  writeFileSync(p, JSON.stringify(msgs, null, 2) + "\n");
}
console.log(`merged ${ns}`);
