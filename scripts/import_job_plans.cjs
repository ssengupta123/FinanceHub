const XLSX = require("xlsx");
const AdmZip = require("adm-zip");
const knex = require("knex");
const path = require("path");
const fs = require("fs");

const STANDARD_WEEKLY_HOURS = 40;
const MAX_WEEKS_FROM_FIRST = 56;
const HEADER_ROWS = 5;
const STD_RESOURCE_COL = 3;
const STD_RATE_COLS = { panelHourly: 6, discount: 7, discountedHourly: 8, discountedDaily: 9, grossCost: 10 };
const STD_FIRST_WEEK_COL = 20;

const db = knex({ client: "pg", connection: process.env.DATABASE_URL });

function isNameValid(name) {
  if (!name || typeof name !== "string") return false;
  const n = name.trim();
  if (n.length <= 3) return false;
  const lower = n.toLowerCase();
  if (lower === "total" || lower.startsWith("unresourced")) return false;
  if (lower.startsWith("contractor-") || lower.startsWith("subcontractor-")) return false;
  if (/^(account|engagement)\s+manager$/i.test(lower)) return false;
  if (lower === "contingency" || lower === "delivery manager") return false;
  if (lower === "perm-project administrator") return false;
  return true;
}

function extractProjectCode(filename) {
  const m = filename.match(/^([A-Z]{2,4}\d{3}(?:-\d{2,3})?)/i);
  return m ? m[1].toUpperCase() : null;
}

function excelDateToMonday(serial) {
  if (!serial || typeof serial !== "number" || serial < 40000 || serial > 55000) return null;
  const epoch = new Date(1899, 11, 30);
  const d = new Date(epoch.getTime() + serial * 86400000);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function dateToKey(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateToMonth(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function parseNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(n) ? null : n;
}

function findResourceLoadingRow(ws, range) {
  for (let r = HEADER_ROWS; r <= range.e.r; r++) {
    for (let c = 0; c <= 3; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && /^resource\s+loading$/i.test(String(cell.v).trim())) return r;
    }
  }
  return -1;
}

function getWeekColumns(ws, range, headerRow, firstWeekCol) {
  const weekCols = [];
  for (let c = firstWeekCol; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (!cell) continue;
    const d = excelDateToMonday(cell.v);
    if (d) weekCols.push({ col: c, date: d, key: dateToKey(d) });
  }
  if (weekCols.length > MAX_WEEKS_FROM_FIRST) weekCols.length = MAX_WEEKS_FROM_FIRST;
  return weekCols;
}

function extractRates(ws, r, rateCols) {
  return {
    chargeOutRate: parseNum(ws[XLSX.utils.encode_cell({ r, c: rateCols.panelHourly })]?.v),
    discountPercent: parseNum(ws[XLSX.utils.encode_cell({ r, c: rateCols.discount })]?.v),
    discountedHourlyRate: parseNum(ws[XLSX.utils.encode_cell({ r, c: rateCols.discountedHourly })]?.v),
    discountedDailyRate: parseNum(ws[XLSX.utils.encode_cell({ r, c: rateCols.discountedDaily })]?.v),
    hourlyGrossCost: parseNum(ws[XLSX.utils.encode_cell({ r, c: rateCols.grossCost })]?.v),
  };
}

function extractPersonData(ws, range, weekCols, resourceCol, rateCols) {
  const rlRow = findResourceLoadingRow(ws, range);
  const startRow = rlRow >= 0 ? rlRow + 1 : HEADER_ROWS;
  const endRow = range.e.r;

  const personMap = new Map();
  for (let r = startRow; r <= endRow; r++) {
    const nameCell = ws[XLSX.utils.encode_cell({ r, c: resourceCol })];
    if (!nameCell) continue;
    const name = String(nameCell.v).trim();
    if (!isNameValid(name)) continue;

    const rates = extractRates(ws, r, rateCols);
    const weeklyAllocs = {};
    for (const wc of weekCols) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: wc.col })];
      const val = parseNum(cell?.v);
      if (val !== null && val > 0 && val <= 2) {
        weeklyAllocs[wc.key] = Math.round(val * 100);
      }
    }

    if (rlRow >= 0) {
      if (!personMap.has(name)) {
        personMap.set(name, { rates, weeklyAllocs });
      } else {
        const existing = personMap.get(name);
        for (const [k, v] of Object.entries(weeklyAllocs)) {
          existing.weeklyAllocs[k] = v;
        }
        for (const [k, v] of Object.entries(rates)) {
          if (v !== null && (existing.rates[k] === null || existing.rates[k] === undefined)) {
            existing.rates[k] = v;
          }
        }
      }
    } else {
      personMap.set(name, { rates, weeklyAllocs });
    }
  }
  return personMap;
}

function detectSheetFormat(ws) {
  const cell = ws[XLSX.utils.encode_cell({ r: 2, c: 6 })];
  if (cell && /DISCOUNTED CHARGE OUT/i.test(String(cell.v))) return "sau046";
  return "standard";
}

function processSAU046Sheet(ws, range) {
  const rateCols = {
    panelHourly: 4,
    discount: 5,
    discountedHourly: 6,
    discountedDaily: -1,
    grossCost: 7,
  };
  const resourceCol = 1;
  let firstWeekCol = -1;
  for (let c = 10; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 2, c })];
    if (cell && typeof cell.v === "number" && cell.v > 40000) { firstWeekCol = c; break; }
  }
  if (firstWeekCol < 0) return new Map();
  const weekCols = getWeekColumns(ws, range, 2, firstWeekCol);

  const personMap = new Map();
  for (let r = HEADER_ROWS; r <= range.e.r; r++) {
    const nameCell = ws[XLSX.utils.encode_cell({ r, c: resourceCol })];
    if (!nameCell) continue;
    const name = String(nameCell.v).trim();
    if (!isNameValid(name)) continue;

    const chargeOut = parseNum(ws[XLSX.utils.encode_cell({ r, c: 4 })]?.v);
    const discPct = parseNum(ws[XLSX.utils.encode_cell({ r, c: 5 })]?.v);
    const discountedRate = parseNum(ws[XLSX.utils.encode_cell({ r, c: 6 })]?.v);
    const costRate = parseNum(ws[XLSX.utils.encode_cell({ r, c: 7 })]?.v);

    const rates = {
      chargeOutRate: chargeOut,
      discountPercent: discPct,
      discountedHourlyRate: discountedRate,
      discountedDailyRate: discountedRate ? discountedRate * 8 : null,
      hourlyGrossCost: costRate,
    };

    const weeklyAllocs = {};
    for (const wc of weekCols) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: wc.col })];
      const val = parseNum(cell?.v);
      if (val !== null && val > 0 && val <= 2) weeklyAllocs[wc.key] = Math.round(val * 100);
    }
    personMap.set(name, { rates, weeklyAllocs });
  }
  return personMap;
}

function selectBestSheet(wb) {
  const candidates = wb.SheetNames.filter((s) => /time.?plan/i.test(s));
  if (candidates.length === 0) return wb.SheetNames[0];
  if (candidates.length === 1) return candidates[0];

  const filtered = candidates.filter(
    (s) => !/multiple|partial|single|lacy|old/i.test(s)
  );

  for (const name of filtered.length > 0 ? filtered : candidates) {
    const ws = wb.Sheets[name];
    if (!ws || !ws["!ref"]) continue;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    let count = 0;
    for (let r = HEADER_ROWS; r <= Math.min(range.e.r, 50); r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: STD_RESOURCE_COL })];
      if (cell && isNameValid(String(cell.v).trim())) count++;
    }
    if (count > 0) return name;
  }

  for (const name of candidates) {
    const ws = wb.Sheets[name];
    if (!ws || !ws["!ref"]) continue;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    let count = 0;
    for (let r = HEADER_ROWS; r <= Math.min(range.e.r, 100); r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: STD_RESOURCE_COL })];
      if (cell && isNameValid(String(cell.v).trim())) count++;
    }
    if (count > 0) return name;
  }

  return candidates[0];
}

async function main() {
  const zipPath = path.resolve(__dirname, "../attached_assets/Job_Plans_1772971859007.zip");
  if (!fs.existsSync(zipPath)) {
    console.error("Zip file not found:", zipPath);
    process.exit(1);
  }

  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries().filter(
    (e) => e.entryName.endsWith(".xlsx") && !e.entryName.startsWith("Archive/")
  );

  const nextFYEntries = entries.filter((e) => e.entryName.startsWith("Next FY/"));
  const currentEntries = entries.filter((e) => !e.entryName.startsWith("Next FY/"));

  const nextFYCodes = new Set(nextFYEntries.map((e) => extractProjectCode(path.basename(e.entryName, ".xlsx"))).filter(Boolean));
  const deduped = currentEntries.filter((e) => {
    const code = extractProjectCode(path.basename(e.entryName, ".xlsx"));
    return !nextFYCodes.has(code);
  });
  const allEntries = [...deduped, ...nextFYEntries];
  console.log(`Processing ${allEntries.length} files (${nextFYEntries.length} Next FY, ${deduped.length} current)`);

  const employees = await db("employees").select("id", "first_name", "last_name");
  const empLookup = new Map();
  for (const e of employees) {
    const full = `${e.first_name} ${e.last_name}`.toLowerCase().trim();
    empLookup.set(full, e.id);
    const parts = full.split(/\s+/);
    if (parts.length >= 2) {
      empLookup.set(`${parts[0]} ${parts[parts.length - 1].charAt(0)}`, e.id);
    }
  }

  const projects = await db("projects").select("id", "project_code", "name");
  const projLookup = new Map();
  for (const p of projects) {
    if (p.project_code) projLookup.set(p.project_code.toUpperCase(), p.id);
  }

  await db("resource_plans").del();
  console.log("Cleared existing resource_plans");

  let totalInserted = 0;
  let totalSkipped = 0;
  const unmatchedNames = new Set();
  const unmatchedProjects = new Set();

  for (const entry of allEntries) {
    const filename = path.basename(entry.entryName, ".xlsx");
    const projCode = extractProjectCode(filename);
    if (!projCode) {
      console.log(`  SKIP ${filename}: no project code`);
      continue;
    }

    let projectId = projLookup.get(projCode);
    if (!projectId) {
      const baseCode = projCode.replace(/-\d+$/, "");
      projectId = projLookup.get(baseCode);
    }
    if (!projectId) {
      unmatchedProjects.add(projCode);
      continue;
    }

    const buf = entry.getData();
    const wb = XLSX.read(buf, { type: "buffer" });
    const planSheetName = selectBestSheet(wb);
    const ws = wb.Sheets[planSheetName];
    if (!ws || !ws["!ref"]) {
      console.log(`  SKIP ${filename}: empty sheet`);
      continue;
    }
    const range = XLSX.utils.decode_range(ws["!ref"]);

    const format = detectSheetFormat(ws);
    let personMap;

    if (format === "sau046") {
      personMap = processSAU046Sheet(ws, range);
    } else {
      const weekCols = getWeekColumns(ws, range, 2, STD_FIRST_WEEK_COL);
      if (weekCols.length === 0) {
        console.log(`  SKIP ${filename}: no week columns`);
        continue;
      }
      personMap = extractPersonData(ws, range, weekCols, STD_RESOURCE_COL, STD_RATE_COLS);
    }

    let fileInserted = 0;
    for (const [name, data] of personMap) {
      if (Object.keys(data.weeklyAllocs).length === 0) continue;

      const nameLower = name.toLowerCase().trim();
      let empId = empLookup.get(nameLower);
      if (!empId) {
        const parts = nameLower.split(/\s+/);
        if (parts.length >= 2) {
          const firstLast = `${parts[0]} ${parts[parts.length - 1]}`;
          empId = empLookup.get(firstLast);
        }
      }
      if (!empId) {
        const parts = nameLower.split(/\s+/);
        if (parts.length >= 2) {
          for (const [key, id] of empLookup) {
            const kp = key.split(/\s+/);
            if (kp[0] === parts[0] && kp.length >= 2 && kp[kp.length - 1].charAt(0) === parts[parts.length - 1].charAt(0)) {
              empId = id;
              break;
            }
          }
        }
      }
      if (!empId) {
        unmatchedNames.add(name);
        totalSkipped++;
        continue;
      }

      const monthGroups = new Map();
      for (const [weekKey, pct] of Object.entries(data.weeklyAllocs)) {
        const d = new Date(weekKey + "T00:00:00Z");
        const monthKey = dateToMonth(d);
        if (!monthGroups.has(monthKey)) monthGroups.set(monthKey, {});
        monthGroups.get(monthKey)[weekKey] = pct;
      }

      for (const [monthKey, weekAllocs] of monthGroups) {
        const totalH = Object.values(weekAllocs).reduce((s, pct) => s + (pct / 100) * STANDARD_WEEKLY_HOURS, 0);
        const totalDays = totalH / 8;
        const activeWeeks = Object.values(weekAllocs).filter((v) => v > 0);
        const avgPct = activeWeeks.length > 0 ? activeWeeks.reduce((s, v) => s + v, 0) / activeWeeks.length : 0;

        await db("resource_plans").insert({
          project_id: projectId,
          employee_id: empId,
          month: monthKey,
          planned_days: totalDays.toFixed(1),
          planned_hours: totalH.toFixed(1),
          allocation_percent: avgPct.toFixed(2),
          weekly_allocations: JSON.stringify(weekAllocs),
          charge_out_rate: data.rates.chargeOutRate,
          discount_percent: data.rates.discountPercent,
          discounted_hourly_rate: data.rates.discountedHourlyRate,
          discounted_daily_rate: data.rates.discountedDailyRate,
          hourly_gross_cost: data.rates.hourlyGrossCost,
        });
        fileInserted++;
      }
    }

    console.log(`  ${projCode.padEnd(12)} ${planSheetName.padEnd(30)} ${personMap.size} people, ${fileInserted} records`);
    totalInserted += fileInserted;
  }

  console.log(`\nDone: ${totalInserted} records inserted, ${totalSkipped} skipped`);
  if (unmatchedNames.size > 0) console.log("Unmatched names:", [...unmatchedNames].sort().join(", "));
  if (unmatchedProjects.size > 0) console.log("Unmatched projects:", [...unmatchedProjects].sort().join(", "));

  const rateCounts = await db("resource_plans")
    .select(
      db.raw("count(*) as total"),
      db.raw("count(charge_out_rate) as with_charge_out"),
      db.raw("count(discounted_hourly_rate) as with_disc_hourly"),
      db.raw("count(hourly_gross_cost) as with_gross_cost")
    );
  console.log("\nRate coverage:", JSON.stringify(rateCounts[0]));

  console.log("\nCalculating project contract values from job plan rates x hours...");
  const contractValues = await db("resource_plans")
    .select("project_id")
    .sum({ totalValue: db.raw("COALESCE(discounted_hourly_rate, 0) * COALESCE(planned_hours, 0)") })
    .groupBy("project_id");

  let contractUpdated = 0;
  for (const cv of contractValues) {
    const val = parseFloat(cv.totalValue || 0);
    if (val > 0) {
      await db("projects").where("id", cv.project_id).update({ contract_value: val.toFixed(2) });
      contractUpdated++;
    }
  }
  console.log(`Updated contract_value on ${contractUpdated} projects`);

  const topProjects = await db("projects")
    .whereNotNull("contract_value")
    .where("contract_value", ">", 0)
    .orderBy("contract_value", "desc")
    .select("project_code", "contract_value")
    .limit(10);
  console.log("Top projects by contract value:");
  for (const p of topProjects) {
    console.log(`  ${(p.project_code || "").padEnd(14)} $${parseFloat(p.contract_value).toLocaleString()}`);
  }

  await db.destroy();
}

main().catch((err) => { console.error(err); process.exit(1); });
