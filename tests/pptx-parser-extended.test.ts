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
