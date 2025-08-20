@echo off
echo ========================================
echo Customer Portal Azure Setup
echo ========================================
echo.

REM Check if Azure CLI is installed
az --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Azure CLI is not installed!
    echo Please install Azure CLI from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
    pause
    exit /b 1
)

REM Check if logged in
az account show >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Not logged in to Azure!
    echo Please run: az login
    pause
    exit /b 1
)

echo Starting Azure Infrastructure Setup...
echo.

REM Run the PowerShell script with parameters
powershell -ExecutionPolicy Bypass -File "create-azure-resources.ps1" ^
    -ResourceGroupName "customer-portal-rg" ^
    -Location "Central India" ^
    -StorageAccountName "customerportalstorage" ^
    -FrontendWebAppName "customer-portal-frontend" ^
    -BackendWebAppName "customer-portal-backend" ^
    -AppServicePlanName "customer-portal-plan" ^
    -JwtSecret "your-super-secret-jwt-key-change-this-in-production" ^
    -Environment "production"

echo.
echo Setup complete! Check azure-config.json for configuration details.
pause 