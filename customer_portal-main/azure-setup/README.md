# Azure Infrastructure Setup for Customer Portal

This directory contains automated scripts to create and manage Azure infrastructure for the Customer Portal application.

## 📋 Prerequisites

### 1. Azure CLI Installation
Download and install Azure CLI from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

### 2. Azure Account
- Active Azure subscription
- Sufficient permissions to create resources

### 3. PowerShell
- Windows PowerShell 5.1 or PowerShell Core 6.0+

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)
1. Open Command Prompt as Administrator
2. Navigate to this directory
3. Run the batch file:
   ```cmd
   run-setup.bat
   ```

### Option 2: Manual Setup
1. Login to Azure:
   ```bash
   az login
   ```

2. Run the PowerShell script with custom parameters:
   ```powershell
   .\create-azure-resources.ps1 `
       -ResourceGroupName "your-resource-group" `
       -Location "Central India" `
       -StorageAccountName "yourstorageaccount" `
       -FrontendWebAppName "your-frontend-app" `
       -BackendWebAppName "your-backend-app" `
       -AppServicePlanName "your-app-plan" `
       -JwtSecret "your-super-secret-jwt-key" `
       -Environment "production"
   ```

## 🏗️ Resources Created

### Core Infrastructure
- **Resource Group**: Container for all resources
- **App Service Plan**: B1 Linux plan for hosting web apps
- **Frontend Web App**: React application hosting
- **Backend Web App**: Node.js API hosting

### Storage Resources
- **Storage Account**: Standard LRS with HTTPS only
- **Tables**:
  - `auth` - User authentication data
  - `mapping` - Customer-invoice mappings
  - `password_history` - Password history tracking
  - `login_attempts` - Failed login tracking
- **Blob Containers**:
  - `invoices` - Invoice ZIP files (private)
  - `temp` - Temporary files (private)

### Monitoring
- **Application Insights**: Application monitoring and logging
- **Application Logs**: Enabled for both web apps

## 🔧 Configuration

### Environment Variables Set

#### Backend Web App
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_STORAGE_ACCOUNT_KEY`
- `JWT_SECRET`
- `NODE_ENV`
- `PORT`
- `WEBSITE_NODE_DEFAULT_VERSION`

#### Frontend Web App
- `REACT_APP_API_URL`
- `NODE_ENV`
- `WEBSITE_NODE_DEFAULT_VERSION`

## 📁 Generated Files

After running the setup script, you'll get:
- `azure-config.json` - Contains all configuration details

## 🗑️ Cleanup

To remove all Azure resources:

```powershell
.\cleanup-azure-resources.ps1 -ResourceGroupName "customer-portal-rg"
```

Or with force flag (no confirmation):
```powershell
.\cleanup-azure-resources.ps1 -ResourceGroupName "customer-portal-rg" -Force
```

## 🔐 Security Features

- **HTTPS Only**: Storage account configured for HTTPS only
- **TLS 1.2**: Minimum TLS version set to 1.2
- **Private Containers**: Blob containers set to private access
- **Secure JWT**: JWT secret configured in environment variables
- **Application Logs**: Comprehensive logging enabled

## 📊 Resource Naming Convention

The scripts use these naming conventions:
- Resource Group: `customer-portal-rg`
- Storage Account: `customerportalstorage`
- App Service Plan: `customer-portal-plan`
- Frontend Web App: `customer-portal-frontend`
- Backend Web App: `customer-portal-backend`
- Application Insights: `customer-portal-rg-insights`

## 🎯 Next Steps

After running the setup script:

1. **Deploy Backend Code**:
   ```bash
   cd ../backend
   git remote add azure <backend-deployment-url>
   git push azure main
   ```

2. **Deploy Frontend Code**:
   ```bash
   cd ../frontend
   git remote add azure <frontend-deployment-url>
   git push azure main
   ```

3. **Update CORS Settings**: Update backend CORS to include frontend URL

4. **Create Admin User**: Use the create-admin script in backend

5. **Test Application**: Verify all functionality works

## 🔍 Troubleshooting

### Common Issues

1. **Azure CLI Not Found**:
   - Install Azure CLI from Microsoft's official site
   - Restart command prompt after installation

2. **Not Logged In**:
   - Run `az login` and follow the browser authentication

3. **Insufficient Permissions**:
   - Ensure your Azure account has Contributor or Owner role
   - Contact your Azure administrator

4. **Resource Name Already Exists**:
   - Azure resource names must be globally unique
   - Modify the resource names in the script parameters

5. **Storage Account Name Invalid**:
   - Must be 3-24 characters long
   - Can only contain lowercase letters and numbers
   - Must start with a letter

### Getting Help

- Check Azure Portal for resource status
- Review application logs in Azure Web App
- Use `az group show` to check resource group status
- Check `azure-config.json` for configuration details

## 📞 Support

For issues with the Azure setup:
1. Check the troubleshooting section above
2. Review Azure CLI documentation
3. Check Azure Portal for resource status
4. Review application logs for errors 