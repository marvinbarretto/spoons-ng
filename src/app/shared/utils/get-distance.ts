export function getDistanceKm(a: { lat: number, lng: number }, b: { lat: number, lng: number }): number {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  // ✅ FIXED: Correct Haversine formula
  const aVal = Math.sin(dLat / 2) ** 2 +
               Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

function toRad(deg: number): number {
  return deg * Math.PI / 180;
}

export function formatDistance(distanceInMeters: number): string {
  const km = distanceInMeters / 1000;

  if (km < 0.1) {
    return `${Math.round(distanceInMeters)}m away`;
  } else if (km < 1) {
    return `${Math.round(km * 100) / 100}km away`;
  } else {
    return `${km.toFixed(1)}km away`;
  }
}
