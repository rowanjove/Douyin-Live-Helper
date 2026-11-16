@echo off
setlocal
chcp 65001 >nul
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0generate.ps1"
set "helper_exit_code=%errorlevel%"
echo.
pause
exit /b %helper_exit_code%
