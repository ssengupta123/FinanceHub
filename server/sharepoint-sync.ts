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
    workType: item.WorkType || item.OppWorkType || null,
    status: item.Status || item.OppStatus || item.RAGStatus || null,
    comment: item.Comment || item.Comments || item.OppComment || null,
    casLead: item.CASLead || item.CAS_x0020_Lead || null,
    csdLead: cleanMultiValueField(item.CSDLead || item.CSD_x0020_Lead || null),
    category: cleanMultiValueField(item.Category || item.OppCategory || null),
    partner: cleanMultiValueField(item.Partner || item.OppPartner || null),
    clientContact: item.ClientContact || item.Client_x0020_Contact || null,
    clientCode: item.ClientCode || item.Client_x0020_Code || null,
    vat: cleanVat(item.VAT || item.VATCategory || null),
    dueDate: parseSharePointDate(item.DueDate || item.OppDueDate),
    startDate: parseSharePointDate(item.StartDate || item.OppStartDate),
    expiryDate: parseSharePointDate(item.ExpiryDate || item.OppExpiryDate),
  };
}

export function transformSharePointItem(item: SharePointListItem): { record?: any; error?: string } {
  const name = item.Title || item.FileLeafRef || "";
  if (!name) return {};

  const phaseRaw = item.Phase || item.OppPhase || "";
  const classification = PHASE_MAP[phaseRaw];
  if (!classification) return {};

  const isFolder = item.FSObjType === "1" || item.ContentType === "Folder" || item.ItemType === "Folder";
  if (item.FSObjType !== undefined && !isFolder) return {};

  const sharepointId = item._sharepointItemId ? String(item._sharepointItemId) : null;

  try {
    const value = formatNumericField(item.Value ?? item.OppValue ?? item.TotalValue, 2);
    const marginPercent = formatNumericField(item.Margin ?? item.MarginPercent ?? item.OppMargin, 3);
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

export function getSharePointConfig(): { domain: string; sitePath: string; listName: string } {
  const domain = process.env.SHAREPOINT_DOMAIN;
  const sitePath = process.env.SHAREPOINT_SITE_PATH;
  const listName = process.env.SHAREPOINT_LIST_NAME || "Open Opps";

  if (!domain || !sitePath) {
    throw new Error(
      "Missing SharePoint config. Set SHAREPOINT_DOMAIN (e.g. yourcompany.sharepoint.com) and SHAREPOINT_SITE_PATH (e.g. /sites/Finance)."
    );
  }

  return { domain, sitePath: sitePath.startsWith("/") ? sitePath : `/${sitePath}`, listName };
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

async function fetchAllSharePointItems(token: SharePointToken, siteId: string, listId: string): Promise<SharePointListItem[]> {
  const allItems: SharePointListItem[] = [];
  let nextUrl: string | null =
    `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=999`;

  while (nextUrl) {
    const resp: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error(`[SharePoint] API error (HTTP ${resp.status}) for URL: ${nextUrl}`);
      console.error(`[SharePoint] Response body: ${errBody.substring(0, 500)}`);
      throw new Error(`SharePoint API error (HTTP ${resp.status}). Check SharePoint domain, site path, and list name configuration.`);
    }

    const data: any = await resp.json();
    const items = (data.value || []).map((item: any) => {
      const fields = item.fields || {};
      fields._sharepointItemId = item.id || fields.id;
      return fields;
    });
    allItems.push(...items);

    nextUrl = data["@odata.nextLink"] || null;
  }
  console.log(`[SharePoint] Retrieved ${allItems.length} items from list`);
  if (allItems.length > 0) {
    const sample = allItems[0];
    console.log(`[SharePoint] Sample item fields: ${Object.keys(sample).join(", ")}`);
    console.log(`[SharePoint] Sample item values: ${JSON.stringify(sample).substring(0, 500)}`);
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
  const allItems = await fetchAllSharePointItems(token, siteId, listId);
  const { staged, errors } = stageSharePointItems(allItems);

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
