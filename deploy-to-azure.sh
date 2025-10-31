#!/bin/bash

# Azure Container Apps Deployment Script
# Deploys the Knowledge Graph chatbot to Azure Container Apps

set -e

# Configuration
RESOURCE_GROUP="kg-free-rg"
LOCATION="eastus"
ACR_NAME="kgchatbotacr"
CONTAINER_APP_NAME="kg-chatbot-backend"
CONTAINER_APP_ENV="kg-chatbot-env"
IMAGE_NAME="kg-backend"
IMAGE_TAG="latest"

echo "🚀 Starting Azure Container Apps deployment..."

# Check if logged in to Azure
echo "📋 Checking Azure login..."
az account show > /dev/null 2>&1 || {
    echo "❌ Not logged in to Azure. Please run 'az login' first."
    exit 1
}

# Create resource group if it doesn't exist
echo "📦 Ensuring resource group exists..."
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION \
    --output none

# Create Azure Container Registry
echo "🏗️  Creating Azure Container Registry..."
az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $ACR_NAME \
    --sku Basic \
    --admin-enabled true \
    --output none || echo "ACR already exists, continuing..."

# Get ACR credentials
echo "🔑 Getting ACR credentials..."
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query "passwords[0].value" -o tsv)
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query loginServer -o tsv)

# Build and push Docker image
echo "🐳 Building Docker image..."
docker build -t $IMAGE_NAME:$IMAGE_TAG .

echo "📤 Tagging and pushing to ACR..."
docker tag $IMAGE_NAME:$IMAGE_TAG $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG
az acr login --name $ACR_NAME
docker push $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG

# Create Container Apps environment
echo "🌍 Creating Container Apps environment..."
az containerapp env create \
    --name $CONTAINER_APP_ENV \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --output none || echo "Environment already exists, continuing..."

# Read OpenAI API key from .env
OPENAI_API_KEY=$(grep OPENAI_API_KEY .env | cut -d '=' -f2)

# Deploy Container App
echo "🚢 Deploying Container App..."
az containerapp create \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment $CONTAINER_APP_ENV \
    --image $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG \
    --target-port 8000 \
    --ingress external \
    --registry-server $ACR_LOGIN_SERVER \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --cpu 0.5 \
    --memory 1.0Gi \
    --min-replicas 0 \
    --max-replicas 1 \
    --env-vars "OPENAI_API_KEY=$OPENAI_API_KEY" \
    --output none || {
        echo "App exists, updating..."
        az containerapp update \
            --name $CONTAINER_APP_NAME \
            --resource-group $RESOURCE_GROUP \
            --image $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG \
            --set-env-vars "OPENAI_API_KEY=$OPENAI_API_KEY" \
            --output none
    }

# Get the app URL
BACKEND_URL=$(az containerapp show \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query properties.configuration.ingress.fqdn -o tsv)

echo ""
echo "✅ Deployment complete!"
echo "🌐 Backend URL: https://$BACKEND_URL"
echo ""
echo "Next steps:"
echo "1. Update frontend WebSocket URL to: wss://$BACKEND_URL"
echo "2. Test the backend: https://$BACKEND_URL/docs"
echo ""
