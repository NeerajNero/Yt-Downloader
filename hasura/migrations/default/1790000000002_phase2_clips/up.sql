-- Phase 2: clips (segments of a video, proposed by AI or by hand, possibly
-- rendered) + the ideas-inbox columns on videos.

alter table videos
  add column note     text,
  add column pipeline text not null default 'none'
             check (pipeline in ('none', 'prepare', 'shorts'));

create table clips (
  id              uuid primary key default gen_random_uuid(),
  video_id        uuid not null references videos(id) on delete cascade,
  start_s         real not null,
  end_s           real not null,
  title           text,
  hook            text,
  reason          text,
  origin          text not null default 'manual'
                  check (origin in ('manual', 'ai_suggest', 'recipe')),
  status          text not null default 'proposed'
                  check (status in ('proposed', 'approved', 'rendering', 'rendered',
                                    'rejected', 'posted')),
  output_path     text,        -- rendered file, relative to the library root
  render_settings jsonb,       -- the exact render payload used
  job_id          uuid references jobs(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index clips_video_idx on clips (video_id);
create trigger clips_set_updated_at
  before update on clips
  for each row execute function set_updated_at();

alter table jobs add column clip_id uuid references clips(id) on delete set null;
create index jobs_clip_idx on jobs (clip_id);

-- Wake-on-LAN bookkeeping: when we last sent a magic packet to a machine.
alter table machines add column woken_at timestamptz;
