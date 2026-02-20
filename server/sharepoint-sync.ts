import { db } from "./db";
import { storage } from "./storage";

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

async function getSharePointToken(): Promise<SharePointToken> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const sharePointDomain = process.env.SHAREPOINT_DOMAIN || "";

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Missing Azure credentials. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET.");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const scope = sharePointDomain
    ? `https://${sharePointDomain}/.default`
    : "https://graph.microsoft.com/.default";

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope,
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

  console.log(`[SharePoint] Token acquired successfully with scope: ${scope}`);
  return resp.json();
}

function parseSharePointDate(val: string | null | undefined): string | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

function cleanMultiValueField(val: string | null | undefined): string | null {
  if (!val) return null;
  return val.replace(/;#\d+;#/g, "; ").replace(/;#/g, "; ").trim() || null;
}

function cleanVat(val: string | null | undefined): string | null {
  if (!val) return null;
  let vat = val.replace(/;#/g, "").replace(/\|.*$/, "").trim();
  if (vat.toLowerCase() === "growth") vat = "GROWTH";
  return vat || null;
}

export async function syncSharePointOpenOpps(): Promise<{
  imported: number;
  errors: string[];
  message: string;
}> {
  const errors: string[] = [];
  let imported = 0;

  const sharePointDomain = process.env.SHAREPOINT_DOMAIN;
  const sharePointSite = process.env.SHAREPOINT_SITE_PATH;
  const sharePointList = process.env.SHAREPOINT_LIST_NAME || "Open Opps";

  if (!sharePointDomain || !sharePointSite) {
    throw new Error(
      "Missing SharePoint config. Set SHAREPOINT_DOMAIN (e.g. yourcompany.sharepoint.com) and SHAREPOINT_SITE_PATH (e.g. /sites/Finance)."
    );
  }

  const token = await getSharePointToken();

  const listUrl =
    `https://${sharePointDomain}${sharePointSite}/_api/web/lists/getbytitle('${encodeURIComponent(sharePointList)}')/items` +
    `?$top=5000&$select=*`;

  const allItems: SharePointListItem[] = [];
  let nextUrl: string | null = listUrl;

  while (nextUrl) {
    const resp: Response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: "application/json;odata=nometadata",
      },
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error(`[SharePoint] API error (HTTP ${resp.status}) for URL: ${nextUrl}`);
      console.error(`[SharePoint] Response body: ${errBody.substring(0, 500)}`);
      throw new Error(`SharePoint API error (HTTP ${resp.status}). Check SharePoint domain, site path, and list name configuration.`);
    }

    const data: any = await resp.json();
    const items = data.value || [];
    allItems.push(...items);

    nextUrl = data["odata.nextLink"] || data["@odata.nextLink"] || null;
  }

  const staged: any[] = [];
  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];

    const name = item.Title || item.FileLeafRef || "";
    if (!name) continue;

    const phaseRaw = item.Phase || item.OppPhase || "";
    const classification = PHASE_MAP[phaseRaw];
    if (!classification) continue;

    const itemType = item.FSObjType === "1" || item.ContentType === "Folder" || item.ItemType === "Folder";
    if (item.FSObjType !== undefined && !itemType) continue;

    try {
      const rawValue = item.Value ?? item.OppValue ?? item.TotalValue;
      const value = rawValue != null && !isNaN(Number(rawValue))
        ? String(Number(rawValue).toFixed(2))
        : null;

      const rawMargin = item.Margin ?? item.MarginPercent ?? item.OppMargin;
      const marginPercent = rawMargin != null && !isNaN(Number(rawMargin))
        ? String(Number(rawMargin).toFixed(3))
        : null;

      const workType = item.WorkType || item.OppWorkType || null;
      const status = item.Status || item.OppStatus || item.RAGStatus || null;
      const comment = item.Comment || item.Comments || item.OppComment || null;
      const casLead = item.CASLead || item.CAS_x0020_Lead || null;
      const csdLead = cleanMultiValueField(item.CSDLead || item.CSD_x0020_Lead || null);
      const category = cleanMultiValueField(item.Category || item.OppCategory || null);
      const partner = cleanMultiValueField(item.Partner || item.OppPartner || null);
      const clientContact = item.ClientContact || item.Client_x0020_Contact || null;
      const clientCode = item.ClientCode || item.Client_x0020_Code || null;
      const vat = cleanVat(item.VAT || item.VATCategory || null);

      const dueDate = parseSharePointDate(item.DueDate || item.OppDueDate);
      const startDate = parseSharePointDate(item.StartDate || item.OppStartDate);
      const expiryDate = parseSharePointDate(item.ExpiryDate || item.OppExpiryDate);

      staged.push({
        name,
        classification,
        vat,
        fyYear: "open_opps",
        value,
        marginPercent,
        workType,
        status,
        dueDate,
        startDate,
        expiryDate,
        comment,
        casLead,
        csdLead,
        category,
        partner,
        clientContact,
        clientCode,
      });
    } catch (err: any) {
      errors.push(`Item "${name}": ${err.message}`);
    }
  }

  await db.transaction(async (trx) => {
    await trx("pipeline_opportunities").where("fy_year", "open_opps").del();
    for (const record of staged) {
      await trx("pipeline_opportunities").insert(record);
      imported++;
    }
  });

  return {
    imported,
    errors,
    message: `Synced ${imported} opportunities from SharePoint. ${errors.length} errors.`,
  };
}
