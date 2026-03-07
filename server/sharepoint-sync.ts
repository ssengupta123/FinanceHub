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
  const encodedPath = folderPath.split("/").map(seg => encodeURIComponent(seg)).join("/");
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodedPath}:/children?$select=name,folder&$top=999`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!resp.ok) return [];
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
  console.log(`[SharePoint] Fetching list items${contentTypeName ? ` (ContentType: ${contentTypeName})` : ""}...`);

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
    out[k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = v;
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
  const { listId } = await findSharePointList(token, siteId, config.listName);

  const folderPath = config.folderPath;
  const allItems = await fetchFolderChildren(token, siteId, folderPath);

  const { staged, errors } = stageSharePointItems(allItems);
  console.log(`[SharePoint] Staged ${staged.length} items from ${allItems.length} total (${errors.length} errors)`);
  if (errors.length > 0) {
    console.log(`[SharePoint] First 5 errors: ${errors.slice(0, 5).join(" | ")}`);
  }

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

    for (const [spId, row] of existingBySpId) {
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

  const parts = [];
  if (inserted > 0) parts.push(`${inserted} added`);
  if (updated > 0) parts.push(`${updated} updated`);
  if (removed > 0) parts.push(`${removed} removed`);
  if (unchanged > 0) parts.push(`${unchanged} unchanged`);
  if (errors.length > 0) parts.push(`${errors.length} errors`);

  console.log(`[SharePoint] Delta sync complete: ${parts.join(", ")}`);

  return {
    imported: inserted,
    updated,
    removed,
    unchanged,
    errors,
    message: `SharePoint sync: ${parts.join(", ")}.`,
  };
}

function parseProjectCode(folderName: string): { projectCode: string; projectName: string } | null {
  const match = folderName.match(/^([A-Z]{2,6}\d{2,4})\s+(.+)$/i);
  if (!match) return null;
  return { projectCode: match[1].toUpperCase(), projectName: match[2].trim() };
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

  const folderCandidates = [
    "General/2. Inflight Engagements",
    "General/2.Inflight Engagements",
    "General/2. Inflight",
    "General/2.Inflight",
  ];

  let allItems: SharePointListItem[] = [];
  let usedPath = "";
  for (const candidate of folderCandidates) {
    try {
      allItems = await fetchFolderChildren(token, siteId, candidate);
      usedPath = candidate;
      break;
    } catch (err: any) {
      if (err.message?.includes("404")) {
        console.log(`[SharePoint] Inflight: folder "${candidate}" not found, trying next...`);
        continue;
      }
      throw err;
    }
  }

  if (!usedPath) {
    try {
      const generalChildren = await listFolderNames(token, siteId, "General");
      const inflightFolder = generalChildren.find((name) => /inflight/i.test(name));
      if (inflightFolder) {
        console.log(`[SharePoint] Inflight: discovered folder "${inflightFolder}" in General/`);
        allItems = await fetchFolderChildren(token, siteId, `General/${inflightFolder}`);
        usedPath = `General/${inflightFolder}`;
      } else {
        throw new Error(`Inflight folder not found. General/ contains: ${generalChildren.join(", ")}`);
      }
    } catch (discoverErr: any) {
      throw new Error(`Could not find Inflight Engagements folder. ${discoverErr.message}`);
    }
  }

  console.log(`[SharePoint] Inflight: Retrieved ${allItems.length} items from ${usedPath}`);

  const staged: { sharepointId: string; projectCode: string; name: string; client: string | null; clientCode: string | null; clientManager: string | null; engagementManager: string | null; vat: string | null; workType: string | null; contractType: string | null; status: string; startDate: string | null; endDate: string | null; contractValue: string | null; opsCommentary: string | null }[] = [];
  const errors: string[] = [];

  for (const item of allItems) {
    const folderName = item.Title || item.FileLeafRef || "";
    if (!folderName) continue;

    const parsed = parseProjectCode(folderName);
    if (!parsed) {
      continue;
    }

    const spId = item._sharepointItemId ? String(item._sharepointItemId) : null;
    if (!spId) continue;

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

  console.log(`[SharePoint] Inflight: Staged ${staged.length} projects (${errors.length} errors)`);
  if (errors.length > 0) {
    console.log(`[SharePoint] Inflight first 5 errors: ${errors.slice(0, 5).join(" | ")}`);
  }

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

    for (const [spId, row] of existingBySpId) {
      if (!incomingSpIds.has(spId)) {
        await trx("projects").where("id", row.id).update({ status: "completed", sharepoint_id: null });
        removed++;
      }
    }
  });

  const parts = [];
  if (inserted > 0) parts.push(`${inserted} added`);
  if (updated > 0) parts.push(`${updated} updated`);
  if (removed > 0) parts.push(`${removed} archived`);
  if (unchanged > 0) parts.push(`${unchanged} unchanged`);
  if (errors.length > 0) parts.push(`${errors.length} errors`);

  console.log(`[SharePoint] Inflight sync complete: ${parts.join(", ")}`);

  return {
    imported: inserted,
    updated,
    removed,
    unchanged,
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

async function parseJobPlanExcel(buffer: Buffer, fileName: string): Promise<{
  projectCode: string;
  rows: { employeeName: string; month: string; plannedDays: number; plannedHours: number; allocationPercent: number }[];
  error?: string;
}> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "buffer" });

  const projectMatch = fileName.match(/^([A-Z]{2,6}\d{2,4})/i);
  const projectCode = projectMatch ? projectMatch[1].toUpperCase() : fileName.replace(/\.(xlsx|xls)$/i, "");

  const rows: { employeeName: string; month: string; plannedDays: number; plannedHours: number; allocationPercent: number }[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    if (data.length < 2) continue;

    const headers = data[0];
    if (!headers || headers.length < 2) continue;

    let nameCol = -1;
    let monthCols: { col: number; month: string }[] = [];

    for (let c = 0; c < headers.length; c++) {
      const h = String(headers[c] || "").trim().toLowerCase();
      if (h === "resource" || h === "name" || h === "employee" || h === "staff" || h === "team member" || h === "consultant") {
        nameCol = c;
      }
    }

    if (nameCol === -1) {
      nameCol = 0;
    }

    for (let c = 0; c < headers.length; c++) {
      if (c === nameCol) continue;
      const h = headers[c];
      if (h == null) continue;

      let monthStr: string | null = null;

      if (typeof h === "number" && h > 40000 && h < 60000) {
        const jsDate = new Date((h - 25569) * 86400 * 1000);
        if (!isNaN(jsDate.getTime())) {
          monthStr = `${jsDate.getUTCFullYear()}-${String(jsDate.getUTCMonth() + 1).padStart(2, "0")}-01`;
        }
      } else {
        const hStr = String(h).trim();
        const monthMatch = hStr.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/]*(\d{2,4})$/i);
        if (monthMatch) {
          const monthNames: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
          const m = monthNames[monthMatch[1].toLowerCase().substring(0, 3)];
          let y = monthMatch[2];
          if (y.length === 2) y = `20${y}`;
          if (m) monthStr = `${y}-${m}-01`;
        }
        if (!monthStr) {
          const isoMatch = hStr.match(/^(\d{4})[-\/](\d{1,2})/);
          if (isoMatch) {
            monthStr = `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, "0")}-01`;
          }
        }
      }

      if (monthStr) {
        monthCols.push({ col: c, month: monthStr });
      }
    }

    if (monthCols.length === 0) continue;

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (!row) continue;

      const name = String(row[nameCol] || "").trim();
      if (!name || name.toLowerCase() === "total" || name.toLowerCase() === "totals" || name.toLowerCase() === "grand total") continue;

      for (const mc of monthCols) {
        const val = row[mc.col];
        if (val == null || val === "" || val === 0) continue;

        const numVal = Number(val);
        if (isNaN(numVal) || numVal === 0) continue;

        const isPercent = numVal > 0 && numVal <= 1.5;
        const days = isPercent ? Math.round(numVal * 20 * 10) / 10 : numVal;
        const hours = days * 8;
        const allocPercent = isPercent ? Math.round(numVal * 100) : Math.min(Math.round((days / 20) * 100), 100);

        rows.push({
          employeeName: name,
          month: mc.month,
          plannedDays: Math.round(days * 10) / 10,
          plannedHours: Math.round(hours * 10) / 10,
          allocationPercent: allocPercent,
        });
      }
    }

    if (rows.length > 0) break;
  }

  return { projectCode, rows };
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
    projectByCode.set(p.project_code?.toUpperCase(), p);
  }

  const allEmployees = await db("employees").select("id", "name");
  const employeeByName = new Map<string, any>();
  for (const e of allEmployees) {
    const normalised = e.name?.toLowerCase().trim();
    if (normalised) employeeByName.set(normalised, e);
    const parts = normalised?.split(/\s+/);
    if (parts && parts.length >= 2) {
      employeeByName.set(`${parts[parts.length - 1]}, ${parts[0]}`, e);
    }
  }

  function findEmployee(name: string): any | null {
    const n = name.toLowerCase().trim();
    if (employeeByName.has(n)) return employeeByName.get(n);

    const reversed = n.split(/,\s*/).reverse().join(" ").trim();
    if (employeeByName.has(reversed)) return employeeByName.get(reversed);

    for (const [key, emp] of employeeByName) {
      if (key.includes(n) || n.includes(key)) return emp;
    }
    return null;
  }

  const processedProjectIds = new Set<number>();

  for (const file of files) {
    try {
      const buffer = await downloadExcelFile(file.downloadUrl, token);
      const { projectCode, rows } = await parseJobPlanExcel(buffer, file.name);

      const project = projectByCode.get(projectCode.toUpperCase());
      if (!project) {
        if (rows.length > 0) {
          errors.push(`"${file.name}": project ${projectCode} not found in DB`);
        }
        continue;
      }

      processedProjectIds.add(project.id);
      filesProcessed++;

      if (rows.length === 0) {
        continue;
      }

      const existingPlans = await db("resource_plans").where("project_id", project.id).select("*");
      const existingKey = new Map<string, any>();
      for (const ep of existingPlans) {
        const monthStr = typeof ep.month === "string" ? ep.month.substring(0, 10) : new Date(ep.month).toISOString().substring(0, 10);
        existingKey.set(`${ep.employee_id}|${monthStr}`, ep);
      }

      const processedKeys = new Set<string>();

      for (const row of rows) {
        const emp = findEmployee(row.employeeName);
        if (!emp) {
          continue;
        }

        const key = `${emp.id}|${row.month}`;
        processedKeys.add(key);

        const existing = existingKey.get(key);
        if (existing) {
          const daysMatch = Math.abs(Number(existing.planned_days || 0) - row.plannedDays) < 0.05;
          const hoursMatch = Math.abs(Number(existing.planned_hours || 0) - row.plannedHours) < 0.05;
          if (daysMatch && hoursMatch) {
            totalUnchanged++;
          } else {
            await db("resource_plans").where("id", existing.id).update({
              planned_days: row.plannedDays,
              planned_hours: row.plannedHours,
              allocation_percent: row.allocationPercent,
            });
            totalUpdated++;
          }
        } else {
          await db("resource_plans").insert({
            project_id: project.id,
            employee_id: emp.id,
            month: row.month,
            planned_days: row.plannedDays,
            planned_hours: row.plannedHours,
            allocation_percent: row.allocationPercent,
          });
          totalInserted++;
        }
      }
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
