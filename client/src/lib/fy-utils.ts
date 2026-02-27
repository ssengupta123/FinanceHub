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
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function getElapsedFyMonths(fy: string): number {
  const now = new Date();
  const parts = fy.split("-");
  if (parts.length !== 2) return 0;
  const fyStartYear = 2000 + parseInt(parts[0], 10);
  const fyStart = new Date(fyStartYear, 6, 1);
  const fyEnd = new Date(fyStartYear + 1, 5, 30, 23, 59, 59);
  if (now < fyStart) return 0;
  if (now > fyEnd) return 12;
  const calMonth = now.getMonth();
  const fyMonth = calMonth >= 6 ? calMonth - 6 + 1 : calMonth + 6 + 1;
  return fyMonth;
}
