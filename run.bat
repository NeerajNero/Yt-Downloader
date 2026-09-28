@echo off
rem YT Studio launcher (Windows). First run sets everything up;
rem after that it just starts the app. Usage: run.bat
setlocal
cd /d "%~dp0"

rem --- Python env --------------------------------------------------------------
if not exist venv\Scripts\python.exe (
  set "PY_CMD="
  py -3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>nul
  if not errorlevel 1 (
    set "PY_CMD=py -3"
  ) else (
    where python >nul 2>nul
    if not errorlevel 1 (
      python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>nul
      if not errorlevel 1 set "PY_CMD=python"
    )
  )
  if "%PY_CMD%"=="" (
    echo error: Python 3.11+ required. Install with: winget install Python.Python.3.12
    echo        Then reopen the terminal and run run.bat again.
    exit /b 1
  )
  echo Creating venv...
  %PY_CMD% -m venv venv
  if errorlevel 1 exit /b 1
)

rem --- ffmpeg ------------------------------------------------------------------
rem The app also auto-finds WinGet's install, so only warn if truly absent.
where ffmpeg >nul 2>nul
if errorlevel 1 (
  if not exist "%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg*" (
    if not exist "C:\ffmpeg\bin\ffmpeg.exe" (
      echo error: ffmpeg not found. Install with: winget install Gyan.FFmpeg
      echo        Then reopen the terminal and run run.bat again.
      exit /b 1
    )
  )
)

venv\Scripts\python -c "import fastapi, uvicorn, yt_dlp, faster_whisper, pydantic" >nul 2>nul
if errorlevel 1 (
  echo Installing Python dependencies...
  venv\Scripts\pip install --no-cache-dir -q -r requirements.txt
  if errorlevel 1 exit /b 1
)

rem --- web app build ------------------------------------------------------------
if not exist web\dist\index.html (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo error: Node/npm not found - needed once to build the web app.
    echo        Install with: winget install OpenJS.NodeJS.LTS, reopen the terminal.
    exit /b 1
  )
  echo Building the web app - first run only...
  pushd web
  call npm install --no-fund --no-audit
  if errorlevel 1 (popd & exit /b 1)
  call npm run build
  if errorlevel 1 (popd & exit /b 1)
  popd
)

rem --- go --------------------------------------------------------------------------
venv\Scripts\python -m studio
