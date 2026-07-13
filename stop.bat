@echo off
setlocal EnableExtensions
title Rasa Platform - Stop
cd /d "%~dp0"

echo.
echo  ============================================
echo    Rasa by Narayanam - Stopping services
echo  ============================================
echo.

set "XAMPP=C:\xampp7.3"
set "PORT=3000"

REM ---- Stop Next.js on port 3000 ----
echo  [..] Stopping app on port %PORT%...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  echo  [..] Killing PID %%p
  taskkill /F /PID %%p >nul 2>&1
)

REM Also stop stray next/node for this project if still holding the port
timeout /t 1 /nobreak >nul
call :still_listening %PORT%
if "%STILL%"=="1" (
  echo  [!] Port %PORT% still busy - close the start.bat window with Ctrl+C if needed.
) else (
  echo  [OK] Port %PORT% is free
)

REM ---- Optional: stop XAMPP MySQL ----
echo.
choice /C YN /M "Also stop XAMPP MySQL"
if errorlevel 2 goto done
if errorlevel 1 goto stop_mysql

:stop_mysql
if exist "%XAMPP%\mysql_stop.bat" (
  echo  [..] Stopping MySQL...
  call "%XAMPP%\mysql_stop.bat"
) else if exist "%XAMPP%\mysql\bin\mysqladmin.exe" (
  "%XAMPP%\mysql\bin\mysqladmin.exe" -u root shutdown
  echo  [OK] MySQL stop requested
) else (
  echo  [!] Could not find mysql_stop.bat - stop MySQL from XAMPP Control Panel.
)

:done
echo.
echo  Done.
pause
exit /b 0

:still_listening
set "STILL=0"
netstat -ano | findstr ":%~1" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 set "STILL=1"
exit /b 0
