# Brain image: the FastAPI api AND the brain-side worker share it (compose runs
# two services with different commands). Build context = repo root.
FROM python:3.12-slim

# ffmpeg (Debian build has libass → captions), plus deno for yt-dlp's YouTube
# JS challenges (see yt-dlp "ejs" remote components).
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg curl unzip ca-certificates \
 && curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh -s -- --no-modify-path \
 && apt-get purge -y curl unzip && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY api/requirements.txt ./requirements.txt
COPY worker ./worker
RUN pip install --no-cache-dir -r requirements.txt \
 && pip install --no-cache-dir --pre "./worker[download]"
COPY api/app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
