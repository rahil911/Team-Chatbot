# Azure Deployment Guide

This guide explains how to deploy the Knowledge Graph Multi-Agent System to Azure using GitHub Actions CI/CD.

## Prerequisites

1. Azure account with active subscription
2. GitHub repository for this project
3. Azure CLI installed and authenticated (`az login`)

## Azure Resources Created

The deployment creates the following Azure resources:

1. **Resource Group**: `kg-rg`
2. **Backend (App Service)**:
   - Name: `kg-backend-app`
   - Plan: `kg-backend-plan` (B1 tier)
   - Runtime: Python 3.9
   - URL: https://kg-backend-app.azurewebsites.net

3. **Frontend (Static Web App)**:
   - Name: `kg-frontend-app`
   - SKU: Free
   - Location: East US 2

## Service Principal Credentials

Your Azure Service Principal has been created. The credentials have been stored securely in GitHub Secrets.

⚠️ **IMPORTANT**: Keep these credentials secure. They provide full access to your Azure subscription.

## Setting Up GitHub Secrets

You need to add the following secrets to your GitHub repository:

### Method 1: Using GitHub Web UI

1. Go to your GitHub repository
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of the following:

#### Required Secrets:

1. **AZURE_CREDENTIALS**
   ```json
   {
     "clientId": "YOUR_CLIENT_ID",
     "clientSecret": "YOUR_CLIENT_SECRET",
     "subscriptionId": "YOUR_SUBSCRIPTION_ID",
     "tenantId": "YOUR_TENANT_ID"
   }
   ```
   _(Note: Your actual credentials have already been set up in GitHub Secrets)_

2. **OPENAI_API_KEY**
   ```
   sk-your-openai-api-key-here
   ```

### Method 2: Using GitHub CLI

If you have GitHub CLI installed:

```bash
# Set AZURE_CREDENTIALS
gh secret set AZURE_CREDENTIALS --body '{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "subscriptionId": "YOUR_SUBSCRIPTION_ID",
  "tenantId": "YOUR_TENANT_ID"
}'

# Set OPENAI_API_KEY
gh secret set OPENAI_API_KEY --body "your-openai-api-key-here"
```
_(Note: Your secrets have already been configured)_

## Deployment Workflows

Three GitHub Actions workflows have been created:

### 1. CI Pipeline (`.github/workflows/ci.yml`)
- Runs on pull requests and non-main branch pushes
- Tests both backend and frontend
- Ensures code quality before deployment

### 2. Backend Deployment (`.github/workflows/deploy-backend.yml`)
- Triggers on pushes to `main` branch when Python files change
- Deploys to Azure App Service
- Configures environment variables

### 3. Frontend Deployment (`.github/workflows/deploy-frontend.yml`)
- Triggers on pushes to `main` branch when frontend files change
- Builds React app with Vite
- Deploys to Azure Static Web Apps

## Manual Deployment

To manually trigger a deployment:

1. Go to GitHub Actions tab in your repository
2. Select the workflow you want to run
3. Click "Run workflow" → Select branch `main` → "Run workflow"

## Updating CORS Settings

After deployment, update the CORS settings in `server.py` to include your Azure URLs:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://<your-static-web-app-url>.azurestaticapps.net"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Monitoring and Logs

### Backend Logs
```bash
az webapp log tail --name kg-backend-app --resource-group kg-rg
```

### View Application Insights
```bash
az webapp log show --name kg-backend-app --resource-group kg-rg
```

### Frontend Logs
Access logs from Azure Portal:
1. Go to Static Web Apps
2. Select `kg-frontend-app`
3. View logs in the left menu

## Environment Variables

Backend environment variables are set in the deployment workflow:
- `OPENAI_API_KEY`: Your OpenAI API key
- `SCM_DO_BUILD_DURING_DEPLOYMENT`: Enable build on deployment
- `ENABLE_ORYX_BUILD`: Enable Oryx build system

To add more environment variables:

```bash
az webapp config appsettings set \
  --name kg-backend-app \
  --resource-group kg-rg \
  --settings KEY=VALUE
```

## Cost Optimization

Current configuration uses:
- **App Service B1**: ~$13/month
- **Static Web App Free**: $0/month

To reduce costs, you can:
1. Use App Service Free tier (F1) for development
2. Stop resources when not in use:
   ```bash
   az webapp stop --name kg-backend-app --resource-group kg-rg
   ```

## Troubleshooting

### Backend won't start
- Check logs: `az webapp log tail --name kg-backend-app --resource-group kg-rg`
- Verify Python version matches runtime
- Ensure all dependencies in `requirements.txt`

### Frontend deployment fails
- Check build output in GitHub Actions
- Verify Node.js version compatibility
- Check for build errors in `npm run build`

### API connection issues
- Verify CORS settings include frontend URL
- Check backend logs for errors
- Ensure WebSocket connections are enabled

## Cleanup

To delete all Azure resources:

```bash
az group delete --name kg-rg --yes --no-wait
```

To revoke service principal:

```bash
az ad sp delete --id YOUR_SERVICE_PRINCIPAL_ID
```

## Next Steps

1. Add GitHub secrets (see above)
2. Push to `main` branch to trigger deployment
3. Monitor GitHub Actions for deployment progress
4. Test deployed application
5. Configure custom domain (optional)

## Support

For issues:
1. Check GitHub Actions logs
2. Review Azure Portal logs
3. Check this documentation

---

**Last Updated**: October 30, 2025

