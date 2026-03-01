import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { transformSharePointItem, formatNumericField, extractItemFields, parseSharePointDate, cleanMultiValueField, cleanVat, stageSharePointItems, getSharePointConfig } from "../server/sharepoint-sync";

describe("transformSharePointItem", () => {
  it("transforms a valid SharePoint item", () => {
    const item = {
      Title: "New Opportunity",
      Phase: "S",
      Value: 50000,
      Margin: 0.25,
      WorkType: "Advisory",
      Status: "Active",
      VAT: "DAFF",
    };
    const result = transformSharePointItem(item);
    expect(result.record).toBeDefined();
    expect(result.record!.name).toBe("New Opportunity");
    expect(result.record!.classification).toBe("S");
    expect(result.record!.value).toBe("50000.00");
    expect(result.record!.marginPercent).toBe("0.250");
    expect(result.record!.workType).toBe("Advisory");
  });

  it("returns empty for item without title", () => {
    const result = transformSharePointItem({});
    expect(result.record).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it("returns empty for invalid phase", () => {
    const result = transformSharePointItem({ Title: "Test", Phase: "INVALID" });
    expect(result.record).toBeUndefined();
  });

  it("handles full phase names", () => {
    const result = transformSharePointItem({ Title: "Test", Phase: "1.A - Activity" });
    expect(result.record).toBeDefined();
    expect(result.record!.classification).toBe("A");
  });

  it("handles alternative field names", () => {
    const item = {
      Title: "Alt Opp",
      Phase: "Q",
      OppValue: 100000,
      MarginPercent: 0.3,
      OppWorkType: "Delivery",
      OppStatus: "Proposed",
      VATCategory: "SAU",
    };
    const result = transformSharePointItem(item);
    expect(result.record).toBeDefined();
    expect(result.record!.value).toBe("100000.00");
    expect(result.record!.marginPercent).toBe("0.300");
    expect(result.record!.workType).toBe("Delivery");
  });

  it("handles null value fields", () => {
    const result = transformSharePointItem({ Title: "No Values", Phase: "A" });
    expect(result.record).toBeDefined();
    expect(result.record!.value).toBeNull();
    expect(result.record!.marginPercent).toBeNull();
    expect(result.record!.workType).toBeNull();
  });

  it("sets fyYear to open_opps", () => {
    const result = transformSharePointItem({ Title: "Opp", Phase: "DF" });
    expect(result.record).toBeDefined();
    expect(result.record!.fyYear).toBe("open_opps");
  });

  it("handles FileLeafRef as fallback name", () => {
    const result = transformSharePointItem({ FileLeafRef: "Fallback Name", Phase: "S" });
    expect(result.record).toBeDefined();
    expect(result.record!.name).toBe("Fallback Name");
  });

  it("handles DVF phase", () => {
    const result = transformSharePointItem({ Title: "DVF Item", Phase: "4.DVF - Shortlisted" });
    expect(result.record).toBeDefined();
    expect(result.record!.classification).toBe("DVF");
  });

  it("handles comment fields", () => {
    const result = transformSharePointItem({ Title: "Commented", Phase: "Q", Comment: "Some note" });
    expect(result.record!.comment).toBe("Some note");
  });

  it("handles alternative comment fields", () => {
    const result = transformSharePointItem({ Title: "Commented", Phase: "Q", Comments: "Alt note" });
    expect(result.record!.comment).toBe("Alt note");
  });
});

describe("formatNumericField", () => {
  it("formats number with 2 decimals", () => {
    expect(formatNumericField(50000, 2)).toBe("50000.00");
  });

  it("formats number with 3 decimals", () => {
    expect(formatNumericField(0.25, 3)).toBe("0.250");
  });

  it("returns null for null input", () => {
    expect(formatNumericField(null, 2)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(formatNumericField(undefined, 2)).toBeNull();
  });

  it("returns null for NaN", () => {
    expect(formatNumericField("abc", 2)).toBeNull();
  });

  it("handles string numbers", () => {
    expect(formatNumericField("123.456", 2)).toBe("123.46");
  });

  it("handles zero", () => {
    expect(formatNumericField(0, 2)).toBe("0.00");
  });
});

describe("extractItemFields", () => {
  it("extracts standard fields", () => {
    const item = {
      WorkType: "Advisory",
      Status: "Active",
      Comment: "Test",
      CASLead: "John",
      VAT: "DAFF",
    };
    const result = extractItemFields(item);
    expect(result.workType).toBe("Advisory");
    expect(result.status).toBe("Active");
    expect(result.comment).toBe("Test");
    expect(result.casLead).toBe("John");
    expect(result.vat).toBe("DAFF");
  });

  it("falls back to alternative field names", () => {
    const item = {
      OppWorkType: "Delivery",
      OppStatus: "Proposed",
      OppComment: "Alt comment",
      CSD_x0020_Lead: "Jane",
      VATCategory: "SAU",
    };
    const result = extractItemFields(item);
    expect(result.workType).toBe("Delivery");
    expect(result.status).toBe("Proposed");
    expect(result.comment).toBe("Alt comment");
    expect(result.vat).toBe("SAU");
  });

  it("returns null for missing fields", () => {
    const result = extractItemFields({});
    expect(result.workType).toBeNull();
    expect(result.status).toBeNull();
    expect(result.comment).toBeNull();
    expect(result.vat).toBeNull();
  });

  it("uses RAGStatus as fallback for status", () => {
    const result = extractItemFields({ RAGStatus: "Green" });
    expect(result.status).toBe("Green");
  });
});

describe("parseSharePointDate", () => {
  it("parses ISO date string", () => {
    expect(parseSharePointDate("2024-07-15T00:00:00Z")).toBe("2024-07-15");
  });

  it("returns null for null", () => {
    expect(parseSharePointDate(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseSharePointDate(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseSharePointDate("")).toBeNull();
  });

  it("returns null for invalid date", () => {
    expect(parseSharePointDate("not-a-date")).toBeNull();
  });

  it("parses simple date string", () => {
    const result = parseSharePointDate("2024-01-15");
    expect(result).toBe("2024-01-15");
  });
});

describe("cleanMultiValueField", () => {
  it("cleans SharePoint multi-value format", () => {
    expect(cleanMultiValueField("Value1;#1;#Value2")).toBe("Value1; Value2");
  });

  it("returns null for null", () => {
    expect(cleanMultiValueField(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(cleanMultiValueField(undefined)).toBeNull();
  });

  it("cleans simple semicolons", () => {
    expect(cleanMultiValueField("Value1;#Value2")).toBe("Value1; Value2");
  });

  it("returns null for empty result", () => {
    expect(cleanMultiValueField("")).toBeNull();
  });
});

describe("cleanVat", () => {
  it("cleans semicolons from VAT", () => {
    expect(cleanVat("DAFF;#")).toBe("DAFF");
  });

  it("removes pipe separator", () => {
    expect(cleanVat("DAFF|other")).toBe("DAFF");
  });

  it("uppercases growth", () => {
    expect(cleanVat("growth")).toBe("GROWTH");
  });

  it("returns null for null", () => {
    expect(cleanVat(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(cleanVat("")).toBeNull();
  });

  it("preserves normal VAT values", () => {
    expect(cleanVat("SAU")).toBe("SAU");
  });
});

describe("stageSharePointItems", () => {
  it("stages valid items", () => {
    const items = [{
      Title: "Opp 1",
      Phase: "S",
      Value: 100000,
      VAT: "DAFF",
    }];
    const result = stageSharePointItems(items);
    expect(result.staged.length).toBe(1);
    expect(result.errors.length).toBe(0);
  });

  it("skips items without title (no error, no record)", () => {
    const items = [{}];
    const result = stageSharePointItems(items);
    expect(result.staged.length).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it("handles empty array", () => {
    const result = stageSharePointItems([]);
    expect(result.staged).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("handles mix of valid and skipped items", () => {
    const items = [
      { Title: "Good Opp", Phase: "S", Value: 50000, VAT: "SAU" },
      { Title: "Bad Phase", Phase: "UNKNOWN" },
    ];
    const result = stageSharePointItems(items);
    expect(result.staged.length).toBe(1);
  });
});

describe("getSharePointConfig", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("throws when SHAREPOINT_DOMAIN is missing", () => {
    delete process.env.SHAREPOINT_DOMAIN;
    process.env.SHAREPOINT_SITE_PATH = "/sites/Finance";
    expect(() => getSharePointConfig()).toThrow("Missing SharePoint config");
  });

  it("throws when SHAREPOINT_SITE_PATH is missing", () => {
    process.env.SHAREPOINT_DOMAIN = "example.sharepoint.com";
    delete process.env.SHAREPOINT_SITE_PATH;
    expect(() => getSharePointConfig()).toThrow("Missing SharePoint config");
  });

  it("returns config with defaults", () => {
    process.env.SHAREPOINT_DOMAIN = "example.sharepoint.com";
    process.env.SHAREPOINT_SITE_PATH = "/sites/Finance";
    delete process.env.SHAREPOINT_LIST_NAME;
    const cfg = getSharePointConfig();
    expect(cfg.domain).toBe("example.sharepoint.com");
    expect(cfg.sitePath).toBe("/sites/Finance");
    expect(cfg.listName).toBe("Open Opps");
  });

  it("prepends slash to sitePath if missing", () => {
    process.env.SHAREPOINT_DOMAIN = "example.sharepoint.com";
    process.env.SHAREPOINT_SITE_PATH = "sites/Finance";
    const cfg = getSharePointConfig();
    expect(cfg.sitePath).toBe("/sites/Finance");
  });

  it("uses custom list name", () => {
    process.env.SHAREPOINT_DOMAIN = "example.sharepoint.com";
    process.env.SHAREPOINT_SITE_PATH = "/sites/Finance";
    process.env.SHAREPOINT_LIST_NAME = "Custom List";
    const cfg = getSharePointConfig();
    expect(cfg.listName).toBe("Custom List");
  });
});
