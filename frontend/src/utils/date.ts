// French-style date/time formatters used across the app.
// Examples: "4h30", "14h" (no leading zero on hours, minutes only when non-zero).

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format an ISO datetime as a French time string, e.g. "4h30" or "14h". */
export function formatFrenchTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return m === 0 ? `${h}h` : `${h}h${pad2(m)}`;
}

/** Format an ISO datetime as "DD/MM/YYYY · 4h30". */
export function formatFrenchDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} · ${formatFrenchTime(iso)}`;
}

/** Format ISO date only (no time), e.g. "13/07/2025". */
export function formatFrenchDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
