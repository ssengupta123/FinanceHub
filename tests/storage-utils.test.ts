import { describe, it, expect } from "vitest";
import {
  toSnakeCase,
  toCamelCase,
  rowToModel,
  isReasonableDate,
  sanitizeDateFields,
} from "../server/storage";

describe("toSnakeCase", () => {
  it("converts camelCase keys to snake_case", () => {
    const result = toSnakeCase({ firstName: "John", lastName: "Doe" });
    expect(result).toEqual({ first_name: "John", last_name: "Doe" });
  });

  it("handles already snake_case keys", () => {
    const result = toSnakeCase({ project_id: 1, name: "test" });
    expect(result).toEqual({ project_id: 1, name: "test" });
  });

  it("uses employee field mapping for employees table", () => {
    const result = toSnakeCase({ grossCost: 150 }, "employees");
    expect(result).toHaveProperty("gross_cost_rate", 150);
  });

  it("handles empty object", () => {
    expect(toSnakeCase({})).toEqual({});
  });

  it("preserves null values", () => {
    const result = toSnakeCase({ startDate: null });
    expect(result).toEqual({ start_date: null });
  });
});

describe("toCamelCase", () => {
  it("converts snake_case keys to camelCase", () => {
    const result = toCamelCase({ first_name: "John", last_name: "Doe" });
    expect(result).toEqual({ firstName: "John", lastName: "Doe" });
  });

  it("handles single-word keys", () => {
    const result = toCamelCase({ name: "test", id: 1 });
    expect(result).toEqual({ name: "test", id: 1 });
  });

  it("uses employee reverse mapping", () => {
    const result = toCamelCase({ gross_cost_rate: 150 });
    expect(result).toHaveProperty("grossCost", 150);
  });

  it("preserves null values", () => {
    const result = toCamelCase({ start_date: null });
    expect(result).toEqual({ startDate: null });
  });

  it("handles empty object", () => {
    expect(toCamelCase({})).toEqual({});
  });
});

describe("rowToModel", () => {
  it("converts snake_case DB row to camelCase model", () => {
    const row = { project_code: "PROJ001", name: "Test Project", id: 1 };
    const model = rowToModel<any>(row);
    expect(model.projectCode).toBe("PROJ001");
    expect(model.name).toBe("Test Project");
    expect(model.id).toBe(1);
  });

  it("converts non-integer numbers to strings", () => {
    const row = { value: 1234.56, margin_percent: 0.35 };
    const model = rowToModel<any>(row);
    expect(model.value).toBe("1234.56");
    expect(model.marginPercent).toBe("0.35");
  });

  it("preserves integer values as numbers", () => {
    const row = { id: 42, month: 3 };
    const model = rowToModel<any>(row);
    expect(model.id).toBe(42);
    expect(model.month).toBe(3);
  });

  it("formats Date objects to ISO date strings", () => {
    const row = { start_date: new Date(2026, 0, 15) };
    const model = rowToModel<any>(row);
    expect(model.startDate).toBe("2026-01-15");
  });

  it("preserves null values", () => {
    const row = { start_date: null, name: "test" };
    const model = rowToModel<any>(row);
    expect(model.startDate).toBeNull();
  });
});

describe("isReasonableDate", () => {
  it("returns true for dates within 1900-2100", () => {
    expect(isReasonableDate(new Date(2026, 0, 1))).toBe(true);
    expect(isReasonableDate(new Date(1900, 0, 1))).toBe(true);
    expect(isReasonableDate(new Date(2100, 11, 31))).toBe(true);
  });

  it("returns false for dates outside 1900-2100", () => {
    expect(isReasonableDate(new Date(1899, 11, 31))).toBe(false);
    expect(isReasonableDate(new Date(2101, 0, 1))).toBe(false);
    expect(isReasonableDate(new Date(100, 0, 1))).toBe(false);
  });
});

describe("sanitizeDateFields", () => {
  it("nullifies empty/NA date values", () => {
    const data = {
      start_date: "",
      end_date: "N/A",
      due_date: "-",
      schedule_start: null,
      name: "test",
    };
    const result = sanitizeDateFields(data);
    expect(result.start_date).toBeNull();
    expect(result.end_date).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.schedule_start).toBeNull();
    expect(result.name).toBe("test");
  });

  it("nullifies unreasonable Date objects", () => {
    const data = { start_date: new Date(1800, 0, 1) };
    const result = sanitizeDateFields(data);
    expect(result.start_date).toBeNull();
  });

  it("preserves reasonable Date objects", () => {
    const d = new Date(2026, 5, 15);
    const data = { start_date: d };
    const result = sanitizeDateFields(data);
    expect(result.start_date).not.toBeNull();
  });

  it("handles ISO date strings", () => {
    const data = { start_date: "2026-06-15" };
    const result = sanitizeDateFields(data);
    expect(result.start_date).not.toBeNull();
  });

  it("nullifies unreasonable ISO date strings", () => {
    const data = { start_date: "1800-01-01" };
    const result = sanitizeDateFields(data);
    expect(result.start_date).toBeNull();
  });

  it("skips text date columns for pipeline_opportunities", () => {
    const data = { start_date: "some-text", due_date: "some-text" };
    const result = sanitizeDateFields({ ...data }, "pipeline_opportunities");
    expect(result.start_date).toBe("some-text");
    expect(result.due_date).toBe("some-text");
  });

  it("does not touch non-date columns", () => {
    const data = { name: "test", status: "active", start_date: "2026-01-01" };
    const result = sanitizeDateFields(data);
    expect(result.name).toBe("test");
    expect(result.status).toBe("active");
  });
});
