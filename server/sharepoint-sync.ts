import { db } from "./db";

interface SharePointToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface SharePointListItem {
  Title?: string;
  Phase?: string;
  ItemType?: string;
  Value?: number;
  Margin?: number;
  WorkType?: string;
  StartDate?: string;
  ExpiryDate?: string;
  DueDate?: string;
  VAT?: string;
  Status?: string;
  Comment?: string;
  CASLead?: string;
  CSDLead?: string;
  Category?: string;
  Partner?: string;
  ClientContact?: string;
  ClientCode?: string;
  [key: string]: any;
}

const PHASE_MAP: Record<string, string> = {
  "1.A - Activity": "A",
  "2.Q - Qualified": "Q",
  "3.DF - Submitted": "DF",
  "4.DVF - Shortlisted": "DVF",
  "5.S - Selected": "S",
  "A": "A",
  "Q": "Q",
  "DF": "DF",
  "DVF": "DVF",
  "S": "S",
};

async function getGraphToken(): Promise<SharePointToken> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Missing Azure credentials. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET.");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    console.error(`[SharePoint] Token request failed (HTTP ${resp.status}): ${errBody}`);
    throw new Error(`Failed to get Azure AD token (HTTP ${resp.status}). Check Azure credentials and tenant configuration.`);
  }

  console.log(`[SharePoint] Graph token acquired successfully`);
  return resp.json();
}

export function parseSharePointDate(val: string | null | undefined): string | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
  } catch (e) {
    console.error("[parseSharePointDate] Date parse error:", (e as Error).message);
    return null;
  }
}

export function cleanMultiValueField(val: string | null | undefined): string | null {
  if (!val) return null;
  return val.replaceAll(/;#\d+;#/g, "; ").replaceAll(";#", "; ").trim() || null;
}

export function cleanVat(val: string | null | undefined): string | null {
  if (!val) return null;
  let vat = val.replaceAll(";#", "").replace(/\|.*$/, "").trim();
  if (vat.toLowerCase() === "growth") vat = "GROWTH";
  return vat || null;
}

export function formatNumericField(raw: any, decimals: number): string | null {
  const num = Number(raw);
  return raw != null && !Number.isNaN(num) ? String(num.toFixed(decimals)) : null;
}

export function extractFieldText(val: any): string | null {
  if (val == null) return null;
  if (typeof val === "string") return val || null;
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) {
    const parts = val.map((v) => {
      if (typeof v === "string") return v;
      if (v && typeof v === "object") return v.LookupValue || v.Description || v.Email || v.Title || v.displayName || JSON.stringify(v);
      return String(v);
    }).filter(Boolean);
    return parts.length > 0 ? parts.join("; ") : null;
  }
  if (typeof val === "object") {
    return val.LookupValue || val.Description || val.Email || val.Title || val.displayName || null;
  }
  return String(val) || null;
}

function extractLookupId(item: SharePointListItem, baseName: string): string | null {
  const lookupIdKey = `${baseName}LookupId`;
  const lookupId = item[lookupIdKey];
  const directVal = item[baseName];
  if (directVal && typeof directVal !== "number") return extractFieldText(directVal);
  if (lookupId) return String(lookupId);
  return null;
}

export function extractItemFields(item: SharePointListItem): Record<string, any> {
  return {
    workType: extractFieldText(item["WorkType_x0028_FTorContract_x0029_"] || item.WorkType || item.Work_x0020_Type || item.OppWorkType),
    status: extractFieldText(item.Status0 || item.RAGStatus || item.OppStatus),
    comment: extractFieldText(item.ChimComment || item.Comment || item.Comments || item.OppComment),
    casLead: extractLookupId(item, "BidLead0") || extractFieldText(item.CAS_x0020_Lead || item.CASLead),
    csdLead: extractFieldText(item.ClientManager || item.CSD_x0020_Lead || item.CSDLead),
    category: extractFieldText(item.Business || item.Category || item.OppCategory),
    partner: extractFieldText(item.Partner || item.OppPartner),
    clientContact: extractFieldText(item.Planner || item.Client_x0020_Contact || item.ClientContact),
    clientCode: extractFieldText(item.CC || item.Client_x0020_Code || item.ClientCode),
    vat: cleanVat(extractFieldText(item.Team || item.VAT || item.VATCategory || item.VAT_x0020_Category)),
    dueDate: parseSharePointDate(typeof item.Due === "string" ? item.Due : null),
    startDate: parseSharePointDate(typeof item.StartDate === "string" ? item.StartDate : null),
    expiryDate: parseSharePointDate(typeof item.ExpiryDate === "string" ? item.ExpiryDate : null),
  };
}

export function transformSharePointItem(item: SharePointListItem): { record?: any; error?: string } {
  const name = item.Title || item.FileLeafRef || "";
  if (!name) return {};

  const phaseRaw = item.Status || item.Phase || item.OppPhase || "";
  const classification = PHASE_MAP[phaseRaw];
  if (!classification) return {};

  const sharepointId = item._sharepointItemId ? String(item._sharepointItemId) : null;

  try {
    const value = formatNumericField(item["Value_x0024_exGST"] ?? item.Value_x0020__x0024__x0020_est_ ?? item["Value $ est."] ?? item.Value ?? item.OppValue ?? item.TotalValue, 2);
    const marginPercent = formatNumericField(item.Margin ?? item.MarginPercent ?? item.Margin_x0025_ ?? item.OppMargin, 3);
    const fields = extractItemFields(item);

    return {
      record: {
        name, classification, fyYear: "open_opps", value, marginPercent,
        sharepointId,
        ...fields,
      },
    };
  } catch (err: any) {
    return { error: `Item "${name}": ${err.message}` };
  }
}

export function getSharePointConfig(): { domain: string; sitePath: string; listName: string; folderPath: string } {
  const domain = process.env.SHAREPOINT_DOMAIN;
  const sitePath = process.env.SHAREPOINT_SITE_PATH;
  const listName = process.env.SHAREPOINT_LIST_NAME || "Documents";
  const folderPath = process.env.SHAREPOINT_FOLDER_PATH || "General/1.Open Opportunities";

  if (!domain || !sitePath) {
    throw new Error(
      "Missing SharePoint config. Set SHAREPOINT_DOMAIN (e.g. yourcompany.sharepoint.com) and SHAREPOINT_SITE_PATH (e.g. /sites/Finance)."
    );
  }

  return { domain, sitePath: sitePath.startsWith("/") ? sitePath : `/${sitePath}`, listName, folderPath };
}

async function lookupSharePointSite(token: SharePointToken, siteHost: string, sitePath: string): Promise<string> {
  const siteUrl = `https://graph.microsoft.com/v1.0/sites/${siteHost}:${sitePath}`;
  console.log(`[SharePoint] Looking up site: ${siteUrl}`);
  const siteResp = await fetch(siteUrl, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!siteResp.ok) {
    const errBody = await siteResp.text();
    console.error(`[SharePoint] Site lookup failed (HTTP ${siteResp.status}): ${errBody.substring(0, 500)}`);
    throw new Error(`SharePoint site not found (HTTP ${siteResp.status}). Check SHAREPOINT_DOMAIN and SHAREPOINT_SITE_PATH.`);
  }
  const siteData = await siteResp.json();
  console.log(`[SharePoint] Found site ID: ${siteData.id}`);
  return siteData.id;
}

async function findSharePointList(token: SharePointToken, siteId: string, listName: string): Promise<{ listId: string; isDrive: boolean }> {
  const listsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists`;
  const listsResp = await fetch(listsUrl, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!listsResp.ok) {
    const errBody = await listsResp.text();
    console.error(`[SharePoint] Lists lookup failed (HTTP ${listsResp.status}): ${errBody.substring(0, 500)}`);
    throw new Error(`Failed to retrieve SharePoint lists (HTTP ${listsResp.status}).`);
  }
  const listsData = await listsResp.json();
  const allLists = listsData.value || [];

  const targetList = allLists.find((l: any) =>
    l.displayName === listName || l.name === listName
  );
  if (targetList) {
    console.log(`[SharePoint] Found list "${listName}" with ID: ${targetList.id}`);
    return { listId: targetList.id, isDrive: false };
  }

  const drivesUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`;
  const drivesResp = await fetch(drivesUrl, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (drivesResp.ok) {
    const drivesData = await drivesResp.json();
    const drives = drivesData.value || [];
    const targetDrive = drives.find((d: any) =>
      d.name === listName || d.name === "Shared Documents"
    );
    if (targetDrive) {
      const driveList = allLists.find((l: any) => l.name === targetDrive.name || l.displayName === targetDrive.name);
      if (driveList) {
        console.log(`[SharePoint] Found document library "${targetDrive.name}" as list ID: ${driveList.id}`);
        return { listId: driveList.id, isDrive: true };
      }
    }
    const driveNames = drives.map((d: any) => `${d.name} (drive)`).join(", ");
    const listNames = allLists.map((l: any) => l.displayName).join(", ");
    throw new Error(`SharePoint list "${listName}" not found. Available: ${listNames}, ${driveNames}`);
  }

  const available = allLists.map((l: any) => l.displayName).join(", ");
  throw new Error(`SharePoint list "${listName}" not found. Available lists: ${available}`);
}

async function listFolderNames(token: SharePointToken, siteId: string, folderPath: string): Promise<string[]> {
  let url: string;
  if (folderPath) {
    const encodedPath = folderPath.split("/").map(seg => encodeURIComponent(seg)).join("/");
    url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodedPath}:/children?$select=name,folder&$top=999`;
  } else {
    url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children?$select=name,folder&$top=999`;
  }
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!resp.ok) {
    console.log(`[SharePoint] listFolderNames("${folderPath}") failed: HTTP ${resp.status}`);
    return [];
  }
  const data: any = await resp.json();
  return (data.value || []).filter((item: any) => item.folder).map((item: any) => item.name as string);
}

async function fetchFolderChildren(token: SharePointToken, siteId: string, folderPath: string): Promise<SharePointListItem[]> {
  const allItems: SharePointListItem[] = [];
  const encodedPath = folderPath.split("/").map(seg => encodeURIComponent(seg)).join("/");
  let nextUrl: string | null = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodedPath}:/children?$expand=listItem($expand=fields)&$top=999`;
  console.log(`[SharePoint] Fetching folder children: ${folderPath} (encoded: ${encodedPath})`);

  while (nextUrl) {
    const resp: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error(`[SharePoint] Folder API error (HTTP ${resp.status}): ${errBody.substring(0, 500)}`);
      throw new Error(`SharePoint folder API error (HTTP ${resp.status}).`);
    }

    const data: any = await resp.json();
    for (const driveItem of (data.value || [])) {
      const fields = driveItem.listItem?.fields || {};
      fields._sharepointItemId = driveItem.listItem?.id || driveItem.id;
      if (!fields.FileLeafRef && driveItem.name) fields.FileLeafRef = driveItem.name;
      allItems.push(fields);
    }

    nextUrl = data["@odata.nextLink"] || null;
  }

  console.log(`[SharePoint] Retrieved ${allItems.length} folder children`);
  return allItems;
}

async function fetchListItemsFiltered(token: SharePointToken, siteId: string, listId: string, contentTypeName?: string): Promise<SharePointListItem[]> {
  const allItems: SharePointListItem[] = [];
  let baseUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=999`;
  if (contentTypeName) {
    baseUrl += `&$filter=fields/ContentType eq '${contentTypeName}'`;
  }

  let nextUrl: string | null = baseUrl;
  const contentTypeLabel = contentTypeName ? ` (ContentType: ${contentTypeName})` : "";
  console.log(`[SharePoint] Fetching list items${contentTypeLabel}...`);

  while (nextUrl) {
    const resp: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token.access_token}`, Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly" },
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error(`[SharePoint] API error (HTTP ${resp.status}): ${errBody.substring(0, 500)}`);
      if (contentTypeName && resp.status === 400) {
        console.log(`[SharePoint] Content type filter failed, falling back to unfiltered fetch...`);
        return fetchListItemsFiltered(token, siteId, listId);
      }
      throw new Error(`SharePoint API error (HTTP ${resp.status}).`);
    }

    const data: any = await resp.json();
    const items = (data.value || []).map((item: any) => {
      const fields = item.fields || {};
      fields._sharepointItemId = item.id || fields.id;
      return fields;
    });
    allItems.push(...items);

    nextUrl = data["@odata.nextLink"] || null;
    if (allItems.length > 0 && allItems.length % 5000 === 0) {
      console.log(`[SharePoint] Fetched ${allItems.length} items so far...`);
    }
  }

  console.log(`[SharePoint] Retrieved ${allItems.length} total items`);
  return allItems;
}

export function stageSharePointItems(allItems: SharePointListItem[]): { staged: any[]; errors: string[] } {
  const staged: any[] = [];
  const errors: string[] = [];
  for (const item of allItems) {
    const result = transformSharePointItem(item);
    if (result.error) {
      errors.push(result.error);
    } else if (result.record) {
      staged.push(result.record);
    }
  }
  return { staged, errors };
}

function recordToSnake(record: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(record)) {
    out[k.replaceAll(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = v;
  }
  return out;
}

const DELTA_COMPARE_FIELDS = [
  "name", "classification", "value", "margin_percent", "work_type", "status",
  "due_date", "start_date", "expiry_date", "comment", "cas_lead", "csd_lead",
  "category", "partner", "client_contact", "client_code", "vat",
];

function hasChanges(existing: Record<string, any>, incoming: Record<string, any>): boolean {
  for (const field of DELTA_COMPARE_FIELDS) {
    const oldVal = existing[field] ?? null;
    const newVal = incoming[field] ?? null;
    if (String(oldVal) !== String(newVal)) return true;
  }
  return false;
}

async function performOpenOppsDeltaSync(staged: any[]): Promise<{ inserted: number; updated: number; removed: number; unchanged: number }> {
  let inserted = 0;
  let updated = 0;
  let removed = 0;
  let unchanged = 0;

  await db.transaction(async (trx) => {
    const existingRows = await trx("pipeline_opportunities").where("fy_year", "open_opps").select("*");
    const existingBySpId = new Map<string, any>();
    const existingWithoutSpId: any[] = [];
    for (const row of existingRows) {
      if (row.sharepoint_id) {
        existingBySpId.set(String(row.sharepoint_id), row);
      } else {
        existingWithoutSpId.push(row);
      }
    }

    const incomingSpIds = new Set<string>();

    for (const record of staged) {
      const snakeRecord = recordToSnake(record);
      const spId = snakeRecord.sharepoint_id;

      if (!spId) {
        await trx("pipeline_opportunities").insert({ ...snakeRecord, fy_year: "open_opps" });
        inserted++;
        continue;
      }

      incomingSpIds.add(String(spId));
      const existing = existingBySpId.get(String(spId));

      if (existing) {
        if (hasChanges(existing, snakeRecord)) {
          await trx("pipeline_opportunities").where("id", existing.id).update(snakeRecord);
          updated++;
        } else {
          unchanged++;
        }
      } else {
        await trx("pipeline_opportunities").insert({ ...snakeRecord, fy_year: "open_opps" });
        inserted++;
      }
    }

    for (const [spId, row] of Array.from(existingBySpId)) {
      if (!incomingSpIds.has(spId)) {
        await trx("pipeline_opportunities").where("id", row.id).del();
        removed++;
      }
    }

    if (existingWithoutSpId.length > 0 && staged.length > 0) {
      const incomingNames = new Set(staged.map((r: any) => r.name));
      for (const row of existingWithoutSpId) {
        if (!incomingNames.has(row.name)) {
          await trx("pipeline_opportunities").where("id", row.id).del();
          removed++;
        }
      }
    }
  });

  return { inserted, updated, removed, unchanged };
}

export async function syncSharePointOpenOpps(): Promise<{
  imported: number;
  updated: number;
  removed: number;
  unchanged: number;
  errors: string[];
  message: string;
}> {
  const config = getSharePointConfig();
  const token = await getGraphToken();
  const siteId = await lookupSharePointSite(token, config.domain, config.sitePath);
  await findSharePointList(token, siteId, config.listName);

  const folderPath = config.folderPath;
  const allItems = await fetchFolderChildren(token, siteId, folderPath);

  const { staged, errors } = stageSharePointItems(allItems);
  console.log(`[SharePoint] Staged ${staged.length} items from ${allItems.length} total (${errors.length} errors)`);
  if (errors.length > 0) {
    console.log(`[SharePoint] First 5 errors: ${errors.slice(0, 5).join(" | ")}`);
  }

  const counts = await performOpenOppsDeltaSync(staged);

  const parts = [];
  if (counts.inserted > 0) parts.push(`${counts.inserted} added`);
  if (counts.updated > 0) parts.push(`${counts.updated} updated`);
  if (counts.removed > 0) parts.push(`${counts.removed} removed`);
  if (counts.unchanged > 0) parts.push(`${counts.unchanged} unchanged`);
  if (errors.length > 0) parts.push(`${errors.length} errors`);

  console.log(`[SharePoint] Delta sync complete: ${parts.join(", ")}`);

  return {
    imported: counts.inserted,
    updated: counts.updated,
    removed: counts.removed,
    unchanged: counts.unchanged,
    errors,
    message: `SharePoint sync: ${parts.join(", ")}.`,
  };
}

function parseProjectCode(folderName: string): { projectCode: string; projectName: string } | null {
  const skip = /^(00\.|ZZZ)/i;
  if (skip.test(folderName.trim())) return null;

  const match = /^([A-Z]{2,6}[\dX]{2,4})(?:-[\dA-Z]{1,3})?\s+(.+)$/i.exec(folderName.trim());
  if (!match) return null;
  let projectCode = match[1].toUpperCase();
  const projectName = match[2].replace(/\s*\(\d{1,2}-[A-Za-z]{3}-\d{2}\s*-\s*\d{1,2}-[A-Za-z]{3}-\d{2}\)\s*$/, "")
    .replace(/\s*NEXT\s+FY\s*$/i, "")
    .trim();

  return { projectCode, projectName };
}

async function performInflightDeltaSync(staged: { sharepointId: string; projectCode: string; name: string; client: string | null; clientCode: string | null; clientManager: string | null; engagementManager: string | null; vat: string | null; workType: string | null; contractType: string | null; status: string; startDate: string | null; endDate: string | null; contractValue: string | null; opsCommentary: string | null }[]): Promise<{ inserted: number; updated: number; removed: number; unchanged: number }> {
  let inserted = 0;
  let updated = 0;
  let removed = 0;
  let unchanged = 0;

  await db.transaction(async (trx) => {
    const existingRows = await trx("projects").whereNotNull("sharepoint_id").select("*");
    const existingBySpId = new Map<string, any>();
    for (const row of existingRows) {
      existingBySpId.set(String(row.sharepoint_id), row);
    }

    const incomingSpIds = new Set<string>();

    for (const record of staged) {
      incomingSpIds.add(record.sharepointId);
      const existing = existingBySpId.get(record.sharepointId);

      const dbRecord = {
        project_code: record.projectCode,
        name: record.name,
        client: record.client,
        client_code: record.clientCode,
        client_manager: record.clientManager,
        engagement_manager: record.engagementManager,
        vat: record.vat,
        work_type: record.workType,
        contract_type: record.contractType,
        status: record.status,
        start_date: record.startDate,
        end_date: record.endDate,
        contract_value: record.contractValue,
        ops_commentary: record.opsCommentary,
        sharepoint_id: record.sharepointId,
      };

      if (existing) {
        const changed = Object.entries(dbRecord).some(([k, v]) => {
          if (k === "sharepoint_id") return false;
          return String(existing[k] ?? "") !== String(v ?? "");
        });
        if (changed) {
          await trx("projects").where("id", existing.id).update(dbRecord);
          updated++;
        } else {
          unchanged++;
        }
      } else {
        const existingByCode = await trx("projects").where("project_code", record.projectCode).first();
        if (existingByCode) {
          await trx("projects").where("id", existingByCode.id).update(dbRecord);
          updated++;
        } else {
          await trx("projects").insert(dbRecord);
          inserted++;
        }
      }
    }

    for (const [spId, row] of Array.from(existingBySpId)) {
      if (!incomingSpIds.has(spId)) {
        await trx("projects").where("id", row.id).update({ status: "completed", sharepoint_id: null });
        removed++;
      }
    }

    await ensureFyMonthlyRows(trx);
  });

  return { inserted, updated, removed, unchanged };
}

async function ensureFyMonthlyRows(trx: any): Promise<void> {
  const now = new Date();
  const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const currentFy = String(fyStartYear).slice(2) + "-" + String(fyStartYear + 1).slice(2);
  const fyMonthLabels = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const fyMonthNums = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];

  const allSyncedProjects = await trx("projects").whereNotNull("sharepoint_id").select("id");
  for (const proj of allSyncedProjects) {
    const existingMonthly = await trx("project_monthly").where({ project_id: proj.id, fy_year: currentFy }).select("month");
    const existingMonthSet = new Set(existingMonthly.map((m: any) => m.month));

    for (let i = 0; i < 12; i++) {
      if (!existingMonthSet.has(fyMonthNums[i])) {
        await trx("project_monthly").insert({
          project_id: proj.id,
          fy_year: currentFy,
          month: fyMonthNums[i],
          month_label: fyMonthLabels[i],
          revenue: 0,
          cost: 0,
          profit: 0,
        });
      }
    }
  }
}

async function discoverInflightFolder(token: SharePointToken, siteId: string): Promise<{ items: SharePointListItem[]; usedPath: string }> {
  const folderCandidates = [
    "General/2.Inflight Engagements",
    "General/2. Inflight Engagements",
    "General/2. Inflight",
    "General/2.Inflight",
  ];

  for (const candidate of folderCandidates) {
    try {
      const items = await fetchFolderChildren(token, siteId, candidate);
      return { items, usedPath: candidate };
    } catch (err: any) {
      if (err.message?.includes("404")) {
        console.log(`[SharePoint] Inflight: folder "${candidate}" not found, trying next...`);
        continue;
      }
      throw err;
    }
  }

  console.log(`[SharePoint] Inflight: all candidates failed, discovering folders in General/...`);
  const generalChildren = await listFolderNames(token, siteId, "General");
  console.log(`[SharePoint] Inflight: General/ contains ${generalChildren.length} folders: ${generalChildren.join(", ")}`);

  const inflightFolder = generalChildren.find((name) => /inflight/i.test(name));
  if (inflightFolder) {
    console.log(`[SharePoint] Inflight: discovered folder "${inflightFolder}"`);
    const items = await fetchFolderChildren(token, siteId, `General/${inflightFolder}`);
    return { items, usedPath: `General/${inflightFolder}` };
  }

  if (generalChildren.length === 0) {
    const rootChildren = await listFolderNames(token, siteId, "");
    console.log(`[SharePoint] Inflight: drive root contains: ${rootChildren.join(", ")}`);
  }
  throw new Error(`Inflight folder not found in General/. Available folders: ${generalChildren.join(", ") || "(none)"}`);
}

export async function syncSharePointInflightProjects(): Promise<{
  imported: number;
  updated: number;
  removed: number;
  unchanged: number;
  errors: string[];
  message: string;
}> {
  const config = getSharePointConfig();
  const token = await getGraphToken();
  const siteId = await lookupSharePointSite(token, config.domain, config.sitePath);

  const { items: allItems, usedPath } = await discoverInflightFolder(token, siteId);
  console.log(`[SharePoint] Inflight: Retrieved ${allItems.length} items from ${usedPath}`);

  const staged: { sharepointId: string; projectCode: string; name: string; client: string | null; clientCode: string | null; clientManager: string | null; engagementManager: string | null; vat: string | null; workType: string | null; contractType: string | null; status: string; startDate: string | null; endDate: string | null; contractValue: string | null; opsCommentary: string | null }[] = [];
  const errors: string[] = [];

  const skippedNames: string[] = [];
  const noSpId: string[] = [];

  for (const item of allItems) {
    const folderName = item.Title || item.FileLeafRef || "";
    if (!folderName) continue;

    const parsed = parseProjectCode(folderName);
    if (!parsed) {
      skippedNames.push(folderName);
      continue;
    }

    const spId = item._sharepointItemId ? String(item._sharepointItemId) : null;
    if (!spId) {
      noSpId.push(folderName);
      continue;
    }

    try {
      const fields = extractItemFields(item);
      staged.push({
        sharepointId: spId,
        projectCode: parsed.projectCode,
        name: parsed.projectName,
        client: extractFieldText(item.Client || item.ClientName) || null,
        clientCode: fields.clientCode,
        clientManager: fields.csdLead,
        engagementManager: fields.casLead,
        vat: fields.vat,
        workType: fields.workType,
        contractType: extractFieldText(item.ContractType || item.Contract_x0020_Type) || null,
        status: "active",
        startDate: fields.startDate,
        endDate: fields.expiryDate,
        contractValue: formatNumericField(item["Value_x0024_exGST"] ?? item.Value ?? item.ContractValue, 2),
        opsCommentary: fields.comment,
      });
    } catch (err: any) {
      errors.push(`"${folderName}": ${err.message}`);
    }
  }

  console.log(`[SharePoint] Inflight: Staged ${staged.length} projects (${errors.length} errors, ${skippedNames.length} skipped by name parse, ${noSpId.length} no SP id)`);
  if (skippedNames.length > 0) {
    console.log(`[SharePoint] Inflight skipped names: ${skippedNames.join(" | ")}`);
  }
  if (noSpId.length > 0) {
    console.log(`[SharePoint] Inflight no SP id: ${noSpId.join(" | ")}`);
  }
  if (errors.length > 0) {
    console.log(`[SharePoint] Inflight first 5 errors: ${errors.slice(0, 5).join(" | ")}`);
  }

  const counts = await performInflightDeltaSync(staged);

  const parts = [];
  if (counts.inserted > 0) parts.push(`${counts.inserted} added`);
  if (counts.updated > 0) parts.push(`${counts.updated} updated`);
  if (counts.removed > 0) parts.push(`${counts.removed} archived`);
  if (counts.unchanged > 0) parts.push(`${counts.unchanged} unchanged`);
  if (errors.length > 0) parts.push(`${errors.length} errors`);

  console.log(`[SharePoint] Inflight sync complete: ${parts.join(", ")}`);

  return {
    imported: counts.inserted,
    updated: counts.updated,
    removed: counts.removed,
    unchanged: counts.unchanged,
    errors,
    message: `Inflight Projects sync: ${parts.join(", ")}.`,
  };
}

async function fetchDriveFolderFiles(token: SharePointToken, siteId: string, folderPath: string): Promise<{ name: string; downloadUrl: string; id: string }[]> {
  const files: { name: string; downloadUrl: string; id: string }[] = [];
  const encodedPath = folderPath.split("/").map(seg => encodeURIComponent(seg)).join("/");
  let nextUrl: string | null = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodedPath}:/children?$top=999`;

  while (nextUrl) {
    const resp: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`Failed to list folder files (HTTP ${resp.status}): ${errBody.substring(0, 300)}`);
    }
    const data: any = await resp.json();
    for (const item of (data.value || [])) {
      if (item.file && item.name && (item.name.endsWith(".xlsx") || item.name.endsWith(".xls"))) {
        const downloadUrl = item["@microsoft.graph.downloadUrl"] || item["@content.downloadUrl"] || `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${item.id}/content`;
        files.push({ name: item.name, downloadUrl, id: item.id });
      }
    }
    nextUrl = data["@odata.nextLink"] || null;
  }

  return files;
}

async function downloadExcelFile(url: string, token: SharePointToken): Promise<Buffer> {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!resp.ok) {
    throw new Error(`Failed to download file (HTTP ${resp.status})`);
  }
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

const STANDARD_WEEKLY_HOURS = 40;
const MAX_WEEKS_FROM_FIRST = 56;
const JP_HEADER_ROWS = 5;
const STD_RESOURCE_COL = 3;
const STD_RATE_COLS = { panelHourly: 6, discount: 7, discountedHourly: 8, discountedDaily: 9, grossCost: 10 };
const STD_FIRST_WEEK_COL = 20;

interface PersonData {
  rates: {
    chargeOutRate: number | null;
    discountPercent: number | null;
    discountedHourlyRate: number | null;
    discountedDailyRate: number | null;
    hourlyGrossCost: number | null;
  };
  weeklyAllocs: Record<string, number>;
}

function isJobPlanNameValid(name: string): boolean {
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

function extractProjectCode(filename: string): string | null {
  const m = filename.match(/^([A-Z]{2,4}\d{3}(?:-\d{2,3})?)/i);
  return m ? m[1].toUpperCase() : null;
}

function excelDateToMonday(serial: any): Date | null {
  if (!serial || typeof serial !== "number" || serial < 40000 || serial > 55000) return null;
  const epoch = new Date(1899, 11, 30);
  const d = new Date(epoch.getTime() + serial * 86400000);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function jpDateToKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function jpDateToMonth(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function jpParseNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(n) ? null : n;
}

function findResourceLoadingRow(ws: any, range: any, XLSX: any): number {
  for (let r = JP_HEADER_ROWS; r <= range.e.r; r++) {
    for (let c = 0; c <= 3; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && /^resource\s+loading$/i.test(String(cell.v).trim())) return r;
    }
  }
  return -1;
}

function getWeekColumns(ws: any, range: any, headerRow: number, firstWeekCol: number, XLSX: any): { col: number; date: Date; key: string }[] {
  const weekCols: { col: number; date: Date; key: string }[] = [];
  for (let c = firstWeekCol; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (!cell) continue;
    const d = excelDateToMonday(cell.v);
    if (d) weekCols.push({ col: c, date: d, key: jpDateToKey(d) });
  }
  if (weekCols.length > MAX_WEEKS_FROM_FIRST) weekCols.length = MAX_WEEKS_FROM_FIRST;
  return weekCols;
}

function extractRates(ws: any, r: number, rateCols: typeof STD_RATE_COLS, XLSX: any) {
  return {
    chargeOutRate: jpParseNum(ws[XLSX.utils.encode_cell({ r, c: rateCols.panelHourly })]?.v),
    discountPercent: jpParseNum(ws[XLSX.utils.encode_cell({ r, c: rateCols.discount })]?.v),
    discountedHourlyRate: jpParseNum(ws[XLSX.utils.encode_cell({ r, c: rateCols.discountedHourly })]?.v),
    discountedDailyRate: rateCols.discountedDaily >= 0 ? jpParseNum(ws[XLSX.utils.encode_cell({ r, c: rateCols.discountedDaily })]?.v) : null,
    hourlyGrossCost: jpParseNum(ws[XLSX.utils.encode_cell({ r, c: rateCols.grossCost })]?.v),
  };
}

function extractPersonData(ws: any, range: any, weekCols: { col: number; date: Date; key: string }[], resourceCol: number, rateCols: typeof STD_RATE_COLS, XLSX: any): Map<string, PersonData> {
  const rlRow = findResourceLoadingRow(ws, range, XLSX);
  const startRow = rlRow >= 0 ? rlRow + 1 : JP_HEADER_ROWS;
  const endRow = range.e.r;

  const personMap = new Map<string, PersonData>();
  for (let r = startRow; r <= endRow; r++) {
    const nameCell = ws[XLSX.utils.encode_cell({ r, c: resourceCol })];
    if (!nameCell) continue;
    const name = String(nameCell.v).trim();
    if (!isJobPlanNameValid(name)) continue;

    const rates = extractRates(ws, r, rateCols, XLSX);
    const weeklyAllocs: Record<string, number> = {};
    for (const wc of weekCols) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: wc.col })];
      const val = jpParseNum(cell?.v);
      if (val !== null && val > 0 && val <= 2) {
        weeklyAllocs[wc.key] = Math.round(val * 100);
      }
    }

    if (rlRow >= 0) {
      if (!personMap.has(name)) {
        personMap.set(name, { rates, weeklyAllocs });
      } else {
        const existing = personMap.get(name)!;
        for (const [k, v] of Object.entries(weeklyAllocs)) {
          existing.weeklyAllocs[k] = v;
        }
        for (const [k, v] of Object.entries(rates)) {
          if (v !== null && ((existing.rates as any)[k] === null || (existing.rates as any)[k] === undefined)) {
            (existing.rates as any)[k] = v;
          }
        }
      }
    } else {
      personMap.set(name, { rates, weeklyAllocs });
    }
  }
  return personMap;
}

function detectSheetFormat(ws: any, XLSX: any): string {
  const cell = ws[XLSX.utils.encode_cell({ r: 2, c: 6 })];
  if (cell && /DISCOUNTED CHARGE OUT/i.test(String(cell.v))) return "sau046";
  return "standard";
}

function processSAU046Sheet(ws: any, range: any, XLSX: any): Map<string, PersonData> {
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
  const weekCols = getWeekColumns(ws, range, 2, firstWeekCol, XLSX);

  const personMap = new Map<string, PersonData>();
  for (let r = JP_HEADER_ROWS; r <= range.e.r; r++) {
    const nameCell = ws[XLSX.utils.encode_cell({ r, c: resourceCol })];
    if (!nameCell) continue;
    const name = String(nameCell.v).trim();
    if (!isJobPlanNameValid(name)) continue;

    const chargeOut = jpParseNum(ws[XLSX.utils.encode_cell({ r, c: 4 })]?.v);
    const discPct = jpParseNum(ws[XLSX.utils.encode_cell({ r, c: 5 })]?.v);
    const discountedRate = jpParseNum(ws[XLSX.utils.encode_cell({ r, c: 6 })]?.v);
    const costRate = jpParseNum(ws[XLSX.utils.encode_cell({ r, c: 7 })]?.v);

    const rates = {
      chargeOutRate: chargeOut,
      discountPercent: discPct,
      discountedHourlyRate: discountedRate,
      discountedDailyRate: discountedRate ? discountedRate * 8 : null,
      hourlyGrossCost: costRate,
    };

    const weeklyAllocs: Record<string, number> = {};
    for (const wc of weekCols) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: wc.col })];
      const val = jpParseNum(cell?.v);
      if (val !== null && val > 0 && val <= 2) weeklyAllocs[wc.key] = Math.round(val * 100);
    }
    personMap.set(name, { rates, weeklyAllocs });
  }
  return personMap;
}

function selectBestSheet(wb: any, XLSX: any): string {
  const candidates = wb.SheetNames.filter((s: string) => /time.?plan/i.test(s));
  if (candidates.length === 0) return wb.SheetNames[0];
  if (candidates.length === 1) return candidates[0];

  const filtered = candidates.filter(
    (s: string) => !/multiple|partial|single|lacy|old/i.test(s)
  );

  for (const name of filtered.length > 0 ? filtered : candidates) {
    const ws = wb.Sheets[name];
    if (!ws || !ws["!ref"]) continue;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    let count = 0;
    for (let r = JP_HEADER_ROWS; r <= Math.min(range.e.r, 50); r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: STD_RESOURCE_COL })];
      if (cell && isJobPlanNameValid(String(cell.v).trim())) count++;
    }
    if (count > 0) return name;
  }

  for (const name of candidates) {
    const ws = wb.Sheets[name];
    if (!ws || !ws["!ref"]) continue;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    let count = 0;
    for (let r = JP_HEADER_ROWS; r <= Math.min(range.e.r, 100); r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: STD_RESOURCE_COL })];
      if (cell && isJobPlanNameValid(String(cell.v).trim())) count++;
    }
    if (count > 0) return name;
  }

  return candidates[0];
}

async function buildEmployeeLookup(): Promise<{ findEmployee: (name: string) => { id: number } | null }> {
  const allEmployees = await db("employees").select("id", "first_name", "last_name");

  const byFullName = new Map<string, { id: number }>();
  const byFirstInitial = new Map<string, { id: number }>();

  for (const e of allEmployees) {
    const first = (e.first_name || "").trim().toLowerCase();
    const last = (e.last_name || "").trim().toLowerCase();
    const fullName = `${first} ${last}`.trim();
    if (fullName) {
      byFullName.set(fullName, e);
      if (first && last) {
        byFullName.set(`${last}, ${first}`, e);
        byFullName.set(`${last} ${first}`, e);
      }
      if (first && last) {
        byFirstInitial.set(`${first} ${last.charAt(0)}`, e);
      }
    }
  }

  function findEmployee(name: string): { id: number } | null {
    const n = name.toLowerCase().trim();
    if (byFullName.has(n)) return byFullName.get(n)!;

    const reversed = n.split(/,\s*/).reverse().join(" ").trim();
    if (byFullName.has(reversed)) return byFullName.get(reversed)!;

    if (byFirstInitial.has(n)) return byFirstInitial.get(n)!;

    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      const firstLast = `${parts[0]} ${parts[parts.length - 1]}`;
      if (byFullName.has(firstLast)) return byFullName.get(firstLast)!;
      const firstInit = `${parts[0]} ${parts[parts.length - 1].charAt(0)}`;
      if (byFirstInitial.has(firstInit)) return byFirstInitial.get(firstInit)!;
    }

    for (const [key, emp] of Array.from(byFullName)) {
      if (key.includes(n) || n.includes(key)) return emp;
    }
    return null;
  }

  return { findEmployee };
}

async function parseAndProcessJobPlanFile(
  buffer: Buffer,
  fileName: string,
  projectByCode: Map<string, any>,
  employeeLookup: { findEmployee: (name: string) => { id: number } | null },
): Promise<{ inserted: number; updated: number; unchanged: number; processed: boolean; error?: string }> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "buffer" });

  const codeMatch = extractProjectCode(fileName.replace(/\.(xlsx|xls)$/i, ""));
  const projectCode = codeMatch || fileName.replace(/\.(xlsx|xls)$/i, "").toUpperCase();

  let project = projectByCode.get(projectCode.toUpperCase());
  if (!project) {
    const baseCode = projectCode.replace(/-\d+$/, "");
    project = projectByCode.get(baseCode);
  }

  const planSheetName = selectBestSheet(wb, XLSX);
  const ws = wb.Sheets[planSheetName];
  if (!ws || !ws["!ref"]) {
    return { inserted: 0, updated: 0, unchanged: 0, processed: false, error: `${fileName}: empty sheet` };
  }
  const range = XLSX.utils.decode_range(ws["!ref"]);

  const format = detectSheetFormat(ws, XLSX);
  let personMap: Map<string, PersonData>;

  if (format === "sau046") {
    personMap = processSAU046Sheet(ws, range, XLSX);
  } else {
    const weekCols = getWeekColumns(ws, range, 2, STD_FIRST_WEEK_COL, XLSX);
    if (weekCols.length === 0) {
      return { inserted: 0, updated: 0, unchanged: 0, processed: false, error: `${fileName}: no week columns found` };
    }
    personMap = extractPersonData(ws, range, weekCols, STD_RESOURCE_COL, STD_RATE_COLS, XLSX);
  }

  if (personMap.size === 0) {
    return { inserted: 0, updated: 0, unchanged: 0, processed: true };
  }

  if (!project) {
    const projectName = fileName.replace(/\.(xlsx|xls)$/i, "").replace(/[-_]?\s*Plan\b.*$/i, "").trim() || projectCode;
    const [newProject] = await db("projects").insert({
      project_code: projectCode,
      name: projectName,
      status: "active",
      contract_type: "time_materials",
    }).returning("*");
    if (newProject) {
      project = newProject;
      projectByCode.set(projectCode.toUpperCase(), newProject);
      console.log(`[SharePoint] Job Plans: auto-created project ${projectCode} ("${projectName}")`);
    }
  }
  if (!project) {
    return { inserted: 0, updated: 0, unchanged: 0, processed: false };
  }

  const existingPlans = await db("resource_plans").where("project_id", project.id).select("*");
  const existingKey = new Map<string, any>();
  for (const ep of existingPlans) {
    const monthStr = typeof ep.month === "string" ? ep.month.substring(0, 10) : new Date(ep.month).toISOString().substring(0, 10);
    existingKey.set(`${ep.employee_id}|${monthStr}`, ep);
  }

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const [name, data] of personMap) {
    if (Object.keys(data.weeklyAllocs).length === 0) continue;

    const emp = employeeLookup.findEmployee(name);
    if (!emp) {
      console.log(`[SharePoint] Job Plans: unmatched employee "${name}" in ${fileName}`);
      continue;
    }

    const monthGroups = new Map<string, Record<string, number>>();
    for (const [weekKey, pct] of Object.entries(data.weeklyAllocs)) {
      const d = new Date(weekKey + "T00:00:00Z");
      const monthKey = jpDateToMonth(d);
      if (!monthGroups.has(monthKey)) monthGroups.set(monthKey, {});
      monthGroups.get(monthKey)![weekKey] = pct;
    }

    for (const [monthKey, weekAllocs] of monthGroups) {
      const totalH = Object.values(weekAllocs).reduce((s, pct) => s + (pct / 100) * STANDARD_WEEKLY_HOURS, 0);
      const totalDays = totalH / 8;
      const activeWeeks = Object.values(weekAllocs).filter((v) => v > 0);
      const avgPct = activeWeeks.length > 0 ? activeWeeks.reduce((s, v) => s + v, 0) / activeWeeks.length : 0;

      const key = `${emp.id}|${monthKey}`;
      const existing = existingKey.get(key);

      const weeklyAllocsJson = JSON.stringify(weekAllocs);
      const planData = {
        planned_days: totalDays.toFixed(1),
        planned_hours: totalH.toFixed(1),
        allocation_percent: avgPct.toFixed(2),
        weekly_allocations: weeklyAllocsJson,
        charge_out_rate: data.rates.chargeOutRate,
        discount_percent: data.rates.discountPercent,
        discounted_hourly_rate: data.rates.discountedHourlyRate,
        discounted_daily_rate: data.rates.discountedDailyRate,
        hourly_gross_cost: data.rates.hourlyGrossCost,
      };

      if (existing) {
        const existingWeekly = typeof existing.weekly_allocations === "string" ? existing.weekly_allocations : JSON.stringify(existing.weekly_allocations || {});
        const dataMatch = (
          Math.abs(Number(existing.planned_days || 0) - totalDays) < 0.05 &&
          Math.abs(Number(existing.planned_hours || 0) - totalH) < 0.05 &&
          Number(existing.charge_out_rate || 0) === (data.rates.chargeOutRate || 0) &&
          Number(existing.discount_percent || 0) === (data.rates.discountPercent || 0) &&
          Number(existing.discounted_hourly_rate || 0) === (data.rates.discountedHourlyRate || 0) &&
          Number(existing.discounted_daily_rate || 0) === (data.rates.discountedDailyRate || 0) &&
          Number(existing.hourly_gross_cost || 0) === (data.rates.hourlyGrossCost || 0) &&
          existingWeekly === weeklyAllocsJson
        );
        if (dataMatch) {
          unchanged++;
        } else {
          await db("resource_plans").where("id", existing.id).update(planData);
          existingKey.set(key, { ...existing, ...planData, id: existing.id });
          updated++;
        }
      } else {
        const [newRow] = await db("resource_plans").insert({
          project_id: project.id,
          employee_id: emp.id,
          month: monthKey,
          ...planData,
        }).returning("id");
        existingKey.set(key, { id: newRow?.id || 0, employee_id: emp.id, month: monthKey, ...planData });
        inserted++;
      }
    }
  }

  console.log(`[SharePoint] Job Plans: ${projectCode} sheet="${planSheetName}" fmt=${format} ${personMap.size} people, ${inserted} new, ${updated} upd, ${unchanged} unchg`);
  return { inserted, updated, unchanged, processed: true };
}

async function processJobPlanFile(
  file: { name: string; downloadUrl: string; id: string },
  token: SharePointToken,
  projectByCode: Map<string, any>,
  employeeLookup: { findEmployee: (name: string) => { id: number } | null },
): Promise<{ inserted: number; updated: number; unchanged: number; processed: boolean; error?: string }> {
  const buffer = await downloadExcelFile(file.downloadUrl, token);
  return parseAndProcessJobPlanFile(buffer, file.name, projectByCode, employeeLookup);
}

export async function syncSharePointJobPlans(): Promise<{
  imported: number;
  updated: number;
  removed: number;
  unchanged: number;
  errors: string[];
  message: string;
}> {
  const token = await getGraphToken();
  const domain = process.env.SHAREPOINT_DOMAIN;
  if (!domain) throw new Error("Missing SHAREPOINT_DOMAIN env var");

  const deliverySitePath = "/sites/RGDelivery";
  const siteId = await lookupSharePointSite(token, domain, deliverySitePath);

  const folderPath = "General/00.Mgmt/Job Plans/01.Active plans";
  const files = await fetchDriveFolderFiles(token, siteId, folderPath);
  console.log(`[SharePoint] Job Plans: Found ${files.length} Excel files in ${folderPath}`);

  const errors: string[] = [];
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalUnchanged = 0;
  let filesProcessed = 0;

  const allProjects = await db("projects").select("id", "project_code", "name");
  const projectByCode = new Map<string, any>();
  for (const p of allProjects) {
    if (p.project_code) projectByCode.set(p.project_code.toUpperCase(), p);
  }

  const employeeLookup = await buildEmployeeLookup();

  for (const file of files) {
    try {
      const result = await processJobPlanFile(file, token, projectByCode, employeeLookup);
      totalInserted += result.inserted;
      totalUpdated += result.updated;
      totalUnchanged += result.unchanged;
      if (result.processed) filesProcessed++;
      if (result.error) errors.push(result.error);
    } catch (err: any) {
      errors.push(`"${file.name}": ${err.message}`);
    }
  }

  const parts = [];
  if (totalInserted > 0) parts.push(`${totalInserted} plans added`);
  if (totalUpdated > 0) parts.push(`${totalUpdated} updated`);
  if (totalUnchanged > 0) parts.push(`${totalUnchanged} unchanged`);
  parts.push(`${filesProcessed} files processed`);
  if (errors.length > 0) parts.push(`${errors.length} errors`);

  try {
    const contractValues = await db("resource_plans")
      .select("project_id")
      .sum({ totalValue: db.raw("COALESCE(CAST(discounted_hourly_rate AS FLOAT), 0) * COALESCE(CAST(planned_hours AS FLOAT), 0)") })
      .groupBy("project_id");

    let contractUpdated = 0;
    for (const cv of contractValues) {
      const val = parseFloat(cv.totalValue || 0);
      if (val > 0) {
        await db("projects").where("id", cv.project_id).update({ contract_value: val.toFixed(2) });
        contractUpdated++;
      }
    }
    if (contractUpdated > 0) {
      parts.push(`${contractUpdated} project contract values updated`);
      console.log(`[SharePoint] Job Plans: updated contract_value on ${contractUpdated} projects`);
    }
  } catch (cvErr: any) {
    console.log(`[SharePoint] Job Plans: contract value calc error: ${cvErr.message}`);
  }

  console.log(`[SharePoint] Job Plans sync complete: ${parts.join(", ")}`);
  if (errors.length > 0) {
    console.log(`[SharePoint] Job Plans first 5 errors: ${errors.slice(0, 5).join(" | ")}`);
  }

  return {
    imported: totalInserted,
    updated: totalUpdated,
    removed: 0,
    unchanged: totalUnchanged,
    errors,
    message: `Job Plans sync: ${parts.join(", ")}.`,
  };
}
