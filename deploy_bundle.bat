@echo off
echo ==========================================
echo       Netlify Deployment Bundle Script
echo ==========================================

echo [1/3] Exporting Data to JSON...
cd server
node export_json.js
if %errorlevel% neq 0 (
    echo [ERROR] Data export failed!
    exit /b %errorlevel%
)
cd ..

echo [2/3] Building Client Application...
cd client
call npm run build-high-mem
if %errorlevel% neq 0 (
    echo [ERROR] Client build failed!
    exit /b %errorlevel%
)

if exist "dist\index.html" (
    echo [INFO] Build artifacts generated successfully.
    
    echo [INFO] Copying additional JSON data...
    copy /Y "public\staff_list_*.json" "dist\"
    
) else (
    echo [ERROR] dist\index.html not found!
    exit /b 1
)
cd ..

echo ==========================================
echo [3/3] BUNDLE COMPLETE!
echo ==========================================
echo.
echo The deployment bundle is ready in:
echo    %CD%\client\dist
echo.
echo Please drag and drop the 'client\dist' folder to Netlify.
echo.

