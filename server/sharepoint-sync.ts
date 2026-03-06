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

export function extractItemFields(item: SharePointListItem): Record<string, any> {
  return {
    workType: item.Work_x0020_Type || item.WorkType || item.OppWorkType || null,
    status: item.RAGStatus || item.OppStatus || null,
    comment: item.Comment || item.Comments || item.OppComment || null,
    casLead: item.CAS_x0020_Lead || item.CASLead || null,
    csdLead: cleanMultiValueField(item.CSD_x0020_Lead || item.CSDLead || null),
    category: cleanMultiValueField(item.Category || item.OppCategory || null),
    partner: cleanMultiValueField(item.Partner || item.OppPartner || null),
    clientContact: item.Client_x0020_Contact || item.ClientContact || null,
    clientCode: item.Client_x0020_Code || item.ClientCode || null,
    vat: cleanVat(item.VAT || item.VATCategory || item.VAT_x0020_Category || null),
    dueDate: parseSharePointDate(item.Due || item.DueDate || item.OppDueDate),
    startDate: parseSharePointDate(item.Start_x0020_Date || item.StartDate || item.OppStartDate),
    expiryDate: parseSharePointDate(item.Expiry_x0020_Date || item.ExpiryDate || item.OppExpiryDate),
  };
}

export function transformSharePointItem(item: SharePointListItem): { record?: any; error?: string } {
  const name = item.Title || item.FileLeafRef || "";
  if (!name) return {};

  const phaseRaw = item.Status || item.Phase || item.OppPhase || "";
  const classification = PHASE_MAP[phaseRaw] || null;

  const isOpenOpp = item.ContentType === "Open Opps Content Type" || item.ContentType === "Panel Content Type";
  const isFolder = item.FSObjType === "1" || item.ContentType === "Folder" || item.ItemType === "Folder";
  if (!isOpenOpp && item.FSObjType !== undefined && !isFolder) return {};

  const sharepointId = item._sharepointItemId ? String(item._sharepointItemId) : null;

  try {
    const value = formatNumericField(item.Value_x0020__x0024__x0020_est_ ?? item["Value $ est."] ?? item.Value ?? item.OppValue ?? item.TotalValue, 2);
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

async function discoverListContentTypes(token: SharePointToken, siteId: string, listId: string): Promise<void> {
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/contentTypes`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (resp.ok) {
    const data = await resp.json();
    const types = (data.value || []).map((ct: any) => `"${ct.name}" (id: ${ct.id})`);
    console.log(`[SharePoint] Content types on list: ${types.join(", ")}`);
  }
}

async function discoverListColumns(token: SharePointToken, siteId: string, listId: string): Promise<void> {
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/columns`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (resp.ok) {
    const data = await resp.json();
    const cols = (data.value || []);
    console.log(`[SharePoint] === FULL COLUMN LIST (${cols.length} columns) ===`);
    const BATCH = 10;
    for (let i = 0; i < cols.length; i += BATCH) {
      const batch = cols.slice(i, i + BATCH).map((c: any) => `${c.displayName} [${c.name}]`);
      console.log(`[SharePoint] Columns ${i + 1}-${Math.min(i + BATCH, cols.length)}: ${batch.join(" | ")}`);
    }
    console.log(`[SharePoint] === END COLUMN LIST ===`);
  }
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

  const contentTypes = new Map<string, number>();
  for (const item of allItems) {
    const ct = item.ContentType || "(none)";
    contentTypes.set(ct, (contentTypes.get(ct) || 0) + 1);
  }
  console.log(`[SharePoint] Content type breakdown: ${[...contentTypes.entries()].map(([k, v]) => `${k}: ${v}`).join(", ")}`);

  const statusValues = new Map<string, number>();
  for (const item of allItems) {
    const s = item.Status || "(empty)";
    statusValues.set(s, (statusValues.get(s) || 0) + 1);
  }
  console.log(`[SharePoint] Status (Phase) value breakdown: ${[...statusValues.entries()].map(([k, v]) => `"${k}": ${v}`).join(", ")}`);

  const itemWithStatus = allItems.find((i) => i.Status && i.Status !== "(empty)");
  if (itemWithStatus) {
    console.log(`[SharePoint] Sample item WITH Status: ${JSON.stringify(itemWithStatus).substring(0, 1000)}`);
  } else {
    console.log(`[SharePoint] WARNING: No items have a Status field value`);
  }

  if (allItems.length > 0) {
    const fieldCounts = new Map<string, number>();
    for (const item of allItems) {
      for (const key of Object.keys(item)) {
        if (item[key] != null && item[key] !== "" && !key.startsWith("@") && !key.startsWith("_")) {
          fieldCounts.set(key, (fieldCounts.get(key) || 0) + 1);
        }
      }
    }
    const relevantFields = [...fieldCounts.entries()]
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => `${name}(${count})`);
    console.log(`[SharePoint] Fields with values (name(count)): ${relevantFields.join(", ")}`);

    const sample = allItems.find((i) => {
      const keys = Object.keys(i).filter((k) => !k.startsWith("@") && !k.startsWith("_"));
      return keys.length > 15;
    }) || allItems[0];
    console.log(`[SharePoint] Richest sample item fields: ${Object.keys(sample).join(", ")}`);
    console.log(`[SharePoint] Richest sample item values: ${JSON.stringify(sample).substring(0, 1000)}`);
  }

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

  await discoverListColumns(token, siteId, listId);

  const contentType = process.env.SHAREPOINT_CONTENT_TYPE || "Open Opps Content Type";
  const allItems = await fetchListItemsFiltered(token, siteId, listId, contentType);

  const folderPath = config.folderPath;
  const filteredItems = allItems.filter((item) => {
    const reqField = item.RequiredField || item.FileRef || "";
    return reqField.includes(folderPath);
  });
  console.log(`[SharePoint] Filtered to ${filteredItems.length} items in folder "${folderPath}" (from ${allItems.length} total)`);

  if (filteredItems.length > 0) {
    const sampleItem = filteredItems.find((i) => i.Title && i.Title !== folderPath.split("/").pop()) || filteredItems[0];
    const keys = Object.keys(sampleItem).filter((k) => !k.startsWith("_") && !k.startsWith("@"));
    console.log(`[SharePoint] === SAMPLE OPEN OPP ITEM (all fields) ===`);
    const BATCH = 5;
    for (let i = 0; i < keys.length; i += BATCH) {
      const entries = keys.slice(i, i + BATCH).map((k) => {
        const v = sampleItem[k];
        const val = v === null || v === undefined ? "(null)" : typeof v === "object" ? JSON.stringify(v) : String(v);
        return `${k}=${val.substring(0, 100)}`;
      });
      console.log(`[SharePoint] Fields: ${entries.join(" | ")}`);
    }
    console.log(`[SharePoint] === END SAMPLE ===`);
  }

  const { staged, errors } = stageSharePointItems(filteredItems);

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
