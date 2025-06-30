# EUDR Pulp Portal - Azure Setup Guide

## 🏗️ Azure Architecture Overview

Your EUDR Pulp Portal application uses the following Azure resources:
- **Azure Table Storage** - Structured data storage for users, documents, and submissions
- **Azure Blob Storage** - File storage for documents and GeoJSON files
- **Azure App Service** - Web hosting (optional)

---

## 📋 Prerequisites

1. **Azure Subscription** - Active Azure account
2. **Azure CLI** - Install from [here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
3. **Resource Group** - We'll create one for this project

---

## 🚀 Step-by-Step Setup

### Step 1: Login to Azure and Create Resource Group

```bash
# Login to Azure
az login

# Create a resource group
az group create --name "rg-eudr-pulp-portal" --location "East US"
```

### Step 2: Create Azure Storage Account

```bash
# Create storage account
az storage account create \
  --name "eudrpulpstorage" \
  --resource-group "rg-eudr-pulp-portal" \
  --location "East US" \
  --sku Standard_LRS \
  --kind StorageV2

# Create blob container
az storage container create \
  --name "pulp-files" \
  --account-name "eudrpulpstorage" \
  --public-access off

# Create tables
az storage table create \
  --name "Users" \
  --account-name "eudrpulpstorage"

az storage table create \
  --name "PulpDocuments" \
  --account-name "eudrpulpstorage"

az storage table create \
  --name "CompanyDocuments" \
  --account-name "eudrpulpstorage"

az storage table create \
  --name "DDSSubmissions" \
  --account-name "eudrpulpstorage"
```

### Step 3: Get Connection String

```bash
# Get Storage Account connection string
az storage account show-connection-string \
  --name "eudrpulpstorage" \
  --resource-group "rg-eudr-pulp-portal" \
  --query "connectionString" \
  --output tsv
```

---

## ⚙️ Environment Configuration

Create your `.env` file with the connection string from Step 3:

```env
# Server Configuration
PORT=18001
JWT_SECRET=your-super-secure-jwt-secret-change-this
NODE_ENV=development

# Azure Storage Configuration
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=eudrpulpstorage;AccountKey=<YOUR_STORAGE_KEY>;EndpointSuffix=core.windows.net
AZURE_TABLE_USERS=Users
AZURE_TABLE_DOCUMENTS=PulpDocuments
AZURE_TABLE_COMPANY_DOCS=CompanyDocuments
AZURE_BLOB_CONTAINER=pulp-files

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

---

## 🌐 Deployment Options

### Option 1: Azure App Service (Recommended)

#### Deploy Backend:
```bash
# Create App Service Plan
az appservice plan create \
  --name "plan-eudr-backend" \
  --resource-group "rg-eudr-pulp-portal" \
  --sku B1 \
  --is-linux

# Create Web App for Backend
az webapp create \
  --name "app-eudr-backend" \
  --resource-group "rg-eudr-pulp-portal" \
  --plan "plan-eudr-backend" \
  --runtime "NODE|18-lts"

# Deploy from local folder
az webapp up \
  --name "app-eudr-backend" \
  --resource-group "rg-eudr-pulp-portal" \
  --location "East US" \
  --runtime "NODE|18-lts" \
  --src-path "./backend"
```

#### Deploy Frontend:
```bash
# Build the React app
cd pulp-portal
npm run build

# Create Web App for Frontend
az webapp create \
  --name "app-eudr-frontend" \
  --resource-group "rg-eudr-pulp-portal" \
  --plan "plan-eudr-backend" \
  --runtime "NODE|18-lts"

# Deploy the built React app
az webapp up \
  --name "app-eudr-frontend" \
  --resource-group "rg-eudr-pulp-portal" \
  --location "East US" \
  --runtime "NODE|18-lts" \
  --src-path "./pulp-portal/build"
```

### Option 2: Static Web Apps (For Frontend)

```bash
# Alternative: Deploy React app as Static Web App
az staticwebapp create \
  --name "eudr-frontend" \
  --resource-group "rg-eudr-pulp-portal" \
  --source "https://github.com/yourusername/eudr-portal" \
  --location "Central US" \
  --branch "main" \
  --app-location "/pulp-portal" \
  --api-location "/backend" \
  --output-location "build"
```

---

## 🔐 Environment Variables for App Service

Set these in your Azure App Service configuration:

### Backend App Service:
```bash
az webapp config appsettings set \
  --name "app-eudr-backend" \
  --resource-group "rg-eudr-pulp-portal" \
  --settings \
    PORT="18001" \
    JWT_SECRET="your-secure-jwt-secret" \
    NODE_ENV="production" \
    AZURE_STORAGE_CONNECTION_STRING="your-storage-connection-string" \
    AZURE_TABLE_USERS="Users" \
    AZURE_TABLE_DOCUMENTS="PulpDocuments" \
    AZURE_TABLE_COMPANY_DOCS="CompanyDocuments" \
    AZURE_BLOB_CONTAINER="pulp-files" \
    FRONTEND_URL="https://app-eudr-frontend.azurewebsites.net"
```

### Frontend App Service:
```bash
az webapp config appsettings set \
  --name "app-eudr-frontend" \
  --resource-group "rg-eudr-pulp-portal" \
  --settings \
    REACT_APP_API_URL="https://app-eudr-backend.azurewebsites.net"
```

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Node.js API   │    │ Azure Storage   │
│  (Frontend UI)  │───▶│   (Backend)     │───▶│ Tables + Blobs  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Data Storage Strategy:**
- **Azure Table Storage**: User accounts, document metadata, submissions
- **Azure Blob Storage**: Uploaded files (PDFs, GeoJSON, images)

---

## 💰 Cost Optimization

### Recommended Pricing Tiers:
- **Storage Account**: Standard LRS (Locally Redundant Storage)
- **App Service**: B1 Basic for development, S1 Standard for production

### Estimated Monthly Costs:
- **Development Environment (~$15-25/month)**:
  - Storage Account: ~$2-5
  - App Service B1: ~$13
- **Production Environment (~$30-50/month)**:
  - Storage Account: ~$5-10
  - App Service S1: ~$25-40

### Cost Management:
```bash
# Set up budget alerts
az consumption budget create \
  --resource-group "rg-eudr-pulp-portal" \
  --budget-name "eudr-budget" \
  --amount 50 \
  --category Cost \
  --time-grain Monthly
```

---

## 🔧 Troubleshooting

### Common Issues:
1. **Storage Connection**: Ensure connection string includes account key
2. **CORS Errors**: Configure allowed origins in App Service
3. **File Upload Limits**: Increase blob storage limits if needed
4. **Table Storage**: Ensure proper partitionKey/rowKey format

### Debug Commands:
```bash
# Check App Service logs
az webapp log tail --name "app-eudr-backend" --resource-group "rg-eudr-pulp-portal"

# Test storage account
az storage account check-name --name "eudrpulpstorage"

# List tables
az storage table list --account-name "eudrpulpstorage"

# List blobs
az storage blob list --container-name "pulp-files" --account-name "eudrpulpstorage"
```

---

## 📊 Monitoring and Performance

### Application Insights Setup:
```bash
# Create Application Insights
az monitor app-insights component create \
  --app "eudr-insights" \
  --location "East US" \
  --resource-group "rg-eudr-pulp-portal"

# Configure backend to use Application Insights
az webapp config appsettings set \
  --name "app-eudr-backend" \
  --resource-group "rg-eudr-pulp-portal" \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="<instrumentation-key>"
```

---

## 📝 Next Steps

1. **Update Frontend API URLs**: Point your React app to the deployed backend
2. **Configure Custom Domain**: Set up your own domain name
3. **Enable HTTPS**: Configure SSL certificates (automatic with App Service)
4. **Set up CI/CD**: Use GitHub Actions or Azure DevOps
5. **Configure Backup**: Set up automated backups for Table Storage

---

## 🆘 Support

For issues with this setup:
1. Check Azure Activity Log for deployment errors
2. Review App Service logs for runtime errors  
3. Validate connection strings and environment variables
4. Test Azure Storage services individually 