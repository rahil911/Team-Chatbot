#!/bin/bash
# Script to set up GitHub secrets for Azure deployment
# Prerequisites: GitHub CLI (gh) must be installed and authenticated

set -e

echo "=========================================="
echo "GitHub Secrets Setup for Azure Deployment"
echo "=========================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI."
    echo "Run: gh auth login"
    exit 1
fi

echo "Setting up GitHub secrets..."
echo ""

# Set AZURE_CREDENTIALS secret
echo "1. Setting AZURE_CREDENTIALS..."
echo "Please enter your Azure Client ID:"
read CLIENT_ID
echo "Please enter your Azure Client Secret:"
read -s CLIENT_SECRET
echo "Please enter your Azure Subscription ID:"
read SUBSCRIPTION_ID
echo "Please enter your Azure Tenant ID:"
read TENANT_ID

gh secret set AZURE_CREDENTIALS --body "{
  \"clientId\": \"$CLIENT_ID\",
  \"clientSecret\": \"$CLIENT_SECRET\",
  \"subscriptionId\": \"$SUBSCRIPTION_ID\",
  \"tenantId\": \"$TENANT_ID\"
}"
echo "✓ AZURE_CREDENTIALS set"

# Set OPENAI_API_KEY secret
echo ""
echo "2. Setting OPENAI_API_KEY..."
echo "Please enter your OpenAI API key:"
read -s OPENAI_KEY

if [ -z "$OPENAI_KEY" ]; then
    echo "Warning: OPENAI_API_KEY not provided. You'll need to set it manually."
else
    gh secret set OPENAI_API_KEY --body "$OPENAI_KEY"
    echo "✓ OPENAI_API_KEY set"
fi

echo ""
echo "=========================================="
echo "GitHub Secrets Setup Complete!"
echo "=========================================="
echo ""
echo "Secrets configured:"
echo "  ✓ AZURE_CREDENTIALS"
echo "  ✓ OPENAI_API_KEY"
echo ""
echo "You can now push to main branch to trigger deployment."
echo ""
echo "To verify secrets were set:"
echo "  gh secret list"
echo ""

