const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinGeofence(
  userLat: number,
  userLng: number,
  campusLat: number,
  campusLng: number,
  radiusM: number,
): boolean {
  return haversineDistanceM(userLat, userLng, campusLat, campusLng) <= radiusM;
}

export interface GeofenceResult {
  allowed: boolean;
  distanceM: number;
  message?: string;
}

export function checkGeofence(
  userLat: number,
  userLng: number,
  campusLat: number | null,
  campusLng: number | null,
  radiusM: number,
): GeofenceResult {
  if (campusLat == null || campusLng == null) {
    return { allowed: false, distanceM: Infinity, message: "School geofence not configured" };
  }

  const distanceM = haversineDistanceM(userLat, userLng, campusLat, campusLng);
  if (distanceM > radiusM) {
    return {
      allowed: false,
      distanceM,
      message: `You are ${Math.round(distanceM)}m from campus (limit: ${radiusM}m)`,
    };
  }

  return { allowed: true, distanceM };
}
