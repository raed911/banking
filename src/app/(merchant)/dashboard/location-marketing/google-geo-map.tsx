"use client";
import { useEffect, useRef } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";

function RadiusCircle({ lat, lng, radius, enabled }: { lat: number; lng: number; radius: number; enabled: boolean }) {
  const map = useMap();
  const circle = useRef<google.maps.Circle | null>(null);
  useEffect(() => {
    if (!map) return;
    circle.current ??= new google.maps.Circle({ map, clickable: false });
    circle.current.setOptions({ center: { lat, lng }, radius, strokeColor: enabled ? "#6f9a1b" : "#98a2b3", strokeWeight: 2, fillColor: enabled ? "#C6F36B" : "#c3cad6", fillOpacity: 0.28 });
  }, [map, lat, lng, radius, enabled]);
  useEffect(() => () => circle.current?.setMap(null), []);
  return null;
}

function Recenter({ lat, lng, zoomKey }: { lat: number; lng: number; zoomKey?: number }) {
  const map = useMap();
  useEffect(() => { if (map && zoomKey) { map.panTo({ lat, lng }); map.setZoom(18); } }, [map, zoomKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Google Maps variant of the geofence editor map (used when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set). */
export default function GoogleGeoMap({ apiKey, lat, lng, radius, enabled, onMove, zoomKey }: { apiKey: string; lat: number; lng: number; radius: number; enabled: boolean; onMove: (lat: number, lng: number) => void; zoomKey?: number }) {
  return (
    <APIProvider apiKey={apiKey} libraries={["geocoding"]}>
      <Map defaultCenter={{ lat, lng }} defaultZoom={17} gestureHandling="cooperative" disableDefaultUI zoomControl mapTypeControl={false} streetViewControl={false} clickableIcons={false}
        onClick={(e) => e.detail.latLng && onMove(e.detail.latLng.lat, e.detail.latLng.lng)} className="size-full">
        <Marker position={{ lat, lng }} draggable onDragEnd={(e) => e.latLng && onMove(e.latLng.lat(), e.latLng.lng())} />
        <RadiusCircle lat={lat} lng={lng} radius={radius} enabled={enabled} />
        <Recenter lat={lat} lng={lng} zoomKey={zoomKey} />
      </Map>
    </APIProvider>
  );
}
