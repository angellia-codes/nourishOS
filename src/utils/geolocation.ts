export interface GeoCoordinates {
  latitude: number
  longitude: number
  accuracy: number
}

function mapGeolocationError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission was denied. Enable location access to log a patrol.'
    case error.POSITION_UNAVAILABLE:
      return 'Unable to determine your location. Please try again.'
    case error.TIMEOUT:
      return 'Getting your location took too long. Please try again.'
    default:
      return 'Unable to get your location.'
  }
}

/** Rejects with a user-facing message rather than the raw GeolocationPositionError. */
export function getCurrentPosition(options?: PositionOptions): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      (error) => reject(new Error(mapGeolocationError(error))),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0, ...options },
    )
  })
}

/**
 * Haversine distance in meters. Client-side use is UX preview only ("you're
 * ~40m from this checkpoint") — the server independently recomputes this
 * against the checkpoint's registered location before accepting a patrol.
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const EARTH_RADIUS_METERS = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_METERS * c
}
