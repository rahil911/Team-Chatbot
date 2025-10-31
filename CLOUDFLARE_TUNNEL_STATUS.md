# Cloudflare Tunnel Status

## ✅ DEPLOYMENT COMPLETE

### URLs
- **Frontend (HTTPS)**: https://calm-forest-029210d0f.3.azurestaticapps.net
- **Backend (HTTPS via Cloudflare)**: https://agency-window-atmospheric-pushing.trycloudflare.com
- **Backend (Direct HTTP)**: http://52.147.223.151:8000
- **WebSocket (Secure)**: wss://agency-window-atmospheric-pushing.trycloudflare.com/ws

### Status
- ✅ Cloudflare Tunnel: **RUNNING**
- ✅ Backend: **4 agents, 327 nodes loaded**
- ✅ Frontend: **Deployed with HTTPS backend URL**
- ✅ Mixed Content Issue: **SOLVED** (frontend → backend both HTTPS)
- ✅ WebSocket: **Secure (wss://) ready**

## How It Works

```
User Browser
    ↓ HTTPS
Azure Static Web Apps (Frontend)
    ↓ WSS/HTTPS
Cloudflare Tunnel (HTTPS proxy)
    ↓ HTTP (local)
Azure Container Instance (Backend)
```

## Cloudflare Tunnel Details

**Tunnel Type**: Quick Tunnel (account-less)
**URL**: https://agency-window-atmospheric-pushing.trycloudflare.com
**Target**: http://52.147.223.151:8000
**Process**: Running locally on Mac (PID: check with `ps aux | grep cloudflared`)

⚠️ **IMPORTANT**: This tunnel is running on your local machine. If you:
- Close the terminal
- Restart your Mac
- Stop the `cloudflared` process

...the HTTPS endpoint will go offline and the deployed app will disconnect.

## Making the Tunnel Permanent

### Option 1: Keep Terminal Open (Current Setup)
- Simple, no additional setup
- Tunnel stops when Mac sleeps/restarts
- Good for testing and development

### Option 2: Background Service (Recommended for Production)
Run as a background service that auto-starts:

```bash
# Create named tunnel (requires Cloudflare account)
cloudflared tunnel login
cloudflared tunnel create kg-backend
cloudflared tunnel route dns kg-backend backend.yourdomain.com

# Configure as service
sudo cloudflared service install
sudo launchctl start com.cloudflare.cloudflared
```

### Option 3: Deploy Tunnel in Azure Container
- Run `cloudflared` in a separate Azure Container Instance
- Always available, no local dependency
- Costs: ~$10/month for small container

## Verification

Test all endpoints:

```bash
# Root endpoint
curl https://agency-window-atmospheric-pushing.trycloudflare.com/

# Graph API
curl https://agency-window-atmospheric-pushing.trycloudflare.com/api/graph

# Health check
curl https://agency-window-atmospheric-pushing.trycloudflare.com/ | jq .
```

Expected response:
```json
{
  "service": "AI Team Multi-Agent API",
  "status": "running",
  "agents": 4,
  "nodes": 327
}
```

## CI/CD Pipeline

### Automatic Deployment Triggers

**Frontend Deployment** (Quick Deploy Frontend Only):
- Triggers on: Any push to `frontend/**` or `.env.production`
- Deploys to: Azure Static Web Apps
- Duration: ~1-2 minutes

**Full Deployment** (Deploy to Azure):
- Triggers on: Commit message contains `[backend]` or `[all]`
- Deploys: Backend + Frontend
- Duration: ~3-4 minutes

### Current Workflows
1. `.github/workflows/deploy.yml` - Full backend + frontend deployment
2. `.github/workflows/deploy-all-azure.yml` - Quick frontend-only deployment

## Next Steps

### To Test the Application:
1. Open: https://calm-forest-029210d0f.3.azurestaticapps.net
2. Check status indicator (should show "CONNECTED" instead of "DISCONNECTED")
3. Try loading the knowledge graph
4. Test the chat functionality

### If Tunnel Stops:
```bash
# Restart tunnel
cloudflared tunnel --url http://52.147.223.151:8000
```

### To Update Backend URL:
1. Edit `frontend/.env.production`
2. Commit: `git commit -m "[all] Update backend URL"`
3. Push: `git push origin main`
4. Wait 1-2 minutes for deployment

## Troubleshooting

**"DISCONNECTED" status on frontend:**
- Check if tunnel is running: `ps aux | grep cloudflared`
- Verify tunnel URL: `curl https://agency-window-atmospheric-pushing.trycloudflare.com/`
- Restart tunnel if needed

**WebSocket connection fails:**
- Ensure tunnel is routing correctly
- Check browser console for errors
- Verify CORS settings in `server.py`

**Graph doesn't load:**
- Check backend health: `curl https://agency-window-atmospheric-pushing.trycloudflare.com/api/graph`
- Verify 327 nodes and 429 edges in response
- Clear browser cache and reload

## Security Notes

- ✅ HTTPS everywhere (no mixed content warnings)
- ✅ Secure WebSocket (wss://)
- ✅ CORS properly configured
- ⚠️ Quick tunnel has no uptime guarantee (Cloudflare may change URL)
- 💡 For production, use named tunnel with custom domain

---

**Last Updated**: 2025-10-31 23:23 UTC
**Tunnel URL**: https://agency-window-atmospheric-pushing.trycloudflare.com
**Frontend**: https://calm-forest-029210d0f.3.azurestaticapps.net
