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
import { Label } from "@/components/ui/label";

const FALLBACK_CENTER = { lat: 12.9716, lng: 77.5946 };

interface CampusLocationPickerProps {
  defaultLat?: number | null;
  defaultLng?: number | null;
  onLocationChange?: (lat: number, lng: number) => void;
}

function readLatLng(location: google.maps.LatLng | null | undefined): { lat: number; lng: number } | null {
  if (!location) return null;
  return { lat: location.lat(), lng: location.lng() };
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
  onPlaceSelect: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const places = useMapsLibrary("places");
  const onPlaceSelectRef = useRef(onPlaceSelect);

  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  useEffect(() => {
    if (!places || !containerRef.current) return;

    const PlaceAutocompleteElement = places.PlaceAutocompleteElement;
    if (!PlaceAutocompleteElement) return;

    const autocomplete = new PlaceAutocompleteElement({
      placeholder: "Search campus address...",
    });

    autocomplete.style.width = "100%";
    autocomplete.style.border = "1px solid var(--border)";
    autocomplete.style.borderRadius = "var(--radius-sm)";
    autocomplete.style.backgroundColor = "var(--surface)";

    const handleSelect = async (event: Event) => {
      const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
      const place = selectEvent.placePrediction.toPlace();
      await place.fetchFields({ fields: ["location"] });

      const coords = readLatLng(place.location);
      if (!coords) return;
      onPlaceSelectRef.current(coords.lat, coords.lng);
    };

    autocomplete.addEventListener("gmp-select", handleSelect);
    containerRef.current.replaceChildren(autocomplete);

    return () => {
      autocomplete.removeEventListener("gmp-select", handleSelect);
      containerRef.current?.replaceChildren();
    };
  }, [places]);

  return <div ref={containerRef} className="w-full" />;
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
    (lat: number, lng: number) => {
      updatePosition(lat, lng);
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

      <div className="relative h-[300px] w-full overflow-hidden rounded-[var(--radius-md)] border border-border">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80 text-sm text-text-2">
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
        <p className="text-xs text-text-2">
          Selected: {position.lat.toFixed(6)}, {position.lng.toFixed(6)} — used for attendance
          geofencing via device GPS
        </p>
      ) : (
        <p className="text-xs text-text-2">Select a location on the map or search for an address.</p>
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
