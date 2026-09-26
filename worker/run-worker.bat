@echo off
rem YT Studio worker launcher (Windows). Restarts the worker if it exits.
rem Expects: C:\ytstudio\yt-studio (repo clone), C:\ytstudio\venv, C:\ytstudio\worker.toml
rem See docs\WORKER-WINDOWS.md.

set ROOT=C:\ytstudio
set REPO=%ROOT%\yt-studio
set VENV=%ROOT%\venv
set YT_WORKER_CONFIG=%ROOT%\worker.toml

rem CUDA runtime DLLs installed via pip (nvidia-cublas-cu12 / nvidia-cudnn-cu12)
rem live inside site-packages; ctranslate2 finds them only if they are on PATH.
for /d %%d in ("%VENV%\Lib\site-packages\nvidia\*") do (
  if exist "%%d\bin" set "PATH=%%d\bin;%PATH%"
)

cd /d %REPO%
:loop
echo [%date% %time%] starting worker
"%VENV%\Scripts\yt-worker.exe" --config "%YT_WORKER_CONFIG%"
echo [%date% %time%] worker exited with %errorlevel%, restarting in 10 s
timeout /t 10 /nobreak >nul
goto loop
