# Cloudflare Tunnel Setup for HTTPS Backend

## Problem
The frontend is deployed on Azure Static Web Apps with HTTPS, but the backend is on Azure Container Instances with HTTP only. Browsers block mixed content (HTTPS frontend calling HTTP backend WebSocket).

## Solution
Use Cloudflare Tunnel to provide a free HTTPS endpoint for the HTTP backend.

## Prerequisites
- Cloudflare account (free tier works)
- Backend running on Azure Container Instances at http://52.147.223.151:8000

## Setup Steps

### 1. Install Cloudflare Tunnel (cloudflared)

**On macOS:**
```bash
brew install cloudflare/cloudflare/cloudflared
```

**On Linux:**
```bash
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

**On Windows:**
Download from: https://github.com/cloudflare/cloudflared/releases

### 2. Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser to authorize the tunnel.

### 3. Create a Tunnel

```bash
cloudflared tunnel create kg-backend
```

Note the **Tunnel ID** from the output (looks like: `abc123-def456-ghi789`)

### 4. Create Configuration File

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: kg-backend
credentials-file: /Users/YOUR_USERNAME/.cloudflared/abc123-def456-ghi789.json

ingress:
  # Route traffic to backend
  - hostname: kg-backend.yourdomain.com
    service: http://52.147.223.151:8000
  # Catch-all rule (required)
  - service: http_status:404
```

Replace:
- `kg-backend.yourdomain.com` with your desired subdomain
- `abc123-def456-ghi789.json` with your tunnel credentials file
- `YOUR_USERNAME` with your actual username

### 5. Set Up DNS

```bash
cloudflared tunnel route dns kg-backend kg-backend.yourdomain.com
```

This creates a CNAME record in Cloudflare DNS pointing to the tunnel.

### 6. Run the Tunnel

**For testing:**
```bash
cloudflared tunnel run kg-backend
```

**As a service (recommended):**
```bash
cloudflared service install
```

### 7. Verify HTTPS Endpoint

Test the endpoint:
```bash
curl https://kg-backend.yourdomain.com/api/graph
```

You should see the graph data (756 elements).

### 8. Update Frontend Configuration

Update `/frontend/.env.production`:
```bash
VITE_API_URL=https://kg-backend.yourdomain.com
```

### 9. Redeploy Frontend

```bash
cd frontend
npm run build
# Deploy to Azure Static Web Apps (happens via GitHub Actions)
```

## Alternative: Use Cloudflare Quick Tunnels (Temporary)

For quick testing without domain setup:

```bash
cloudflared tunnel --url http://52.147.223.151:8000
```

This gives you a temporary `*.trycloudflare.com` URL (changes each time you run it).

## Tunnel Management Commands

```bash
# List tunnels
cloudflared tunnel list

# Delete tunnel
cloudflared tunnel delete kg-backend

# Check tunnel status
cloudflared tunnel info kg-backend
```

## Production Considerations

1. **Persistent Tunnel**: Run cloudflared as a system service
2. **Custom Domain**: Use your own domain in Cloudflare
3. **Access Control**: Configure Cloudflare Access for authentication
4. **Monitoring**: Set up Cloudflare dashboard alerts

## Cost
- Cloudflare Tunnel: **FREE**
- Cloudflare DNS: **FREE**
- Azure Container Instance: Already running

## Security Notes

- Cloudflare Tunnel creates an outbound connection from your backend to Cloudflare
- No need to open firewall ports or expose the backend directly
- All traffic is encrypted via TLS
- Cloudflare provides DDoS protection automatically

## Troubleshooting

**Tunnel won't connect:**
- Check that backend is running: `curl http://52.147.223.151:8000/health`
- Verify credentials file path in config.yml
- Check cloudflared logs: `journalctl -u cloudflared -f`

**DNS not resolving:**
- Wait 1-2 minutes for DNS propagation
- Verify CNAME record in Cloudflare dashboard
- Try with full domain: `nslookup kg-backend.yourdomain.com`

**WebSocket not working:**
- Cloudflare automatically upgrades WebSocket connections
- Ensure WebSocket route (`/ws`) is accessible via HTTP backend
- Check browser console for WebSocket connection errors

## Next Steps

After setting up Cloudflare Tunnel:

1. Update `.env.production` with HTTPS URL
2. Update GitHub secrets if needed
3. Redeploy frontend via GitHub Actions
4. Test the full application
5. Consider deleting the old HTTP-only setup documentation

---

**Need Help?**
- Cloudflare Docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- Azure Support: https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade
