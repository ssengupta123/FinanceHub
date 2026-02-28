import { describe, it, expect } from "vitest";
import { decodeXmlEntities, resolveVatName } from "../server/pptx-parser";

describe("decodeXmlEntities", () => {
  it("decodes XML entities", () => {
    expect(decodeXmlEntities("&amp;")).toBe("&");
    expect(decodeXmlEntities("&lt;")).toBe("<");
    expect(decodeXmlEntities("&gt;")).toBe(">");
    expect(decodeXmlEntities("&apos;")).toBe("'");
    expect(decodeXmlEntities("&quot;")).toBe('"');
  });

  it("decodes unicode dashes", () => {
    expect(decodeXmlEntities("\u2011")).toBe("-");
    expect(decodeXmlEntities("\u2013")).toBe("–");
    expect(decodeXmlEntities("\u2014")).toBe("—");
  });

  it("handles strings with multiple entities", () => {
    expect(decodeXmlEntities("Tom &amp; Jerry &lt;3")).toBe("Tom & Jerry <3");
  });

  it("returns plain strings unchanged", () => {
    expect(decodeXmlEntities("Hello World")).toBe("Hello World");
  });

  it("handles empty string", () => {
    expect(decodeXmlEntities("")).toBe("");
  });
});

describe("resolveVatName", () => {
  it("resolves known VAT names", () => {
    expect(resolveVatName("DAFF")).toBe("DAFF");
    expect(resolveVatName("SAU")).toBe("SAU");
    expect(resolveVatName("VIC GOV")).toBe("VICGov");
    expect(resolveVatName("VICGOV")).toBe("VICGov");
    expect(resolveVatName("DISR")).toBe("DISR");
    expect(resolveVatName("GROWTH")).toBe("Growth");
  });

  it("handles VAT prefix/suffix in names", () => {
    expect(resolveVatName("VAT DAFF")).toBe("DAFF");
    expect(resolveVatName("DAFF VAT")).toBe("DAFF");
  });

  it("is case insensitive", () => {
    expect(resolveVatName("daff")).toBe("DAFF");
    expect(resolveVatName("Sau")).toBe("SAU");
    expect(resolveVatName("vic gov")).toBe("VICGov");
  });

  it("resolves aliases", () => {
    expect(resolveVatName("PLATFORMS AND PARTNERSHIPS")).toBe("P&P");
    expect(resolveVatName("P&P")).toBe("P&P");
    expect(resolveVatName("EMERGING ACCOUNTS")).toBe("Emerging");
  });

  it("decodes XML entities before matching", () => {
    expect(resolveVatName("P&amp;P")).toBe("P&P");
  });

  it("returns null for unknown VATs", () => {
    expect(resolveVatName("UNKNOWN")).toBeNull();
    expect(resolveVatName("")).toBeNull();
    expect(resolveVatName("RANDOM TEXT")).toBeNull();
  });
});
