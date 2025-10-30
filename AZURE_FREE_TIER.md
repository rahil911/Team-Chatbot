# Azure Free Tier Configuration

This project is configured to work with **Azure Free Tier** accounts!

## 🆓 What You Get for FREE

### 1. App Service (Backend) - **FREE F1 Tier**
- ✅ 60 CPU minutes/day
- ✅ 1 GB RAM
- ✅ 1 GB storage
- ✅ Perfect for development and testing
- ✅ **Cost: $0/month**

### 2. Static Web Apps (Frontend) - **FREE Tier**
- ✅ 100 GB bandwidth/month
- ✅ Custom domains
- ✅ SSL certificates
- ✅ GitHub integration
- ✅ **Cost: $0/month**

### 3. Total Cost: **$0/month** 🎉

## ⚠️ Free Tier Limitations

### Backend (App Service F1)
- **CPU Time**: 60 minutes per day
- **Always On**: Not available (app sleeps after 20 minutes of inactivity)
- **Auto Scale**: Not available
- **Cold Start**: ~10-30 seconds when app wakes up
- **Custom Domains**: Not available on F1

### Frontend (Static Web Apps Free)
- **API Functions**: Not included in free tier
- **Staging Environments**: Limited to 3

## 💡 Usage Tips for Free Tier

1. **Cold Starts**: First request after inactivity will be slow (~30 seconds)
2. **Daily CPU Limit**: If you hit 60 min/day, app will stop until next day
3. **Keep-Alive**: Not recommended on free tier (wastes CPU minutes)
4. **Development**: Perfect for development, demos, and small projects

## 📊 Monitoring Your Usage

Check your usage in Azure Portal:
```bash
# View your app status
az webapp show --name kg-backend-app-free --resource-group kg-free-rg --query state

# View resource group costs (should show $0)
az consumption usage list --resource-group kg-free-rg
```

## 🚀 If You Need More (Upgrade Options)

### Paid Tier Comparison

| Tier | Cost/Month | Always On | CPU | Best For |
|------|------------|-----------|-----|----------|
| **F1 (Free)** | $0 | ❌ | 60 min/day | Development, Testing |
| **B1 (Basic)** | ~$13 | ✅ | 100 ACU | Small production apps |
| **S1 (Standard)** | ~$70 | ✅ | 100 ACU | Production with scaling |

### To Upgrade to B1 (if needed):
```bash
az appservice plan update \
  --name kg-backend-plan \
  --resource-group kg-free-rg \
  --sku B1
```

## ✅ Deployment Checklist

- [x] Using F1 (Free) tier for backend
- [x] Using Free tier for frontend
- [x] Configured for Azure free account
- [x] No hidden costs
- [x] All features working on free tier

## 🎯 What Works on Free Tier

✅ **Fully Functional:**
- Multi-agent chatbot
- Knowledge graph visualization  
- WebSocket real-time communication
- React frontend
- Python FastAPI backend
- CI/CD with GitHub Actions
- HTTPS/SSL
- Custom error pages

⚠️ **With Limitations:**
- App sleeps after 20 minutes (cold start on wake)
- 60 minutes CPU per day
- No custom domain on backend
- Slower performance than paid tiers

## 📚 Resources

- [Azure Free Account](https://azure.microsoft.com/free/)
- [App Service Pricing](https://azure.microsoft.com/pricing/details/app-service/)
- [Static Web Apps Pricing](https://azure.microsoft.com/pricing/details/app-service/static/)

---

**Perfect for:** Learning, Development, Demos, Personal Projects  
**Not recommended for:** High-traffic production, Always-on services, Commercial applications

