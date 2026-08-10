@echo off
rem
rem Configure tcopy - choose the mode and fill in its settings (Windows).
rem
rem This is a convenience wrapper around `tcopy setup`. Run it after
rem install.bat, or any time you want to reconfigure.
rem
rem Usage:
rem   setup.bat
rem
setlocal

cd /d "%~dp0"

if /i "%~1"=="-h" goto show_help
if /i "%~1"=="--help" goto show_help
if not "%~1"=="" (
  echo Error: unknown argument: %~1 ^(use --help^)
  exit /b 1
)

rem Prefer the installed command; fall back to this checkout when tcopy is not
rem on PATH yet, so setup works even before install.bat has been run.
where tcopy >nul 2>nul
if not errorlevel 1 (
  call tcopy setup
  exit /b %errorlevel%
)

if not exist "%CD%\node_modules" (
  echo Error: dependencies are not installed. Run install.bat first.
  exit /b 1
)

echo Note: tcopy is not on your PATH; using this checkout.
echo       Run install.bat to install the commands.
echo.
node "%CD%\bin\tcopy.js" setup
exit /b %errorlevel%

:show_help
echo Configure tcopy - choose the mode and fill in its settings.
echo.
echo Usage:
echo   setup.bat
exit /b 0
