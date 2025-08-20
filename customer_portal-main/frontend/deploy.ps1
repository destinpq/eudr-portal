# Build the React application
Write-Host "Building React application..."
npm run build

# Ensure the build was successful
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed!"
    exit 1
}

# Clean the root directory (where Azure expects the files)
Write-Host "Cleaning root directory..."
Get-ChildItem -Path . -Exclude "build", "src", "public", "node_modules", ".git", "package.json", "package-lock.json", "tsconfig.json", "README.md", ".deployment", "deploy.cmd", "deploy.ps1" | Remove-Item -Recurse -Force

# Copy build files to root
Write-Host "Copying build files to root..."
Copy-Item -Path "build\*" -Destination "." -Recurse -Force

# Copy web.config to root
Write-Host "Copying web.config..."
Copy-Item -Path "public\web.config" -Destination "." -Force

# List contents to verify
Write-Host "Contents of root directory:"
Get-ChildItem

Write-Host "Deployment completed!" 