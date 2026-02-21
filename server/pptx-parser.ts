import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface ParsedSlide {
  index: number;
  paragraphs: string[];
  tables: string[][][];
  size: number;
}

export interface ParsedVatReport {
  vatName: string;
  reportDate: string;
  overallStatus: string;
  statusSummary: string;
  openOppsSummary: string;
  bigPlays: string;
  accountGoals: string;
  relationships: string;
  research: string;
  approachToShortfall: string;
  otherActivities: string;
  openOppsStatus: string;
  bigPlaysStatus: string;
  accountGoalsStatus: string;
  relationshipsStatus: string;
  researchStatus: string;
  risks: ParsedRisk[];
  plannerTasks: ParsedPlannerTask[];
}

export interface ParsedRisk {
  raisedBy: string;
  description: string;
  impact: string;
  dateBecomesIssue: string;
  status: string;
  owner: string;
  impactRating: string;
  likelihood: string;
  mitigation: string;
  comments: string;
  riskRating: string;
  riskType: string;
}

export interface ParsedPlannerTask {
  bucketName: string;
  taskName: string;
  progress: string;
  dueDate: string;
  priority: string;
  assignedTo: string;
  labels: string;
}

const VAT_NAME_MAP: Record<string, string> = {
  "DAFF": "DAFF",
  "SAU": "SAU",
  "VICGOV": "VICGov",
  "VIC GOV": "VICGov",
  "DISR": "DISR",
  "GROWTH": "Growth",
  "P&P": "P&P",
  "PLATFORMS AND PARTNERSHIPS": "P&P",
  "EMERGING": "Emerging",
  "EMERGING ACCOUNTS": "Emerging",
};

function decodeXmlEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/\u2011/g, "-").replace(/\u2013/g, "–").replace(/\u2014/g, "—");
}

function resolveVatName(raw: string): string | null {
  const cleaned = decodeXmlEntities(raw).replace(/\s*VAT\s*/gi, " ").trim().toUpperCase();
  for (const [key, val] of Object.entries(VAT_NAME_MAP)) {
    if (cleaned === key.toUpperCase() || cleaned.includes(key.toUpperCase())) {
      return val;
    }
  }
  return null;
}

function extractParagraphs(xmlContent: string): string[] {
  const paragraphs: string[] = [];
  const paraRegex = /<a:p(?:\s[^>]*)?>([\s\S]*?)<\/a:p>/g;
  let pm;
  while ((pm = paraRegex.exec(xmlContent)) !== null) {
    const texts: string[] = [];
    const tRegex = /<a:t>([^<]*)<\/a:t>/g;
    let tm;
    while ((tm = tRegex.exec(pm[1])) !== null) {
      texts.push(tm[1]);
    }
    const joined = decodeXmlEntities(texts.join(""));
    if (joined.trim()) {
      paragraphs.push(joined);
    }
  }
  return paragraphs;
}

function extractTables(xmlContent: string): string[][][] {
  const tables: string[][][] = [];
  const tblRegex = /<a:tbl>([\s\S]*?)<\/a:tbl>/g;
  let tm;
  while ((tm = tblRegex.exec(xmlContent)) !== null) {
    const rows: string[][] = [];
    const rowRegex = /<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/g;
    let rm;
    while ((rm = rowRegex.exec(tm[1])) !== null) {
      const cells: string[] = [];
      const cellRegex = /<a:tc\b[^>]*>([\s\S]*?)<\/a:tc>/g;
      let cm;
      while ((cm = cellRegex.exec(rm[1])) !== null) {
        const texts: string[] = [];
        const tRegex = /<a:t>([^<]*)<\/a:t>/g;
        let tr;
        while ((tr = tRegex.exec(cm[1])) !== null) {
          texts.push(tr[1]);
        }
        cells.push(decodeXmlEntities(texts.join(" ").trim()));
      }
      rows.push(cells);
    }
    tables.push(rows);
  }
  return tables;
}

function cleanupDir(dir: string) {
  try {
    execSync(`rm -rf "${dir}"`, { stdio: "pipe" });
  } catch { }
}

function extractSlides(pptxBuffer: Buffer): ParsedSlide[] {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pptx-"));

  try {
    const pptxPath = path.join(tmpDir, "input.pptx");
    fs.writeFileSync(pptxPath, pptxBuffer);

    try {
      execSync(`unzip -o "${pptxPath}" "ppt/slides/*.xml" -d "${tmpDir}"`, { stdio: "pipe" });
    } catch {
      throw new Error("Failed to extract PPTX file. Make sure it's a valid PowerPoint file.");
    }

    const slidesDir = path.join(tmpDir, "ppt", "slides");
    if (!fs.existsSync(slidesDir)) {
      throw new Error("No slides found in the PPTX file.");
    }

    const slideFiles = fs.readdirSync(slidesDir)
      .filter(f => f.match(/^slide\d+\.xml$/))
      .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));

    const resolvedTmpDir = fs.realpathSync(tmpDir);
    const slides: ParsedSlide[] = slideFiles.map(sf => {
      const filePath = path.join(slidesDir, sf);
      const resolvedPath = fs.realpathSync(filePath);
      if (!resolvedPath.startsWith(resolvedTmpDir)) {
        throw new Error("Zip Slip detected: entry resolves outside extraction directory.");
      }
      const content = fs.readFileSync(resolvedPath, "utf8");
      const idx = parseInt(sf.match(/\d+/)![0]);
      return {
        index: idx,
        paragraphs: extractParagraphs(content),
        tables: extractTables(content),
        size: content.length,
      };
    });

    return slides;
  } finally {
    cleanupDir(tmpDir);
  }
}

function isTitleSlide(slide: ParsedSlide): boolean {
  return slide.paragraphs.length <= 2 && slide.size < 3000 && slide.tables.length === 0;
}

function isPlannerSlide(slide: ParsedSlide): boolean {
  const first = (slide.paragraphs[0] || "").toUpperCase();
  return first.includes("PLANNER STATUS UPDATE") || first.includes("PLANNER STATUS");
}

function extractReportDate(paragraphs: string[], titleSlideParas: string[]): string {
  const allParas = [...paragraphs.slice(0, 5), ...titleSlideParas];
  for (const p of allParas) {
    const dateMatch = p.match(/(\d{1,2}\s+\w+,?\s+\d{4})/);
    if (dateMatch) {
      try {
        const d = new Date(dateMatch[1].replace(",", ""));
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      } catch { }
    }
    const dateMatch2 = p.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (dateMatch2) {
      const parts = dateMatch2[1].split("/");
      if (parts.length === 3) {
        const d = new Date(`${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`);
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      }
    }
  }
  return new Date().toISOString().split("T")[0];
}

function extractOverallStatusFromTable(table: string[][]): string {
  if (table.length === 0) return "";
  const firstRow = table[0];
  const text = (firstRow[0] || "").toUpperCase();
  const match = text.match(/(GREEN|AMBER|RED|N\/A)/);
  return match ? match[1] : "";
}

function extractStatusSummary(table: string[][]): {
  statusSummary: string;
  openOppsStatus: string;
  bigPlaysStatus: string;
  accountGoalsStatus: string;
  relationshipsStatus: string;
  researchStatus: string;
} {
  const result = {
    statusSummary: "",
    openOppsStatus: "",
    bigPlaysStatus: "",
    accountGoalsStatus: "",
    relationshipsStatus: "",
    researchStatus: "",
  };

  const sectionLabelToField: Record<string, string> = {
    "OPEN OPPS": "openOppsStatus",
    "OPEN OPPS ACTIONS": "openOppsStatus",
    "BIG PLAYS": "bigPlaysStatus",
    "BIG PLAY": "bigPlaysStatus",
    "ACCOUNT GOALS": "accountGoalsStatus",
    "RELATIONSHIPS": "relationshipsStatus",
    "RESEARCH": "researchStatus",
  };

  for (const row of table) {
    const col0 = (row[0] || "").trim();
    const col1 = (row[1] || "").trim();
    const col2 = (row[2] || "").trim();
    const col1Upper = col1.toUpperCase();
    const col0Upper = col0.toUpperCase();

    if (col0Upper.startsWith("OVERALL STATUS")) continue;

    if (col1Upper === "STATUS OVERALL" || col1Upper.startsWith("STATUS OVERALL")) {
      if (col0) result.statusSummary = col0;
      continue;
    }

    let matched = false;
    for (const [marker, field] of Object.entries(sectionLabelToField)) {
      if (col1Upper === marker || col1Upper.startsWith(marker)) {
        const allCols = [col0Upper, col1Upper, col2.toUpperCase()].join(" ");
        const ragMatch = allCols.match(/(GREEN|AMBER|RED|N\/A)/);
        if (ragMatch) {
          (result as any)[field] = ragMatch[1];
        }
        matched = true;
        break;
      }
    }

    if (!matched && col0) {
      if (result.statusSummary) {
        result.statusSummary += "\n" + col0;
      } else {
        result.statusSummary = col0;
      }
    }
  }

  return result;
}

function parseRiskTable(table: string[][]): ParsedRisk[] {
  const risks: ParsedRisk[] = [];
  if (table.length < 2) return risks;

  const header = table[0].map(c => c.toLowerCase().trim());
  const isIssueTable = header.some(h => h.includes("issue rating"));
  const riskType = isIssueTable ? "issue" : "risk";

  for (let i = 1; i < table.length; i++) {
    const row = table[i];
    if (row.every(c => !c.trim())) continue;

    const description = (row[1] || "").trim();
    if (!description || description.toLowerCase() === "people process") continue;

    risks.push({
      raisedBy: (row[0] || "").trim(),
      description,
      impact: (row[2] || "").trim(),
      dateBecomesIssue: (row[3] || "").trim(),
      status: (row[4] || "").trim(),
      owner: (row[5] || "").trim(),
      impactRating: (row[6] || "").trim(),
      likelihood: (row[7] || "").trim(),
      mitigation: (row[8] || "").trim(),
      comments: (row[9] || "").trim(),
      riskRating: (row[10] || "").trim(),
      riskType,
    });
  }

  return risks;
}

function parsePlannerTable(table: string[][]): ParsedPlannerTask[] {
  const tasks: ParsedPlannerTask[] = [];
  if (table.length < 2) return tasks;

  let currentBucket = "";
  for (let i = 1; i < table.length; i++) {
    const row = table[i];
    if (row.every(c => !c.trim())) continue;

    const bucket = (row[0] || "").trim();
    if (bucket) currentBucket = bucket;

    const taskName = (row[1] || "").trim();
    if (!taskName) continue;

    tasks.push({
      bucketName: currentBucket,
      taskName,
      progress: (row[2] || "").trim(),
      dueDate: (row[3] || "").trim(),
      priority: (row[4] || "").trim(),
      assignedTo: (row[5] || "").trim(),
      labels: (row[6] || "").trim(),
    });
  }

  return tasks;
}

type ContentSection = "status" | "openOpps" | "bigPlays" | "accountGoals" | "relationships" | "research" | "approach" | "other";

interface ParagraphContent {
  statusSummary: string;
  openOppsSummary: string;
  bigPlays: string;
  accountGoals: string;
  relationships: string;
  research: string;
  approachToShortfall: string;
  otherActivities: string;
}

function detectSectionFromParagraph(upper: string): { section: ContentSection; afterHeader: string; original: string } | null {
  const tests: { pattern: RegExp; section: ContentSection; stripPattern?: RegExp }[] = [
    { pattern: /^APPROACH TO\b.*(?:SHORTFALL|TARGET)/i, section: "approach", stripPattern: /^Approach to[^:]*:\s*/i },
    { pattern: /^OTHER VAT\b|^OTHER ACTIVITIES/i, section: "other", stripPattern: /^Other[^:]*:\s*/i },
    { pattern: /^OPEN OPP/i, section: "openOpps", stripPattern: /^Open Opp[^:]*:\s*/i },
    { pattern: /^BIG PLAY/i, section: "bigPlays", stripPattern: /^Big Play[^:]*:\s*/i },
    { pattern: /^ACCOUNT GOAL/i, section: "accountGoals", stripPattern: /^Account Goal[^:]*:\s*/i },
    { pattern: /^RELATIONSHIP/i, section: "relationships", stripPattern: /^Relationship[^:]*:\s*/i },
    { pattern: /^RESEARCH/i, section: "research", stripPattern: /^Research[^:]*:\s*/i },
  ];

  for (const t of tests) {
    if (t.pattern.test(upper)) {
      return { section: t.section, afterHeader: "", original: "" };
    }
  }
  return null;
}

function extractContentFromParagraphs(paragraphs: string[]): ParagraphContent {
  const sections: Record<ContentSection, string[]> = {
    status: [], openOpps: [], bigPlays: [], accountGoals: [],
    relationships: [], research: [], approach: [], other: [],
  };
  let currentSection: ContentSection = "status";

  let skipCount = 0;
  for (let i = 0; i < Math.min(5, paragraphs.length); i++) {
    const upper = paragraphs[i].toUpperCase();
    if (upper.includes("VAT REPORT") || upper.includes("OVERALL STATUS") || /^\d{1,2}\s/.test(paragraphs[i]) || /^\d{4}$/.test(paragraphs[i].trim())) {
      skipCount = i + 1;
    }
  }

  const skipMarkers = new Set([
    "STATUS OVERALL", "RAISED BY", "DESCRIPTION", "IMPACT",
    "DATE RISK BECOMES ISSUE", "STATUS", "OWNER", "IMPACT RATING",
    "LIKELIHOOD", "MITIGATION", "COMMENTS", "RISK RATING",
    "ISSUE RATING", "RISKS", "ISSUES", "RISK", "ISSUE",
    "PEOPLE", "PROCESS", "PEOPLE PROCESS", "WEEK ENDING",
  ]);

  for (let i = skipCount; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    if (!p) continue;
    const upper = p.toUpperCase();

    if (upper === "GREEN" || upper === "AMBER" || upper === "RED" || upper === "N/A") continue;
    if (skipMarkers.has(upper)) continue;
    if (/^WEEK ENDING/i.test(upper)) continue;
    if (upper.includes("VAT REPORT") && upper.length < 30) continue;

    const sectionMatch = detectSectionFromParagraph(upper);
    if (sectionMatch) {
      currentSection = sectionMatch.section;
      const colonIdx = p.indexOf(":");
      if (colonIdx >= 0 && colonIdx < 40) {
        const afterColon = p.substring(colonIdx + 1).trim();
        if (afterColon) {
          sections[currentSection].push(afterColon);
        }
      } else if (p.trim().length > 0) {
        sections[currentSection].push(p);
      }
      continue;
    }

    const isStandaloneLabel = [
      "OPEN OPPS", "OPEN OPPS ACTIONS", "BIG PLAYS", "BIG PLAY",
      "ACCOUNT GOALS", "RELATIONSHIPS", "RESEARCH",
      "STATUS OVERALL",
    ].includes(upper);
    if (isStandaloneLabel) continue;

    sections[currentSection].push(p);
  }

  return {
    statusSummary: sections.status.join("\n").trim(),
    openOppsSummary: sections.openOpps.join("\n").trim(),
    bigPlays: sections.bigPlays.join("\n").trim(),
    accountGoals: sections.accountGoals.join("\n").trim(),
    relationships: sections.relationships.join("\n").trim(),
    research: sections.research.join("\n").trim(),
    approachToShortfall: sections.approach.join("\n").trim(),
    otherActivities: sections.other.join("\n").trim(),
  };
}

export function debugPptxSlides(buffer: Buffer): { slides: { index: number; paragraphs: string[]; tables: string[][][]; size: number }[] } {
  const slides = extractSlides(buffer);
  return { slides };
}

export function parsePptxFile(buffer: Buffer): { reports: ParsedVatReport[]; summary: string } {
  const slides = extractSlides(buffer);
  if (slides.length === 0) {
    throw new Error("No slides found in the PPTX file.");
  }

  const titleParas = slides[0]?.paragraphs || [];
  const globalDate = extractReportDate(titleParas, []);

  interface VatGroup {
    vatName: string;
    titleSlide: ParsedSlide;
    contentSlides: ParsedSlide[];
    plannerSlides: ParsedSlide[];
  }

  const groups: VatGroup[] = [];
  let currentGroup: VatGroup | null = null;

  for (const slide of slides) {
    if (slide.index === 1) {
      const first = (slide.paragraphs[0] || "").toUpperCase();
      if (first.includes("VAT REPORT") && first.includes("SALES COMMITTEE")) continue;
    }

    if (slide.paragraphs.length === 0 && slide.tables.length === 0) continue;

    if (isTitleSlide(slide)) {
      const firstPara = slide.paragraphs[0] || "";
      const vatName = resolveVatName(firstPara);
      if (vatName) {
        currentGroup = { vatName, titleSlide: slide, contentSlides: [], plannerSlides: [] };
        groups.push(currentGroup);
        continue;
      }
    }

    if (!currentGroup) continue;

    if (isPlannerSlide(slide)) {
      if (slide.tables.length > 0) {
        currentGroup.plannerSlides.push(slide);
      }
    } else {
      currentGroup.contentSlides.push(slide);
    }
  }

  const reports: ParsedVatReport[] = [];

  for (const group of groups) {
    const report: ParsedVatReport = {
      vatName: group.vatName,
      reportDate: globalDate,
      overallStatus: "",
      statusSummary: "",
      openOppsSummary: "",
      bigPlays: "",
      accountGoals: "",
      relationships: "",
      research: "",
      approachToShortfall: "",
      otherActivities: "",
      openOppsStatus: "",
      bigPlaysStatus: "",
      accountGoalsStatus: "",
      relationshipsStatus: "",
      researchStatus: "",
      risks: [],
      plannerTasks: [],
    };

    for (const slide of group.contentSlides) {
      const reportDate = extractReportDate(slide.paragraphs, group.titleSlide.paragraphs);
      if (reportDate !== new Date().toISOString().split("T")[0]) {
        report.reportDate = reportDate;
      }

      for (const table of slide.tables) {
        if (table.length === 0) continue;
        const headerRow = table[0];
        const colCount = headerRow.length;

        if (colCount === 3 && table.length >= 5) {
          const overallStatus = extractOverallStatusFromTable(table);
          if (overallStatus) report.overallStatus = overallStatus;
          const statuses = extractStatusSummary(table);
          if (statuses.statusSummary && !report.statusSummary) report.statusSummary = statuses.statusSummary;
          if (statuses.openOppsStatus) report.openOppsStatus = statuses.openOppsStatus;
          if (statuses.bigPlaysStatus) report.bigPlaysStatus = statuses.bigPlaysStatus;
          if (statuses.accountGoalsStatus) report.accountGoalsStatus = statuses.accountGoalsStatus;
          if (statuses.relationshipsStatus) report.relationshipsStatus = statuses.relationshipsStatus;
          if (statuses.researchStatus) report.researchStatus = statuses.researchStatus;
        } else if (colCount === 11 && headerRow.some(h => h.toLowerCase().includes("raised by"))) {
          const risks = parseRiskTable(table);
          report.risks.push(...risks);
        } else if (colCount === 7 && headerRow.some(h => h.toLowerCase().includes("bucket"))) {
          report.plannerTasks.push(...parsePlannerTable(table));
        }
      }

      const extraContent = extractContentFromParagraphs(slide.paragraphs);
      if (extraContent.statusSummary && !report.statusSummary) {
        report.statusSummary = extraContent.statusSummary;
      }
      const appendFields: (keyof typeof extraContent)[] = [
        "openOppsSummary", "bigPlays", "accountGoals",
        "relationships", "research", "approachToShortfall", "otherActivities"
      ];
      for (const field of appendFields) {
        if (extraContent[field]) {
          const key = field as keyof ParsedVatReport;
          if (report[key]) {
            (report as any)[key] += "\n" + extraContent[field];
          } else {
            (report as any)[key] = extraContent[field];
          }
        }
      }
    }

    for (const slide of group.plannerSlides) {
      for (const table of slide.tables) {
        if (table.length > 0 && table[0].length === 7) {
          report.plannerTasks.push(...parsePlannerTable(table));
        }
      }
    }

    if (!report.overallStatus) {
      for (const slide of group.contentSlides) {
        for (const p of slide.paragraphs.slice(0, 5)) {
          const match = p.toUpperCase().match(/(GREEN|AMBER|RED|N\/A)/);
          if (match) {
            report.overallStatus = match[1];
            break;
          }
        }
        if (report.overallStatus) break;
      }
    }

    reports.push(report);
  }

  const summary = reports.map(r =>
    `${r.vatName}: ${r.risks.length} risks, ${r.plannerTasks.length} planner tasks, status: ${r.overallStatus || "not set"}`
  ).join("; ");

  return { reports, summary };
}
