@echo off
title Writer OS
echo ========================================================
echo   Iniciando Writer OS...
echo ========================================================
powershell -ExecutionPolicy Bypass -File "%~dp0servidor.ps1"
pause
