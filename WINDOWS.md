# Running YT Studio on Windows

The code is cross-platform — "Open folder" uses `explorer /select,` on Windows
automatically, and the server behaves identically. Follow these steps in
**PowerShell** on Windows 10/11.

## 1. Copy the project

Copy the project folder to the Windows machine (e.g. `D:\yt-studio`), but
**skip these three folders** — they are machine-specific and must be recreated:

- `venv\` (a macOS Python environment; useless on Windows)
- `ui\node_modules\`
- `ui\dist\` (safe to copy, but you'll rebuild it anyway)

The `downloads\` folder is portable — copy it if you want to keep your library.
The library paths are re-scanned from disk on every request, so nothing breaks.

## 2. Install prerequisites

Check what you already have:

```powershell
python --version    # need 3.11+
ffmpeg -version
ffprobe -version
node -v             # any current LTS
```

Install whatever is missing with winget, then **reopen the terminal** so PATH
updates take effect:

```powershell
winget install Python.Python.3.12
winget install Gyan.FFmpeg
winget install OpenJS.NodeJS.LTS
```

> If `python` opens the Microsoft Store instead of Python, disable the
> `python.exe` and `python3.exe` entries under
> Settings → Apps → Advanced app settings → App execution aliases.

## 3. Create the Python environment

From the project root:

```powershell
python -m venv venv
venv\Scripts\pip install --no-cache-dir -r requirements.txt
```

If PowerShell blocks the activation script (you don't need to activate — the
commands here call `venv\Scripts\...` directly), or you want to activate
anyway:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
venv\Scripts\Activate.ps1
```

Verify:

```powershell
venv\Scripts\python -c "import fastapi, uvicorn, yt_dlp; print('ok')"
```

## 4. Build the UI (one time)

```powershell
cd ui
npm install
npm run build
cd ..
```

Rebuild only when the files under `ui\src` change.

## 5. Run

```powershell
venv\Scripts\python server\main.py
```

The browser opens automatically at http://127.0.0.1:8765. The server binds to
127.0.0.1 only, so it is unreachable from other machines. Stop it with
`Ctrl+C`.

## Configuration

`config.json` works the same as on macOS. `download_dir` may be relative
(resolves against the project root) or an absolute Windows path such as
`"D:\\capture"` — note the doubled backslashes, JSON requires them.

For age-restricted videos, drop a `cookies.txt` in the project root exactly as
described in the README's "Age-restricted videos" section — the steps are
identical on Windows. Do not copy `cookies.txt` between machines you don't
control, and never commit it.

## Troubleshooting

- **Downloads fail with `HTTP Error 403: Forbidden`** — YouTube changed
  something; update yt-dlp and restart the server:

  ```powershell
  venv\Scripts\pip install -U yt-dlp
  # if stable still fails, the nightly channel usually has the fix:
  venv\Scripts\pip install -U --pre yt-dlp
  ```

- **Testing the API from PowerShell** — use `curl.exe` explicitly. Plain
  `curl` is a PowerShell alias for `Invoke-WebRequest` and behaves differently:

  ```powershell
  curl.exe -s http://127.0.0.1:8765/api/config
  ```

- **`ffmpeg` not found after winget install** — reopen the terminal; if it
  still fails, log out and back in so the machine-wide PATH refreshes.

- **Port 8765 already in use** — change `port` in `config.json`, or find the
  holder with `netstat -ano | findstr 8765` and stop it.

- **Windows Defender SmartScreen / firewall prompt on first run** — allow it
  for private networks only; the server never listens beyond localhost either
  way.
