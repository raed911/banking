import { describe, expect, it } from "vitest";
import { coordsFromMapsUrl } from "./maps-link";

describe("google maps links", () => {
  it("reads the place pin from a full place URL", () => {
    expect(coordsFromMapsUrl("https://www.google.com/maps/place/Caf%C3%A9/@36.8421,10.1745,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d36.842155!4d10.176912")).toEqual({ lat: 36.842155, lng: 10.176912 });
  });
  it("reads the map center and query formats", () => {
    expect(coordsFromMapsUrl("https://www.google.com/maps/@36.80649,10.18153,18z")).toEqual({ lat: 36.80649, lng: 10.18153 });
    expect(coordsFromMapsUrl("https://maps.google.com/?q=36.8065,10.1815")).toEqual({ lat: 36.8065, lng: 10.1815 });
    expect(coordsFromMapsUrl("36.8065, 10.1815")).toEqual({ lat: 36.8065, lng: 10.1815 });
  });
  it("rejects text without coordinates", () => expect(coordsFromMapsUrl("https://maps.app.goo.gl/abc")).toBeNull());
});
