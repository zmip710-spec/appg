@echo off
title AppG Launcher
echo ===========================================
echo         INICIANDO SISTEMA APPG (PRODUCCION)
echo ===========================================
echo.

cd /d "%~dp0"

:: Cerrar instancias colgadas para liberar los puertos 3000 y 4000
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im ngrok.exe >nul 2>&1

echo [1/4] Compilando frontend (Build)...
call npm run build

echo [2/4] Iniciando Backend...
start /min "AppG - Backend" cmd /k "npm run server"

echo [3/4] Iniciando Servidor Estatico Produccion...
start /min "AppG - Frontend" cmd /k "serve -s dist -l 3000"

echo.
echo Esperando que los servidores respondan...
timeout /t 5 /nobreak >nul

echo [4/4] Iniciando Tunel Ngrok...
start /min "AppG - Ngrok" cmd /k ""%USERPROFILE%\ngrok.exe" http --domain=baking-wildfowl-opt.ngrok-free.dev 3000"

echo.
echo ===========================================
echo  AppG iniciado en PRODUCCION (Sin HMR).
echo  URL: https://baking-wildfowl-opt.ngrok-free.dev
echo ===========================================
timeout /t 4 >nul
exit