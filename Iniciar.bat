@echo off
title AppG Launcher
echo ===========================================
echo        INICIANDO SISTEMA APPG
echo ===========================================
echo.

:: Cambiar al directorio donde se encuentra este archivo .bat
cd /d "%~dp0"

echo [1/3] Iniciando Servidor Backend...
start "AppG - Servidor Backend" cmd /k "npm run server"

echo [2/3] Iniciando Interfaz Frontend...
start "AppG - Frontend Vite" cmd /k "npm run dev"

echo.
echo Esperando que los servicios locales respondan...
timeout /t 4 /nobreak >nul

echo [3/3] Iniciando Tunel Cloudflare...
start "AppG - Cloudflare Tunnel" cmd /k "%USERPROFILE%\cloudflared.exe tunnel --url http://localhost:3000"

echo.
echo ===========================================
echo AppG iniciado correctamente en local y en la red.
echo Revisa la ventana de Cloudflare para ver tu URL publica.
echo No cierres las ventanas de terminal abiertas.
echo ===========================================