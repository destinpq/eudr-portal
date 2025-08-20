@echo off
echo Deploying React app to Azure...

:: Build the React app
call npm run build

:: Clean the root directory (where Azure expects the files)
echo Cleaning root directory...
del /Q /S * 2>nul

:: Copy the build files to root
echo Copying build files to root...
xcopy /E /Y /I build\* .\

:: Copy web.config to root
echo Copying web.config...
copy /Y public\web.config .\

:: List contents to verify
echo Contents of root directory:
dir

echo Deployment completed! 