@echo off
rem
rem Install tcopy from this checkout (Windows).
rem
rem Links the four commands - tcopy, tpaste, fcopy, fpaste - onto your PATH via
rem `npm link`, so the checkout stays live: after `git pull` (or `tcopy update`)
rem the installed commands are already up to date, with nothing to reinstall.
rem
rem Usage:
rem   install.bat            Install dependencies and link the commands
rem   install.bat --no-deps  Skip `npm install` (dependencies already present)
rem
setlocal EnableDelayedExpansion

cd /d "%~dp0"

set "INSTALL_DEPS=1"

:parse_args
if "%~1"=="" goto args_done
if /i "%~1"=="--no-deps" (
  set "INSTALL_DEPS=0"
  shift
  goto parse_args
)
if /i "%~1"=="-h" goto show_help
if /i "%~1"=="--help" goto show_help
echo Error: unknown argument: %~1 ^(use --help^)
exit /b 1

:show_help
echo Install tcopy from this checkout ^(Windows^).
echo.
echo Usage:
echo   install.bat            Install dependencies and link the commands
echo   install.bat --no-deps  Skip `npm install` ^(dependencies already present^)
exit /b 0

:args_done

rem ---- Preflight -------------------------------------------------------------

echo.
echo ==^> Checking environment

where node >nul 2>nul
if errorlevel 1 (
  echo Error: node is not installed or not in PATH.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Error: npm is not installed or not in PATH.
  exit /b 1
)

rem Take the major version by splitting on the first dot, which avoids having to
rem escape quotes inside the `for /f` command string.
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set "NODE_MAJOR=%%v"
if !NODE_MAJOR! LSS 18 (
  echo Error: Node.js 18+ is required.
  node -v
  exit /b 1
)

if not exist "%CD%\package.json" (
  echo Error: package.json not found in %CD%.
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do echo node:         %%v
for /f "delims=" %%p in ('npm prefix -g') do set "NPM_PREFIX=%%p"
echo npm prefix:   !NPM_PREFIX!

rem ---- Dependencies ----------------------------------------------------------

if "!INSTALL_DEPS!"=="1" (
  echo.
  echo ==^> Installing dependencies
  rem `call` is required: npm is npm.cmd, and invoking another batch file
  rem without it transfers control and never returns here.
  call npm install
  if errorlevel 1 (
    echo Error: npm install failed.
    exit /b 1
  )
) else (
  echo.
  echo ==^> Skipping dependency install ^(--no-deps^)
  if not exist "%CD%\node_modules" (
    echo Error: node_modules not found; re-run without --no-deps.
    exit /b 1
  )
)

rem ---- Link ------------------------------------------------------------------

echo.
echo ==^> Linking commands

call npm link
if errorlevel 1 (
  echo Error: npm link failed.
  exit /b 1
)

rem ---- Verify ----------------------------------------------------------------

echo.
echo ==^> Verifying

set "MISSING=0"
for %%c in (tcopy tpaste fcopy fpaste) do (
  where %%c >nul 2>nul
  if errorlevel 1 (
    echo   %%c: NOT FOUND on PATH
    set /a MISSING+=1
  ) else (
    for /f "delims=" %%p in ('where %%c') do echo   %%c: %%p
  )
)

if !MISSING! GTR 0 (
  echo.
  echo Some commands are not on your PATH. Make sure npm's global directory
  echo is in it:
  echo   !NPM_PREFIX!
  exit /b 1
)

for /f "delims=" %%v in ('tcopy --version') do set "TCOPY_VERSION=%%v"

echo.
echo ==^> Installed tcopy !TCOPY_VERSION!
echo Next step:  tcopy setup
echo Uninstall:  npm rm -g tcopy
exit /b 0
