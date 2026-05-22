export function isNightHour(): boolean {
  const h = new Date().getHours()
  return h < 7 || h >= 20
}
