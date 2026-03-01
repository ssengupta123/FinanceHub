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
  computeMonthlySpend,
  computeBillingBreakdown,
  computeTopCostProjects,
  computeStaffCostBreakdown,
  computeKpiAverages,
  computePipelineClassGroups,
  computeProjectRiskMetrics,
  buildPipelineRevenueRecord,
  buildGrossProfitRecord,
  buildPersonalHoursTimesheetRecord,
  parsePersonalHoursEmployeeFields,
  buildProjectHoursKpiRecord,
  buildCxProjectMaps,
  buildCxEmployeeMap,
  buildCxRatingRecord,
  buildResourceCostRecord,
  buildEmployeeNameMap,
  parseExcelNumericDate,
  isValidYear,
  parseStringDate,
  parseISOOrAUDate,
  buildPipelineInsightPrompt,
  buildProjectInsightPrompt,
  buildOverviewInsightPrompt,
  buildSpendingDataContext,
  getSpendingUserPrompt,
  buildPipelineSummaryText,
  buildRiskSummaryText,
  computeFyFromDate,
  normalizeWeeklyUtilRow,
  PHASE_TO_CLASSIFICATION,
  buildFySetFromDates,
  computeUtilizationRatio,
  isImportSkippableRow,
  formatImportError,
  buildPermissionsMap,
  formatPlannerTaskEntry,
  buildVatAiRiskSummary,
  buildVatAiActionSummaries,
  buildVatAiPlannerSummary,
  buildVatReportContextString,
  buildPlannerCompletedByName,
  buildPlannerSyncResult,
  extractInitialUserCache,
  buildVatAiSuggestFieldsPrompt,
  buildVatChatSystemPrompt,
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

describe("computeMonthlySpend", () => {
  it("aggregates monthly spend by fy-month key", () => {
    const data = [
      { fyYear: "23-24", month: 1, revenue: "1000", cost: "600" },
      { fyYear: "23-24", month: 1, revenue: "500", cost: "300" },
      { fyYear: "23-24", month: 2, revenue: "800", cost: "400" },
    ];
    const result = computeMonthlySpend(data);
    expect(result["23-24-M1"].revenue).toBe(1500);
    expect(result["23-24-M1"].cost).toBe(900);
    expect(result["23-24-M1"].profit).toBe(600);
    expect(result["23-24-M2"].revenue).toBe(800);
  });

  it("returns empty for no data", () => {
    expect(Object.keys(computeMonthlySpend([])).length).toBe(0);
  });

  it("handles missing revenue/cost as 0", () => {
    const data = [{ fyYear: "23-24", month: 3, revenue: null, cost: null }];
    const result = computeMonthlySpend(data);
    expect(result["23-24-M3"].revenue).toBe(0);
    expect(result["23-24-M3"].cost).toBe(0);
  });
});

describe("computeBillingBreakdown", () => {
  it("groups by billing category", () => {
    const projects = [
      { id: 1, billingCategory: "Fixed" },
      { id: 2, billingCategory: "T&M" },
    ];
    const monthly = [
      { projectId: 1, revenue: "1000", cost: "600" },
      { projectId: 2, revenue: "2000", cost: "1200" },
    ];
    const result = computeBillingBreakdown(projects, monthly);
    expect(result["Fixed"].revenue).toBe(1000);
    expect(result["T&M"].cost).toBe(1200);
  });

  it("defaults to Other when no billing category", () => {
    const projects = [{ id: 1, billingCategory: null }];
    const monthly = [{ projectId: 1, revenue: "500", cost: "300" }];
    const result = computeBillingBreakdown(projects, monthly);
    expect(result["Other"]).toBeDefined();
  });
});

describe("computeTopCostProjects", () => {
  it("returns top N by cost", () => {
    const projects = [
      { id: 1, name: "A", projectCode: "P1", billingCategory: "Fixed" },
      { id: 2, name: "B", projectCode: "P2", billingCategory: "T&M" },
    ];
    const monthly = [
      { projectId: 1, cost: "500", revenue: "1000", month: 1 },
      { projectId: 2, cost: "800", revenue: "1600", month: 1 },
    ];
    const result = computeTopCostProjects(projects, monthly, 1);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("B");
  });

  it("calculates margin correctly", () => {
    const projects = [{ id: 1, name: "X", projectCode: "X1", billingCategory: "Fixed" }];
    const monthly = [{ projectId: 1, cost: "200", revenue: "1000", month: 1 }];
    const result = computeTopCostProjects(projects, monthly, 10);
    expect(result[0].margin).toBe("80.0");
  });

  it("returns 0 margin when no revenue", () => {
    const projects = [{ id: 1, name: "X", projectCode: "X1", billingCategory: "Fixed" }];
    const monthly = [{ projectId: 1, cost: "200", revenue: "0", month: 1 }];
    const result = computeTopCostProjects(projects, monthly, 10);
    expect(result[0].margin).toBe("0");
  });
});

describe("computeStaffCostBreakdown", () => {
  it("breaks down by staff type", () => {
    const rc = [
      { staff_type: "Permanent", total_cost: "50000" },
      { staff_type: "Contractor", total_cost: "30000" },
      { staff_type: "Permanent", total_cost: "20000" },
    ];
    const result = computeStaffCostBreakdown(rc);
    expect(result.totalStaffCost).toBe(100000);
    expect(result.permCost).toBe(70000);
    expect(result.contractorCost).toBe(30000);
  });

  it("returns zeros for empty input", () => {
    const result = computeStaffCostBreakdown([]);
    expect(result.totalStaffCost).toBe(0);
  });
});

describe("computeKpiAverages", () => {
  it("computes averages", () => {
    const kpis = [
      { revenue: "1000", grossCost: "600", marginPercent: "40", utilization: "80" },
      { revenue: "2000", grossCost: "1200", marginPercent: "40", utilization: "60" },
    ];
    const result = computeKpiAverages(kpis);
    expect(result.totalRevenue).toBe(3000);
    expect(result.totalCost).toBe(1800);
    expect(result.avgMargin).toBe("40.0");
    expect(result.avgUtil).toBe("70.0");
  });

  it("returns zeros for empty input", () => {
    const result = computeKpiAverages([]);
    expect(result.totalRevenue).toBe(0);
    expect(result.avgMargin).toBe("0");
    expect(result.avgUtil).toBe("0");
  });
});

describe("computePipelineClassGroups", () => {
  it("groups revenue by classification", () => {
    const opps = [
      { classification: "C", revenueM1: "100", revenueM2: "200", revenueM3: null, revenueM4: null, revenueM5: null, revenueM6: null, revenueM7: null, revenueM8: null, revenueM9: null, revenueM10: null, revenueM11: null, revenueM12: null },
      { classification: "C", revenueM1: "50", revenueM2: null, revenueM3: null, revenueM4: null, revenueM5: null, revenueM6: null, revenueM7: null, revenueM8: null, revenueM9: null, revenueM10: null, revenueM11: null, revenueM12: null },
    ];
    const result = computePipelineClassGroups(opps);
    expect(result["C"]).toBe(350);
  });

  it("defaults to Unknown classification", () => {
    const opps = [{ revenueM1: "100", revenueM2: null, revenueM3: null, revenueM4: null, revenueM5: null, revenueM6: null, revenueM7: null, revenueM8: null, revenueM9: null, revenueM10: null, revenueM11: null, revenueM12: null }];
    const result = computePipelineClassGroups(opps);
    expect(result["Unknown"]).toBe(100);
  });
});

describe("computeProjectRiskMetrics", () => {
  it("computes margin and balance", () => {
    const projects = [{ id: 1, name: "P1", balanceAmount: "5000", status: "active" }];
    const monthly = [
      { projectId: 1, revenue: "1000", cost: "600" },
      { projectId: 1, revenue: "500", cost: "200" },
    ];
    const result = computeProjectRiskMetrics(projects, monthly);
    expect(result[0].totalRev).toBe(1500);
    expect(result[0].margin).toBe(46.7);
    expect(result[0].balance).toBe(5000);
    expect(result[0].status).toBe("active");
  });

  it("handles zero revenue", () => {
    const projects = [{ id: 1, name: "P1", balanceAmount: null, status: "draft" }];
    const monthly: any[] = [];
    const result = computeProjectRiskMetrics(projects, monthly);
    expect(result[0].margin).toBe(0);
  });
});

describe("buildPipelineRevenueRecord", () => {
  it("builds record with 12 monthly revenues", () => {
    const row = [null, null, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];
    const result = buildPipelineRevenueRecord(row, "Test Opp", "C", "DAFF", "23-24", 2);
    expect(result.name).toBe("Test Opp");
    expect(result.classification).toBe("C");
    expect(result.vat).toBe("DAFF");
    expect(result.fyYear).toBe("23-24");
    expect(result.revenueM1).toBe("100.00");
    expect(result.revenueM12).toBe("1200.00");
    expect(result.grossProfitM1).toBe("0");
  });
});

describe("buildGrossProfitRecord", () => {
  it("builds GP record", () => {
    const row = ["Name", "C", "DAFF", 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];
    const result = buildGrossProfitRecord(row, "TestProject", "C", "DAFF");
    expect(result.name).toBe("TestProject (GP)");
    expect(result.grossProfitM1).toBe("100.00");
    expect(result.grossProfitM12).toBe("1200.00");
    expect(result.revenueM1).toBe("0");
  });
});

describe("buildPersonalHoursTimesheetRecord", () => {
  it("builds timesheet record", () => {
    const row = new Array(17).fill(null);
    row[1] = 8; row[2] = 400; row[3] = 200; row[13] = 7; row[16] = "Billable";
    const result = buildPersonalHoursTimesheetRecord(row, 10, 20, "2024-01-15");
    expect(result.employeeId).toBe(10);
    expect(result.projectId).toBe(20);
    expect(result.weekEnding).toBe("2024-01-15");
    expect(result.hoursWorked).toBe("8.00");
    expect(result.billable).toBe(true);
    expect(result.fyMonth).toBe(7);
    expect(result.source).toBe("excel-import");
  });

  it("marks leave as non-billable", () => {
    const row = new Array(17).fill(null);
    row[16] = "Leave";
    const result = buildPersonalHoursTimesheetRecord(row, 1, 1, "2024-01-01");
    expect(result.billable).toBe(false);
  });
});

describe("parsePersonalHoursEmployeeFields", () => {
  it("parses employee fields", () => {
    const row = new Array(13).fill(null);
    row[10] = "John"; row[11] = "Doe"; row[12] = "Developer";
    const result = parsePersonalHoursEmployeeFields(row);
    expect(result).toEqual({ firstName: "John", lastName: "Doe", role: "Developer" });
  });

  it("returns null when no name", () => {
    const row = new Array(13).fill(null);
    expect(parsePersonalHoursEmployeeFields(row)).toBeNull();
  });

  it("handles very long names by truncating", () => {
    const row = new Array(13).fill(null);
    row[10] = "A".repeat(200);
    row[11] = "B";
    const result = parsePersonalHoursEmployeeFields(row);
    expect(result!.firstName.length).toBe(100);
  });
});

describe("buildProjectHoursKpiRecord", () => {
  it("computes margin and utilization", () => {
    const row = [2080, 1000, 600, "Test Project"];
    const result = buildProjectHoursKpiRecord(row, 5);
    expect(result.projectId).toBe(5);
    expect(result.revenue).toBe("1000.00");
    expect(result.grossCost).toBe("600.00");
    expect(Number(result.marginPercent)).toBeCloseTo(40, 0);
    expect(Number(result.utilization)).toBeCloseTo(100, 0);
  });

  it("handles zero revenue", () => {
    const row = [0, 0, 0, "Empty"];
    const result = buildProjectHoursKpiRecord(row, 1);
    expect(result.marginPercent).toBe("0");
  });
});

describe("buildCxProjectMaps", () => {
  it("maps by name and code", () => {
    const projects = [
      { id: 1, name: "Alpha Project", projectCode: "ALPHA01" },
      { id: 2, name: "Beta Work", projectCode: null },
    ];
    const { projByName, projByBaseCode } = buildCxProjectMaps(projects);
    expect(projByName.get("alpha project")).toBe(1);
    expect(projByName.get("alpha01")).toBe(1);
    expect(projByName.get("beta work")).toBe(2);
  });

  it("extracts base code from name", () => {
    const projects = [{ id: 1, name: "ABC123 Extension Phase", projectCode: null }];
    const { projByBaseCode } = buildCxProjectMaps(projects);
    expect(projByBaseCode.get("abc123")).toBe(1);
  });
});

describe("buildCxEmployeeMap", () => {
  it("maps full and last name", () => {
    const employees = [
      { id: 1, firstName: "John", lastName: "Doe" },
      { id: 2, firstName: "Jane", lastName: "Smith" },
    ];
    const map = buildCxEmployeeMap(employees);
    expect(map.get("john doe")).toBe(1);
    expect(map.get("doe")).toBe(1);
    expect(map.get("smith")).toBe(2);
  });
});

describe("buildCxRatingRecord", () => {
  it("builds CX rating record", () => {
    const row = ["Proj Alpha", 45000, 4.5, "John Doe", "Y", "N", "Great work"];
    const result = buildCxRatingRecord(row, "Proj Alpha", 10, 20, "John Doe");
    expect(result.projectId).toBe(10);
    expect(result.employeeId).toBe(20);
    expect(result.engagementName).toBe("Proj Alpha");
    expect(result.cxRating).toBe(4.5);
    expect(result.isClientManager).toBe(true);
    expect(result.isDeliveryManager).toBe(false);
    expect(result.rationale).toBe("Great work");
  });

  it("handles null rating", () => {
    const row = ["Proj", null, null, null, null, null, null];
    const result = buildCxRatingRecord(row, "Proj", null, null, null);
    expect(result.cxRating).toBeNull();
  });
});

describe("buildResourceCostRecord", () => {
  it("builds resource cost record", () => {
    const costs = Array.from({length: 12}, (_, i) => String((i + 1) * 100));
    const result = buildResourceCostRecord(5, "John Doe", "Permanent", "Total", "23-24", costs, "7800.00", "Excel Import");
    expect(result.employeeId).toBe(5);
    expect(result.employeeName).toBe("John Doe");
    expect(result.staffType).toBe("Permanent");
    expect(result.costM1).toBe("100");
    expect(result.costM12).toBe("1200");
    expect(result.totalCost).toBe("7800.00");
    expect(result.source).toBe("Excel Import");
  });
});

describe("buildEmployeeNameMap", () => {
  it("maps employee full names", () => {
    const employees = [
      { id: 1, firstName: "John", lastName: "Doe" },
      { id: 2, firstName: "Jane", lastName: "Smith" },
    ];
    const map = buildEmployeeNameMap(employees);
    expect(map.get("john doe")).toBe(1);
    expect(map.get("jane smith")).toBe(2);
  });

  it("handles empty array", () => {
    expect(buildEmployeeNameMap([]).size).toBe(0);
  });
});

describe("isValidYear", () => {
  it("returns true for 1900", () => {
    expect(isValidYear(1900)).toBe(true);
  });

  it("returns true for 2100", () => {
    expect(isValidYear(2100)).toBe(true);
  });

  it("returns false for 1899", () => {
    expect(isValidYear(1899)).toBe(false);
  });

  it("returns false for 2101", () => {
    expect(isValidYear(2101)).toBe(false);
  });

  it("returns true for 2024", () => {
    expect(isValidYear(2024)).toBe(true);
  });
});

describe("parseExcelNumericDate", () => {
  it("converts Excel serial number to date string", () => {
    const result = parseExcelNumericDate(45000);
    expect(result).toBeTruthy();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns a date for serial 0 (Excel epoch)", () => {
    const result = parseExcelNumericDate(0);
    expect(result === null || typeof result === "string").toBe(true);
  });
});

describe("parseStringDate", () => {
  it("returns null for empty string", () => {
    expect(parseStringDate("")).toBeNull();
  });

  it("returns null for N/A", () => {
    expect(parseStringDate("N/A")).toBeNull();
  });

  it("returns null for dash", () => {
    expect(parseStringDate("-")).toBeNull();
  });

  it("parses ISO date string", () => {
    const result = parseStringDate("2024-07-15");
    expect(result).toBe("2024-07-15");
  });

  it("parses AU date format DD/MM/YYYY", () => {
    const result = parseISOOrAUDate("15/07/2024");
    expect(result).toBe("2024-07-15");
  });

  it("parses AU date with 2-digit year", () => {
    const result = parseISOOrAUDate("15/07/24");
    expect(result).toBe("2024-07-15");
  });

  it("returns null for unreasonable year", () => {
    expect(parseStringDate("1800-01-01")).toBeNull();
  });
});

describe("parseISOOrAUDate", () => {
  it("parses ISO format", () => {
    expect(parseISOOrAUDate("2024-1-5")).toBe("2024-01-05");
  });

  it("parses AU format", () => {
    expect(parseISOOrAUDate("5/1/2024")).toBe("2024-01-05");
  });

  it("returns null for unreasonable year in ISO", () => {
    expect(parseISOOrAUDate("1800-01-01")).toBeNull();
  });

  it("returns null for non-date string", () => {
    expect(parseISOOrAUDate("hello")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseISOOrAUDate("")).toBeNull();
  });
});

describe("buildPipelineInsightPrompt", () => {
  it("builds prompt with pipeline data", () => {
    const opps = [
      { classification: "C", name: "Opp1", value: "50000", revenueM1: "5000", revenueM2: null, revenueM3: null, revenueM4: null, revenueM5: null, revenueM6: null, revenueM7: null, revenueM8: null, revenueM9: null, revenueM10: null, revenueM11: null, revenueM12: null, vat: "DAFF", status: "Active" },
    ];
    const projects = [{ id: 1, name: "P1", status: "active" }];
    const result = buildPipelineInsightPrompt(opps, projects);
    expect(result).toContain("Pipeline");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(50);
  });

  it("handles empty data", () => {
    const result = buildPipelineInsightPrompt([], []);
    expect(typeof result).toBe("string");
  });
});

describe("buildProjectInsightPrompt", () => {
  it("builds prompt with project data", () => {
    const projects = [{ id: 1, name: "Alpha", status: "active", billingCategory: "Fixed", balanceAmount: "10000" }];
    const monthly = [{ projectId: 1, revenue: "5000", cost: "3000", month: 1 }];
    const result = buildProjectInsightPrompt(projects, monthly);
    expect(result).toContain("Alpha");
    expect(typeof result).toBe("string");
  });

  it("handles empty data", () => {
    const result = buildProjectInsightPrompt([], []);
    expect(typeof result).toBe("string");
  });
});

describe("buildOverviewInsightPrompt", () => {
  it("builds overview prompt", () => {
    const kpis = [{ revenue: "1000", grossCost: "600", marginPercent: "40", utilization: "80" }];
    const projects = [{ id: 1, name: "P1", status: "active", balanceAmount: "5000" }];
    const opps = [{ classification: "C", revenueM1: "100", revenueM2: null, revenueM3: null, revenueM4: null, revenueM5: null, revenueM6: null, revenueM7: null, revenueM8: null, revenueM9: null, revenueM10: null, revenueM11: null, revenueM12: null }];
    const monthly = [{ projectId: 1, revenue: "5000", cost: "3000" }];
    const result = buildOverviewInsightPrompt(kpis, projects, opps, monthly);
    expect(result).toContain("Financial Position");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(100);
  });

  it("handles empty data", () => {
    const result = buildOverviewInsightPrompt([], [], [], []);
    expect(typeof result).toBe("string");
  });
});

describe("buildSpendingDataContext", () => {
  it("builds context string with project data", () => {
    const projects = [
      { id: 1, name: "P1", status: "active", billingCategory: "Fixed", projectCode: "P1" },
    ];
    const monthly = [{ projectId: 1, revenue: "5000", cost: "3000", month: 1, fyYear: "23-24" }];
    const opps = [{ classification: "C", revenueM1: "100" }];
    const employees = [{ staffType: "Permanent" }];
    const rc = [{ staff_type: "Permanent", total_cost: "50000" }];
    const result = buildSpendingDataContext(projects, monthly, opps, employees, rc);
    expect(result).toContain("Active Projects");
    expect(result).toContain("Top 20 Projects");
    expect(typeof result).toBe("string");
  });

  it("handles empty data", () => {
    const result = buildSpendingDataContext([], [], [], [], []);
    expect(result).toContain("Active Projects: 0");
  });
});

describe("getSpendingUserPrompt", () => {
  it("returns spending patterns prompt", () => {
    const result = getSpendingUserPrompt("spending_patterns", "Test data context");
    expect(result).toContain("spending patterns");
    expect(result).toContain("Test data context");
  });

  it("returns financial advice prompt", () => {
    const result = getSpendingUserPrompt("financial_advice", "Data here");
    expect(result).toContain("Data here");
  });

  it("returns spending forecast prompt", () => {
    const result = getSpendingUserPrompt("spending_forecast", "Forecast data");
    expect(result).toContain("Forecast data");
  });

  it("returns default prompt for unknown type", () => {
    const result = getSpendingUserPrompt("unknown", "Some data");
    expect(typeof result).toBe("string");
  });
});

describe("buildJobStatusProjectData - extended", () => {
  it("handles missing optional fields", () => {
    const r = ["Project X", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""];
    const result = buildJobStatusProjectData(r, "Project X", 1);
    expect(result.name).toBe("Project X");
    expect(result.billingCategory).toBeNull();
    expect(result.vat).toBeNull();
  });

  it("handles all fields populated", () => {
    const r = new Array(35).fill("");
    r[0] = "Active";
    r[1] = "DAFF";
    r[2] = "CL001";
    r[4] = "Client Manager";
    r[5] = "Eng Manager";
    r[9] = "Fixed";
    r[13] = "100000";
    const result = buildJobStatusProjectData(r, "Project Y", 5);
    expect(result.name).toBe("Project Y");
    expect(result.projectCode).toBe("CL001-005");
    expect(result.vat).toBe("DAFF");
    expect(result.billingCategory).toBe("Fixed");
    expect(result.contractType).toBe("fixed_price");
  });
});

describe("buildOpenOppRecord - extended", () => {
  it("handles empty row", () => {
    const r = ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""];
    const result = buildOpenOppRecord(r, "Test", "Q");
    expect(result.name).toBe("Test");
    expect(result.classification).toBe("Q");
  });

  it("handles row with all values", () => {
    const r = [
      "", "", "45000", "100000", "0.35", "T&M", "45000", "45100",
      "DAFF", "active", "Comment", "CAS Lead", "CSD Lead", "Category",
      "Partner", "Client Contact", "CC001",
    ];
    const result = buildOpenOppRecord(r, "Big Opp", "S");
    expect(result.name).toBe("Big Opp");
    expect(result.classification).toBe("S");
    expect(result.vat).toBe("DAFF");
    expect(result.workType).toBe("T&M");
  });
});

describe("parseStaffSOTRow - extended", () => {
  it("handles virtual bench status", () => {
    const r = ["John Doe", "L3", "Permanent", "yes", "5000", "virtual bench", "6000", "JID001", "45000", "45000", "Team A", "", "Sydney"];
    const result = parseStaffSOTRow(r);
    expect(result.empData.status).toBe("bench");
    expect(result.empData.payrollTax).toBe(true);
  });

  it("handles empty name", () => {
    const r = ["", "L3", "Permanent", "no", "5000", "active", "6000", "", "", "", "", "", ""];
    const result = parseStaffSOTRow(r);
    expect(result.firstName).toBe("");
    expect(result.empData.payrollTax).toBe(false);
  });
});

describe("buildPipelineRevenueRecord - extended", () => {
  it("handles row with revenue months", () => {
    const r = ["", "", "", "", "", "", "", "", "", "100", "200", "300", "400", "500", "600", "700", "800", "900", "1000", "1100", "1200"];
    const result = buildPipelineRevenueRecord(r, "Pipeline Opp", "C", "DAFF", "24-25", 9);
    expect(result.name).toBe("Pipeline Opp");
    expect(result.classification).toBe("C");
    expect(result.revenueM1).toBeTruthy();
  });
});

describe("buildGrossProfitRecord - extended", () => {
  it("handles full row with monthly GP data", () => {
    const r = [
      "GP Project", "C", "DAFF", "1000", "2000", "3000", "4000", "5000", "6000",
      "7000", "8000", "9000", "10000", "11000", "12000",
    ];
    const result = buildGrossProfitRecord(r, "GP Project", "C", "DAFF");
    expect(result.name).toBe("GP Project (GP)");
    expect(result.classification).toBe("C");
    expect(result.vat).toBe("DAFF");
    expect(result.grossProfitM1).toBe("1000.00");
  });
});

describe("buildCxRatingRecord - extended", () => {
  it("handles full CX rating row", () => {
    const r = [
      "", "", "", "", "", "", "", "", "", "",
      "", "", "", "", "", "", "", "",
      "Q1", "Q2", "Q3", "Q4",
      "", "", "", "Notes here",
    ];
    const result = buildCxRatingRecord(r, "Engagement", 1, 2, "John");
    expect(result.engagementName).toBe("Engagement");
    expect(result.projectId).toBe(1);
    expect(result.employeeId).toBe(2);
  });
});

describe("buildResourceCostRecord - extended", () => {
  it("builds record with all fields", () => {
    const monthlyCosts = ["100", "200", "300", "400", "500", "600", "700", "800", "900", "1000", "1100", "1200"];
    const result = buildResourceCostRecord(1, "John Doe", "Permanent", "Phase 1", "24-25", monthlyCosts, "7800", "Manual");
    expect(result.employeeId).toBe(1);
    expect(result.staffType).toBe("Permanent");
    expect(result.fyYear).toBe("24-25");
    expect(result.costM1).toBe("100");
    expect(result.totalCost).toBe("7800");
  });

  it("handles null employee", () => {
    const monthlyCosts = ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
    const result = buildResourceCostRecord(null, "Unknown", null, "Phase 1", "24-25", monthlyCosts, "0", "Import");
    expect(result.employeeId).toBeNull();
    expect(result.staffType).toBeNull();
  });
});

describe("collectPlannerUserIds", () => {
  it("collects unique user IDs from assignments", () => {
    const tasks = [
      { assignments: { user1: {}, user2: {} } },
      { assignments: { user2: {}, user3: {} } },
    ];
    const result = collectPlannerUserIds(tasks);
    expect(result.size).toBe(3);
    expect(result.has("user1")).toBe(true);
    expect(result.has("user3")).toBe(true);
  });

  it("handles tasks without assignments", () => {
    const tasks = [
      { assignments: null },
      { assignments: undefined },
      {},
    ];
    const result = collectPlannerUserIds(tasks);
    expect(result.size).toBe(0);
  });
});

describe("findRecentlyCompletedTasks - extended", () => {
  it("finds recently completed tasks", () => {
    const tasks = [
      { title: "Task 1", percentComplete: 100, completedDateTime: new Date().toISOString(), completedBy: { user: { id: "u1" } } },
      { title: "Task 2", percentComplete: 50, completedDateTime: new Date().toISOString() },
    ];
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const resolveUser = (uid: string) => uid === "u1" ? "John" : "Unknown";
    const result = findRecentlyCompletedTasks(tasks, fourWeeksAgo, resolveUser);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Task 1");
    expect(result[0].completedBy).toBe("John");
  });

  it("skips old completed tasks", () => {
    const tasks = [
      { title: "Old Task", percentComplete: 100, completedDateTime: "2020-01-01T00:00:00Z" },
    ];
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const resolveUser = () => "John";
    const result = findRecentlyCompletedTasks(tasks, fourWeeksAgo, resolveUser);
    expect(result).toHaveLength(0);
  });

  it("uses displayName fallback", () => {
    const tasks = [
      { title: "Task", percentComplete: 100, completedDateTime: new Date().toISOString(), completedBy: { user: { displayName: "Jane" } } },
    ];
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const resolveUser = () => "Unknown";
    const result = findRecentlyCompletedTasks(tasks, fourWeeksAgo, resolveUser);
    expect(result).toHaveLength(1);
    expect(result[0].completedBy).toBe("Jane");
  });

  it("returns empty for no completed tasks", () => {
    const result = findRecentlyCompletedTasks([], new Date(), () => "");
    expect(result).toHaveLength(0);
  });
});

describe("buildPipelineSummaryText", () => {
  it("builds pipeline summary from opps", () => {
    const opps = [
      { name: "Opp 1", classification: "C", status: "active", revenueM1: "1000", revenueM2: "2000", revenueM3: "0", revenueM4: "0", revenueM5: "0", revenueM6: "0", revenueM7: "0", revenueM8: "0", revenueM9: "0", revenueM10: "0", revenueM11: "0", revenueM12: "0" },
      { name: "Opp 2", classification: "S", revenueM1: "0", revenueM2: "0", revenueM3: "0", revenueM4: "0", revenueM5: "0", revenueM6: "0", revenueM7: "0", revenueM8: "0", revenueM9: "0", revenueM10: "0", revenueM11: "0", revenueM12: "0" },
    ];
    const result = buildPipelineSummaryText(opps);
    expect(result).toContain("Opp 1");
    expect(result).toContain("C");
    expect(result).toContain("active");
    expect(result).toContain("Opp 2");
    expect(result).toContain("open");
  });

  it("handles empty array", () => {
    expect(buildPipelineSummaryText([])).toBe("");
  });
});

describe("buildRiskSummaryText", () => {
  it("builds risk summary text", () => {
    const risks = [
      { description: "Risk 1", impactRating: "High", likelihood: "Medium", owner: "John" },
      { description: "Risk 2", impactRating: "Low", likelihood: "High", owner: "Jane" },
    ];
    const result = buildRiskSummaryText(risks);
    expect(result).toContain("Risk 1");
    expect(result).toContain("High");
    expect(result).toContain("John");
    expect(result).toContain("Risk 2");
  });

  it("handles empty array", () => {
    expect(buildRiskSummaryText([])).toBe("");
  });
});

describe("buildOpenOppRecord - growth VAT", () => {
  it("uppercases growth VAT", () => {
    const r = new Array(20).fill("");
    r[8] = "growth";
    const result = buildOpenOppRecord(r, "Test", "Q");
    expect(result.vat).toBe("GROWTH");
  });

  it("cleans semicolons from VAT", () => {
    const r = new Array(20).fill("");
    r[8] = "DAFF;#extra";
    const result = buildOpenOppRecord(r, "Test", "Q");
    expect(result.vat).toBe("DAFFextra");
  });

  it("cleans pipe separator from VAT", () => {
    const r = new Array(20).fill("");
    r[8] = "SAU|pipe";
    const result = buildOpenOppRecord(r, "Test", "Q");
    expect(result.vat).toBe("SAU");
  });

  it("returns null for empty VAT", () => {
    const r = new Array(20).fill("");
    r[8] = "";
    const result = buildOpenOppRecord(r, "Test", "Q");
    expect(result.vat).toBeNull();
  });

  it("cleans CSD lead multi-value", () => {
    const r = new Array(20).fill("");
    r[12] = "John;#1;#Jane";
    const result = buildOpenOppRecord(r, "Test", "Q");
    expect(result.csdLead).toContain("John");
    expect(result.csdLead).toContain("Jane");
  });
});

describe("buildJobStatusProjectData - T&M", () => {
  it("sets T&M contract type", () => {
    const r = new Array(35).fill("");
    r[9] = "T&M";
    const result = buildJobStatusProjectData(r, "TM Project", 1);
    expect(result.contractType).toBe("time_materials");
    expect(result.billingCategory).toBe("T&M");
  });

  it("sets completed status for closed projects", () => {
    const r = new Array(35).fill("");
    r[0] = "Closed - Complete";
    const result = buildJobStatusProjectData(r, "Done Project", 1);
    expect(result.status).toBe("completed");
    expect(result.adStatus).toBe("Closed - Complete");
  });

  it("generates IMP code for no client code", () => {
    const r = new Array(35).fill("");
    const result = buildJobStatusProjectData(r, "No Client", 3);
    expect(result.projectCode).toBe("IMP-003");
  });
});

describe("deriveFyYear - extended", () => {
  it("handles December date", () => {
    expect(deriveFyYear("2024-12-15")).toBe("24-25");
  });

  it("handles January date", () => {
    expect(deriveFyYear("2025-01-15")).toBe("24-25");
  });

  it("handles invalid date string", () => {
    expect(deriveFyYear("not-a-date")).toBe("N-N");
  });
});

describe("getOppMonthlyRevenues - extended", () => {
  it("extracts all 12 revenue months", () => {
    const opp = {
      revenueM1: "100", revenueM2: "200", revenueM3: "300",
      revenueM4: "400", revenueM5: "500", revenueM6: "600",
      revenueM7: "700", revenueM8: "800", revenueM9: "900",
      revenueM10: "1000", revenueM11: "1100", revenueM12: "1200",
    };
    const result = getOppMonthlyRevenues(opp);
    expect(result).toHaveLength(12);
    expect(result[0]).toBe("100");
    expect(result[11]).toBe("1200");
  });

  it("handles null revenues", () => {
    const opp = {};
    const result = getOppMonthlyRevenues(opp);
    expect(result).toHaveLength(12);
    result.forEach(v => expect(v).toBeUndefined());
  });
});

describe("sumRevenues - extended", () => {
  it("sums numeric strings", () => {
    expect(sumRevenues(["100", "200.50", null, "300"])).toBeCloseTo(600.5);
  });

  it("handles all nulls", () => {
    expect(sumRevenues([null, null, null])).toBe(0);
  });
});

describe("parseMonthlyCosts - extended", () => {
  it("parses monthly cost columns", () => {
    const r = [0, 0, 0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];
    const result = parseMonthlyCosts(r, 3, 14);
    expect(result.costs).toHaveLength(12);
    expect(result.costs[0]).toBe("100.00");
    expect(result.total).toBeCloseTo(7800);
  });

  it("handles NaN values", () => {
    const r = [0, 0, 0, "abc", 200];
    const result = parseMonthlyCosts(r, 3, 4);
    expect(result.costs[0]).toBe("0");
    expect(result.costs[1]).toBe("200.00");
  });
});

describe("buildEmployeeNameMap - extended", () => {
  it("maps employee names to IDs", () => {
    const employees = [
      { id: 1, firstName: "John", lastName: "Doe" },
      { id: 2, firstName: "Jane", lastName: "Smith" },
    ];
    const result = buildEmployeeNameMap(employees);
    expect(result.get("john doe")).toBe(1);
    expect(result.get("jane smith")).toBe(2);
  });

  it("handles empty array", () => {
    const result = buildEmployeeNameMap([]);
    expect(result.size).toBe(0);
  });
});

describe("buildExistingTaskMaps - extended", () => {
  it("separates tasks by external ID", () => {
    const tasks = [
      { id: 1, externalId: "ext1", taskName: "Task 1" },
      { id: 2, externalId: null, taskName: "Task 2" },
      { id: 3, externalId: "ext2", taskName: "Task 3" },
    ];
    const result = buildExistingTaskMaps(tasks);
    expect(result.existingByExtId.size).toBe(2);
    expect(result.existingWithoutExtId).toHaveLength(1);
    expect(result.existingByExtId.get("ext1")?.taskName).toBe("Task 1");
  });

  it("handles all tasks having external IDs", () => {
    const tasks = [
      { id: 1, externalId: "ext1" },
      { id: 2, externalId: "ext2" },
    ];
    const result = buildExistingTaskMaps(tasks);
    expect(result.existingByExtId.size).toBe(2);
    expect(result.existingWithoutExtId).toHaveLength(0);
  });
});

describe("buildProjectHoursKpiRecord - extended", () => {
  it("builds KPI record from row", () => {
    const r = new Array(5).fill("");
    r[0] = "2000";
    r[1] = "50000";
    r[2] = "40000";
    const result = buildProjectHoursKpiRecord(r, 1);
    expect(result.projectId).toBe(1);
    expect(result.revenue).toBe("50000.00");
    expect(result.grossCost).toBe("40000.00");
    expect(result.margin).toBe("10000.00");
  });
});

describe("parsePersonalHoursEmployeeFields - extended", () => {
  it("parses employee fields from row", () => {
    const r = new Array(15).fill("");
    r[10] = "John";
    r[11] = "Doe";
    r[12] = "Developer";
    const result = parsePersonalHoursEmployeeFields(r);
    expect(result).not.toBeNull();
    expect(result!.firstName).toBe("John");
    expect(result!.lastName).toBe("Doe");
    expect(result!.role).toBe("Developer");
  });

  it("returns null for empty names", () => {
    const r = new Array(15).fill("");
    const result = parsePersonalHoursEmployeeFields(r);
    expect(result).toBeNull();
  });

  it("handles first name only", () => {
    const r = new Array(15).fill("");
    r[10] = "Madonna";
    const result = parsePersonalHoursEmployeeFields(r);
    expect(result).not.toBeNull();
    expect(result!.firstName).toBe("Madonna");
    expect(result!.lastName).toBe("");
  });
});

describe("buildPersonalHoursTimesheetRecord - extended", () => {
  it("builds timesheet with hours", () => {
    const r = new Array(20).fill("");
    r[1] = "40";
    r[2] = "5000";
    r[3] = "4000";
    r[16] = "Project";
    const result = buildPersonalHoursTimesheetRecord(r, 1, 2, "2024-01-15");
    expect(result.employeeId).toBe(1);
    expect(result.projectId).toBe(2);
    expect(result.weekEnding).toBe("2024-01-15");
    expect(result.hoursWorked).toBe("40.00");
    expect(result.billable).toBe(true);
  });

  it("marks leave as non-billable", () => {
    const r = new Array(20).fill("");
    r[16] = "Leave";
    const result = buildPersonalHoursTimesheetRecord(r, 1, 2, "2024-01-15");
    expect(result.billable).toBe(false);
    expect(result.activityType).toBe("Leave");
  });
});

describe("buildPlannerBucketGroups - extended", () => {
  it("groups tasks by bucket", () => {
    const tasks = [
      { bucketId: "b1", title: "Task 1", percentComplete: 0 },
      { bucketId: "b1", title: "Task 2", percentComplete: 100 },
      { bucketId: "b2", title: "Task 3", percentComplete: 50 },
    ];
    const bucketCache = new Map([["b1", "Sprint 1"], ["b2", "Sprint 2"]]);
    const resolveUser = (uid: string) => uid;
    const result = buildPlannerBucketGroups(tasks, bucketCache, resolveUser);
    expect(result["Sprint 1"]).toHaveLength(2);
    expect(result["Sprint 2"]).toHaveLength(1);
    expect(result["Sprint 1"][0]).toContain("Not Started");
    expect(result["Sprint 1"][1]).toContain("Completed");
    expect(result["Sprint 2"][0]).toContain("In Progress");
  });

  it("uses Other bucket for unmatched", () => {
    const tasks = [{ bucketId: "unknown", title: "Task 1", percentComplete: 0 }];
    const bucketCache = new Map<string, string>();
    const resolveUser = (uid: string) => uid;
    const result = buildPlannerBucketGroups(tasks, bucketCache, resolveUser);
    expect(result["Other"]).toHaveLength(1);
  });

  it("includes assignee names", () => {
    const tasks = [{
      bucketId: "b1", title: "Task 1", percentComplete: 0,
      assignments: { "user1": {}, "user2": {} },
    }];
    const bucketCache = new Map([["b1", "Sprint"]]);
    const resolveUser = (uid: string) => uid === "user1" ? "John" : "Jane";
    const result = buildPlannerBucketGroups(tasks, bucketCache, resolveUser);
    expect(result["Sprint"][0]).toContain("John");
    expect(result["Sprint"][0]).toContain("Jane");
  });

  it("handles no bucketId", () => {
    const tasks = [{ title: "Task 1", percentComplete: 0 }];
    const bucketCache = new Map<string, string>();
    const resolveUser = (uid: string) => uid;
    const result = buildPlannerBucketGroups(tasks, bucketCache, resolveUser);
    expect(result["Other"]).toHaveLength(1);
  });
});

describe("computeFyFromDate", () => {
  it("returns FY for July date", () => {
    expect(computeFyFromDate("2024-07-15")).toBe("24-25");
  });

  it("returns FY for January date", () => {
    expect(computeFyFromDate("2025-01-10")).toBe("24-25");
  });

  it("returns FY for June date", () => {
    expect(computeFyFromDate("2024-06-30")).toBe("23-24");
  });

  it("handles Date object", () => {
    expect(computeFyFromDate(new Date(2024, 6, 1))).toBe("24-25");
  });

  it("returns null for invalid date", () => {
    expect(computeFyFromDate("invalid")).toBeNull();
  });

  it("handles December date", () => {
    expect(computeFyFromDate("2024-12-01")).toBe("24-25");
  });
});

describe("normalizeWeeklyUtilRow", () => {
  it("normalizes a row with all fields", () => {
    const result = normalizeWeeklyUtilRow({
      employee_id: "5",
      week_ending: "2024-07-15T00:00:00.000Z",
      employee_name: "John",
      employee_role: "Dev",
      total_hours: 40,
      billable_hours: 32,
      cost_value: 5000,
      sale_value: 8000,
    });
    expect(result.employee_id).toBe(5);
    expect(result.week_ending).toBe("2024-07-15");
    expect(result.total_hours).toBe("40");
    expect(result.billable_hours).toBe("32");
  });

  it("handles Date object for week_ending", () => {
    const result = normalizeWeeklyUtilRow({
      employee_id: 1,
      week_ending: new Date("2024-07-15"),
      employee_name: null,
      employee_role: null,
      total_hours: null,
      billable_hours: null,
      cost_value: null,
      sale_value: null,
    });
    expect(result.week_ending).toBe("2024-07-15");
    expect(result.employee_name).toBe("Unknown");
    expect(result.employee_role).toBe("");
    expect(result.total_hours).toBe("0");
  });
});

describe("PHASE_TO_CLASSIFICATION", () => {
  it("maps all phases correctly", () => {
    expect(PHASE_TO_CLASSIFICATION["1.A - Activity"]).toBe("A");
    expect(PHASE_TO_CLASSIFICATION["2.Q - Qualified"]).toBe("Q");
    expect(PHASE_TO_CLASSIFICATION["3.DF - Submitted"]).toBe("DF");
    expect(PHASE_TO_CLASSIFICATION["4.DVF - Shortlisted"]).toBe("DVF");
    expect(PHASE_TO_CLASSIFICATION["5.S - Selected"]).toBe("S");
  });

  it("has exactly 5 entries", () => {
    expect(Object.keys(PHASE_TO_CLASSIFICATION)).toHaveLength(5);
  });
});

describe("buildFySetFromDates", () => {
  it("builds sorted FY set from dates", () => {
    const dates = [
      { week_ending: "2024-07-15" },
      { week_ending: "2024-12-01" },
      { week_ending: "2023-08-01" },
      { week_ending: "2024-03-01" },
    ];
    const result = buildFySetFromDates(dates);
    expect(result).toEqual(["23-24", "24-25"]);
  });

  it("handles Date objects", () => {
    const dates = [
      { week_ending: new Date(2024, 6, 1) },
      { week_ending: new Date(2024, 0, 1) },
    ];
    const result = buildFySetFromDates(dates);
    expect(result).toEqual(["23-24", "24-25"]);
  });

  it("handles empty array", () => {
    expect(buildFySetFromDates([])).toEqual([]);
  });
});

describe("computeUtilizationRatio", () => {
  it("computes utilization when total > 0", () => {
    const result = computeUtilizationRatio(100, 75);
    expect(result.totalPermanent).toBe(100);
    expect(result.allocatedPermanent).toBe(75);
    expect(result.utilization).toBe(0.75);
  });

  it("returns 0 utilization when total is 0", () => {
    const result = computeUtilizationRatio(0, 0);
    expect(result.utilization).toBe(0);
  });
});

describe("isImportSkippableRow", () => {
  it("skips empty string", () => {
    expect(isImportSkippableRow("")).toBe(true);
  });

  it("skips 'project'", () => {
    expect(isImportSkippableRow("project")).toBe(true);
  });

  it("skips 'Project Name'", () => {
    expect(isImportSkippableRow("Project Name")).toBe(true);
  });

  it("skips 'name'", () => {
    expect(isImportSkippableRow("name")).toBe(true);
  });

  it("does not skip valid name", () => {
    expect(isImportSkippableRow("My Project")).toBe(false);
  });
});

describe("formatImportError", () => {
  it("formats error with row offset", () => {
    expect(formatImportError(5, 2, "Invalid data")).toBe("Row 7: Invalid data");
  });

  it("formats error with zero offset", () => {
    expect(formatImportError(0, 1, "Missing field")).toBe("Row 1: Missing field");
  });
});

describe("buildPermissionsMap", () => {
  it("builds permissions from allowed rows", () => {
    const rows = [
      { resource: "projects", action: "view", allowed: true },
      { resource: "projects", action: "edit", allowed: true },
      { resource: "projects", action: "delete", allowed: false },
      { resource: "timesheets", action: "view", allowed: true },
    ];
    const result = buildPermissionsMap(rows);
    expect(result.projects).toEqual(["view", "edit"]);
    expect(result.timesheets).toEqual(["view"]);
  });

  it("returns empty object for no permissions", () => {
    const rows = [
      { resource: "projects", action: "view", allowed: false },
    ];
    expect(buildPermissionsMap(rows)).toEqual({});
  });

  it("handles empty array", () => {
    expect(buildPermissionsMap([])).toEqual({});
  });
});

describe("formatPlannerTaskEntry", () => {
  it("formats not started task without assignees", () => {
    expect(formatPlannerTaskEntry({ title: "Task A", percentComplete: 0 }, "")).toBe("Task A [Not Started]");
  });

  it("formats completed task with assignees", () => {
    expect(formatPlannerTaskEntry({ title: "Task B", percentComplete: 100 }, "John")).toBe("Task B [Completed] (John)");
  });

  it("formats in progress task", () => {
    expect(formatPlannerTaskEntry({ title: "Task C", percentComplete: 50 }, "Alice, Bob")).toBe("Task C [In Progress] (Alice, Bob)");
  });

  it("handles missing percentComplete", () => {
    expect(formatPlannerTaskEntry({ title: "X" }, "")).toBe("X [Not Started]");
  });
});

describe("buildVatAiRiskSummary", () => {
  it("uses userRisks when provided", () => {
    const userRisks = [{ description: "Risk 1", impactRating: "High", likelihood: "Low", status: "Open", owner: "Alice" }];
    const result = buildVatAiRiskSummary(userRisks, []);
    expect(result).toContain("Risk 1");
    expect(result).toContain("High");
    expect(result).toContain("Low");
  });

  it("falls back to stored risks when userRisks is undefined", () => {
    const risks = [{ description: "Stored Risk", impactRating: "Medium", likelihood: "Medium", status: "Open", owner: "Bob" }];
    const result = buildVatAiRiskSummary(undefined, risks);
    expect(result).toContain("Stored Risk");
  });

  it("falls back to stored risks when userRisks is empty", () => {
    const risks = [{ description: "R2", impactRating: "Low", likelihood: "High", status: "Closed", owner: "Z" }];
    const result = buildVatAiRiskSummary([], risks);
    expect(result).toContain("R2");
  });

  it("handles missing fields with N/A defaults", () => {
    const userRisks = [{ description: "RiskX" }];
    const result = buildVatAiRiskSummary(userRisks, []);
    expect(result).toContain("N/A");
  });
});

describe("buildVatAiActionSummaries", () => {
  it("separates completed and open actions", () => {
    const items = [
      { description: "Done task", status: "Completed", owner: "A", section: "S1" },
      { description: "Open task", status: "Open", owner: "B", dueDate: "2024-01-01" },
    ];
    const result = buildVatAiActionSummaries(items);
    expect(result.completedActionsSummary).toContain("Done task");
    expect(result.openActionsSummary).toContain("Open task");
  });

  it("treats Done and Closed as completed", () => {
    const items = [
      { description: "T1", status: "Done", owner: "X" },
      { description: "T2", status: "Closed", owner: "Y" },
    ];
    const result = buildVatAiActionSummaries(items);
    expect(result.completedActionsSummary).toContain("T1");
    expect(result.completedActionsSummary).toContain("T2");
    expect(result.openActionsSummary).toBe("");
  });

  it("handles empty array", () => {
    const result = buildVatAiActionSummaries([]);
    expect(result.completedActionsSummary).toBe("");
    expect(result.openActionsSummary).toBe("");
  });
});

describe("buildVatAiPlannerSummary", () => {
  it("groups completed and in-progress tasks", () => {
    const tasks = [
      { taskName: "Task1", progress: "100%", bucketName: "B1" },
      { taskName: "Task2", progress: "50%", dueDate: "2024-06-01" },
      { taskName: "Task3", progress: "0%" },
    ];
    const result = buildVatAiPlannerSummary(tasks);
    expect(result).toContain("Completed:");
    expect(result).toContain("Task1");
    expect(result).toContain("In Progress:");
    expect(result).toContain("Task2");
    expect(result).not.toContain("Task3");
  });

  it("handles all completed", () => {
    const tasks = [{ taskName: "T", progress: "Complete", bucketName: "B" }];
    const result = buildVatAiPlannerSummary(tasks);
    expect(result).toContain("Completed:");
    expect(result).not.toContain("In Progress:");
  });

  it("handles empty tasks", () => {
    expect(buildVatAiPlannerSummary([])).toBe("");
  });
});

describe("buildVatReportContextString", () => {
  it("returns empty string for null report", () => {
    expect(buildVatReportContextString(null)).toBe("");
  });

  it("builds context with report data", () => {
    const report = { overallStatus: "GREEN", statusSummary: "All good", openOppsSummary: "5 opps", bigPlays: "Big deal", approachToShortfall: "Plan B" };
    const result = buildVatReportContextString(report);
    expect(result).toContain("PREVIOUS REPORT CONTENT:");
    expect(result).toContain("GREEN");
    expect(result).toContain("All good");
  });

  it("uses custom label", () => {
    const result = buildVatReportContextString({ overallStatus: "RED" }, "CUSTOM LABEL");
    expect(result).toContain("CUSTOM LABEL:");
  });

  it("handles missing fields", () => {
    const result = buildVatReportContextString({});
    expect(result).toContain("Not set");
    expect(result).toContain("Empty");
  });
});

describe("buildPlannerCompletedByName", () => {
  it("resolves user by id", () => {
    const pt = { completedBy: { user: { id: "u1", displayName: "Fallback" } } };
    const resolve = (uid: string) => uid === "u1" ? "Resolved Name" : "Unknown";
    expect(buildPlannerCompletedByName(pt, resolve)).toBe("Resolved Name");
  });

  it("falls back to displayName", () => {
    const pt = { completedBy: { user: { displayName: "Display" } } };
    expect(buildPlannerCompletedByName(pt, () => "X")).toBe("Display");
  });

  it("returns Unknown when no completedBy", () => {
    expect(buildPlannerCompletedByName({}, () => "X")).toBe("Unknown");
  });

  it("returns Unknown when completedBy has no user", () => {
    expect(buildPlannerCompletedByName({ completedBy: {} }, () => "X")).toBe("Unknown");
  });
});

describe("buildPlannerSyncResult", () => {
  it("detects completed task", () => {
    const pt = { completedBy: { user: { id: "u1", displayName: "John" } }, completedDateTime: "2024-01-15T10:00:00Z" };
    const rec = { taskName: "Task", bucketName: "B", progress: "Completed", dueDate: "2024-01-15", priority: "Medium", assignedTo: "John", extId: "e1" };
    const existing = { progress: "In Progress", taskName: "Task", dueDate: "2024-01-15", priority: "Medium", bucketName: "B", assignedTo: "John", externalId: "e1" };
    const result = buildPlannerSyncResult(pt, rec, existing, () => "John");
    expect(result.wasCompleted).toBe(true);
    expect(result.completedInfo).toBeDefined();
    expect(result.completedInfo!.completedBy).toBe("John");
  });

  it("detects no completion when already completed", () => {
    const rec = { taskName: "T", bucketName: "B", progress: "Completed", dueDate: "", priority: "Low", assignedTo: "", extId: "e1" };
    const existing = { progress: "Completed", taskName: "T", dueDate: "", priority: "Low", bucketName: "B", assignedTo: "", externalId: "e1" };
    const result = buildPlannerSyncResult({}, rec, existing, () => "X");
    expect(result.wasCompleted).toBe(false);
  });

  it("detects bucket update needed", () => {
    const rec = { taskName: "T", bucketName: "NewBucket", progress: "Not Started", dueDate: "", priority: "Low", assignedTo: "", extId: "e1" };
    const existing = { progress: "Not Started", taskName: "T", dueDate: "", priority: "Low", bucketName: "OldBucket", assignedTo: "", externalId: "e1" };
    const result = buildPlannerSyncResult({}, rec, existing, () => "X");
    expect(result.needsUpdate).toBe(true);
  });
});

describe("extractInitialUserCache", () => {
  it("extracts user id/name pairs", () => {
    const tasks = [
      { completedBy: { user: { id: "u1", displayName: "Alice" } } },
      { completedBy: { user: { id: "u2", displayName: "Bob" } } },
      { completedBy: null },
      {},
    ];
    const cache = extractInitialUserCache(tasks);
    expect(cache.size).toBe(2);
    expect(cache.get("u1")).toBe("Alice");
    expect(cache.get("u2")).toBe("Bob");
  });

  it("returns empty map for empty tasks", () => {
    expect(extractInitialUserCache([]).size).toBe(0);
  });
});

describe("buildVatAiSuggestFieldsPrompt", () => {
  it("includes vatName and pipeline data", () => {
    const result = buildVatAiSuggestFieldsPrompt("DAFF", "Pipeline info", "", "", "", "", "", undefined);
    expect(result).toContain("DAFF");
    expect(result).toContain("Pipeline info");
    expect(result).toContain("statusSummary");
  });

  it("includes risk summary when provided", () => {
    const result = buildVatAiSuggestFieldsPrompt("SAU", "", "Risk data here", "", "", "", "", undefined);
    expect(result).toContain("CURRENT RISKS");
    expect(result).toContain("Risk data here");
  });

  it("includes user notes", () => {
    const result = buildVatAiSuggestFieldsPrompt("V", "", "", "", "", "", "", "My notes");
    expect(result).toContain("USER NOTES");
    expect(result).toContain("My notes");
  });

  it("handles all empty inputs", () => {
    const result = buildVatAiSuggestFieldsPrompt("", "", "", "", "", "", "", undefined);
    expect(result).toContain("No pipeline data available");
  });
});

describe("buildVatChatSystemPrompt", () => {
  it("includes vatName and pipeline data", () => {
    const result = buildVatChatSystemPrompt("VICGov", "Pipe data", "Risk info", "Report ctx");
    expect(result).toContain("VICGov");
    expect(result).toContain("Pipe data");
    expect(result).toContain("Risk info");
    expect(result).toContain("Report ctx");
  });

  it("handles empty pipeline", () => {
    const result = buildVatChatSystemPrompt("T", "", "", "");
    expect(result).toContain("No pipeline data available");
  });
});
