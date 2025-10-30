# Quick Setup Guide for Azure Deployment

This guide will help you complete the deployment setup in just a few steps.

## ✅ What's Already Done

1. ✓ Azure Service Principal created
2. ✓ GitHub Actions workflows configured
3. ✓ Azure deployment files ready
4. ✓ Frontend configured for Azure URLs

## 🚀 Quick Start (3 Steps)

### Step 1: Set Up GitHub Secrets

You need to add two secrets to your GitHub repository:

#### Option A: Using GitHub Web Interface (Recommended)

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click **"New repository secret"**
3. Add these two secrets:

**Secret 1: AZURE_CREDENTIALS**
- Name: `AZURE_CREDENTIALS`
- Value: _(Your Azure credentials - already configured)_
```json
{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "subscriptionId": "YOUR_SUBSCRIPTION_ID",
  "tenantId": "YOUR_TENANT_ID"
}
```
✅ **Already configured in your repository!**

**Secret 2: OPENAI_API_KEY**
- Name: `OPENAI_API_KEY`
- Value: `your-openai-api-key-here` (replace with your actual key)

#### Option B: Using GitHub CLI

If you have GitHub CLI installed:

```bash
# Run the automated setup script
./GITHUB_SECRETS_SETUP.sh
```

### Step 2: Initialize Your Git Repository (if not already done)

```bash
# Initialize git (if needed)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit with Azure CI/CD setup"

# Add your GitHub remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to main branch
git branch -M main
git push -u origin main
```

### Step 3: Deploy! 🎉

Once you push to the `main` branch, GitHub Actions will automatically:

1. Build your backend (Python FastAPI)
2. Build your frontend (React + Vite)
3. Deploy backend to Azure App Service
4. Deploy frontend to Azure Static Web Apps

**Monitor deployment progress:**
- Go to your GitHub repository
- Click on the "Actions" tab
- Watch the workflows run

## 🌐 Your Deployed URLs

After deployment completes (usually 5-10 minutes):

- **Backend API**: https://kg-backend-app.azurewebsites.net
- **Frontend**: https://kg-frontend-app.azurestaticapps.net (URL will be shown in deployment logs)

## 🔍 Verify Deployment

### Check Backend
```bash
curl https://kg-backend-app.azurewebsites.net/api/health
```

### Check Frontend
Open in browser: https://kg-frontend-app.azurestaticapps.net

## 📝 Environment Variables

The deployment already configures:
- ✓ `OPENAI_API_KEY` (from GitHub secrets)
- ✓ Python runtime (3.9)
- ✓ Build settings

## 🛠️ Manual Deployment Trigger

To manually deploy without pushing code:

1. Go to GitHub → Actions tab
2. Select workflow: "Deploy Backend to Azure" or "Deploy Frontend to Azure"
3. Click "Run workflow"
4. Select branch: `main`
5. Click "Run workflow"

## 📊 Monitor Your Application

### View Backend Logs
```bash
az webapp log tail --name kg-backend-app --resource-group kg-rg
```

### View All Resources
```bash
az resource list --resource-group kg-rg --output table
```

## 💰 Cost Estimate

Current configuration:
- App Service B1: ~$13/month
- Static Web App: Free tier ($0/month)

**Total: ~$13/month**

## 🔧 Troubleshooting

### "Deployment failed" in GitHub Actions
- Check the Actions tab for detailed error logs
- Verify secrets are set correctly
- Ensure you have Azure quota available

### Backend not starting
```bash
# Check logs
az webapp log tail --name kg-backend-app --resource-group kg-rg

# Restart the app
az webapp restart --name kg-backend-app --resource-group kg-rg
```

### Frontend connection issues
- Verify backend is running
- Check CORS settings in `server.py`
- Check browser console for errors

## 🗑️ Cleanup (Delete Everything)

If you want to remove all Azure resources:

```bash
# Delete resource group (removes all resources)
az group delete --name kg-rg --yes

# Revoke service principal
az ad sp delete --id e8dfcef6-04dc-43f9-8d72-de1d9d2d430a
```

## 📚 Additional Resources

- Full deployment documentation: `DEPLOYMENT.md`
- Azure Portal: https://portal.azure.com
- GitHub Actions: https://github.com/YOUR_USERNAME/YOUR_REPO/actions

## ⚠️ Security Notes

1. **Keep credentials secure** - Never commit secrets to git
2. **Rotate secrets regularly** - Change service principal secret periodically
3. **Monitor usage** - Check Azure costs regularly
4. **Use .env files locally** - Copy `.env.example` to `.env` for local development

## 🎯 Next Steps

After successful deployment:

1. ✓ Test your application at the Azure URLs
2. Configure custom domain (optional)
3. Set up Application Insights for monitoring (optional)
4. Configure auto-scaling (optional)

---

**Need Help?**
- Check `DEPLOYMENT.md` for detailed documentation
- Review GitHub Actions logs for deployment errors
- Check Azure Portal for resource status

Good luck! 🚀

