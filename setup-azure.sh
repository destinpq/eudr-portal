#!/bin/bash

# EUDR Pulp Portal - Azure Setup Script (Table Storage + Blob Storage Only)
# This script automates the creation of Azure resources

set -e  # Exit on any error

echo "🚀 Starting EUDR Pulp Portal Azure Setup..."

# Configuration
RESOURCE_GROUP="rg-eudr-pulp-portal"
LOCATION="East US"
STORAGE_ACCOUNT_NAME="eudrpulp$(date +%s | tail -c 6)"  # Add timestamp for uniqueness (max 24 chars)

echo "📋 Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Storage Account: $STORAGE_ACCOUNT_NAME"

# Step 1: Login and create resource group
echo "🔐 Checking Azure login status..."
if ! az account show &>/dev/null; then
    echo "Please login to Azure first:"
    az login
fi

echo "📦 Creating resource group..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

# Step 2: Create Storage Account
echo "💾 Creating Storage Account..."
az storage account create \
    --name "$STORAGE_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2

# Step 3: Create Blob Container and Tables
echo "📁 Creating blob container and tables..."
az storage container create \
    --name "pulp-files" \
    --account-name "$STORAGE_ACCOUNT_NAME" \
    --public-access off

az storage table create \
    --name "Users" \
    --account-name "$STORAGE_ACCOUNT_NAME"

az storage table create \
    --name "PulpDocuments" \
    --account-name "$STORAGE_ACCOUNT_NAME"

az storage table create \
    --name "CompanyDocuments" \
    --account-name "$STORAGE_ACCOUNT_NAME"

az storage table create \
    --name "DDSSubmissions" \
    --account-name "$STORAGE_ACCOUNT_NAME"

# Step 4: Get connection string
echo "🔗 Retrieving connection string..."

echo "Getting Storage Account connection string..."
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
    --name "$STORAGE_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "connectionString" \
    --output tsv)

# Step 5: Create .env file
echo "📄 Creating .env file..."
cat > .env.azure << EOF
# Generated Azure Configuration for EUDR Pulp Portal
# Generated on: $(date)
# Using Azure Table Storage + Blob Storage Only

# Server Configuration
PORT=18001
JWT_SECRET=your-super-secure-jwt-secret-$(openssl rand -hex 16)
NODE_ENV=development

# Azure Storage Configuration
AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION_STRING
AZURE_TABLE_USERS=Users
AZURE_TABLE_DOCUMENTS=PulpDocuments
AZURE_TABLE_COMPANY_DOCS=CompanyDocuments
AZURE_BLOB_CONTAINER=pulp-files

# CORS Configuration
FRONTEND_URL=http://localhost:3000
EOF

echo "✅ Azure setup completed successfully!"
echo ""
echo "📋 Summary:"
echo "  ✅ Resource Group: $RESOURCE_GROUP"
echo "  ✅ Storage Account: $STORAGE_ACCOUNT_NAME"
echo "  ✅ Tables: Users, PulpDocuments, CompanyDocuments, DDSSubmissions"
echo "  ✅ Blob Container: pulp-files"
echo "  ✅ Storage Type: Azure Table Storage + Blob Storage"
echo ""
echo "🔧 Next Steps:"
echo "  1. Copy .env.azure to backend/.env"
echo "  2. Test the configuration locally"
echo "  3. Deploy to Azure App Service (optional)"
echo ""
echo "💡 Commands to run:"
echo "  cp .env.azure backend/.env"
echo "  cd backend && npm install && npm start"
echo ""
echo "🌐 Azure Portal URLs:"
echo "  Resource Group: https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP"
echo "  Storage Account: https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT_NAME"

echo ""
echo "🎉 Setup completed! Your EUDR Pulp Portal is ready for deployment with Azure Table Storage + Blob Storage." 