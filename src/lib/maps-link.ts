/** Extracts coordinates from a Google Maps URL (full links; short links are resolved server-side first). */
export function coordsFromMapsUrl(url: string): { lat: number; lng: number } | null {
  const u = decodeURIComponent(url);
  const pats = [
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, // place pin (most precise)
    /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, // map center
    /[?&](?:q|query|ll|center|destination)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /\/place\/(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /^(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)$/, // plain "lat, lng"
  ];
  for (const p of pats) {
    const m = p.exec(u.trim());
    if (m) {
      const lat = Number(m[1]), lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

export const SHORT_MAPS_HOSTS = ["maps.app.goo.gl", "goo.gl", "g.co"];
export const GOOGLE_MAPS_HOSTS = /^(www\.)?(google\.[a-z.]+|maps\.google\.[a-z.]+)$/;
