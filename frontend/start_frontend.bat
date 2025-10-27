@echo off
echo ================================================
echo   FRONTEND BASLATILIYOR
echo ================================================
echo.

cd /d "%~dp0"

echo [1/3] Node.js kontrolu...
node --version
if errorlevel 1 (
    echo HATA: Node.js bulunamadi!
    pause
    exit /b 1
)

echo.
echo [2/3] Dependencies kontrolu...
if not exist "node_modules" (
    echo node_modules bulunamadi, kuruluyor...
    npm install
)

echo.
echo [3/3] Frontend baslatiliyor...
echo URL: http://localhost:3000
echo.
echo ================================================
echo   FRONTEND CALISIYOR - Kapatmak icin Ctrl+C
echo ================================================
echo.

npm start

pause

