"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Fetches a short-lived signed QR payload and refreshes it before it expires. */
export function LiveQr({ token }: { token: string }) {
  const [svg, setSvg] = useState("");
  const [progress, setProgress] = useState(1);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let ticker: ReturnType<typeof setInterval>;
    let alive = true;
    async function refresh() {
      try {
        const res = await fetch(`/api/card/${token}/qr`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const { token: payload, expiresAt } = (await res.json()) as { token: string; expiresAt: number };
        if (!alive) return;
        setSvg(await QRCode.toString(payload, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#101828", light: "#FFFFFF" } }));
        const total = expiresAt - Date.now();
        clearInterval(ticker);
        ticker = setInterval(() => setProgress(Math.max(0, (expiresAt - Date.now()) / total)), 500);
        timer = setTimeout(refresh, Math.max(5_000, total - 20_000));
      } catch {
        timer = setTimeout(refresh, 5_000);
      }
    }
    refresh();
    const onVisible = () => document.visibilityState === "visible" && (clearTimeout(timer), refresh());
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; clearTimeout(timer); clearInterval(ticker); document.removeEventListener("visibilitychange", onVisible); };
  }, [token]);

  return (
    <div className="relative">
      {svg ? (
        // SVG produced locally by the qrcode library
        <div className="size-full animate-fade-in [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="skeleton size-full rounded-lg" />
      )}
      <div className="absolute -bottom-3 inset-x-6 h-1 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-lime-500 transition-[width] duration-500" style={{ width: `${progress * 100}%` }} /></div>
    </div>
  );
}
