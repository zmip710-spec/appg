@echo off
title AppG Launcher
echo ===========================================
echo         INICIANDO SISTEMA APPG
echo ===========================================
echo.

cd /d "%~dp0"

taskkill /f /im node.exe >nul 2>&1
taskkill /f /im ngrok.exe >nul 2>&1

echo [1/3] Compilando frontend...
call npm run build

echo [2/3] Iniciando Servidor Unificado (Puerto 4000)...
start /min "AppG - Server" cmd /k "npm run server"

echo.
echo Esperando que el servidor responda...
timeout /t 4 /nobreak >nul

echo [3/3] Iniciando Tunel Ngrok (Puerto 4000)...
start /min "AppG - Ngrok" cmd /k ""%USERPROFILE%\ngrok.exe" http --domain=baking-wildfowl-opt.ngrok-free.dev 4000"

echo.
echo ===========================================
echo  AppG iniciado correctamente.
echo  URL: https://baking-wildfowl-opt.ngrok-free.dev
echo ===========================================
timeout /t 4 >nul
exit