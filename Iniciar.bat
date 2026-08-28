@echo off
title AppG Launcher
echo ===========================================
echo       INICIANDO SISTEMA APPG
echo ===========================================
echo.

:: Cambiar al directorio donde se encuentra este archivo .bat
cd /d "%~dp0"

echo [1/2] Iniciando Servidor Backend...
start "AppG - Servidor Backend" cmd /k "npm run server"

echo [2/2] Iniciando Interfaz Frontend...
start "AppG - Frontend Vite" cmd /k "npm run dev"

echo.
echo Esperando que los servicios respondan...
timeout /t 4 /nobreak >nul

echo.
echo ===========================================
echo AppG iniciado correctamente.
echo No cierres las ventanas de terminal abiertas.
echo ===========================================