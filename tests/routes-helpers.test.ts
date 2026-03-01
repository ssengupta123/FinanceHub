import { describe, it, expect } from "vitest";
import {
  deriveFyYear,
  buildJobStatusProjectData,
  buildEmployeeLookupMaps,
  buildProjectLookupMaps,
  buildOpenOppRecord,
  buildPlannerSyncInsights,
  buildExistingTaskMaps,
  collectPlannerUserIds,
  buildPlannerTaskRecord,
  detectTaskChanges,
  findRecentlyCompletedTasks,
  buildPlannerBucketGroups,
  parseStaffSOTRow,
  excelDateToString,
  toNum,
  toDecimal,
  excelDateToISOString,
  getOppMonthlyRevenues,
  sumRevenues,
  mapPlannerProgress,
  mapPlannerPriority,
  parseMonthlyCosts,
  cleanVatValue,
  parseOptionalNumericField,
  parseOptionalMarginField,
  fuzzyMatchProjectId,
  getSpendingSystemPrompt,
} from "../server/routes";

describe("deriveFyYear", () => {
  it("returns 23-24 for null input", () => {
    expect(deriveFyYear(null)).toBe("23-24");
  });

  it("returns correct FY for July (start of FY)", () => {
    expect(deriveFyYear("2024-07-01")).toBe("24-25");
  });

  it("returns correct FY for June (end of FY)", () => {
    expect(deriveFyYear("2024-06-15")).toBe("23-24");
  });

  it("returns correct FY for January", () => {
    expect(deriveFyYear("2025-01-15")).toBe("24-25");
  });

  it("returns correct FY for December", () => {
    expect(deriveFyYear("2024-12-31")).toBe("24-25");
  });
});

describe("toNum", () => {
  it("returns 0 for null", () => {
    expect(toNum(null)).toBe("0");
  });

  it("returns 0 for undefined", () => {
    expect(toNum(undefined)).toBe("0");
  });

  it("returns 0 for empty string", () => {
    expect(toNum("")).toBe("0");
  });

  it("converts number to fixed 2 decimal string", () => {
    expect(toNum(123.45)).toBe("123.45");
  });

  it("returns numeric string with 2 decimals", () => {
    expect(toNum("456.78")).toBe("456.78");
  });

  it("returns 0 for non-numeric string", () => {
    expect(toNum("abc")).toBe("0");
  });

  it("handles zero", () => {
    expect(toNum(0)).toBe("0.00");
  });

  it("handles negative numbers", () => {
    expect(toNum(-100)).toBe("-100.00");
  });
});

describe("toDecimal", () => {
  it("returns 0 for null", () => {
    expect(toDecimal(null)).toBe("0");
  });

  it("returns 0 for undefined", () => {
    expect(toDecimal(undefined)).toBe("0");
  });

  it("converts percentage-like decimal with 4 decimals", () => {
    expect(toDecimal(0.5)).toBe("0.5000");
  });

  it("handles string numbers with 4 decimals", () => {
    expect(toDecimal("0.75")).toBe("0.7500");
  });

  it("returns 0 for non-numeric", () => {
    expect(toDecimal("abc")).toBe("0");
  });
});

describe("excelDateToString", () => {
  it("returns null for null input", () => {
    expect(excelDateToString(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(excelDateToString("")).toBeNull();
  });

  it("parses ISO date string", () => {
    expect(excelDateToString("2024-07-15")).toBe("2024-07-15");
  });

  it("parses AU format date", () => {
    expect(excelDateToString("15/07/2024")).toBe("2024-07-15");
  });

  it("returns null for N/A", () => {
    expect(excelDateToString("N/A")).toBeNull();
  });

  it("returns null for dash", () => {
    expect(excelDateToString("-")).toBeNull();
  });

  it("parses Excel numeric serial", () => {
    const result = excelDateToString(45000);
    expect(result).toBeTruthy();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("excelDateToISOString", () => {
  it("returns null for null", () => {
    expect(excelDateToISOString(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(excelDateToISOString(undefined)).toBeNull();
  });

  it("returns ISO string for date string", () => {
    const result = excelDateToISOString("2024-07-15");
    expect(result).toBe("2024-07-15");
  });

  it("handles Excel serial numbers", () => {
    const result = excelDateToISOString(45000);
    expect(result).toBeTruthy();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("buildJobStatusProjectData", () => {
  it("builds project data from row", () => {
    const row: any[] = new Array(35).fill(null);
    row[0] = "Active";
    row[1] = "DAFF";
    row[2] = "CLT";
    row[4] = "Manager1";
    row[5] = "EM1";
    row[9] = "Fixed";
    row[13] = 100000;
    const result = buildJobStatusProjectData(row, "Test Project", 1);
    expect(result.name).toBe("Test Project");
    expect(result.client).toBe("CLT");
    expect(result.projectCode).toBe("CLT-001");
    expect(result.contractType).toBe("fixed_price");
    expect(result.status).toBe("active");
    expect(result.vat).toBe("DAFF");
    expect(result.pipelineStatus).toBe("C");
  });

  it("handles closed status", () => {
    const row: any[] = new Array(35).fill(null);
    row[0] = "Closed";
    const result = buildJobStatusProjectData(row, "Closed Proj", 2);
    expect(result.status).toBe("completed");
  });

  it("uses IMP prefix when no client code", () => {
    const row: any[] = new Array(35).fill(null);
    const result = buildJobStatusProjectData(row, "No Client", 5);
    expect(result.projectCode).toBe("IMP-005");
  });

  it("handles T&M billing", () => {
    const row: any[] = new Array(35).fill(null);
    row[9] = "T&M";
    const result = buildJobStatusProjectData(row, "TM Proj", 1);
    expect(result.contractType).toBe("time_materials");
  });
});

describe("buildEmployeeLookupMaps", () => {
  it("builds name-to-id map and code set", () => {
    const employees = [
      { id: 1, firstName: "John", lastName: "Doe", employeeCode: "E001" },
      { id: 2, firstName: "Jane", lastName: "Smith", employeeCode: "E002" },
    ];
    const { empMap, empCodes } = buildEmployeeLookupMaps(employees);
    expect(empMap.get("john doe")).toBe(1);
    expect(empMap.get("jane smith")).toBe(2);
    expect(empCodes.has("E001")).toBe(true);
    expect(empCodes.has("E002")).toBe(true);
  });

  it("handles empty array", () => {
    const { empMap, empCodes } = buildEmployeeLookupMaps([]);
    expect(empMap.size).toBe(0);
    expect(empCodes.size).toBe(0);
  });
});

describe("buildProjectLookupMaps", () => {
  it("builds name and code to id maps", () => {
    const projects = [
      { id: 10, name: "Alpha Project", projectCode: "A001" },
      { id: 20, name: "Beta Project", projectCode: null },
    ];
    const { projMap, projCodes } = buildProjectLookupMaps(projects);
    expect(projMap.get("alpha project")).toBe(10);
    expect(projMap.get("a001")).toBe(10);
    expect(projMap.get("beta project")).toBe(20);
    expect(projCodes.has("A001")).toBe(true);
    expect(projCodes.size).toBe(1);
  });
});

describe("buildOpenOppRecord", () => {
  it("builds opportunity record from row data", () => {
    const row: any[] = new Array(17).fill(null);
    row[0] = "Opp Name";
    row[3] = 50000;
    row[4] = 0.25;
    row[5] = "Advisory";
    row[8] = "DAFF";
    row[9] = "Active";
    const result = buildOpenOppRecord(row, "My Opp", "S");
    expect(result.name).toBe("My Opp");
    expect(result.classification).toBe("S");
    expect(result.value).toBe("50000.00");
    expect(result.marginPercent).toBe("0.250");
    expect(result.workType).toBe("Advisory");
    expect(result.vat).toBe("DAFF");
    expect(result.status).toBe("Active");
  });

  it("handles null values gracefully", () => {
    const row: any[] = new Array(17).fill(null);
    const result = buildOpenOppRecord(row, "Empty Opp", "Q");
    expect(result.name).toBe("Empty Opp");
    expect(result.value).toBeNull();
    expect(result.marginPercent).toBeNull();
    expect(result.workType).toBeNull();
  });

  it("cleans VAT field with semicolons", () => {
    const row: any[] = new Array(17).fill(null);
    row[8] = "growth;#";
    const result = buildOpenOppRecord(row, "Opp", "C");
    expect(result.vat).toBe("GROWTH");
  });

  it("cleans VAT field with pipe separator", () => {
    const row: any[] = new Array(17).fill(null);
    row[8] = "DAFF|other";
    const result = buildOpenOppRecord(row, "Opp", "C");
    expect(result.vat).toBe("DAFF");
  });
});

describe("buildPlannerSyncInsights", () => {
  it("returns all-up-to-date for zero counts", () => {
    const result = buildPlannerSyncInsights({
      newlyCompletedCount: 0,
      newCount: 0,
      updatedCount: 0,
      removedCount: 0,
      recentCompletedCount: 0,
    });
    expect(result).toEqual(["All tasks are up to date"]);
  });

  it("returns correct insights for various counts", () => {
    const result = buildPlannerSyncInsights({
      newlyCompletedCount: 2,
      newCount: 3,
      updatedCount: 1,
      removedCount: 0,
      recentCompletedCount: 5,
    });
    expect(result.length).toBe(4);
    expect(result[0]).toContain("2 tasks newly completed");
    expect(result[1]).toContain("3 new tasks added");
    expect(result[2]).toContain("1 task updated");
    expect(result[3]).toContain("5 tasks completed");
  });

  it("uses singular for count of 1", () => {
    const result = buildPlannerSyncInsights({
      newlyCompletedCount: 1,
      newCount: 0,
      updatedCount: 0,
      removedCount: 0,
      recentCompletedCount: 0,
    });
    expect(result[0]).toContain("1 task newly completed");
  });
});

describe("buildExistingTaskMaps", () => {
  it("separates tasks with and without external IDs", () => {
    const tasks = [
      { id: 1, externalId: "ext-1", name: "Task 1" },
      { id: 2, externalId: null, name: "Task 2" },
      { id: 3, externalId: "ext-3", name: "Task 3" },
    ];
    const { existingByExtId, existingWithoutExtId } = buildExistingTaskMaps(tasks);
    expect(existingByExtId.size).toBe(2);
    expect(existingByExtId.get("ext-1")).toEqual(tasks[0]);
    expect(existingWithoutExtId.length).toBe(1);
    expect(existingWithoutExtId[0]).toEqual(tasks[1]);
  });

  it("handles empty array", () => {
    const { existingByExtId, existingWithoutExtId } = buildExistingTaskMaps([]);
    expect(existingByExtId.size).toBe(0);
    expect(existingWithoutExtId.length).toBe(0);
  });
});

describe("collectPlannerUserIds", () => {
  it("collects assignment user IDs", () => {
    const tasks = [
      { assignments: { "user-1": {}, "user-2": {} } },
      { assignments: { "user-3": {} } },
    ];
    const ids = collectPlannerUserIds(tasks);
    expect(ids.size).toBe(3);
    expect(ids.has("user-1")).toBe(true);
    expect(ids.has("user-2")).toBe(true);
    expect(ids.has("user-3")).toBe(true);
  });

  it("collects completedBy user IDs", () => {
    const tasks = [
      { completedBy: { user: { id: "user-5", displayName: "Test" } } },
    ];
    const ids = collectPlannerUserIds(tasks);
    expect(ids.has("user-5")).toBe(true);
  });

  it("handles tasks without assignments", () => {
    const tasks = [{ title: "Simple task" }];
    const ids = collectPlannerUserIds(tasks);
    expect(ids.size).toBe(0);
  });
});

describe("buildPlannerTaskRecord", () => {
  it("builds task record from planner data", () => {
    const pt = {
      id: "task-1",
      title: "Fix Bug",
      bucketId: "bucket-1",
      percentComplete: 50,
      dueDateTime: "2024-07-15T00:00:00Z",
      priority: 1,
      assignments: { "user-1": {} },
    };
    const bucketCache = new Map([["bucket-1", "Development"]]);
    const resolveUser = (uid: string) => uid === "user-1" ? "John" : uid;
    const result = buildPlannerTaskRecord(pt, bucketCache, resolveUser);
    expect(result.taskName).toBe("Fix Bug");
    expect(result.bucketName).toBe("Development");
    expect(result.progress).toBeTruthy();
    expect(result.dueDate).toBe("2024-07-15");
    expect(result.assignedTo).toBe("John");
    expect(result.extId).toBe("task-1");
  });

  it("handles missing fields", () => {
    const pt = { id: "task-2" };
    const result = buildPlannerTaskRecord(pt, new Map(), (uid) => uid);
    expect(result.taskName).toBe("Untitled");
    expect(result.bucketName).toBe("");
    expect(result.assignedTo).toBe("");
  });
});

describe("detectTaskChanges", () => {
  it("returns empty when nothing changed", () => {
    const existing = { progress: "In Progress", dueDate: "2024-07-15", priority: "High", taskName: "Task" };
    const changes = detectTaskChanges(existing, "Task", "In Progress", "2024-07-15", "High");
    expect(changes).toEqual([]);
  });

  it("detects progress change", () => {
    const existing = { progress: "Not Started", dueDate: "", priority: "Low", taskName: "Task" };
    const changes = detectTaskChanges(existing, "Task", "In Progress", "", "Low");
    expect(changes.length).toBe(1);
    expect(changes[0]).toContain("progress");
  });

  it("detects multiple changes", () => {
    const existing = { progress: "Not Started", dueDate: "", priority: "Low", taskName: "Old" };
    const changes = detectTaskChanges(existing, "New", "Completed", "2024-08-01", "High");
    expect(changes.length).toBe(4);
  });

  it("ignores empty due date update", () => {
    const existing = { progress: "In Progress", dueDate: "2024-07-15", priority: "High", taskName: "Task" };
    const changes = detectTaskChanges(existing, "Task", "In Progress", "", "High");
    expect(changes).toEqual([]);
  });
});

describe("findRecentlyCompletedTasks", () => {
  it("finds tasks completed within timeframe", () => {
    const fourWeeksAgo = new Date("2024-06-01");
    const tasks = [
      { percentComplete: 100, completedDateTime: "2024-06-15T00:00:00Z", title: "Done", completedBy: { user: { id: "u1", displayName: "Alice" } } },
      { percentComplete: 50, completedDateTime: "2024-06-15T00:00:00Z", title: "Partial" },
      { percentComplete: 100, completedDateTime: "2024-05-01T00:00:00Z", title: "Old" },
    ];
    const resolve = (uid: string) => uid === "u1" ? "Alice" : uid;
    const result = findRecentlyCompletedTasks(tasks, fourWeeksAgo, resolve);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("Done");
    expect(result[0].completedBy).toBe("Alice");
  });

  it("returns empty for no completed tasks", () => {
    const result = findRecentlyCompletedTasks([], new Date(), (uid) => uid);
    expect(result).toEqual([]);
  });
});

describe("buildPlannerBucketGroups", () => {
  it("groups tasks by bucket", () => {
    const tasks = [
      { title: "Task A", bucketId: "b1", percentComplete: 0, assignments: {} },
      { title: "Task B", bucketId: "b1", percentComplete: 100 },
      { title: "Task C", bucketId: "b2", percentComplete: 50, assignments: { "u1": {} } },
    ];
    const cache = new Map([["b1", "Dev"], ["b2", "QA"]]);
    const resolve = (uid: string) => uid === "u1" ? "Bob" : uid;
    const result = buildPlannerBucketGroups(tasks, cache, resolve);
    expect(result["Dev"].length).toBe(2);
    expect(result["QA"].length).toBe(1);
    expect(result["Dev"][0]).toContain("Task A");
    expect(result["Dev"][0]).toContain("Not Started");
    expect(result["Dev"][1]).toContain("Completed");
    expect(result["QA"][0]).toContain("Bob");
  });

  it("uses 'Other' for unknown buckets", () => {
    const tasks = [{ title: "Orphan", percentComplete: 0 }];
    const result = buildPlannerBucketGroups(tasks, new Map(), (uid) => uid);
    expect(result["Other"].length).toBe(1);
  });
});

describe("parseStaffSOTRow", () => {
  it("parses employee row correctly", () => {
    const row: any[] = new Array(15).fill(null);
    row[0] = "John Doe";
    row[1] = "Band 3";
    row[2] = "Permanent";
    row[3] = "yes";
    row[4] = 120000;
    row[6] = 150000;
    const result = parseStaffSOTRow(row);
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBe("Doe");
    expect(result.empData.costBandLevel).toBe("Band 3");
    expect(result.empData.staffType).toBe("Permanent");
    expect(result.empData.payrollTax).toBe(true);
    expect(result.empData.status).toBe("active");
  });

  it("handles virtual bench status", () => {
    const row: any[] = new Array(15).fill(null);
    row[0] = "Jane Smith";
    row[5] = "Virtual Bench";
    const result = parseStaffSOTRow(row);
    expect(result.empData.status).toBe("bench");
  });

  it("handles single name", () => {
    const row: any[] = new Array(15).fill(null);
    row[0] = "SingleName";
    const result = parseStaffSOTRow(row);
    expect(result.firstName).toBe("SingleName");
    expect(result.lastName).toBe("");
  });
});

describe("getOppMonthlyRevenues", () => {
  it("extracts 12 monthly revenue fields", () => {
    const opp = {
      revenueM1: "100", revenueM2: "200", revenueM3: null, revenueM4: "400",
      revenueM5: "500", revenueM6: "600", revenueM7: "700", revenueM8: "800",
      revenueM9: "900", revenueM10: "1000", revenueM11: "1100", revenueM12: "1200",
    };
    const result = getOppMonthlyRevenues(opp);
    expect(result.length).toBe(12);
    expect(result[0]).toBe("100");
    expect(result[2]).toBeNull();
    expect(result[11]).toBe("1200");
  });

  it("returns undefined for missing fields", () => {
    const opp = {};
    const result = getOppMonthlyRevenues(opp);
    expect(result.length).toBe(12);
    expect(result.every(v => v === undefined)).toBe(true);
  });
});

describe("sumRevenues", () => {
  it("sums numeric string values", () => {
    expect(sumRevenues(["100", "200", "300"])).toBe(600);
  });

  it("treats null as 0", () => {
    expect(sumRevenues(["100", null, "200"])).toBe(300);
  });

  it("returns 0 for empty array", () => {
    expect(sumRevenues([])).toBe(0);
  });

  it("handles all nulls", () => {
    expect(sumRevenues([null, null, null])).toBe(0);
  });

  it("handles decimal values", () => {
    expect(sumRevenues(["10.5", "20.3"])).toBeCloseTo(30.8);
  });
});

describe("mapPlannerProgress", () => {
  it("returns Completed for 100%", () => {
    expect(mapPlannerProgress(100)).toBe("Completed");
  });

  it("returns In progress for 50%", () => {
    expect(mapPlannerProgress(50)).toBe("In progress");
  });

  it("returns In progress for 1%", () => {
    expect(mapPlannerProgress(1)).toBe("In progress");
  });

  it("returns Not started for 0%", () => {
    expect(mapPlannerProgress(0)).toBe("Not started");
  });
});

describe("mapPlannerPriority", () => {
  it("returns Important for priority 1", () => {
    expect(mapPlannerPriority(1)).toBe("Important");
  });

  it("returns Low for priority 5", () => {
    expect(mapPlannerPriority(5)).toBe("Low");
  });

  it("returns Medium for priority 3", () => {
    expect(mapPlannerPriority(3)).toBe("Medium");
  });

  it("returns Medium for undefined", () => {
    expect(mapPlannerPriority(undefined)).toBe("Medium");
  });
});

describe("parseMonthlyCosts", () => {
  it("parses costs from row columns", () => {
    const row = [0, 0, 100, 200, 300];
    const result = parseMonthlyCosts(row, 2, 4);
    expect(result.costs).toEqual(["100.00", "200.00", "300.00"]);
    expect(result.total).toBe(600);
  });

  it("handles null/undefined values", () => {
    const row = [null, undefined, 0];
    const result = parseMonthlyCosts(row, 0, 2);
    expect(result.costs).toEqual(["0.00", "0.00", "0.00"]);
    expect(result.total).toBe(0);
  });

  it("handles NaN values", () => {
    const row = ["abc", "def"];
    const result = parseMonthlyCosts(row, 0, 1);
    expect(result.costs).toEqual(["0", "0"]);
    expect(result.total).toBe(0);
  });

  it("handles single column range", () => {
    const row = [500];
    const result = parseMonthlyCosts(row, 0, 0);
    expect(result.costs).toEqual(["500.00"]);
    expect(result.total).toBe(500);
  });
});

describe("cleanVatValue", () => {
  it("returns null for null input", () => {
    expect(cleanVatValue(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(cleanVatValue("")).toBeNull();
  });

  it("cleans semicolons", () => {
    expect(cleanVatValue("DAFF;#")).toBe("DAFF");
  });

  it("cleans pipe separator", () => {
    expect(cleanVatValue("DAFF|other")).toBe("DAFF");
  });

  it("uppercases growth", () => {
    expect(cleanVatValue("growth")).toBe("GROWTH");
  });

  it("preserves normal values", () => {
    expect(cleanVatValue("SAU")).toBe("SAU");
  });

  it("trims whitespace", () => {
    expect(cleanVatValue("  DAFF  ")).toBe("DAFF");
  });
});

describe("parseOptionalNumericField", () => {
  it("returns null for null", () => {
    expect(parseOptionalNumericField(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseOptionalNumericField("")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseOptionalNumericField(undefined)).toBeNull();
  });

  it("formats number with 2 decimals", () => {
    expect(parseOptionalNumericField(50000)).toBe("50000.00");
  });

  it("parses string number", () => {
    expect(parseOptionalNumericField("123.456")).toBe("123.46");
  });

  it("returns null for non-numeric", () => {
    expect(parseOptionalNumericField("abc")).toBeNull();
  });
});

describe("parseOptionalMarginField", () => {
  it("returns null for null", () => {
    expect(parseOptionalMarginField(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseOptionalMarginField("")).toBeNull();
  });

  it("formats with 3 decimals", () => {
    expect(parseOptionalMarginField(0.25)).toBe("0.250");
  });

  it("parses string number", () => {
    expect(parseOptionalMarginField("0.3333")).toBe("0.333");
  });

  it("returns null for non-numeric", () => {
    expect(parseOptionalMarginField("N/A")).toBeNull();
  });
});

describe("fuzzyMatchProjectId", () => {
  it("matches exact name", () => {
    const nameMap = new Map([["alpha project", 10]]);
    const codeMap = new Map<string, number>();
    expect(fuzzyMatchProjectId("Alpha Project", nameMap, codeMap)).toBe(10);
  });

  it("matches by project code prefix", () => {
    const nameMap = new Map<string, number>();
    const codeMap = new Map([["abc123", 20]]);
    expect(fuzzyMatchProjectId("ABC123-Extension", nameMap, codeMap)).toBe(20);
  });

  it("matches by partial name inclusion", () => {
    const nameMap = new Map([["big project alpha", 30]]);
    const codeMap = new Map<string, number>();
    expect(fuzzyMatchProjectId("Big Project Alpha - Phase 2", nameMap, codeMap)).toBe(30);
  });

  it("returns null for no match", () => {
    const nameMap = new Map([["alpha", 10]]);
    const codeMap = new Map<string, number>();
    expect(fuzzyMatchProjectId("completely different", nameMap, codeMap)).toBeNull();
  });
});

describe("getSpendingSystemPrompt", () => {
  it("returns spending patterns prompt", () => {
    const result = getSpendingSystemPrompt("spending_patterns");
    expect(result).toContain("spending pattern");
  });

  it("returns financial advice prompt", () => {
    const result = getSpendingSystemPrompt("financial_advice");
    expect(result).toBeTruthy();
  });

  it("returns spending forecast prompt", () => {
    const result = getSpendingSystemPrompt("spending_forecast");
    expect(result).toBeTruthy();
  });

  it("returns default prompt for unknown type", () => {
    const result = getSpendingSystemPrompt("unknown_type");
    expect(result).toBeTruthy();
  });
});
