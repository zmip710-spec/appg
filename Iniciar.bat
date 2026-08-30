@echo off
title AppG Launcher
echo ===========================================
echo        INICIANDO SISTEMA APPG
@echo off
title AppG Launcher
echo ===========================================
@echo off
title AppG Launcher
echo ===========================================
echo        INICIANDO SISTEMA APPG
echo ===========================================
echo.

:: Cambiar a la carpeta del proyecto
cd /d "%~dp0"

echo [1/3] Iniciando Servidor Backend...
start /min "AppG - Backend" cmd /k "npm run server"

echo [2/3] Iniciando Interfaz Frontend...
start /min "AppG - Frontend" cmd /k "npm run dev"

echo.
echo Esperando que los servidores locales respondan...
timeout /t 4 /nobreak >nul

echo [3/3] Iniciando Tunel Ngrok (Dominio Fijo)...
start /min "AppG - Ngrok" cmd /k ""%USERPROFILE%\ngrok.exe" http --domain=baking-wildfowl-opt.ngrok-free.dev 3000"

echo.
echo ===========================================
echo  AppG iniciado correctamente.
echo  URL: https://baking-wildfowl-opt.ngrok-free.dev
echo ===========================================
timeout /t 4 >nul
exit