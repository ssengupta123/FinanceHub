export function getCurrentFy(): string {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const fyStart = m >= 6 ? y : y - 1;
  return String(fyStart).slice(2) + "-" + String(fyStart + 1).slice(2);
}

export function getFyFromDate(dateStr: string | Date | null | undefined): string | null {
  if (!dateStr) return null;
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return null;
  const m = d.getMonth();
  const y = d.getFullYear();
  const fyStart = m >= 6 ? y : y - 1;
  return String(fyStart).slice(2) + "-" + String(fyStart + 1).slice(2);
}

export function getFyOptions(existing: string[]): string[] {
  const current = getCurrentFy();
  const set = new Set(existing);
  set.add(current);
  return Array.from(set).sort();
}
