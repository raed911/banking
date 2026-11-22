export const INDUSTRIES = ["cafe", "restaurant", "bakery", "beauty", "retail", "fitness", "grocery", "other"] as const;
export type Industry = (typeof INDUSTRIES)[number];
