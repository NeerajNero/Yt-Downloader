# Installing a worker on Windows 11

Applies to the NVIDIA laptop (transcription) and the gaming PC (render + LLM,
job types arrive in Phase 2). Native Windows Python, no WSL — that keeps CUDA
and Wake-on-LAN simple.

## 1. Prerequisites

- **Tailscale** installed and signed in (the worker reaches the brain's Postgres
  and API over the tailnet). Note the brain's tailnet IP: `tailscale status`.
- **Python 3.12** from python.org (tick *Add python.exe to PATH*).
- **Git** for Windows.
- **FFmpeg** — Gyan.FFmpeg *full* build (has `h264_amf` and libass):
  `winget install Gyan.FFmpeg` or unzip to `C:\ffmpeg`. Not needed for
  transcription alone but the config expects a path.

## 2. Install

Open PowerShell:

```powershell
mkdir C:\ytstudio; cd C:\ytstudio
git clone <your-repo-url> yt-studio
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -U pip

# NVIDIA laptop (transcription):
pip install -e ".\yt-studio\worker[transcribe]"
pip install nvidia-cublas-cu12 nvidia-cudnn-cu12    # CUDA 12 runtime for ctranslate2

# Gaming PC (renders + downloads):
pip install -e ".\yt-studio\worker[download]"
```

An NVIDIA driver that supports CUDA 12 is required (any recent Game Ready
driver is). No CUDA toolkit install — the pip wheels carry the runtime.

## 3. Configure

```powershell
copy .\yt-studio\worker\examples\nvidia-laptop.toml .\worker.toml   # or gaming-pc.toml
notepad .\worker.toml
```

Fill in the brain's tailnet IP in `database_url` and `brain_url`, the
`POSTGRES_PASSWORD` and `HASURA_ADMIN_SECRET` from the brain's `.env`, and
`ffmpeg_path`. `work_dir` is local scratch (audio extracts, temp outputs).

Whisper on the GTX 1650 (4 GB): `model = "small"` with `device = "cuda"`,
`compute_type = "int8_float16"`. `medium` also fits at int8 — try it once the
pipeline works.

## 4. First run (foreground)

```powershell
cd C:\ytstudio
.\yt-studio\worker\run-worker.bat
```

You should see `registered as nvidia-laptop`, a `can run:` line listing what
this machine has installed, and `assigned (Machines page): …`. The dot turns
green on the PWA's Machines page, where you tick which jobs it should take. Queue a transcribe from the
Library page and watch it run. The first transcription downloads the Whisper
model (~500 MB for `small`) into the Hugging Face cache.

Common problems:

- `Could not load library cudnn_ops64_9.dll` / `cublas64_12.dll` — the pip
  CUDA wheels aren't on PATH. `run-worker.bat` adds them; if you start
  `yt-worker` by hand, run it through the bat file instead.
- `CUDA out of memory` — use `small`, or `compute_type = "int8"`.
- Connection refused to Postgres — the brain must expose POSTGRES_PORT on the host
  (compose does) and the Ubuntu firewall must allow it from the tailnet
  (`sudo ufw allow in on tailscale0 to any port 5433   # POSTGRES_PORT`).

## 5. Run at logon (Task Scheduler)

1. Task Scheduler → *Create Task…*
2. **General**: name `YT Studio worker`; *Run only when user is logged on*
   (simplest; the GPU is available to a logged-on session). Tick *Run with
   highest privileges* only if FFmpeg/CUDA complain about access.
3. **Triggers**: *At log on* for your user.
4. **Actions**: *Start a program* → `C:\ytstudio\yt-studio\worker\run-worker.bat`,
   *Start in* `C:\ytstudio`.
5. **Settings**: untick *Stop the task if it runs longer than…*; tick
   *If the task fails, restart every 1 minute*.
6. **Conditions**: untick *Start the task only if the computer is on AC power*
   (laptop) unless you want it that way.

Set the laptop to auto-login (or keep it signed in) and, in Power Options,
*Never sleep* while plugged in — a sleeping worker is just an offline machine.
Stop the worker with Task Scheduler → *End*; it requeues the job it was running.

## 6. Updating

```powershell
cd C:\ytstudio\yt-studio; git pull
C:\ytstudio\venv\Scripts\pip install -e ".\worker[transcribe]"
```

then end and re-run the scheduled task.

## Gaming PC extras

- `encoder = "h264_amf"` in worker.toml uses the RX 6750 XT. Check the Gyan
  build has it: `ffmpeg -encoders | findstr amf`. Switch to `libx264` for a
  final-quality pass (slower, better at the same bitrate).
- Renders pull the source from the brain once into `work_dir/cache` and reuse
  it for every clip of that video. Clear the cache folder when the disk fills.
- Wake-on-LAN: NIC driver → enable *Wake on Magic Packet*; Power Options →
  disable *Fast startup*; prefer Ethernet. Find the MAC with `ipconfig /all`
  and store it in `machines.mac_address` on the brain. Then the PWA's Machines
  page can wake it, and the watchdog wakes it automatically when a render is
  waiting.
- Ollama native Windows build for the LLM jobs (Phase 4; uses the 6750 XT via ROCm/Vulkan).
