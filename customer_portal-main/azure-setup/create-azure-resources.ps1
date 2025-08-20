# Customer Portal Azure Infrastructure Setup Script
# This script creates all necessary Azure resources for the customer portal application

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$Location = "Central India",
    
    [Parameter(Mandatory=$true)]
    [string]$StorageAccountName,
    
    [Parameter(Mandatory=$true)]
    [string]$FrontendWebAppName,
    
    [Parameter(Mandatory=$true)]
    [string]$BackendWebAppName,
    
    [Parameter(Mandatory=$true)]
    [string]$AppServicePlanName,
    
    [Parameter(Mandatory=$true)]
    [string]$JwtSecret,
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production"
)

Write-Host "Starting Azure Infrastructure Setup for Customer Portal..." -ForegroundColor Green
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Yellow
Write-Host "Location: $Location" -ForegroundColor Yellow
Write-Host "Storage Account: $StorageAccountName" -ForegroundColor Yellow
Write-Host "Frontend Web App: $FrontendWebAppName" -ForegroundColor Yellow
Write-Host "Backend Web App: $BackendWebAppName" -ForegroundColor Yellow

# Check if Azure CLI is installed
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "Azure CLI found: $($azVersion.'azure-cli')" -ForegroundColor Green
} catch {
    Write-Host "Azure CLI not found. Please install Azure CLI first." -ForegroundColor Red
    Write-Host "Download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

# Check if logged in to Azure
try {
    $account = az account show --output json | ConvertFrom-Json
    Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Host "Not logged in to Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}

# Function to check if resource exists
function Test-AzureResource {
    param([string]$ResourceType, [string]$ResourceName)
    try {
        az resource show --name $ResourceName --resource-group $ResourceGroupName --resource-type $ResourceType --output json | Out-Null
        return $true
    } catch {
        return $false
    }
}

# 1. Create Resource Group
Write-Host "Creating Resource Group..." -ForegroundColor Cyan
try {
    az group create --name $ResourceGroupName --location $Location
    Write-Host "Resource Group created successfully" -ForegroundColor Green
} catch {
    Write-Host "Resource Group '$ResourceGroupName' already exists or creation failed." -ForegroundColor Yellow
}

# 2. Create Storage Account
Write-Host "Creating Storage Account..." -ForegroundColor Cyan
try {
    az storage account create `
        --name $StorageAccountName `
        --resource-group $ResourceGroupName `
        --location $Location `
        --sku Standard_LRS `
        --kind StorageV2 `
        --https-only true `
        --min-tls-version TLS1_2
    
    Write-Host "Storage Account created successfully" -ForegroundColor Green
} catch {
    Write-Host "Storage Account '$StorageAccountName' already exists or creation failed." -ForegroundColor Yellow
}

# 3. Get Storage Account Key
Write-Host "Getting Storage Account Key..." -ForegroundColor Cyan
$storageKey = az storage account keys list `
    --account-name $StorageAccountName `
    --resource-group $ResourceGroupName `
    --query '[0].value' `
    --output tsv

if (-not $storageKey) {
    Write-Host "ERROR: Could not retrieve storage account key." -ForegroundColor Red
    exit 1
}

$connectionString = "DefaultEndpointsProtocol=https;AccountName=$($StorageAccountName);AccountKey=$($storageKey);EndpointSuffix=core.windows.net"

# 4. Create Tables
Write-Host "Creating Storage Tables..." -ForegroundColor Cyan
$tables = @("auth", "mapping", "password_history", "login_attempts")

foreach ($table in $tables) {
    Write-Host "Creating table: $table" -ForegroundColor Yellow
    try {
        az storage table create `
            --name $table `
            --connection-string $connectionString
        Write-Host "Table $table created successfully" -ForegroundColor Green
    } catch {
        Write-Host "Table $table already exists or creation failed" -ForegroundColor Yellow
    }
}

# 5. Create Blob Containers
Write-Host "Creating Blob Containers..." -ForegroundColor Cyan
$containers = @("invoices", "temp")

foreach ($container in $containers) {
    Write-Host "Creating container: $container" -ForegroundColor Yellow
    try {
        az storage container create `
            --name $container `
            --connection-string $connectionString `
            --public-access off
        Write-Host "Container $container created successfully" -ForegroundColor Green
    } catch {
        Write-Host "Container $container already exists or creation failed" -ForegroundColor Yellow
    }
}

# 6. Create App Service Plan
Write-Host "Creating App Service Plan..." -ForegroundColor Cyan
try {
    az appservice plan create `
        --name $AppServicePlanName `
        --resource-group $ResourceGroupName `
        --location $Location `
        --sku B1 `
        --is-linux
    
    Write-Host "App Service Plan created successfully" -ForegroundColor Green
} catch {
    Write-Host "App Service Plan '$AppServicePlanName' already exists or creation failed." -ForegroundColor Yellow
}

# 7. Create Backend Web App
Write-Host "Creating Backend Web App..." -ForegroundColor Cyan
try {
    az webapp create `
        --name $BackendWebAppName `
        --resource-group $ResourceGroupName `
        --plan $AppServicePlanName `
        --runtime "NODE|18-lts"
    
    Write-Host "Backend Web App created successfully" -ForegroundColor Green
} catch {
    Write-Host "Backend Web App '$BackendWebAppName' already exists or creation failed." -ForegroundColor Yellow
}

# 8. Create Frontend Web App
Write-Host "Creating Frontend Web App..." -ForegroundColor Cyan
try {
    az webapp create `
        --name $FrontendWebAppName `
        --resource-group $ResourceGroupName `
        --plan $AppServicePlanName `
        --runtime "NODE|18-lts"
    
    Write-Host "Frontend Web App created successfully" -ForegroundColor Green
} catch {
    Write-Host "Frontend Web App '$FrontendWebAppName' already exists or creation failed." -ForegroundColor Yellow
}

# 9. Configure Backend Environment Variables
Write-Host "Configuring Backend Environment Variables..." -ForegroundColor Cyan
try {
    az webapp config appsettings set `
        --name $BackendWebAppName `
        --resource-group $ResourceGroupName `
        --settings `
        AZURE_STORAGE_CONNECTION_STRING="$connectionString" `
        AZURE_STORAGE_ACCOUNT_NAME="$StorageAccountName" `
        AZURE_STORAGE_ACCOUNT_KEY="$storageKey" `
        JWT_SECRET="$JwtSecret" `
        NODE_ENV="$Environment" `
        PORT="8080" `
        WEBSITE_NODE_DEFAULT_VERSION="18-lts"
    
    Write-Host "Backend environment variables configured successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to configure backend environment variables" -ForegroundColor Red
}

# 10. Configure Frontend Environment Variables
Write-Host "Configuring Frontend Environment Variables..." -ForegroundColor Cyan
$backendUrl = "https://$BackendWebAppName.azurewebsites.net"
try {
    az webapp config appsettings set `
        --name $FrontendWebAppName `
        --resource-group $ResourceGroupName `
        --settings `
        REACT_APP_API_URL="$backendUrl" `
        NODE_ENV="$Environment" `
        WEBSITE_NODE_DEFAULT_VERSION="18-lts"
    
    Write-Host "Frontend environment variables configured successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to configure frontend environment variables" -ForegroundColor Red
}

# 11. Enable Application Logs
Write-Host "Enabling Application Logs..." -ForegroundColor Cyan
try {
    az webapp log config `
        --name $BackendWebAppName `
        --resource-group $ResourceGroupName `
        --web-server-logging filesystem `
        --application-logging filesystem

    az webapp log config `
        --name $FrontendWebAppName `
        --resource-group $ResourceGroupName `
        --web-server-logging filesystem `
        --application-logging filesystem
    
    Write-Host "Application logs enabled successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to enable application logs" -ForegroundColor Red
}

# 12. Create Application Insights (Optional)
Write-Host "Creating Application Insights..." -ForegroundColor Cyan
$appInsightsName = "$ResourceGroupName-insights"
try {
    az monitor app-insights component create `
        --app $appInsightsName `
        --location $Location `
        --resource-group $ResourceGroupName `
        --application-type web
    
    Write-Host "Application Insights created successfully" -ForegroundColor Green
} catch {
    Write-Host "Application Insights creation failed or already exists" -ForegroundColor Yellow
}

# 13. Generate Output Summary
Write-Host ""
Write-Host "Azure Infrastructure Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Resource Summary:" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor White
Write-Host "Storage Account: $StorageAccountName" -ForegroundColor White
Write-Host "Backend Web App: https://$BackendWebAppName.azurewebsites.net" -ForegroundColor White
Write-Host "Frontend Web App: https://$FrontendWebAppName.azurewebsites.net" -ForegroundColor White
Write-Host "App Service Plan: $AppServicePlanName" -ForegroundColor White

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Deploy your backend code to: $BackendWebAppName" -ForegroundColor White
Write-Host "2. Deploy your frontend code to: $FrontendWebAppName" -ForegroundColor White
Write-Host "3. Update CORS settings in backend to include frontend URL" -ForegroundColor White
Write-Host "4. Create admin user using the create-admin script" -ForegroundColor White

Write-Host ""
Write-Host "Security Notes:" -ForegroundColor Yellow
Write-Host "- JWT Secret has been configured" -ForegroundColor White
Write-Host "- Storage account uses HTTPS only" -ForegroundColor White
Write-Host "- Blob containers are private" -ForegroundColor White
Write-Host "- Application logs are enabled" -ForegroundColor White

Write-Host ""
Write-Host "Generated Files:" -ForegroundColor Cyan
Write-Host "- azure-config.json (contains all configuration)" -ForegroundColor White

# Save configuration to file
$config = @{
    ResourceGroupName = $ResourceGroupName
    Location = $Location
    StorageAccountName = $StorageAccountName
    FrontendWebAppName = $FrontendWebAppName
    BackendWebAppName = $BackendWebAppName
    AppServicePlanName = $AppServicePlanName
    BackendUrl = $backendUrl
    FrontendUrl = "https://$FrontendWebAppName.azurewebsites.net"
    StorageConnectionString = $connectionString
    Environment = $Environment
    CreatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}

$config | ConvertTo-Json -Depth 10 | Out-File -FilePath "azure-config.json" -Encoding UTF8
Write-Host "Configuration saved to azure-config.json" -ForegroundColor Green 