-- YT Studio v2 — Phase 0 core: machines, videos, jobs, assets.
-- (recipes/clips/ideas/posts land in their own phases.)

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table machines (
  id            uuid primary key default gen_random_uuid(),
  name          text unique not null,
  capabilities  text[] not null default '{}',
  os            text,
  tailscale_ip  inet,
  mac_address   macaddr,
  wol_via       uuid references machines(id),
  status        text not null default 'offline'
                check (status in ('online', 'offline', 'waking')),
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table videos (
  id            uuid primary key default gen_random_uuid(),
  source        text not null default 'youtube' check (source in ('youtube', 'import')),
  youtube_id    text unique,
  url           text,
  title         text not null,
  channel       text,
  duration      real,
  width         int,
  height        int,
  vcodec        text,
  size_bytes    bigint,
  storage_path  text,       -- relative to the library root; null until downloaded
  thumb_path    text,
  status        text not null default 'new'
                check (status in ('new', 'downloading', 'ready', 'failed')),
  meta          jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create table jobs (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,
  status        text not null default 'queued'
                check (status in ('queued', 'claimed', 'running', 'done',
                                  'error', 'cancelled', 'cancel_requested')),
  priority      int  not null default 100,   -- lower = sooner
  payload       jsonb not null default '{}',
  result        jsonb,
  error         text,
  progress      real,                        -- 0-100, null = indeterminate
  progress_note text,
  video_id      uuid references videos(id) on delete cascade,
  parent_job_id uuid references jobs(id),
  claimed_by    uuid references machines(id),
  claimed_at    timestamptz,
  heartbeat_at  timestamptz,
  attempts      int not null default 0,
  max_attempts  int not null default 2,
  run_after     timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index jobs_claim_idx on jobs (status, priority, created_at)
  where status = 'queued';
create index jobs_video_idx on jobs (video_id);

create trigger jobs_set_updated_at
  before update on jobs
  for each row execute function set_updated_at();

create table assets (
  id            uuid primary key default gen_random_uuid(),
  video_id      uuid not null references videos(id) on delete cascade,
  kind          text not null,
  path          text,       -- relative to the library root
  data          jsonb,      -- small payloads inline (postkit, borders, ...)
  job_id        uuid references jobs(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (video_id, kind)
);
