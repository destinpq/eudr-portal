# EUDR Pulp Portal - Azure Deployment Guide

## 🎯 Quick Start

Follow these steps to deploy your EUDR Pulp Portal to your own Azure environment using **Azure Table Storage + Blob Storage**.

### Prerequisites
- Azure subscription with appropriate permissions
- Azure CLI installed and configured
- Node.js 18+ installed locally

---

## 🚀 Automated Setup

### Option 1: Run the Setup Script (Recommended)

```bash
# Make the script executable (if not already)
chmod +x setup-azure.sh

# Run the setup script
./setup-azure.sh
```

This script will:
- ✅ Create Azure Resource Group
- ✅ Create Storage Account with Blob and Table storage
- ✅ Set up all required tables (Users, Documents, CompanyDocuments, DDSSubmissions)
- ✅ Generate connection strings
- ✅ Create `.env.azure` configuration file

### Option 2: Manual Setup

Follow the detailed instructions in `AZURE_SETUP_GUIDE.md`

---

## 🔧 Configuration Updates

### 1. Backend Configuration

After running the setup script:

```bash
# Copy the generated environment file
cp .env.azure backend/.env

# Test the backend locally
cd backend
npm install
npm start
```

### 2. Frontend Configuration

Update your React app to point to your Azure backend:

#### For Local Development:
Create `pulp-portal/.env.local`:
```env
REACT_APP_API_URL=http://localhost:18001
```

#### For Production Deployment:
Create `pulp-portal/.env.production`:
```env
REACT_APP_API_URL=https://your-backend-app.azurewebsites.net
```

### 3. Update API Configuration

The frontend automatically uses `REACT_APP_API_URL` from your environment variables. No code changes needed!

---

## 🌐 Deployment to Azure App Service

### Deploy Backend:

```bash
# Login to Azure
az login

# Deploy backend
az webapp up \
    --name "app-eudr-backend-$(date +%s)" \
    --resource-group "rg-eudr-pulp-portal" \
    --location "East US" \
    --runtime "NODE|18-lts" \
    --src-path "./backend"
```

### Deploy Frontend:

```bash
# Build React app for production
cd pulp-portal
npm run build

# Deploy frontend
az webapp up \
    --name "app-eudr-frontend-$(date +%s)" \
    --resource-group "rg-eudr-pulp-portal" \
    --location "East US" \
    --runtime "NODE|18-lts" \
    --src-path "./build"
```

---

## 🔐 Environment Variables for App Service

Set these in your Azure App Service configuration:

### Backend App Service:
```bash
az webapp config appsettings set \
    --name "your-backend-app-name" \
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
        FRONTEND_URL="https://your-frontend-app.azurewebsites.net"
```

### Frontend App Service:
```bash
az webapp config appsettings set \
    --name "your-frontend-app-name" \
    --resource-group "rg-eudr-pulp-portal" \
    --settings \
        REACT_APP_API_URL="https://your-backend-app.azurewebsites.net"
```

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Node.js API   │    │ Azure Storage   │
│  (Frontend UI)  │───▶│   (Backend)     │───▶│ Tables + Blobs  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Storage Components:**
- **Azure Table Storage**: User accounts, document metadata, submissions
- **Azure Blob Storage**: Uploaded files (PDFs, documents, GeoJSON files)

---

## 📊 Cost Estimation

### Development Environment (~$15-25/month):
- Storage Account: Standard LRS (~$2-5)
- App Service: B1 Basic (~$13)

### Production Environment (~$30-50/month):
- Storage Account: Standard GRS (~$5-10)
- App Service: S1 Standard (~$25-40)

---

## 🔍 Testing Your Deployment

### 1. Test Backend API:
```bash
curl https://your-backend-app.azurewebsites.net/health
```

### 2. Test Frontend:
Visit `https://your-frontend-app.azurewebsites.net`

### 3. Test File Upload:
1. Register/Login to your app
2. Try uploading documents and GeoJSON files
3. Check Azure Storage for the uploaded files

### 4. Test Table Storage:
```bash
# List tables in your storage account
az storage table list --account-name "your-storage-account"

# Check table contents (example)
az storage entity query \
    --table-name "Users" \
    --account-name "your-storage-account"
```

---

## 🚨 Troubleshooting

### Common Issues:

1. **CORS Errors**:
   ```bash
   az webapp cors add \
       --name "your-backend-app" \
       --resource-group "rg-eudr-pulp-portal" \
       --allowed-origins "https://your-frontend-app.azurewebsites.net"
   ```

2. **Storage Connection Issues**:
   - Verify storage account connection string is correct
   - Ensure storage account has proper access keys
   - Check table names match environment variables

3. **File Upload Fails**:
   - Check blob container permissions
   - Verify storage account access keys
   - Ensure container exists

4. **Table Storage Errors**:
   - Verify table names are correct
   - Check partitionKey/rowKey format
   - Ensure tables exist in storage account

5. **App Won't Start**:
   ```bash
   # Check logs
   az webapp log tail --name "your-app-name" --resource-group "rg-eudr-pulp-portal"
   ```

### Debug Commands:
```bash
# Test storage account
az storage account show \
    --name "your-storage-account" \
    --resource-group "rg-eudr-pulp-portal"

# List all tables
az storage table list --account-name "your-storage-account"

# List blob containers
az storage container list --account-name "your-storage-account"

# Check table entities (example)
az storage entity query \
    --table-name "Users" \
    --account-name "your-storage-account" \
    --select PartitionKey,RowKey,username
```

---

## 🎉 Success Checklist

- [ ] Azure resources created successfully
- [ ] Storage account accessible
- [ ] All tables created (Users, PulpDocuments, CompanyDocuments, DDSSubmissions)
- [ ] Blob container created and accessible
- [ ] Backend API responding on Azure
- [ ] Frontend deployed and accessible
- [ ] File uploads working to blob storage
- [ ] Data saving to table storage
- [ ] Authentication functioning
- [ ] CORS configured properly
- [ ] HTTPS enabled
- [ ] Custom domain configured (optional)
- [ ] Monitoring and alerts set up

---

## 🔄 CI/CD Setup (Optional)

Consider setting up automated deployments with GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Azure
on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd backend && npm ci
      - name: Deploy to Azure
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'your-backend-app'
          publish-profile: ${{ secrets.AZURE_BACKEND_PUBLISH_PROFILE }}
          package: './backend'

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install and build
        run: cd pulp-portal && npm ci && npm run build
      - name: Deploy to Azure
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'your-frontend-app'
          publish-profile: ${{ secrets.AZURE_FRONTEND_PUBLISH_PROFILE }}
          package: './pulp-portal/build'
```

---

## 📈 Monitoring and Scaling

### Set up Application Insights:
```bash
# Create Application Insights
az monitor app-insights component create \
    --app "eudr-insights" \
    --location "East US" \
    --resource-group "rg-eudr-pulp-portal"

# Add to backend app
az webapp config appsettings set \
    --name "your-backend-app" \
    --resource-group "rg-eudr-pulp-portal" \
    --settings APPINSIGHTS_INSTRUMENTATIONKEY="your-insights-key"
```

### Configure Auto-scaling:
```bash
# Create auto-scaling rules for production
az monitor autoscale create \
    --resource-group "rg-eudr-pulp-portal" \
    --resource "your-backend-app" \
    --resource-type "Microsoft.Web/serverfarms" \
    --name "eudr-autoscale" \
    --min-count 1 \
    --max-count 5 \
    --count 2
```

---

## 🔒 Security Best Practices

1. **Regenerate JWT Secret**: Use a strong, unique JWT secret for production
2. **Enable HTTPS Only**: Force HTTPS in production
3. **Configure CORS**: Restrict origins to your domain
4. **Storage Access**: Use managed identity where possible
5. **Regular Updates**: Keep dependencies updated

---

## 📝 Next Steps

1. **Custom Domain**: Set up your own domain name
2. **SSL Certificate**: Configure custom SSL certificates
3. **CDN**: Add Azure CDN for better performance
4. **Backup Strategy**: Set up automated backups
5. **Disaster Recovery**: Plan for multi-region deployment

---

## 🆘 Support

For deployment issues:
1. Check Azure Activity Log for resource creation errors
2. Review App Service application logs
3. Validate all environment variables
4. Test storage connectivity separately
5. Contact Azure support for platform issues 