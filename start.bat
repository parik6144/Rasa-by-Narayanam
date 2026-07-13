@echo off
setlocal EnableExtensions
title Rasa Platform - Start
cd /d "%~dp0"

echo.
echo  ============================================
echo    Rasa by Narayanam - Project Start
echo  ============================================
echo.

REM ---- Paths (change XAMPP if your install differs) ----
set "XAMPP=C:\xampp7.3"
set "PORT=3000"
set "URL=http://localhost:%PORT%"
set "ADMIN_URL=http://localhost:%PORT%/admin"

REM ---- 1) MySQL (XAMPP) ----
call :port_listening 3306
if "%PORT_OK%"=="1" (
  echo  [OK] MySQL already running on port 3306
) else (
  echo  [..] Starting XAMPP MySQL...
  if exist "%XAMPP%\mysql_start.bat" (
    start "XAMPP-MySQL" /MIN cmd /c "cd /d \"%XAMPP%\" && call mysql_start.bat"
    echo  [..] Waiting for MySQL...
    call :wait_for_port 3306 30
    if "%PORT_OK%"=="1" (
      echo  [OK] MySQL is up
    ) else (
      echo  [!] MySQL did not start in time. Open XAMPP Control and start MySQL.
    )
  ) else (
    echo  [!] XAMPP not found at %XAMPP%
    echo      Edit start.bat and set XAMPP= to your XAMPP folder.
  )
)
echo.

REM ---- 2) Node.js ----
where node >nul 2>&1
if errorlevel 1 (
  echo  [!] Node.js not found. Install from https://nodejs.org
  echo.
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo  [OK] Node %%v

where npm >nul 2>&1
if errorlevel 1 (
  echo  [!] npm not found.
  pause
  exit /b 1
)
echo.

REM ---- 3) Dependencies ----
if not exist "node_modules\" (
  echo  [..] Installing npm packages ^(first time^)...
  call npm install
  if errorlevel 1 (
    echo  [!] npm install failed
    pause
    exit /b 1
  )
  echo  [OK] Packages installed
) else (
  echo  [OK] node_modules present
)
echo.

REM ---- 4) Prisma client ----
echo  [..] Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
  echo  [!] prisma generate had an issue - if the app fails, stop Node and run again.
)
echo.

REM ---- 5) Free / reuse port 3000 ----
call :port_listening %PORT%
if "%PORT_OK%"=="1" (
  echo  [OK] App already running on port %PORT%
  echo  [..] Opening browser...
  start "" "%URL%"
  start "" "%ADMIN_URL%"
  echo.
  echo  Site:  %URL%
  echo  Admin: %ADMIN_URL%
  echo.
  pause
  exit /b 0
)

REM ---- 6) Start Next.js + open browser ----
echo  [..] Starting Next.js on %URL%
echo  [..] Keep this window open while you work.
echo  [..] Press Ctrl+C to stop the server.
echo.

REM Open browser after server has a moment to boot
start "" cmd /c "timeout /t 5 /nobreak >nul && start \"\" \"%URL%\" && start \"\" \"%ADMIN_URL%\""

call npx next dev -p %PORT%

echo.
echo  Server stopped.
pause
exit /b 0

REM ========== helpers ==========
:port_listening
set "PORT_OK=0"
netstat -ano | findstr ":%~1" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 set "PORT_OK=1"
exit /b 0

:wait_for_port
set "WAIT_PORT=%~1"
set "WAIT_SECS=%~2"
if "%WAIT_SECS%"=="" set "WAIT_SECS=20"
set /a _i=0
:wait_loop
call :port_listening %WAIT_PORT%
if "%PORT_OK%"=="1" exit /b 0
set /a _i+=1
if %_i% geq %WAIT_SECS% exit /b 1
timeout /t 1 /nobreak >nul
goto wait_loop
