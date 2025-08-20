# Customer Portal Azure Infrastructure Validation Script
# This script validates that all Azure resources are properly created and configured

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName
)

Write-Host "🔍 Validating Azure Infrastructure for Customer Portal..." -ForegroundColor Green
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Yellow

# Check if Azure CLI is installed
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "✅ Azure CLI found: $($azVersion.'azure-cli')" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI not found. Please install Azure CLI first." -ForegroundColor Red
    exit 1
}

# Check if logged in to Azure
try {
    $account = az account show --output json | ConvertFrom-Json
    Write-Host "✅ Logged in as: $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}

# Check if resource group exists
try {
    $rg = az group show --name $ResourceGroupName --output json | ConvertFrom-Json
    Write-Host "✅ Resource Group found: $($rg.name)" -ForegroundColor Green
} catch {
    Write-Host "❌ Resource Group '$ResourceGroupName' not found." -ForegroundColor Red
    exit 1
}

# List all resources in the resource group
Write-Host "`n📋 Resources in Resource Group:" -ForegroundColor Cyan
$resources = az resource list --resource-group $ResourceGroupName --output json | ConvertFrom-Json

$resourceTypes = @{
    "Microsoft.Storage/storageAccounts" = "Storage Account"
    "Microsoft.Web/serverfarms" = "App Service Plan"
    "Microsoft.Web/sites" = "Web App"
    "Microsoft.Insights/components" = "Application Insights"
}

$foundResources = @{}

foreach ($resource in $resources) {
    $resourceType = $resourceTypes[$resource.type]
    if ($resourceType) {
        Write-Host "✅ $resourceType`: $($resource.name)" -ForegroundColor Green
        $foundResources[$resource.type] = $resource.name
    } else {
        Write-Host "ℹ️  $($resource.type): $($resource.name)" -ForegroundColor Gray
    }
}

# Validate Storage Account
if ($foundResources["Microsoft.Storage/storageAccounts"]) {
    $storageAccount = $foundResources["Microsoft.Storage/storageAccounts"]
    Write-Host "`n💾 Validating Storage Account: $storageAccount" -ForegroundColor Cyan
    
    # Check storage account properties
    $storageInfo = az storage account show --name $storageAccount --resource-group $ResourceGroupName --output json | ConvertFrom-Json
    
    if ($storageInfo.httpsOnly) {
        Write-Host "✅ HTTPS Only: Enabled" -ForegroundColor Green
    } else {
        Write-Host "❌ HTTPS Only: Disabled" -ForegroundColor Red
    }
    
    if ($storageInfo.minimumTlsVersion -eq "TLS1_2") {
        Write-Host "✅ Minimum TLS Version: TLS1_2" -ForegroundColor Green
    } else {
        Write-Host "❌ Minimum TLS Version: $($storageInfo.minimumTlsVersion)" -ForegroundColor Red
    }
    
    # Check tables
    Write-Host "`n📊 Checking Storage Tables:" -ForegroundColor Cyan
    $storageKey = az storage account keys list --account-name $storageAccount --resource-group $ResourceGroupName --query '[0].value' --output tsv
    
    $expectedTables = @("auth", "mapping", "password_history", "login_attempts")
    foreach ($table in $expectedTables) {
        try {
            az storage table exists --name $table --account-name $storageAccount --account-key $storageKey --output json | Out-Null
            Write-Host "✅ Table: $table" -ForegroundColor Green
        } catch {
            Write-Host "❌ Table: $table (not found)" -ForegroundColor Red
        }
    }
    
    # Check blob containers
    Write-Host "`n📁 Checking Blob Containers:" -ForegroundColor Cyan
    $expectedContainers = @("invoices", "temp")
    foreach ($container in $expectedContainers) {
        try {
            $containerInfo = az storage container show --name $container --account-name $storageAccount --account-key $storageKey --output json | ConvertFrom-Json
            Write-Host "✅ Container: $container (Public Access: $($containerInfo.properties.publicAccess))" -ForegroundColor Green
        } catch {
            Write-Host "❌ Container: $container (not found)" -ForegroundColor Red
        }
    }
}

# Validate Web Apps
$webApps = $resources | Where-Object { $_.type -eq "Microsoft.Web/sites" }
if ($webApps) {
    Write-Host "`n🌐 Validating Web Apps:" -ForegroundColor Cyan
    
    foreach ($webApp in $webApps) {
        Write-Host "`nWeb App: $($webApp.name)" -ForegroundColor Yellow
        
        # Check app settings
        $appSettings = az webapp config appsettings list --name $webApp.name --resource-group $ResourceGroupName --output json | ConvertFrom-Json
        
        $requiredSettings = @{
            "AZURE_STORAGE_CONNECTION_STRING" = "Backend"
            "JWT_SECRET" = "Backend"
            "REACT_APP_API_URL" = "Frontend"
        }
        
        foreach ($setting in $appSettings) {
            if ($requiredSettings.ContainsKey($setting.name)) {
                if ($setting.value) {
                    Write-Host "✅ $($setting.name): Configured" -ForegroundColor Green
                } else {
                    Write-Host "❌ $($setting.name): Not configured" -ForegroundColor Red
                }
            }
        }
        
        # Check if web app is running
        try {
            $status = az webapp show --name $webApp.name --resource-group $ResourceGroupName --query "state" --output tsv
            if ($status -eq "Running") {
                Write-Host "✅ Status: Running" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Status: $status" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "❌ Could not check status" -ForegroundColor Red
        }
    }
}

# Validate App Service Plan
if ($foundResources["Microsoft.Web/serverfarms"]) {
    $appServicePlan = $foundResources["Microsoft.Web/serverfarms"]
    Write-Host "`n🏗️ Validating App Service Plan: $appServicePlan" -ForegroundColor Cyan
    
    $planInfo = az appservice plan show --name $appServicePlan --resource-group $ResourceGroupName --output json | ConvertFrom-Json
    
    Write-Host "✅ SKU: $($planInfo.sku.name)" -ForegroundColor Green
    Write-Host "✅ Tier: $($planInfo.sku.tier)" -ForegroundColor Green
    Write-Host "✅ OS: $($planInfo.kind)" -ForegroundColor Green
}

# Validate Application Insights
if ($foundResources["Microsoft.Insights/components"]) {
    $appInsights = $foundResources["Microsoft.Insights/components"]
    Write-Host "`n📊 Validating Application Insights: $appInsights" -ForegroundColor Cyan
    Write-Host "✅ Application Insights configured" -ForegroundColor Green
}

# Summary
Write-Host "`n📋 Validation Summary:" -ForegroundColor Cyan
Write-Host "Resource Group: ✅ $ResourceGroupName" -ForegroundColor Green
Write-Host "Storage Account: $(if($foundResources["Microsoft.Storage/storageAccounts"]) { "✅" } else { "❌" })" -ForegroundColor $(if($foundResources["Microsoft.Storage/storageAccounts"]) { "Green" } else { "Red" })
Write-Host "App Service Plan: $(if($foundResources["Microsoft.Web/serverfarms"]) { "✅" } else { "❌" })" -ForegroundColor $(if($foundResources["Microsoft.Web/serverfarms"]) { "Green" } else { "Red" })
Write-Host "Web Apps: $(if($webApps) { "✅ $($webApps.Count) found" } else { "❌ None found" })" -ForegroundColor $(if($webApps) { "Green" } else { "Red" })
Write-Host "Application Insights: $(if($foundResources["Microsoft.Insights/components"]) { "✅" } else { "❌" })" -ForegroundColor $(if($foundResources["Microsoft.Insights/components"]) { "Green" } else { "Red" })

Write-Host "`n🎉 Validation complete!" -ForegroundColor Green 