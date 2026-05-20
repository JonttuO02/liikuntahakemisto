export function isNightHour(): boolean {
  const h = new Date().getHours()
  return h < 7 || h >= 20
}

// Matches the day reference screenshot — clean light with blue water
export const DAY_MAP_STYLES = [
  { featureType: 'poi',         stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',     stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water',    elementType: 'geometry.fill',       stylers: [{ color: '#9bc4de' }] },
  { featureType: 'water',    elementType: 'labels.text.fill',    stylers: [{ color: '#5b8fa8' }] },
  { featureType: 'landscape',elementType: 'geometry.fill',       stylers: [{ color: '#f2f6fa' }] },
  { featureType: 'landscape.natural', elementType: 'geometry.fill', stylers: [{ color: '#d1e8d4' }] },
  { featureType: 'road.highway',  elementType: 'geometry.fill',   stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway',  elementType: 'geometry.stroke', stylers: [{ color: '#dce8f0' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill',   stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.local',    elementType: 'geometry.fill',   stylers: [{ color: '#f8fafc' }] },
  { featureType: 'road',          elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'administrative', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
]

// "Aubergine" — exact JSON provided by user
export const NIGHT_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
  // Hide POI, transit and icons — same content rules as day theme
  { featureType: 'poi',         stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park',    stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',     stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
]
