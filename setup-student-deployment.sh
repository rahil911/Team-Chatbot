#!/bin/bash

################################################################################
# Student Deployment Setup Script
# Sets up complete GitHub + Azure Student deployment
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
info() { echo -e "${BLUE}ℹ${NC}  $1"; }

# Configuration
RESOURCE_GROUP="kg-student-20251031184510-rg"
LOCATION="westus2"
SWA_NAME="kg-student-frontend"
CONTAINER_NAME="kg-student-backend"
TUNNEL_CONTAINER="kg-student-tunnel"
GITHUB_USER="rahil911"
GITHUB_REPO="Team-Chatbot"
IMAGE_NAME="kg-backend"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     Student Deployment Setup - Knowledge Graph Chatbot   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Verify Azure Login
info "Verifying Azure Student subscription..."
SUBSCRIPTION=$(az account show --query name -o tsv)
if [[ "$SUBSCRIPTION" != "Azure for Students" ]]; then
    error "Not logged into Azure Student subscription!"
    error "Current: $SUBSCRIPTION"
    exit 1
fi
log "Logged into: $SUBSCRIPTION"

# Step 2: Check provider registration
info "Checking Microsoft.Web provider..."
PROVIDER_STATE=$(az provider show --namespace Microsoft.Web --query "registrationState" -o tsv)
if [[ "$PROVIDER_STATE" != "Registered" ]]; then
    warn "Provider state: $PROVIDER_STATE"
    info "Waiting for registration to complete..."
    while [[ "$PROVIDER_STATE" != "Registered" ]]; do
        sleep 10
        PROVIDER_STATE=$(az provider show --namespace Microsoft.Web --query "registrationState" -o tsv)
        echo -n "."
    done
    echo ""
fi
log "Microsoft.Web provider: Registered"

# Step 3: Create Static Web App
info "Creating Azure Static Web App..."
if az staticwebapp show --name "$SWA_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    log "Static Web App already exists"
else
    az staticwebapp create \
        --name "$SWA_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "eastus2" \
        --sku "Free" || {
        error "Failed to create Static Web App"
        exit 1
    }
    log "Static Web App created"
fi

# Step 4: Get Static Web App token
info "Retrieving Static Web App deployment token..."
SWA_TOKEN=$(az staticwebapp secrets list \
    --name "$SWA_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "properties.apiKey" -o tsv)
log "Deployment token retrieved"

# Step 5: Get Static Web App URL
SWA_URL=$(az staticwebapp show \
    --name "$SWA_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "defaultHostname" -o tsv)
SWA_URL="https://${SWA_URL}"
log "Frontend URL: $SWA_URL"

# Step 6: Create Service Principal for GitHub Actions
info "Creating service principal for GitHub Actions..."
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SP_NAME="sp-github-student-$(date +%s)"

SP_JSON=$(az ad sp create-for-rbac \
    --name "$SP_NAME" \
    --role Contributor \
    --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
    --sdk-auth)
log "Service principal created"

# Step 7: Build and push Docker image to ghcr.io
info "Building Docker image..."
cd "$(dirname "$0")"

# Login to ghcr.io
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin

# Build image
docker build \
    --platform linux/amd64 \
    -t "ghcr.io/${GITHUB_USER}/${IMAGE_NAME}:latest" \
    -t "ghcr.io/${GITHUB_USER}/${IMAGE_NAME}:$(date +%Y%m%d%H%M%S)" \
    -f Dockerfile .

log "Docker image built"

# Push image
docker push "ghcr.io/${GITHUB_USER}/${IMAGE_NAME}:latest"
log "Docker image pushed to ghcr.io"

# Step 8: Deploy backend container
info "Deploying backend container..."
OPENAI_KEY=$(grep OPENAI_API_KEY .env | cut -d '=' -f2)

az container create \
    --name "$CONTAINER_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --image "ghcr.io/${GITHUB_USER}/${IMAGE_NAME}:latest" \
    --cpu 1 \
    --memory 1 \
    --os-type Linux \
    --ports 8000 \
    --dns-name-label "kg-student-backend" \
    --environment-variables OPENAI_API_KEY="$OPENAI_KEY" \
    --location "$LOCATION" || {
    error "Failed to deploy backend"
    exit 1
}

sleep 10

# Get backend IP
BACKEND_IP=$(az container show \
    --name "$CONTAINER_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "ipAddress.ip" -o tsv)

BACKEND_URL="http://${BACKEND_IP}:8000"
log "Backend deployed: $BACKEND_URL"

# Step 9: Test backend health
info "Testing backend health..."
sleep 5
if curl -sf "$BACKEND_URL/" >/dev/null; then
    log "Backend is healthy!"
    curl -s "$BACKEND_URL/" | jq .
else
    error "Backend health check failed"
    exit 1
fi

# Step 10: Display GitHub Secrets to configure
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              Configure GitHub Secrets                     ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Set these secrets in your GitHub repository:"
echo "  https://github.com/${GITHUB_USER}/${GITHUB_REPO}/settings/secrets/actions"
echo ""
echo "1. AZURE_STUDENT_CREDENTIALS"
echo "$SP_JSON" | jq -c .
echo ""
echo "2. AZURE_STUDENT_STATIC_WEB_APPS_TOKEN"
echo "$SWA_TOKEN"
echo ""
echo "3. STUDENT_BACKEND_URL"
echo "$BACKEND_URL"
echo ""
echo "4. OPENAI_API_KEY"
echo "$OPENAI_KEY"
echo ""

# Step 11: Save configuration
cat > student-deployment-config.json <<EOF
{
  "resource_group": "$RESOURCE_GROUP",
  "location": "$LOCATION",
  "static_web_app": "$SWA_NAME",
  "backend_container": "$CONTAINER_NAME",
  "frontend_url": "$SWA_URL",
  "backend_url": "$BACKEND_URL",
  "backend_ip": "$BACKEND_IP",
  "github_user": "$GITHUB_USER",
  "image": "ghcr.io/${GITHUB_USER}/${IMAGE_NAME}:latest"
}
EOF

log "Configuration saved to student-deployment-config.json"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                  ✅ SETUP COMPLETE!                       ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║  Frontend: $SWA_URL"
echo "║  Backend:  $BACKEND_URL"
echo "║                                                           ║"
echo "║  Next Steps:                                              ║"
echo "║  1. Configure GitHub secrets (see above)                  ║"
echo "║  2. Push code to trigger CI/CD:                           ║"
echo "║     git add .                                             ║"
echo "║     git commit -m '[student] Initial deployment'          ║"
echo "║     git push origin main                                  ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
