import { describe, it, expect } from "vitest";
import { transformSharePointItem } from "../server/sharepoint-sync";

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
