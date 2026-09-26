# Deploying the brain (Ubuntu Server)

One-time setup on the Ubuntu server, then every deploy is `git pull` + rebuild.

## 1. One-time setup

```sh
# Docker Engine + Compose plugin (official repo)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # log out/in afterwards

# Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# The app
git clone <your-repo-url> ~/yt-studio
cd ~/yt-studio
cp .env.example .env
```

Edit `.env` — the v2 section at the bottom:

```
POSTGRES_PASSWORD=<long random>
HASURA_ADMIN_SECRET=<long random>
POSTGRES_PORT=5432
WEB_PORT=8080
HASURA_PORT=8081
LIBRARY_DIR=/srv/yt-studio/library     # on the 1 TB disk
GEMINI_API_KEY=<your key>
```

```sh
sudo mkdir -p /srv/yt-studio/library && sudo chown $USER /srv/yt-studio/library
docker compose up -d --build
```

The Hasura image auto-applies `hasura/migrations` and `hasura/metadata` on
every boot — no manual migrate step, a fresh machine comes up fully schema'd.

Copy the v1 library into `LIBRARY_DIR` (one folder per video with its
`.info.json` sidecar), then index it:

```sh
docker compose exec api python scripts/import_v1_library.py   # idempotent
```

Postgres must be reachable from the workers over the tailnet:

```sh
sudo ufw allow in on tailscale0 to any port 5432
sudo ufw allow in on tailscale0 to any port 8080
```

## 2. Serve over HTTPS on the tailnet

```sh
sudo tailscale serve --bg http://localhost:8080
```

The app is now at `https://<server-hostname>.<tailnet>.ts.net` for every
device on your tailnet, with a real TLS cert (needed for PWA install).

## 3. Install the PWA on the phone

Open that URL in Chrome on Android → menu → **Add to home screen** → Install.

## 4. Every later deploy

```sh
cd ~/yt-studio && git pull && docker compose up -d --build
```

Schema changes ride along automatically (migrations apply on boot).

## Workers

Windows install steps for the NVIDIA laptop and gaming PC: `docs/WORKER-WINDOWS.md`.
A Hasura cron trigger calls the api's watchdog every minute (requeues jobs whose
worker died, marks silent machines offline) — nothing to set up, it ships in
`hasura/metadata`.

## Ports on the server

| Port | What | Exposure |
|---|---|---|
| 8080 | Caddy — PWA + `/v1` GraphQL + `/api` | via `tailscale serve` (and LAN) |
| 8081 | Hasura console (admin secret required) | LAN/tailnet, admin use only |
| 5432 | Postgres | workers connect over the tailnet (Phase 1) |

## Dev on the Mac

Same compose file: `.env` uses `POSTGRES_PORT=5433` (local Postgres owns 5432)
and dev-grade secrets. The Mac has the standalone `docker-compose` binary
rather than the `docker compose` plugin — same commands, one hyphen.
Local worker: `cp worker/examples/mac-dev.toml worker/worker.toml`, then
`venv/bin/pip install -e "worker[transcribe,dev]"` and
`cd worker && ../venv/bin/yt-worker`. Tests: `venv/bin/python -m pytest worker/tests api/tests`
(they need the compose stack up). Web dev loop: `cd web && npm run dev` (proxies `/v1`
and `/api` to the containers). After changing any `.graphql` document or the
DB schema: `cd web && HASURA_ADMIN_SECRET=devsecret npm run codegen` — the
generated `src/gql/generated.ts` is committed.

## Hasura workflow (schema changes)

```sh
cd hasura
hasura migrate create <name> --database-name default   # writes up/down.sql; edit them
hasura migrate apply --endpoint http://localhost:8081 --admin-secret devsecret --database-name default
# track new tables / relationships in the console, then:
hasura metadata export --endpoint http://localhost:8081 --admin-secret devsecret
git add migrations metadata
```
