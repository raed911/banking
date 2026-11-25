import { z } from "zod";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const optInt = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export const programSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().or(z.literal("")),
  type: z.enum(["stamps", "points", "visits"]),
  stamps_required: optInt(1, 50).optional(),
  points_per_unit: z.coerce.number().positive().max(1000).optional(),
  reward_title: z.string().trim().max(80).optional().or(z.literal("")),
  welcome_bonus: optInt(0, 10000).default(0),
  cooldown_minutes: optInt(0, 1440).default(5),
  max_earn_per_day: optInt(1, 100000).default(3),
  max_earn_per_transaction: optInt(1, 100000).default(1),
  terms: z.string().trim().max(1000).optional().or(z.literal("")),
  referral_enabled: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  referral_reward: optInt(1, 1000).default(1),
}).superRefine((v, ctx) => {
  if (v.type !== "points" && !v.stamps_required) ctx.addIssue({ code: "custom", path: ["stamps_required"], message: "required" });
  if (v.type === "points" && !v.points_per_unit) ctx.addIssue({ code: "custom", path: ["points_per_unit"], message: "required" });
});

export const designSchema = z.object({
  background_color: hex, foreground_color: hex, label_color: hex, accent_color: hex,
  stamp_icon: z.enum(["coffee", "croissant", "pizza", "scissors", "bag", "star", "heart", "sparkles", "icecream", "dumbbell"]),
  logo_text: z.string().trim().max(40).optional().or(z.literal("")),
  logo_path: z.string().max(300).nullable().optional(),
  strip_path: z.string().max(300).nullable().optional(),
});

export const rewardSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().or(z.literal("")),
  cost: optInt(1, 1_000_000),
  stock: z.union([z.literal(""), optInt(0, 1_000_000)]).optional(),
  is_active: z.coerce.boolean().default(true),
});

export const linkSchema = z.object({
  name: z.string().trim().min(1).max(60),
  require_phone: z.coerce.boolean().default(false),
  require_email: z.coerce.boolean().default(false),
  collect_birthday: z.coerce.boolean().default(false),
});

/** WCAG relative-luminance contrast ratio between two hex colors. */
export function contrastRatio(a: string, b: string) {
  const lum = (h: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}
