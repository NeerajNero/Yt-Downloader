import os
from pathlib import Path

DATABASE_URL = os.environ.get("DATABASE_URL", "postgres://ytstudio:devpass@localhost:5433/ytstudio")
LIBRARY_DIR = Path(os.environ.get("LIBRARY_DIR", "/library")).resolve()
# Shared secret for worker uploads and internal (cron) endpoints. The tailnet is
# the real boundary; this just keeps a stray LAN device from writing files.
API_SECRET = os.environ.get("HASURA_ADMIN_SECRET", "")
FFMPEG = os.environ.get("FFMPEG_PATH", "ffmpeg")

# Watchdog thresholds (seconds)
JOB_STALE_AFTER = int(os.environ.get("JOB_STALE_AFTER", "120"))
MACHINE_OFFLINE_AFTER = int(os.environ.get("MACHINE_OFFLINE_AFTER", "90"))

# Auto Wake-on-LAN: a queued job nobody online can serve for this long wakes a
# capable offline machine; don't re-send within AUTO_WAKE_RETRY.
AUTO_WAKE_AFTER = int(os.environ.get("AUTO_WAKE_AFTER", "60"))
AUTO_WAKE_RETRY = int(os.environ.get("AUTO_WAKE_RETRY", "300"))
