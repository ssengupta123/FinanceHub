# FinanceHub - Azure Deployment Guide

This guide walks you through deploying FinanceHub to your own Azure tenancy using Azure App Service and Azure SQL Database.

---

## Prerequisites

- An Azure subscription with Owner or Contributor access
- Azure CLI installed (optional, for command-line setup)
- The FinanceHub repository pushed to GitHub (already done)

---

## Step 1: Create Azure SQL Database

1. Go to **Azure Portal** > **Create a resource** > **SQL Database**
2. Configure:
   - **Resource Group**: Create new (e.g., `financehub-rg`)
   - **Database name**: `financehub`
   - **Server**: Create new
     - **Server name**: e.g., `financehub-sql` (must be globally unique)
     - **Location**: Choose your preferred region (e.g., `Australia East`)
     - **Authentication**: SQL authentication
     - **Admin login**: Choose a username (e.g., `financehubadmin`)
     - **Password**: Choose a strong password
   - **Compute + storage**: Click "Configure database"
     - For starting out, select **Basic** tier (~$5/month)
     - Scale up later as needed
3. Click **Review + Create** > **Create**
4. After creation, go to the SQL Server resource:
   - Click **Networking** in the left menu
   - Under **Firewall rules**, toggle **Allow Azure services and resources to access this server** to **Yes**
   - Click **Save**

**Note down these values** (you'll need them in Step 3):
- Server name: `financehub-sql.database.windows.net`
- Database name: `financehub`
- Admin username
- Admin password

---

## Step 2: Create Azure App Service

1. Go to **Azure Portal** > **Create a resource** > **Web App**
2. Configure:
   - **Resource Group**: Use the same one (`financehub-rg`)
   - **Name**: e.g., `financehub` (this becomes your URL: `financehub.azurewebsites.net`)
   - **Publish**: Code
   - **Runtime stack**: **Node 22 LTS**
   - **Operating System**: Linux (recommended) or Windows
   - **Region**: Same as your database
   - **Pricing plan**: Select **Basic B1** (~$13/month) to start
3. Click **Review + Create** > **Create**

---

## Step 3: Configure App Service Environment Variables

1. Go to your App Service in the Azure Portal
2. Click **Configuration** (under Settings in the left menu)
3. Under **Application settings**, add these environment variables:

| Name | Value | Description |
|------|-------|-------------|
| `NODE_ENV` | `production` | Tells the app to run in production mode |
| `DB_CLIENT` | `mssql` | Switches from PostgreSQL to Azure SQL |
| `AZURE_SQL_SERVER` | `financehub-sql.database.windows.net` | Your SQL server address |
| `AZURE_SQL_DATABASE` | `financehub` | Your database name |
| `AZURE_SQL_USER` | `financehubadmin` | Your SQL admin username |
| `AZURE_SQL_PASSWORD` | `(your password)` | Your SQL admin password |
| `SESSION_SECRET` | `(generate a random 64-char string)` | Used to sign session cookies |
| `PORT` | `8080` | Azure App Service default port |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~22` | Ensures Node 22 is used |

To generate a random session secret, you can use:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Click **Save** (the app will restart)

---

## Step 4: Set Up Automated Deployment from GitHub

### Option A: GitHub Actions (Recommended)

The repository already includes a GitHub Actions workflow at `.github/workflows/azure-deploy.yml`.

1. In Azure Portal, go to your App Service > **Deployment Center**
2. Click **Manage publish profile** > **Download publish profile**
3. In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**
4. Add a new repository secret:
   - **Name**: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - **Value**: Paste the entire contents of the downloaded publish profile XML file
5. Update the workflow file if your App Service name differs:
   - Open `.github/workflows/azure-deploy.yml`
   - Change `AZURE_WEBAPP_NAME: financehub` to match your actual App Service name
6. Push to the `main` branch - the workflow will automatically build and deploy

### Option B: Azure Deployment Center (Simpler)

1. Go to your App Service > **Deployment Center**
2. Under **Source**, select **GitHub**
3. Authorise Azure to access your GitHub account
4. Select:
   - **Organisation**: Your GitHub username
   - **Repository**: `FinanceHub`
   - **Branch**: `main`
5. Azure will create a GitHub Actions workflow for you automatically
6. Click **Save**

---

## Step 5: Verify Deployment

1. After deployment completes, go to your App Service **Overview** page
2. Click the **URL** (e.g., `https://financehub.azurewebsites.net`)
3. The login page should appear
4. Sign in with the default admin credentials: `admin` / `admin123`
5. **Important**: Change the admin password immediately after first login

### Troubleshooting

If the app doesn't load:
- Check **App Service** > **Log stream** for real-time logs
- Check **Deployment Center** > **Logs** for deployment status
- Verify all environment variables are set correctly in Configuration
- Ensure the database firewall allows Azure services

---

## Step 6: Set Up Azure SSO (Optional)

To enable Single Sign-On with Microsoft Entra ID (Azure AD):

### Register the Application

1. Go to **Microsoft Entra ID** > **App registrations** > **New registration**
2. Configure:
   - **Name**: `FinanceHub`
   - **Supported account types**: Single tenant (your organisation only)
   - **Redirect URI**: Web > `https://financehub.azurewebsites.net/api/auth/azure/callback`
3. Click **Register**
4. Note the **Application (client) ID** and **Directory (tenant) ID**

### Create Client Secret

1. In the app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description (e.g., `FinanceHub Production`) and expiry
4. Copy the **Value** (shown only once)

### Add Environment Variables

Add these to your App Service Configuration:

| Name | Value |
|------|-------|
| `AZURE_CLIENT_ID` | Your Application (client) ID |
| `AZURE_TENANT_ID` | Your Directory (tenant) ID |
| `AZURE_CLIENT_SECRET` | Your client secret value |

Once these are provided, SSO integration can be enabled in the codebase.

---

## Architecture in Azure

```
                    Internet
                       |
              Azure App Service
            (Node 22 LTS, Linux)
            financehub.azurewebsites.net
                       |
          +------------+------------+
          |                         |
    Express API              Vite Static
   (server/routes)          (client build)
          |
    Azure SQL Database
   (financehub-sql.database.windows.net)
```

---

## Cost Estimate (Monthly)

| Resource | Tier | Estimated Cost (AUD) |
|----------|------|---------------------|
| App Service | Basic B1 | ~$20 |
| SQL Database | Basic (5 DTU) | ~$8 |
| Entra ID (SSO) | Free tier | $0 |
| **Total** | | **~$28/month** |

Costs are approximate and may vary by region. Scale up the App Service and database tiers as your team and usage grows.

---

## Scaling Recommendations

### For Small Teams (1-10 users)
- App Service: Basic B1
- SQL Database: Basic (5 DTU)

### For Medium Teams (10-50 users)
- App Service: Standard S1
- SQL Database: Standard S2 (50 DTU)

### For Large Teams (50+ users)
- App Service: Premium P1v2
- SQL Database: Standard S3 or Premium P1

---

## Backup and Recovery

### Database Backups
Azure SQL automatically creates backups:
- **Point-in-time restore**: Available for the last 7-35 days (depending on tier)
- Go to your SQL Database > **Restore** to recover to a specific point in time

### Application Code
- All code is version-controlled in GitHub
- Redeploy any version by rolling back the commit and pushing

---

## Security Checklist

- [ ] Change default admin password after first login
- [ ] Set a strong `SESSION_SECRET` (64+ random characters)
- [ ] Enable HTTPS Only in App Service (Settings > Configuration > General > HTTPS Only: On)
- [ ] Configure Azure SQL firewall rules to restrict access
- [ ] Set up Azure SSO to eliminate password-based login
- [ ] Enable App Service authentication logging
- [ ] Review and restrict network access as needed
- [ ] Set client secret expiry reminders in your calendar
