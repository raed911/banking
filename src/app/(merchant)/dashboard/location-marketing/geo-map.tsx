"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

const pin = L.divIcon({
  className: "",
  html: `<div style="transform:translate(-50%,-100%);display:grid;place-items:center"><div style="width:36px;height:36px;border-radius:12px 12px 12px 2px;transform:rotate(-45deg);background:#101828;box-shadow:0 8px 20px rgba(16,24,40,.35);display:grid;place-items:center;border:2px solid #C6F36B"><div style="width:10px;height:10px;border-radius:999px;background:#C6F36B"></div></div></div>`,
  iconSize: [0, 0],
});

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], zoom ?? map.getZoom(), { animate: true }); }, [lat, lng, zoom, map]);
  return null;
}
function ClickToMove({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMove(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function GeoMap({ lat, lng, radius, enabled, onMove, zoomKey }: { lat: number; lng: number; radius: number; enabled: boolean; onMove: (lat: number, lng: number) => void; zoomKey?: number }) {
  const handlers = useMemo(() => ({ dragend: (e: L.LeafletEvent) => { const p = (e.target as L.Marker).getLatLng(); onMove(p.lat, p.lng); } }), [onMove]);
  return (
    <MapContainer center={[lat, lng]} zoom={17} scrollWheelZoom={false} className="size-full" attributionControl>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' maxZoom={20} />
      <Recenter lat={lat} lng={lng} zoom={zoomKey ? 17 : undefined} />
      <ClickToMove onMove={onMove} />
      <Circle center={[lat, lng]} radius={radius} pathOptions={{ color: enabled ? "#6f9a1b" : "#98a2b3", weight: 2, fillColor: enabled ? "#C6F36B" : "#c3cad6", fillOpacity: 0.28, dashArray: enabled ? undefined : "6 6" }} />
      <Marker position={[lat, lng]} draggable icon={pin} eventHandlers={handlers} />
    </MapContainer>
  );
}
