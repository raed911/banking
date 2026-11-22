import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20),
  VAYRO_ENCRYPTION_KEY: z.string().regex(/^[A-Za-z0-9+/]{43}=$/, "must be 32 random bytes, base64"),
  QR_SIGNING_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(32),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

/** Lazily validated so that pages not needing secrets can still build. */
export function serverEnv(): ServerEnv {
  if (!cached) cached = serverSchema.parse(process.env);
  return cached;
}
