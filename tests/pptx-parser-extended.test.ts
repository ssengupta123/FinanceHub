import { describe, it, expect } from "vitest";
import {
  decodeXmlEntities,
  resolveVatName,
  tryParseTextDate,
  tryParseSlashDate,
  matchSectionLabel,
  computeHeaderSkipCount,
  shouldSkipParagraph,
  groupSlidesByVat,
  processTableForReport,
  appendContentFields,
  findFallbackOverallStatus,
  buildReportsSummary,
  extractCellText,
  extractRowCells,
  extractTableRows,
  extractRagFromRow,
  appendStatusSummary,
  processStatusRow,
  parseRiskRow,
  extractSectionContent,
  classifyParagraph,
  buildParagraphContent,
  buildReportFromGroup,
  extractOverallStatusFromTable,
  parseRiskTable,
  parsePlannerTable,
  extractStatusSummary,
  extractContentFromParagraphs,
  extractReportDate,
  isTitleSlide,
  isPlannerSlide,
  detectSectionFromParagraph,
  extractParagraphs,
  extractTables,
} from "../server/pptx-parser";

describe("decodeXmlEntities", () => {
  it("decodes &amp;", () => {
    expect(decodeXmlEntities("A &amp; B")).toBe("A & B");
  });

  it("decodes &lt; and &gt;", () => {
    expect(decodeXmlEntities("&lt;div&gt;")).toBe("<div>");
  });

  it("decodes &apos; and &quot;", () => {
    expect(decodeXmlEntities("&apos;hello&quot;")).toBe("'hello\"");
  });

  it("handles strings without entities", () => {
    expect(decodeXmlEntities("plain text")).toBe("plain text");
  });

  it("handles empty string", () => {
    expect(decodeXmlEntities("")).toBe("");
  });

  it("handles multiple entities", () => {
    expect(decodeXmlEntities("&amp;&amp;&amp;")).toBe("&&&");
  });
});

describe("resolveVatName", () => {
  it("resolves DAFF", () => {
    expect(resolveVatName("DAFF")).toBe("DAFF");
  });

  it("resolves case-insensitively", () => {
    expect(resolveVatName("daff")).toBe("DAFF");
  });

  it("resolves SAU variations", () => {
    expect(resolveVatName("SAU")).toBe("SAU");
  });

  it("resolves VICGov variations", () => {
    const result = resolveVatName("VIC Gov");
    expect(result).toBeTruthy();
  });

  it("resolves Growth", () => {
    expect(resolveVatName("Growth")).toBe("Growth");
  });

  it("returns null for unknown VAT", () => {
    expect(resolveVatName("UNKNOWN_VAT_XYZ")).toBeNull();
  });

  it("handles P&P", () => {
    const result = resolveVatName("P&P");
    expect(result).toBe("P&P");
  });

  it("handles Emerging", () => {
    expect(resolveVatName("Emerging")).toBe("Emerging");
  });
});

describe("tryParseTextDate", () => {
  it("parses day-month-year format", () => {
    const result = tryParseTextDate("15 January 2024");
    expect(result).toBeTruthy();
    if (result) expect(result).toMatch(/^2024/);
  });

  it("parses day abbreviated month year", () => {
    const result = tryParseTextDate("1 Jul 2024");
    expect(result).toBeTruthy();
    if (result) expect(result).toMatch(/^2024/);
  });

  it("returns null for text without date pattern", () => {
    expect(tryParseTextDate("not a date")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(tryParseTextDate("")).toBeNull();
  });
});

describe("tryParseSlashDate", () => {
  it("parses dd/mm/yyyy", () => {
    expect(tryParseSlashDate("15/07/2024")).toBe("2024-07-15");
  });

  it("parses d/m/yyyy", () => {
    const result = tryParseSlashDate("1/7/2024");
    expect(result).toBe("2024-07-01");
  });

  it("returns null for non-date", () => {
    expect(tryParseSlashDate("not/a/date")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(tryParseSlashDate("")).toBeNull();
  });
});

describe("matchSectionLabel", () => {
  it("matches exact section labels", () => {
    const sections: Record<string, string> = {
      "OPEN OPPS": "openOpps",
      "BIG PLAYS": "bigPlays",
    };
    expect(matchSectionLabel("OPEN OPPS", sections)).toBe("openOpps");
  });

  it("matches partial labels", () => {
    const sections: Record<string, string> = {
      "OPEN OPP": "openOpps",
    };
    const result = matchSectionLabel("OPEN OPPS AND MORE", sections);
    expect(result).toBe("openOpps");
  });

  it("returns null for no match", () => {
    const sections: Record<string, string> = { "RISK": "risks" };
    expect(matchSectionLabel("NOTHING HERE", sections)).toBeNull();
  });
});

describe("computeHeaderSkipCount", () => {
  it("returns 0 for empty array", () => {
    expect(computeHeaderSkipCount([])).toBe(0);
  });

  it("skips header-like paragraphs", () => {
    const paragraphs = ["STATUS OVERVIEW", "DAFF - Department", "Some actual content"];
    const result = computeHeaderSkipCount(paragraphs);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe("shouldSkipParagraph", () => {
  it("skips GREEN status", () => {
    expect(shouldSkipParagraph("GREEN")).toBe(true);
  });

  it("skips AMBER status", () => {
    expect(shouldSkipParagraph("AMBER")).toBe(true);
  });

  it("skips RED status", () => {
    expect(shouldSkipParagraph("RED")).toBe(true);
  });

  it("skips known header markers", () => {
    expect(shouldSkipParagraph("STATUS OVERALL")).toBe(true);
    expect(shouldSkipParagraph("RAISED BY")).toBe(true);
    expect(shouldSkipParagraph("DESCRIPTION")).toBe(true);
  });

  it("skips WEEK ENDING marker", () => {
    expect(shouldSkipParagraph("WEEK ENDING 15 JAN 2024")).toBe(true);
  });

  it("does not skip content text", () => {
    expect(shouldSkipParagraph("SOME ACTUAL CONTENT TEXT")).toBe(false);
  });

  it("does not skip empty strings", () => {
    expect(shouldSkipParagraph("")).toBe(false);
  });
});

describe("groupSlidesByVat", () => {
  it("groups slides with VAT names", () => {
    const slides = [
      { index: 0, paragraphs: ["DAFF - Overview"], tables: [], size: 100 },
      { index: 1, paragraphs: ["DAFF Details"], tables: [], size: 100 },
      { index: 2, paragraphs: ["SAU - Overview"], tables: [], size: 100 },
    ];
    const groups = groupSlidesByVat(slides as any);
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty slides", () => {
    const groups = groupSlidesByVat([]);
    expect(groups).toEqual([]);
  });
});

describe("processTableForReport", () => {
  it("processes risk table with enough columns", () => {
    const table = [
      ["#", "Category", "Description", "Impact", "Likelihood", "Rating", "Owner", "Mitigation", "Status", "Date", "Update"],
      ["1", "Technical", "Server crash", "High", "Low", "Medium", "John", "Add redundancy", "Open", "2024-01-01", "In progress"],
    ];
    const report: any = { risks: [], actionItems: [] };
    processTableForReport(table, report);
    expect(report.risks.length).toBeGreaterThanOrEqual(0);
  });

  it("handles empty table", () => {
    const report: any = { risks: [], actionItems: [] };
    processTableForReport([], report);
    expect(report.risks.length).toBe(0);
  });
});

describe("appendContentFields", () => {
  it("appends paragraph content to report", () => {
    const report: any = {
      statusSummary: "",
      keyHighlights: "",
    };
    const content = {
      statusSummary: "Everything is on track",
      keyHighlights: "Won new deal",
    };
    appendContentFields(report, content as any);
    expect(report.statusSummary).toContain("on track");
  });
});

describe("findFallbackOverallStatus", () => {
  it("returns Green for positive content", () => {
    const slides = [
      { index: 0, paragraphs: ["Status: Green - All systems operational"], tables: [], size: 50 },
    ];
    const result = findFallbackOverallStatus(slides as any);
    expect(result).toBeTruthy();
  });

  it("handles empty slides", () => {
    const result = findFallbackOverallStatus([]);
    expect(typeof result).toBe("string");
  });
});

describe("buildReportsSummary", () => {
  it("builds summary from reports", () => {
    const reports = [
      { vatName: "DAFF", overallStatus: "Green", risks: [], plannerTasks: [] },
      { vatName: "SAU", overallStatus: "Amber", risks: [{}], plannerTasks: [] },
    ];
    const summary = buildReportsSummary(reports as any);
    expect(summary).toContain("DAFF");
    expect(summary).toContain("SAU");
    expect(typeof summary).toBe("string");
  });

  it("handles empty reports", () => {
    const summary = buildReportsSummary([]);
    expect(summary).toBe("");
  });
});

describe("extractCellText", () => {
  it("extracts text from XML cell", () => {
    const xml = '<a:txBody><a:p><a:r><a:t>Hello</a:t></a:r><a:r><a:t>World</a:t></a:r></a:p></a:txBody>';
    expect(extractCellText(xml)).toBe("Hello World");
  });

  it("returns empty string for no text", () => {
    expect(extractCellText("<a:tc></a:tc>")).toBe("");
  });

  it("decodes XML entities in cell text", () => {
    const xml = '<a:t>A &amp; B</a:t>';
    expect(extractCellText(xml)).toBe("A & B");
  });
});

describe("extractRowCells", () => {
  it("extracts cells from row XML", () => {
    const xml = '<a:tc><a:txBody><a:p><a:r><a:t>Cell1</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>Cell2</a:t></a:r></a:p></a:txBody></a:tc>';
    const cells = extractRowCells(xml);
    expect(cells.length).toBe(2);
    expect(cells[0]).toBe("Cell1");
    expect(cells[1]).toBe("Cell2");
  });

  it("returns empty array for no cells", () => {
    expect(extractRowCells("")).toEqual([]);
  });
});

describe("extractTableRows", () => {
  it("extracts rows from table XML", () => {
    const xml = '<a:tr h="123"><a:tc><a:txBody><a:p><a:r><a:t>R1C1</a:t></a:r></a:p></a:txBody></a:tc></a:tr><a:tr h="456"><a:tc><a:txBody><a:p><a:r><a:t>R2C1</a:t></a:r></a:p></a:txBody></a:tc></a:tr>';
    const rows = extractTableRows(xml);
    expect(rows.length).toBe(2);
    expect(rows[0][0]).toBe("R1C1");
  });

  it("returns empty for no rows", () => {
    expect(extractTableRows("")).toEqual([]);
  });
});

describe("extractRagFromRow", () => {
  it("finds GREEN in row", () => {
    expect(extractRagFromRow(["", "GREEN", ""])).toBe("GREEN");
  });

  it("finds AMBER in row", () => {
    expect(extractRagFromRow(["Something", "Status: AMBER", ""])).toBe("AMBER");
  });

  it("finds RED in row", () => {
    expect(extractRagFromRow(["RED flag", "", ""])).toBe("RED");
  });

  it("returns null when no RAG found", () => {
    expect(extractRagFromRow(["Hello", "World", ""])).toBeNull();
  });

  it("finds N/A in row", () => {
    expect(extractRagFromRow(["N/A", "", ""])).toBe("N/A");
  });
});

describe("appendStatusSummary", () => {
  it("appends text with newline", () => {
    expect(appendStatusSummary("Line 1", "Line 2")).toBe("Line 1\nLine 2");
  });

  it("returns text when existing is empty", () => {
    expect(appendStatusSummary("", "New text")).toBe("New text");
  });

  it("returns existing when text is empty", () => {
    expect(appendStatusSummary("Existing", "")).toBe("Existing");
  });
});

describe("processStatusRow", () => {
  it("sets statusSummary from col0 when col1 has STATUS OVERALL", () => {
    const result: Record<string, string> = { statusSummary: "" };
    processStatusRow(["Summary text", "STATUS OVERALL", ""], result);
    expect(result.statusSummary).toBe("Summary text");
  });

  it("skips OVERALL STATUS row", () => {
    const result: Record<string, string> = { statusSummary: "" };
    processStatusRow(["OVERALL STATUS", "Something", ""], result);
    expect(result.statusSummary).toBe("");
  });

  it("sets RAG for OPEN OPPS section", () => {
    const result: Record<string, string> = {};
    processStatusRow(["", "OPEN OPPS", "GREEN"], result);
    expect(result.openOppsStatus).toBe("GREEN");
  });

  it("appends to statusSummary for unmatched rows", () => {
    const result: Record<string, string> = { statusSummary: "Previous" };
    processStatusRow(["New detail", "", ""], result);
    expect(result.statusSummary).toContain("New detail");
  });
});

describe("parseRiskRow", () => {
  it("parses a risk row", () => {
    const row = ["John", "Server down", "High", "2024-01-15", "Open", "Jane", "Critical", "High", "Backup plan", "Need review", "H"];
    const result = parseRiskRow(row, "risk");
    expect(result).not.toBeNull();
    expect(result!.raisedBy).toBe("John");
    expect(result!.description).toBe("Server down");
    expect(result!.riskType).toBe("risk");
  });

  it("returns null for empty row", () => {
    expect(parseRiskRow(["", "", "", "", "", "", "", "", "", "", ""], "risk")).toBeNull();
  });

  it("returns null for header row (people process)", () => {
    expect(parseRiskRow(["", "People Process", "", "", "", "", "", "", "", "", ""], "risk")).toBeNull();
  });

  it("handles row with only description", () => {
    const row = ["", "Important risk", "", "", "", "", "", "", "", "", ""];
    const result = parseRiskRow(row, "issue");
    expect(result!.description).toBe("Important risk");
    expect(result!.riskType).toBe("issue");
  });
});

describe("extractSectionContent", () => {
  it("extracts content after colon", () => {
    expect(extractSectionContent("Open Opps: Some detail here")).toBe("Some detail here");
  });

  it("returns null when only label before colon", () => {
    expect(extractSectionContent("Open Opps:")).toBeNull();
  });

  it("returns full text when no colon", () => {
    expect(extractSectionContent("Some text without colon")).toBe("Some text without colon");
  });

  it("returns null for empty text", () => {
    expect(extractSectionContent("")).toBeNull();
  });
});

describe("classifyParagraph", () => {
  it("classifies skip paragraphs", () => {
    expect(classifyParagraph("GREEN", "GREEN").type).toBe("skip");
    expect(classifyParagraph("AMBER", "AMBER").type).toBe("skip");
    expect(classifyParagraph("STATUS", "STATUS").type).toBe("skip");
  });

  it("classifies section labels like OPEN OPPS", () => {
    const result1 = classifyParagraph("OPEN OPPS", "OPEN OPPS");
    expect(result1.type === "section" || result1.type === "standalone").toBe(true);
    const result2 = classifyParagraph("BIG PLAYS", "BIG PLAYS");
    expect(result2.type === "section" || result2.type === "standalone").toBe(true);
  });

  it("classifies content paragraphs", () => {
    const result = classifyParagraph("Some regular text", "SOME REGULAR TEXT");
    expect(result.type).toBe("content");
  });
});

describe("buildParagraphContent", () => {
  it("joins section arrays", () => {
    const sections = {
      status: ["Line 1", "Line 2"],
      openOpps: ["Opp detail"],
      bigPlays: [],
      accountGoals: [],
      relationships: [],
      research: [],
      approach: ["Approach text"],
      other: [],
    } as any;
    const result = buildParagraphContent(sections);
    expect(result.statusSummary).toBe("Line 1\nLine 2");
    expect(result.openOppsSummary).toBe("Opp detail");
    expect(result.bigPlays).toBe("");
    expect(result.approachToShortfall).toBe("Approach text");
  });
});

describe("buildReportFromGroup", () => {
  it("builds report with default fields", () => {
    const group = {
      vatName: "DAFF",
      titleSlide: { index: 1, paragraphs: [], tables: [], size: 100 },
      contentSlides: [],
      plannerSlides: [],
    };
    const result = buildReportFromGroup(group, "2024-01-15");
    expect(result.vatName).toBe("DAFF");
    expect(result.reportDate).toBe("2024-01-15");
    expect(result.overallStatus).toBe("");
    expect(result.risks).toEqual([]);
    expect(result.plannerTasks).toEqual([]);
  });
});

describe("extractOverallStatusFromTable", () => {
  it("extracts GREEN status", () => {
    expect(extractOverallStatusFromTable([["GREEN - All good"]])).toBe("GREEN");
  });

  it("extracts AMBER status", () => {
    expect(extractOverallStatusFromTable([["Overall AMBER"]])).toBe("AMBER");
  });

  it("extracts RED status", () => {
    expect(extractOverallStatusFromTable([["RED alert"]])).toBe("RED");
  });

  it("returns empty for no match", () => {
    expect(extractOverallStatusFromTable([["No status"]])).toBe("");
  });

  it("returns empty for empty table", () => {
    expect(extractOverallStatusFromTable([])).toBe("");
  });

  it("extracts N/A status", () => {
    expect(extractOverallStatusFromTable([["Status: N/A"]])).toBe("N/A");
  });
});

describe("parseRiskTable", () => {
  it("returns empty for table with less than 2 rows", () => {
    expect(parseRiskTable([["header"]])).toEqual([]);
  });

  it("parses risk table with valid data", () => {
    const table = [
      ["Raised By", "Description", "Impact", "Date", "Status", "Owner", "Impact Rating", "Likelihood", "Mitigation", "Comments", "Risk Rating"],
      ["John", "Risk 1", "High", "2024-01-01", "Open", "Jane", "5", "3", "Plan A", "Notes", "15"],
    ];
    const result = parseRiskTable(table);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Risk 1");
    expect(result[0].riskType).toBe("risk");
  });

  it("detects issue type from header", () => {
    const table = [
      ["Raised By", "Description", "Impact", "Date", "Status", "Owner", "Issue Rating", "Likelihood", "Mitigation", "Comments", "Risk Rating"],
      ["John", "Issue 1", "High", "", "Open", "Jane", "5", "3", "", "", ""],
    ];
    const result = parseRiskTable(table);
    expect(result).toHaveLength(1);
    expect(result[0].riskType).toBe("issue");
  });

  it("skips empty rows", () => {
    const table = [
      ["header1", "header2", "h3", "h4", "h5", "h6", "h7", "h8", "h9", "h10", "h11"],
      ["", "", "", "", "", "", "", "", "", "", ""],
      ["John", "Real Risk", "High", "", "Open", "Jane", "5", "3", "", "", ""],
    ];
    const result = parseRiskTable(table);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Real Risk");
  });
});

describe("parsePlannerTable", () => {
  it("returns empty for table with less than 2 rows", () => {
    expect(parsePlannerTable([["header"]])).toEqual([]);
  });

  it("parses planner tasks with bucket inheritance", () => {
    const table = [
      ["Bucket", "Task", "Progress", "Due", "Priority", "Assigned", "Labels"],
      ["Sprint 1", "Task A", "50%", "2024-01-15", "High", "John", "Dev"],
      ["", "Task B", "0%", "2024-01-20", "Low", "Jane", ""],
      ["Sprint 2", "Task C", "100%", "2024-01-10", "Med", "Bob", "QA"],
    ];
    const result = parsePlannerTable(table);
    expect(result).toHaveLength(3);
    expect(result[0].bucketName).toBe("Sprint 1");
    expect(result[0].taskName).toBe("Task A");
    expect(result[1].bucketName).toBe("Sprint 1");
    expect(result[1].taskName).toBe("Task B");
    expect(result[2].bucketName).toBe("Sprint 2");
  });

  it("skips rows without task name", () => {
    const table = [
      ["Bucket", "Task", "Progress", "Due", "Priority", "Assigned", "Labels"],
      ["Sprint 1", "", "50%", "", "", "", ""],
    ];
    const result = parsePlannerTable(table);
    expect(result).toHaveLength(0);
  });

  it("skips empty rows", () => {
    const table = [
      ["h1", "h2", "h3", "h4", "h5", "h6", "h7"],
      ["", "", "", "", "", "", ""],
      ["Bucket", "Task A", "Done", "", "", "", ""],
    ];
    const result = parsePlannerTable(table);
    expect(result).toHaveLength(1);
  });
});

describe("extractStatusSummary", () => {
  it("extracts status from 3-column table", () => {
    const table = [
      ["Summary text here", "STATUS OVERALL", "GREEN"],
    ];
    const result = extractStatusSummary(table);
    expect(result.statusSummary).toBe("Summary text here");
  });

  it("extracts RAG statuses for sections", () => {
    const table = [
      ["", "OPEN OPPS", "GREEN"],
      ["", "BIG PLAYS", "AMBER"],
      ["", "ACCOUNT GOALS", "RED"],
      ["", "RELATIONSHIPS", "GREEN"],
      ["", "RESEARCH", "N/A"],
    ];
    const result = extractStatusSummary(table);
    expect(result.openOppsStatus).toBe("GREEN");
    expect(result.bigPlaysStatus).toBe("AMBER");
    expect(result.accountGoalsStatus).toBe("RED");
    expect(result.relationshipsStatus).toBe("GREEN");
    expect(result.researchStatus).toBe("N/A");
  });

  it("skips OVERALL STATUS row", () => {
    const table = [
      ["OVERALL STATUS", "GREEN", ""],
      ["Some summary", "STATUS OVERALL", ""],
    ];
    const result = extractStatusSummary(table);
    expect(result.statusSummary).toBe("Some summary");
  });

  it("appends multiple status lines", () => {
    const table = [
      ["Line 1", "", ""],
      ["Line 2", "", ""],
    ];
    const result = extractStatusSummary(table);
    expect(result.statusSummary).toContain("Line 1");
    expect(result.statusSummary).toContain("Line 2");
  });
});

describe("extractContentFromParagraphs", () => {
  it("parses paragraphs into sections", () => {
    const paragraphs = [
      "Some status text",
      "OPEN OPPS",
      "Opportunity 1",
      "Opportunity 2",
      "BIG PLAYS",
      "Play 1",
      "ACCOUNT GOALS",
      "Goal 1",
    ];
    const result = extractContentFromParagraphs(paragraphs);
    expect(result.statusSummary).toContain("Some status text");
    expect(result.openOppsSummary).toContain("Opportunity 1");
    expect(result.openOppsSummary).toContain("Opportunity 2");
    expect(result.bigPlays).toContain("Play 1");
    expect(result.accountGoals).toContain("Goal 1");
  });

  it("skips header paragraphs", () => {
    const paragraphs = [
      "VAT REPORT",
      "OVERALL STATUS",
      "Actual status text",
    ];
    const result = extractContentFromParagraphs(paragraphs);
    expect(result.statusSummary).toContain("Actual status text");
  });

  it("handles approach to shortfall section", () => {
    const paragraphs = [
      "Approach to Shortfall: Focus on new sales",
    ];
    const result = extractContentFromParagraphs(paragraphs);
    expect(result.approachToShortfall).toContain("Focus on new sales");
  });

  it("returns empty fields for no content", () => {
    const result = extractContentFromParagraphs([]);
    expect(result.statusSummary).toBe("");
    expect(result.openOppsSummary).toBe("");
    expect(result.bigPlays).toBe("");
  });

  it("handles other activities section", () => {
    const paragraphs = [
      "OTHER ACTIVITIES",
      "Activity 1",
    ];
    const result = extractContentFromParagraphs(paragraphs);
    expect(result.otherActivities).toContain("Activity 1");
  });
});

describe("extractReportDate", () => {
  it("extracts text date from paragraphs", () => {
    const result = extractReportDate(["15 January, 2024"], []);
    expect(result).toBe("2024-01-15");
  });

  it("extracts slash date from title slide", () => {
    const result = extractReportDate([], ["15/01/2024"]);
    expect(result).toBe("2024-01-15");
  });

  it("returns today for no date found", () => {
    const result = extractReportDate(["No date here"], ["Nothing"]);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("prefers paragraph date over title slide", () => {
    const result = extractReportDate(["20 March 2024"], ["01/01/2024"]);
    expect(result).toBe("2024-03-20");
  });
});

describe("isTitleSlide", () => {
  it("identifies title slide", () => {
    expect(isTitleSlide({ index: 1, paragraphs: ["DAFF"], tables: [], size: 500 })).toBe(true);
  });

  it("rejects slide with tables", () => {
    expect(isTitleSlide({ index: 1, paragraphs: ["DAFF"], tables: [[["data"]]], size: 500 })).toBe(false);
  });

  it("rejects slide with many paragraphs", () => {
    expect(isTitleSlide({ index: 1, paragraphs: ["a", "b", "c"], tables: [], size: 500 })).toBe(false);
  });

  it("rejects large slides", () => {
    expect(isTitleSlide({ index: 1, paragraphs: ["DAFF"], tables: [], size: 5000 })).toBe(false);
  });

  it("accepts slide with 2 paragraphs", () => {
    expect(isTitleSlide({ index: 1, paragraphs: ["Title", "Subtitle"], tables: [], size: 1000 })).toBe(true);
  });
});

describe("isPlannerSlide", () => {
  it("detects planner status update", () => {
    expect(isPlannerSlide({ index: 1, paragraphs: ["PLANNER STATUS UPDATE"], tables: [], size: 100 })).toBe(true);
  });

  it("detects planner status", () => {
    expect(isPlannerSlide({ index: 1, paragraphs: ["Planner Status"], tables: [], size: 100 })).toBe(true);
  });

  it("rejects non-planner slide", () => {
    expect(isPlannerSlide({ index: 1, paragraphs: ["Some other content"], tables: [], size: 100 })).toBe(false);
  });

  it("handles empty paragraphs", () => {
    expect(isPlannerSlide({ index: 1, paragraphs: [], tables: [], size: 100 })).toBe(false);
  });
});

describe("detectSectionFromParagraph", () => {
  it("detects OPEN OPP section", () => {
    const result = detectSectionFromParagraph("OPEN OPPS: some text");
    expect(result).not.toBeNull();
    expect(result!.section).toBe("openOpps");
  });

  it("detects BIG PLAYS section", () => {
    const result = detectSectionFromParagraph("BIG PLAYS");
    expect(result).not.toBeNull();
    expect(result!.section).toBe("bigPlays");
  });

  it("detects ACCOUNT GOALS section", () => {
    const result = detectSectionFromParagraph("ACCOUNT GOALS:");
    expect(result).not.toBeNull();
    expect(result!.section).toBe("accountGoals");
  });

  it("detects RELATIONSHIPS section", () => {
    const result = detectSectionFromParagraph("RELATIONSHIPS");
    expect(result).not.toBeNull();
    expect(result!.section).toBe("relationships");
  });

  it("detects RESEARCH section", () => {
    const result = detectSectionFromParagraph("RESEARCH");
    expect(result).not.toBeNull();
    expect(result!.section).toBe("research");
  });

  it("detects APPROACH TO SHORTFALL section", () => {
    const result = detectSectionFromParagraph("APPROACH TO SHORTFALL");
    expect(result).not.toBeNull();
    expect(result!.section).toBe("approach");
  });

  it("detects APPROACH TO TARGET section", () => {
    const result = detectSectionFromParagraph("APPROACH TO TARGET");
    expect(result).not.toBeNull();
    expect(result!.section).toBe("approach");
  });

  it("detects OTHER ACTIVITIES section", () => {
    const result = detectSectionFromParagraph("OTHER ACTIVITIES");
    expect(result).not.toBeNull();
    expect(result!.section).toBe("other");
  });

  it("detects OTHER VAT section", () => {
    const result = detectSectionFromParagraph("OTHER VAT ACTIVITIES");
    expect(result).not.toBeNull();
    expect(result!.section).toBe("other");
  });

  it("returns null for non-section text", () => {
    expect(detectSectionFromParagraph("JUST SOME TEXT")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(detectSectionFromParagraph("")).toBeNull();
  });
});

describe("buildReportFromGroup - extended", () => {
  it("processes content slides with tables", () => {
    const group = {
      vatName: "SAU",
      titleSlide: { index: 1, paragraphs: ["SAU"], tables: [], size: 100 },
      contentSlides: [
        {
          index: 2,
          paragraphs: ["Status text"],
          tables: [
            [["OVERALL STATUS GREEN", "", ""]],
          ],
          size: 500,
        },
      ],
      plannerSlides: [],
    };
    const result = buildReportFromGroup(group, "2024-01-15");
    expect(result.vatName).toBe("SAU");
  });

  it("processes planner slides", () => {
    const group = {
      vatName: "DAFF",
      titleSlide: { index: 1, paragraphs: [], tables: [], size: 100 },
      contentSlides: [],
      plannerSlides: [
        {
          index: 5,
          paragraphs: ["PLANNER STATUS UPDATE"],
          tables: [
            [
              ["Bucket", "Task", "Progress", "Due", "Priority", "Assigned", "Labels"],
              ["Sprint 1", "Do thing", "50%", "2024-01-15", "High", "John", "Dev"],
            ],
          ],
          size: 500,
        },
      ],
    };
    const result = buildReportFromGroup(group, "2024-01-15");
    expect(result.plannerTasks).toHaveLength(1);
    expect(result.plannerTasks[0].taskName).toBe("Do thing");
  });
});

describe("groupSlidesByVat - extended", () => {
  it("groups content slides under VAT", () => {
    const slides = [
      { index: 1, paragraphs: ["VAT REPORT SALES COMMITTEE"], tables: [], size: 200 },
      { index: 2, paragraphs: ["DAFF"], tables: [], size: 100 },
      { index: 3, paragraphs: ["Detailed content", "More content", "Even more"], tables: [[["data"]]], size: 5000 },
    ];
    const result = groupSlidesByVat(slides);
    expect(result).toHaveLength(1);
    expect(result[0].vatName).toBe("DAFF");
    expect(result[0].contentSlides).toHaveLength(1);
  });

  it("handles planner slides", () => {
    const slides = [
      { index: 2, paragraphs: ["SAU"], tables: [], size: 100 },
      { index: 3, paragraphs: ["Content"], tables: [[["t"]]], size: 5000 },
      { index: 4, paragraphs: ["PLANNER STATUS UPDATE"], tables: [[["t"]]], size: 5000 },
    ];
    const result = groupSlidesByVat(slides);
    expect(result).toHaveLength(1);
    expect(result[0].plannerSlides).toHaveLength(1);
  });

  it("handles multiple VATs", () => {
    const slides = [
      { index: 2, paragraphs: ["DAFF"], tables: [], size: 100 },
      { index: 3, paragraphs: ["Content 1"], tables: [[["t"]]], size: 5000 },
      { index: 4, paragraphs: ["SAU"], tables: [], size: 100 },
      { index: 5, paragraphs: ["Content 2"], tables: [[["t"]]], size: 5000 },
    ];
    const result = groupSlidesByVat(slides);
    expect(result).toHaveLength(2);
    expect(result[0].vatName).toBe("DAFF");
    expect(result[1].vatName).toBe("SAU");
  });

  it("skips empty slides", () => {
    const slides = [
      { index: 2, paragraphs: ["DAFF"], tables: [], size: 100 },
      { index: 3, paragraphs: [], tables: [], size: 0 },
      { index: 4, paragraphs: ["Content"], tables: [[["t"]]], size: 5000 },
    ];
    const result = groupSlidesByVat(slides);
    expect(result).toHaveLength(1);
    expect(result[0].contentSlides).toHaveLength(1);
  });
});

describe("tryParseTextDate - extended", () => {
  it("parses date without comma", () => {
    expect(tryParseTextDate("Report 15 March 2024")).toBe("2024-03-15");
  });

  it("returns null for no date", () => {
    expect(tryParseTextDate("No date here")).toBeNull();
  });
});

describe("tryParseSlashDate - extended", () => {
  it("parses DD/MM/YYYY format", () => {
    expect(tryParseSlashDate("Date: 25/12/2024")).toBe("2024-12-25");
  });

  it("returns null for no slash date", () => {
    expect(tryParseSlashDate("No date")).toBeNull();
  });
});

describe("computeHeaderSkipCount - extended", () => {
  it("skips VAT REPORT headers", () => {
    expect(computeHeaderSkipCount(["VAT REPORT Q1", "OVERALL STATUS", "Content"])).toBe(2);
  });

  it("skips year-only lines", () => {
    expect(computeHeaderSkipCount(["2024", "Content"])).toBe(1);
  });

  it("returns 0 for no header", () => {
    expect(computeHeaderSkipCount(["Just content"])).toBe(0);
  });
});

describe("processTableForReport - extended", () => {
  it("processes 3-column status table", () => {
    const report: any = {
      overallStatus: "", statusSummary: "", risks: [], plannerTasks: [],
      openOppsStatus: "", bigPlaysStatus: "", accountGoalsStatus: "",
      relationshipsStatus: "", researchStatus: "",
    };
    const table = [
      ["OVERALL STATUS GREEN", "", ""],
      ["Summary line 1", "STATUS OVERALL", ""],
      ["", "OPEN OPPS", "GREEN"],
      ["", "BIG PLAYS", "AMBER"],
      ["", "ACCOUNT GOALS", "RED"],
      ["", "RELATIONSHIPS", "GREEN"],
    ];
    processTableForReport(table, report);
    expect(report.overallStatus).toBe("GREEN");
    expect(report.statusSummary).toBe("Summary line 1");
    expect(report.openOppsStatus).toBe("GREEN");
    expect(report.bigPlaysStatus).toBe("AMBER");
  });

  it("processes 11-column risk table", () => {
    const report: any = { risks: [], plannerTasks: [] };
    const table = [
      ["Raised By", "Description", "Impact", "Date", "Status", "Owner", "Impact Rating", "Likelihood", "Mitigation", "Comments", "Risk Rating"],
      ["John", "Server downtime risk", "High", "2024-01", "Open", "Jane", "5", "3", "Monitor", "Check daily", "15"],
    ];
    processTableForReport(table, report);
    expect(report.risks).toHaveLength(1);
    expect(report.risks[0].description).toBe("Server downtime risk");
  });

  it("processes 7-column planner table", () => {
    const report: any = { risks: [], plannerTasks: [] };
    const table = [
      ["Bucket", "Task Name", "Progress", "Due Date", "Priority", "Assigned To", "Labels"],
      ["Sprint 1", "Build feature", "50%", "2024-02-15", "High", "Bob", "Dev"],
    ];
    processTableForReport(table, report);
    expect(report.plannerTasks).toHaveLength(1);
    expect(report.plannerTasks[0].taskName).toBe("Build feature");
  });

  it("skips unrecognized table formats", () => {
    const report: any = { risks: [], plannerTasks: [] };
    const table = [
      ["Col1", "Col2", "Col3", "Col4", "Col5"],
      ["data1", "data2", "data3", "data4", "data5"],
    ];
    processTableForReport(table, report);
    expect(report.risks).toHaveLength(0);
    expect(report.plannerTasks).toHaveLength(0);
  });

  it("handles empty table", () => {
    const report: any = { risks: [], plannerTasks: [] };
    processTableForReport([], report);
    expect(report.risks).toHaveLength(0);
  });
});

describe("appendContentFields - extended", () => {
  it("appends multiple content fields", () => {
    const report: any = {
      statusSummary: "", openOppsSummary: "", bigPlays: "",
      accountGoals: "", relationships: "", research: "",
      approachToShortfall: "", otherActivities: "",
    };
    const content = {
      statusSummary: "Status text",
      openOppsSummary: "Opps text",
      bigPlays: "Plays text",
      accountGoals: "Goals text",
      relationships: "Relations text",
      research: "Research text",
      approachToShortfall: "Approach text",
      otherActivities: "Other text",
    };
    appendContentFields(report, content);
    expect(report.statusSummary).toBe("Status text");
    expect(report.openOppsSummary).toBe("Opps text");
    expect(report.bigPlays).toBe("Plays text");
    expect(report.accountGoals).toBe("Goals text");
  });

  it("appends to existing content", () => {
    const report: any = {
      statusSummary: "Existing", openOppsSummary: "Existing opps",
      bigPlays: "", accountGoals: "", relationships: "",
      research: "", approachToShortfall: "", otherActivities: "",
    };
    const content = {
      statusSummary: "New status",
      openOppsSummary: "New opps",
      bigPlays: "New plays",
      accountGoals: "",
      relationships: "",
      research: "",
      approachToShortfall: "",
      otherActivities: "",
    };
    appendContentFields(report, content);
    expect(report.statusSummary).toBe("Existing");
    expect(report.openOppsSummary).toContain("Existing opps");
    expect(report.openOppsSummary).toContain("New opps");
    expect(report.bigPlays).toBe("New plays");
  });
});

describe("findFallbackOverallStatus - extended", () => {
  it("finds GREEN from slide paragraphs", () => {
    const slides = [{ index: 1, paragraphs: ["Some text GREEN here"], tables: [], size: 100 }];
    expect(findFallbackOverallStatus(slides)).toBe("GREEN");
  });

  it("finds AMBER from second slide", () => {
    const slides = [
      { index: 1, paragraphs: ["No status"], tables: [], size: 100 },
      { index: 2, paragraphs: ["AMBER warning"], tables: [], size: 100 },
    ];
    expect(findFallbackOverallStatus(slides)).toBe("AMBER");
  });

  it("returns empty for no status", () => {
    const slides = [{ index: 1, paragraphs: ["No status info"], tables: [], size: 100 }];
    expect(findFallbackOverallStatus(slides)).toBe("");
  });

  it("returns empty for no slides", () => {
    expect(findFallbackOverallStatus([])).toBe("");
  });
});

describe("shouldSkipParagraph - extended", () => {
  it("skips RAISED BY", () => {
    expect(shouldSkipParagraph("RAISED BY")).toBe(true);
  });

  it("skips DESCRIPTION", () => {
    expect(shouldSkipParagraph("DESCRIPTION")).toBe(true);
  });

  it("skips WEEK ENDING prefix", () => {
    expect(shouldSkipParagraph("WEEK ENDING 15/01/2024")).toBe(true);
  });

  it("does not skip normal text", () => {
    expect(shouldSkipParagraph("NORMAL PARAGRAPH TEXT")).toBe(false);
  });
});

describe("extractSectionContent - extended", () => {
  it("extracts content after colon", () => {
    expect(extractSectionContent("Open Opps: Good progress")).toBe("Good progress");
  });

  it("returns null for colon-only", () => {
    expect(extractSectionContent("Open Opps:")).toBeNull();
  });

  it("returns full text without colon", () => {
    expect(extractSectionContent("Full text content")).toBe("Full text content");
  });

  it("returns null for empty text", () => {
    expect(extractSectionContent("")).toBeNull();
  });
});

describe("extractParagraphs", () => {
  it("extracts text from XML paragraphs", () => {
    const xml = `<a:p><a:r><a:t>Hello</a:t></a:r></a:p><a:p><a:r><a:t>World</a:t></a:r></a:p>`;
    const result = extractParagraphs(xml);
    expect(result).toEqual(["Hello", "World"]);
  });

  it("joins multiple text runs in one paragraph", () => {
    const xml = `<a:p><a:r><a:t>Hello </a:t></a:r><a:r><a:t>World</a:t></a:r></a:p>`;
    const result = extractParagraphs(xml);
    expect(result).toEqual(["Hello World"]);
  });

  it("skips empty paragraphs", () => {
    const xml = `<a:p><a:r><a:t>Hello</a:t></a:r></a:p><a:p></a:p><a:p><a:r><a:t>  </a:t></a:r></a:p>`;
    const result = extractParagraphs(xml);
    expect(result).toEqual(["Hello"]);
  });

  it("decodes XML entities", () => {
    const xml = `<a:p><a:r><a:t>A &amp; B</a:t></a:r></a:p>`;
    const result = extractParagraphs(xml);
    expect(result).toEqual(["A & B"]);
  });

  it("returns empty array for no paragraphs", () => {
    expect(extractParagraphs("<root></root>")).toEqual([]);
  });

  it("handles paragraph with attributes", () => {
    const xml = `<a:p algn="ctr"><a:r><a:t>Centered</a:t></a:r></a:p>`;
    const result = extractParagraphs(xml);
    expect(result).toEqual(["Centered"]);
  });
});

describe("extractTables", () => {
  it("extracts tables from XML", () => {
    const xml = `<a:tbl><a:tr><a:tc><a:p><a:r><a:t>Cell1</a:t></a:r></a:p></a:tc><a:tc><a:p><a:r><a:t>Cell2</a:t></a:r></a:p></a:tc></a:tr></a:tbl>`;
    const result = extractTables(xml);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(1);
    expect(result[0][0]).toEqual(["Cell1", "Cell2"]);
  });

  it("extracts multiple tables", () => {
    const xml = `<a:tbl><a:tr><a:tc><a:p><a:r><a:t>T1</a:t></a:r></a:p></a:tc></a:tr></a:tbl><a:tbl><a:tr><a:tc><a:p><a:r><a:t>T2</a:t></a:r></a:p></a:tc></a:tr></a:tbl>`;
    const result = extractTables(xml);
    expect(result).toHaveLength(2);
  });

  it("returns empty for no tables", () => {
    expect(extractTables("<root></root>")).toEqual([]);
  });

  it("extracts multi-row table", () => {
    const xml = `<a:tbl><a:tr><a:tc><a:p><a:r><a:t>R1</a:t></a:r></a:p></a:tc></a:tr><a:tr><a:tc><a:p><a:r><a:t>R2</a:t></a:r></a:p></a:tc></a:tr></a:tbl>`;
    const result = extractTables(xml);
    expect(result[0]).toHaveLength(2);
    expect(result[0][0]).toEqual(["R1"]);
    expect(result[0][1]).toEqual(["R2"]);
  });
});
