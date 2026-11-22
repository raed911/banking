"use client";
import { ActionForm } from "@/components/forms/action-form";
import dynamic from "next/dynamic";
import { useActionState, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Crosshair, MapPin, Search } from "lucide-react";
import { saveZone } from "@/features/geo/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";
import { PhonePreviews } from "./phone-previews";

const GeoMap = dynamic(() => import("./geo-map"), { ssr: false, loading: () => <div className="skeleton size-full" /> });
const TUNIS = { lat: 36.8065, lng: 10.1815 };

export type Zone = { id: string; name: string; address: string | null; city: string | null; latitude: number | null; longitude: number | null; geo_enabled: boolean; geo_radius_m: number; geo_message: string | null };

export function ZoneEditor({ zone, merchantName, canEdit }: { zone: Zone; merchantName: string; canEdit: boolean }) {
  const t = useTranslations("geo.zone");
  const [pos, setPos] = useState({ lat: zone.latitude ?? TUNIS.lat, lng: zone.longitude ?? TUNIS.lng });
  const [placed, setPlaced] = useState(zone.latitude != null);
  const [radius, setRadius] = useState(zone.geo_radius_m);
  const [enabled, setEnabled] = useState(zone.geo_enabled);
  const [message, setMessage] = useState(zone.geo_message ?? "");
  const [query, setQuery] = useState([zone.address, zone.city].filter(Boolean).join(", "));
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [zoomKey, setZoomKey] = useState(0);
  const [state, action] = useActionState(saveZone.bind(null, zone.id), null);
  const move = useCallback((lat: number, lng: number) => { setPos({ lat, lng }); setPlaced(true); }, []);

  async function search() {
    if (!query.trim()) return;
    setSearching(true); setSearchError(false);
    try {
      // OpenStreetMap Nominatim: one request on explicit user action (no autocomplete), per its usage policy.
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, { headers: { "Accept-Language": document.documentElement.lang } });
      const [hit] = (await res.json()) as { lat: string; lon: string }[];
      if (hit) { move(Number(hit.lat), Number(hit.lon)); setZoomKey((k) => k + 1); } else setSearchError(true);
    } catch { setSearchError(true); } finally { setSearching(false); }
  }
  function locate() {
    navigator.geolocation?.getCurrentPosition((p) => { move(p.coords.latitude, p.coords.longitude); setZoomKey((k) => k + 1); }, () => setSearchError(true), { enableHighAccuracy: true, timeout: 10000 });
  }

  return (
    <Card className="overflow-hidden">
      <ActionForm action={action}>
        <input type="hidden" name="latitude" value={placed ? pos.lat.toFixed(6) : ""} />
        <input type="hidden" name="longitude" value={placed ? pos.lng.toFixed(6) : ""} />
        <input type="hidden" name="geo_radius_m" value={radius} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-ink-900 text-lime-300"><MapPin className="size-5" /></span><div><div className="font-semibold">{zone.name}</div><div className="text-xs text-fg-muted">{[zone.address, zone.city].filter(Boolean).join(", ") || t("title")}</div></div></div>
          <label className="flex items-center gap-3 text-sm font-medium">{t("enable")}<Switch name="geo_enabled" checked={enabled} onCheckedChange={setEnabled} disabled={!canEdit} /></label>
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-3 p-5">
            <div className="flex gap-2">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} placeholder={t("search")} leading={<Search />} />
              <Button type="button" variant="secondary" onClick={search} loading={searching}>{t("searchBtn")}</Button>
              <Button type="button" variant="ghost" size="icon" onClick={locate} aria-label={t("myPosition")} title={t("myPosition")}><Crosshair /></Button>
            </div>
            {searchError && <p className="text-xs text-danger-700">{t("noResult")}</p>}
            <div className="relative z-0 h-[340px] overflow-hidden rounded-2xl border border-border"><GeoMap lat={pos.lat} lng={pos.lng} radius={radius} enabled={enabled} onMove={move} zoomKey={zoomKey} /></div>
            <p className="text-xs text-fg-muted">{t("dragHint")}</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("lat")} htmlFor={`lat-${zone.id}`}><Input id={`lat-${zone.id}`} type="number" step="0.000001" value={pos.lat.toFixed(6)} onChange={(e) => move(Number(e.target.value), pos.lng)} dir="ltr" /></Field>
              <Field label={t("lng")} htmlFor={`lng-${zone.id}`}><Input id={`lng-${zone.id}`} type="number" step="0.000001" value={pos.lng.toFixed(6)} onChange={(e) => move(pos.lat, Number(e.target.value))} dir="ltr" /></Field>
            </div>
          </div>
          <div className="space-y-5 border-t border-border bg-surface-muted/50 p-5 lg:border-s lg:border-t-0">
            <Field label={`${t("radius")} · ${radius} m`} htmlFor={`r-${zone.id}`} hint={t("radiusHint")}>
              <input id={`r-${zone.id}`} type="range" min={20} max={1000} step={10} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full accent-[#6f9a1b]" />
            </Field>
            <Field label={t("message")} htmlFor={`m-${zone.id}`} hint={`${message.length}/120 · ${t("messageHint")}`}>
              <Input id={`m-${zone.id}`} name="geo_message" maxLength={120} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("messagePlaceholder")} />
            </Field>
            <PhonePreviews merchant={merchantName} message={message || t("messagePlaceholder")} />
            <FormAlert>{state?.error ? t(state.error as "error") : null}</FormAlert>
            <FormAlert tone="success">{state?.ok ? t("saved") : null}</FormAlert>
            {canEdit && <SubmitButton className="w-full">{t("save")}</SubmitButton>}
          </div>
        </div>
      </ActionForm>
    </Card>
  );
}
