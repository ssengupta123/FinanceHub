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

function extractFieldText(val: any): string | null {
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

async function fetchFolderChildren(token: SharePointToken, siteId: string, folderPath: string): Promise<SharePointListItem[]> {
  const allItems: SharePointListItem[] = [];
  const encodedPath = encodeURIComponent(folderPath).replace(/%2F/g, "/");
  let nextUrl: string | null = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodedPath}:/children?$expand=listItem($expand=fields)&$top=999`;
  console.log(`[SharePoint] Fetching folder children: ${folderPath}`);

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
