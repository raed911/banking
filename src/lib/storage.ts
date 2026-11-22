export const BRAND_BUCKET = "brand-assets";

export function publicAssetUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BRAND_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
