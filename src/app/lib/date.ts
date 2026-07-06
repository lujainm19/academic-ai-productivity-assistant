// `Date#toISOString()` is UTC-based, so `.split("T")[0]` shifts to the
// adjacent calendar day whenever the local offset carries the clock across a
// UTC midnight boundary (e.g. evenings in US timezones, early mornings east
// of UTC). Every "what's today's date" comparison in this app needs the
// local calendar date instead.
export function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
