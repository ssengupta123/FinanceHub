import { describe, it, expect } from "vitest";
import {
  toSnakeCase,
  toCamelCase,
  rowToModel,
  isReasonableDate,
  sanitizeStringDateValue,
  sanitizeSingleDateField,
  sanitizeDateFields,
  buildVatNameList,
} from "../server/storage";

describe("toSnakeCase", () => {
  it("converts camelCase keys to snake_case", () => {
    const result = toSnakeCase({ firstName: "John", lastName: "Doe" });
    expect(result).toEqual({ first_name: "John", last_name: "Doe" });
  });

  it("handles already snake_case keys", () => {
    const result = toSnakeCase({ first_name: "John" });
    expect(result).toEqual({ first_name: "John" });
  });

  it("handles empty object", () => {
    const result = toSnakeCase({});
    expect(result).toEqual({});
  });

  it("handles single word keys", () => {
    const result = toSnakeCase({ name: "test", id: 1 });
    expect(result).toEqual({ name: "test", id: 1 });
  });

  it("preserves values of different types", () => {
    const result = toSnakeCase({ myNumber: 42, myBool: true, myNull: null });
    expect(result).toEqual({ my_number: 42, my_bool: true, my_null: null });
  });
});

describe("toCamelCase", () => {
  it("converts snake_case keys to camelCase", () => {
    const result = toCamelCase({ first_name: "John", last_name: "Doe" });
    expect(result).toEqual({ firstName: "John", lastName: "Doe" });
  });

  it("handles already camelCase keys", () => {
    const result = toCamelCase({ firstName: "John" });
    expect(result).toEqual({ firstName: "John" });
  });

  it("handles empty object", () => {
    const result = toCamelCase({});
    expect(result).toEqual({});
  });

  it("handles multiple underscores", () => {
    const result = toCamelCase({ my_long_key: "value" });
    expect(result).toEqual({ myLongKey: "value" });
  });
});

describe("rowToModel", () => {
  it("converts database row to camelCase model", () => {
    const row = { first_name: "John", last_name: "Doe", employee_code: "E001" };
    const result = rowToModel<{ firstName: string; lastName: string; employeeCode: string }>(row);
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBe("Doe");
    expect(result.employeeCode).toBe("E001");
  });
});

describe("isReasonableDate", () => {
  it("returns true for current decade dates", () => {
    expect(isReasonableDate(new Date("2024-06-15"))).toBe(true);
  });

  it("returns true for year 2000", () => {
    expect(isReasonableDate(new Date("2000-01-01"))).toBe(true);
  });

  it("returns false for very old dates", () => {
    expect(isReasonableDate(new Date("1899-01-01"))).toBe(false);
  });

  it("returns false for far future dates", () => {
    expect(isReasonableDate(new Date("2200-01-01"))).toBe(false);
  });

  it("returns false for invalid dates", () => {
    expect(isReasonableDate(new Date("invalid"))).toBe(false);
  });
});

describe("sanitizeStringDateValue", () => {
  it("returns valid ISO date string", () => {
    const result = sanitizeStringDateValue("2024-07-15");
    expect(result).toBe("2024-07-15");
  });

  it("returns null for unreasonable date strings", () => {
    const result = sanitizeStringDateValue("1800-01-01");
    expect(result).toBeNull();
  });

  it("handles date-time strings", () => {
    const result = sanitizeStringDateValue("2024-07-15T10:30:00Z");
    expect(result).toBeTruthy();
  });
});

describe("sanitizeSingleDateField", () => {
  it("passes through null", () => {
    expect(sanitizeSingleDateField(null)).toBeNull();
  });

  it("returns null for numbers", () => {
    expect(sanitizeSingleDateField(42)).toBeNull();
  });

  it("sanitizes date strings", () => {
    const result = sanitizeSingleDateField("2024-07-15");
    expect(result).toBe("2024-07-15");
  });

  it("returns null for non-date strings", () => {
    const result = sanitizeSingleDateField("hello");
    expect(result).toBeNull();
  });
});

describe("sanitizeDateFields", () => {
  it("sanitizes known date fields", () => {
    const data = { startDate: "2024-07-15", name: "Test" };
    const result = sanitizeDateFields(data);
    expect(result.startDate).toBe("2024-07-15");
    expect(result.name).toBe("Test");
  });

  it("handles null date fields", () => {
    const data = { startDate: null, endDate: null };
    const result = sanitizeDateFields(data);
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });

  it("handles empty object", () => {
    const result = sanitizeDateFields({});
    expect(result).toEqual({});
  });
});

describe("buildVatNameList", () => {
  it("combines ref vats and target vats", () => {
    const refVats = [{ key: "DAFF" }, { key: "SAU" }];
    const targetModels = [{ vatName: "DAFF" }, { vatName: "GROWTH" }];
    const result = buildVatNameList(refVats, targetModels);
    expect(result).toContain("DAFF");
    expect(result).toContain("SAU");
    expect(result).toContain("GROWTH");
    expect(new Set(result).size).toBe(result.length);
  });

  it("handles empty inputs", () => {
    const result = buildVatNameList([], []);
    expect(result.length).toBe(0);
  });

  it("deduplicates VAT names", () => {
    const refVats = [{ key: "DAFF" }];
    const targetModels = [{ vatName: "DAFF" }];
    const result = buildVatNameList(refVats, targetModels);
    const daffCount = result.filter(v => v === "DAFF").length;
    expect(daffCount).toBe(1);
  });
});

describe("toSnakeCase - extended", () => {
  it("handles multiple uppercase letters in sequence", () => {
    const result = toSnakeCase({ myHTTPServer: "test" });
    expect(result).toHaveProperty("my_h_t_t_p_server");
  });

  it("handles deeply nested keys", () => {
    const result = toSnakeCase({ nestedKeyName: 42 });
    expect(result).toHaveProperty("nested_key_name");
  });

  it("handles employee table field mapping", () => {
    const result = toSnakeCase({ baseCost: "1000" }, "employees");
    expect(result).toBeDefined();
  });

  it("handles non-employee table without special mapping", () => {
    const result = toSnakeCase({ baseCost: "1000" }, "projects");
    expect(result).toHaveProperty("base_cost");
  });
});

describe("toCamelCase - extended", () => {
  it("handles single character after underscore", () => {
    const result = toCamelCase({ a_b: "test" });
    expect(result).toHaveProperty("aB");
  });

  it("handles consecutive underscores", () => {
    const result = toCamelCase({ my__key: "test" });
    expect(result).toBeDefined();
  });

  it("preserves null values explicitly", () => {
    const result = toCamelCase({ first_name: null });
    expect(result.firstName).toBeNull();
  });
});

describe("rowToModel - extended", () => {
  it("converts float numbers to strings", () => {
    const row = { total_amount: 123.45 };
    const result = rowToModel<{ totalAmount: string }>(row);
    expect(typeof result.totalAmount).toBe("string");
    expect(result.totalAmount).toBe("123.45");
  });

  it("preserves integer id fields", () => {
    const row = { id: 42, project_id: 10 };
    const result = rowToModel<{ id: number; projectId: number }>(row);
    expect(result.id).toBe(42);
    expect(result.projectId).toBe(10);
  });

  it("converts Date objects to ISO strings", () => {
    const row = { start_date: new Date("2024-07-15") };
    const result = rowToModel<{ startDate: string }>(row);
    expect(result.startDate).toBe("2024-07-15");
  });

  it("handles null values", () => {
    const row = { name: null, value: null };
    const result = rowToModel<{ name: null; value: null }>(row);
    expect(result.name).toBeNull();
    expect(result.value).toBeNull();
  });
});

describe("sanitizeDateFields - extended", () => {
  it("sanitizes start_date field", () => {
    const result = sanitizeDateFields({ start_date: "2024-07-15", name: "Test" });
    expect(result.name).toBe("Test");
  });

  it("nullifies unreasonable dates", () => {
    const result = sanitizeDateFields({ start_date: "1800-01-01" });
    expect(result.start_date).toBeNull();
  });

  it("preserves N/A as null", () => {
    const result = sanitizeSingleDateField("N/A");
    expect(result).toBeNull();
  });

  it("preserves dash as null", () => {
    const result = sanitizeSingleDateField("-");
    expect(result).toBeNull();
  });

  it("preserves n/a as null (lowercase)", () => {
    const result = sanitizeSingleDateField("n/a");
    expect(result).toBeNull();
  });
});

describe("isReasonableDate - extended", () => {
  it("returns true for 1900", () => {
    expect(isReasonableDate(new Date("1900-01-01"))).toBe(true);
  });

  it("returns true for 2100", () => {
    expect(isReasonableDate(new Date("2100-12-31"))).toBe(true);
  });

  it("returns false for year 2101", () => {
    expect(isReasonableDate(new Date("2101-01-01"))).toBe(false);
  });

  it("returns false for year 1899", () => {
    expect(isReasonableDate(new Date("1899-12-31"))).toBe(false);
  });
});
