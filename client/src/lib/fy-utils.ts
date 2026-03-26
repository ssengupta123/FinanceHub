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
  if (Number.isNaN(d.getTime())) return null;
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

export function getFyDateRange(fy: string): { fyStart: Date; fyEnd: Date } | null {
  const parts = fy.split("-");
  if (parts.length !== 2) return null;
  const fyStartYear = 2000 + Number.parseInt(parts[0], 10);
  return {
    fyStart: new Date(fyStartYear, 6, 1),       // July 1
    fyEnd: new Date(fyStartYear + 1, 5, 30),    // June 30
  };
}

export function getElapsedFyMonths(fy: string): number {
  const now = new Date();
  const parts = fy.split("-");
  if (parts.length !== 2) return 0;
  const fyStartYear = 2000 + Number.parseInt(parts[0], 10);
  const fyStart = new Date(fyStartYear, 6, 1);
  const fyEnd = new Date(fyStartYear + 1, 5, 30, 23, 59, 59);
  if (now < fyStart) return 0;
  if (now > fyEnd) return 12;
  const calMonth = now.getMonth();
  const fyMonth = calMonth >= 6 ? calMonth - 6 + 1 : calMonth + 6 + 1;
  return fyMonth;
}

export interface FyElapsedInfo {
  completedMonths: number;
  currentFyMonth: number;
  dayFraction: number;
  isCurrentFy: boolean;
}

export function getElapsedFyInfo(fy: string): FyElapsedInfo {
  const now = new Date();
  const parts = fy.split("-");
  if (parts.length !== 2) return { completedMonths: 0, currentFyMonth: 0, dayFraction: 0, isCurrentFy: false };
  const fyStartYear = 2000 + Number.parseInt(parts[0], 10);
  const fyStart = new Date(fyStartYear, 6, 1);
  const fyEnd = new Date(fyStartYear + 1, 5, 30, 23, 59, 59);
  if (now < fyStart) return { completedMonths: 0, currentFyMonth: 0, dayFraction: 0, isCurrentFy: false };
  if (now > fyEnd) return { completedMonths: 12, currentFyMonth: 12, dayFraction: 0, isCurrentFy: false };
  const calMonth = now.getMonth();
  const calYear = now.getFullYear();
  const fyMonth = calMonth >= 6 ? calMonth - 6 + 1 : calMonth + 6 + 1;
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const fraction = dayOfMonth / daysInMonth;
  return {
    completedMonths: fyMonth - 1,
    currentFyMonth: fyMonth,
    dayFraction: fraction,
    isCurrentFy: true,
  };
}
