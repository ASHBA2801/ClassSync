"use client";

/**
 * Google Maps campus location picker — used ONLY during school registration
 * and geofence settings. Coordinates saved here are stored on the School record
 * and used server-side for attendance geofencing (see lib/geofence).
 * Attendance never loads or calls Google Maps.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
  useMapsLibrary,
  type MapMouseEvent as VisMapMouseEvent,
} from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FALLBACK_CENTER = { lat: 12.9716, lng: 77.5946 };

interface CampusLocationPickerProps {
  defaultLat?: number | null;
  defaultLng?: number | null;
  onLocationChange?: (lat: number, lng: number) => void;
}

function MapPanHandler({ position }: { position: google.maps.LatLngLiteral | null }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !position) return;
    map.panTo(position);
  }, [map, position]);

  return null;
}

function PlaceSearch({
  onPlaceSelect,
}: {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary("places");
  const onPlaceSelectRef = useRef(onPlaceSelect);

  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const autocomplete = new places.Autocomplete(inputRef.current, {
      fields: ["geometry", "name", "formatted_address"],
    });

    const listener = autocomplete.addListener("place_changed", () => {
      onPlaceSelectRef.current(autocomplete.getPlace());
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [places]);

  return <Input ref={inputRef} placeholder="Search campus address..." type="text" autoComplete="off" />;
}

function CampusLocationPickerInner({
  defaultLat,
  defaultLng,
  mapId,
  onLocationChange,
}: CampusLocationPickerProps & { mapId: string }) {
  const hasDefaults = defaultLat != null && defaultLng != null;
  const geoUnavailable =
    typeof navigator !== "undefined" && !navigator.geolocation;

  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(() => {
    if (hasDefaults) return { lat: defaultLat!, lng: defaultLng! };
    return FALLBACK_CENTER;
  });
  const [loading, setLoading] = useState(() => !hasDefaults && !geoUnavailable);

  const updatePosition = useCallback(
    (lat: number, lng: number) => {
      const next = { lat, lng };
      setPosition(next);
      onLocationChange?.(lat, lng);
    },
    [onLocationChange],
  );

  useEffect(() => {
    if (hasDefaults || geoUnavailable) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      () => {
        setPosition(FALLBACK_CENTER);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [hasDefaults, geoUnavailable]);

  const handlePlaceSelect = useCallback(
    (place: google.maps.places.PlaceResult) => {
      const loc = place.geometry?.location;
      if (!loc) return;
      updatePosition(loc.lat(), loc.lng());
    },
    [updatePosition],
  );

  const handleDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (lat == null || lng == null) return;
      updatePosition(lat, lng);
    },
    [updatePosition],
  );

  const handleMapClick = useCallback(
    (e: VisMapMouseEvent) => {
      const latLng = e.detail.latLng;
      if (!latLng) return;
      updatePosition(latLng.lat, latLng.lng);
    },
    [updatePosition],
  );

  return (
    <div className="space-y-2">
      <Label>Campus Location</Label>
      <PlaceSearch onPlaceSelect={handlePlaceSelect} />

      <div className="relative h-[300px] w-full overflow-hidden rounded-md border border-zinc-200">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-zinc-600">
            Detecting location...
          </div>
        )}
        <Map
          mapId={mapId}
          defaultCenter={FALLBACK_CENTER}
          defaultZoom={15}
          gestureHandling="greedy"
          disableDefaultUI
          style={{ width: "100%", height: "100%" }}
          onClick={handleMapClick}
        >
          {position && (
            <>
              <AdvancedMarker position={position} draggable onDragEnd={handleDragEnd} />
              <MapPanHandler position={position} />
            </>
          )}
        </Map>
      </div>

      {position ? (
        <p className="text-xs text-zinc-500">
          Selected: {position.lat.toFixed(6)}, {position.lng.toFixed(6)} — used for attendance
          geofencing via device GPS
        </p>
      ) : (
        <p className="text-xs text-zinc-500">Select a location on the map or search for an address.</p>
      )}

      <input type="hidden" name="campusLat" value={position?.lat ?? ""} />
      <input type="hidden" name="campusLng" value={position?.lng ?? ""} />
    </div>
  );
}

export function CampusLocationPicker({
  defaultLat,
  defaultLng,
  onLocationChange,
}: CampusLocationPickerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

  if (!apiKey || !mapId) {
    return (
      <div className="space-y-2">
        <Label>Campus Location</Label>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Google Maps is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and
          NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID in your environment.
        </div>
        <input type="hidden" name="campusLat" value={defaultLat ?? ""} />
        <input type="hidden" name="campusLng" value={defaultLng ?? ""} />
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["places"]}>
      <CampusLocationPickerInner
        defaultLat={defaultLat}
        defaultLng={defaultLng}
        mapId={mapId}
        onLocationChange={onLocationChange}
      />
    </APIProvider>
  );
}
