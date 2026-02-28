import { describe, it, expect } from "vitest";
import { toNum, toDecimal, excelDateToISOString } from "../server/routes";

describe("toNum", () => {
  it("returns '0' for null/undefined/empty", () => {
    expect(toNum(null)).toBe("0");
    expect(toNum(undefined)).toBe("0");
    expect(toNum("")).toBe("0");
  });

  it("formats numbers to 2 decimal places", () => {
    expect(toNum(1234.5678)).toBe("1234.57");
    expect(toNum(100)).toBe("100.00");
    expect(toNum(0)).toBe("0.00");
  });

  it("parses numeric strings", () => {
    expect(toNum("42.5")).toBe("42.50");
    expect(toNum("1000")).toBe("1000.00");
  });

  it("returns '0' for non-numeric strings", () => {
    expect(toNum("abc")).toBe("0");
    expect(toNum("N/A")).toBe("0");
  });

  it("handles negative numbers", () => {
    expect(toNum(-50.123)).toBe("-50.12");
  });
});

describe("toDecimal", () => {
  it("returns '0' for null/undefined/empty", () => {
    expect(toDecimal(null)).toBe("0");
    expect(toDecimal(undefined)).toBe("0");
    expect(toDecimal("")).toBe("0");
  });

  it("formats numbers to 4 decimal places", () => {
    expect(toDecimal(0.35)).toBe("0.3500");
    expect(toDecimal(1.23456789)).toBe("1.2346");
    expect(toDecimal(100)).toBe("100.0000");
  });

  it("parses numeric strings", () => {
    expect(toDecimal("0.1234")).toBe("0.1234");
    expect(toDecimal("42")).toBe("42.0000");
  });

  it("returns '0' for non-numeric strings", () => {
    expect(toDecimal("abc")).toBe("0");
  });
});

describe("excelDateToISOString", () => {
  it("returns null for falsy values", () => {
    expect(excelDateToISOString(null)).toBeNull();
    expect(excelDateToISOString(undefined)).toBeNull();
    expect(excelDateToISOString("")).toBeNull();
    expect(excelDateToISOString(0)).toBeNull();
  });

  it("converts Excel serial date numbers", () => {
    const result = excelDateToISOString(44927);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("passes through ISO date strings", () => {
    expect(excelDateToISOString("2026-03-15")).toBe("2026-03-15");
  });

  it("returns null for non-numeric non-date strings", () => {
    expect(excelDateToISOString("abc")).toBeNull();
  });

  it("handles string numbers by converting them", () => {
    const result = excelDateToISOString("44927");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
