@echo off
title Writer OS
echo ========================================================
echo   Iniciando Writer OS...
echo ========================================================
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Ocurrio un error al iniciar el servidor de Writer OS.
    pause
)
