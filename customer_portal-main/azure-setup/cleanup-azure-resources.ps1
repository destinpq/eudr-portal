# Customer Portal Azure Infrastructure Cleanup Script
# This script removes all Azure resources created for the customer portal application

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force
)

Write-Host "🗑️ Starting Azure Infrastructure Cleanup for Customer Portal..." -ForegroundColor Red
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

# List resources in the resource group
Write-Host "`n📋 Resources in Resource Group:" -ForegroundColor Cyan
$resources = az resource list --resource-group $ResourceGroupName --output json | ConvertFrom-Json
foreach ($resource in $resources) {
    Write-Host "- $($resource.type): $($resource.name)" -ForegroundColor White
}

# Confirm deletion
if (-not $Force) {
    Write-Host "`n⚠️  WARNING: This will delete ALL resources in the resource group!" -ForegroundColor Red
    Write-Host "This action cannot be undone!" -ForegroundColor Red
    $confirmation = Read-Host "`nType 'DELETE' to confirm deletion of resource group '$ResourceGroupName'"
    
    if ($confirmation -ne "DELETE") {
        Write-Host "❌ Deletion cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Delete the resource group (this will delete all resources within it)
Write-Host "`n🗑️ Deleting Resource Group '$ResourceGroupName'..." -ForegroundColor Red
az group delete --name $ResourceGroupName --yes --no-wait

Write-Host "✅ Resource Group deletion initiated. This may take several minutes to complete." -ForegroundColor Green
Write-Host "You can check the status in the Azure Portal or run: az group show --name $ResourceGroupName" -ForegroundColor Yellow

# Clean up local files
if (Test-Path "azure-config.json") {
    Remove-Item "azure-config.json"
    Write-Host "✅ Removed local azure-config.json" -ForegroundColor Green
}

Write-Host "`n🎉 Cleanup complete!" -ForegroundColor Green 