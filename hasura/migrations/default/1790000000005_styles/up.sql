-- Style clone: paste a Short, get its edit broken down into a report, a
-- recipe for our renderer, and DaVinci Resolve steps for the rest.
-- Idempotent (see 0002).
create table if not exists styles (
  id            uuid primary key default gen_random_uuid(),
  url           text not null,
  youtube_id    text unique,
  title         text,
  channel       text,
  duration      real,
  width         int,
  height        int,
  ref_path      text,                 -- downloaded reference, relative (<library>/.refs/<id>/ref.mp4)
  thumb_path    text,
  status        text not null default 'new'
                check (status in ('new', 'analyzing', 'ready', 'failed')),
  error         text,
  measured      jsonb,                -- ffmpeg facts: cuts, loudness, bars, ...
  report        jsonb,                -- Gemini's breakdown (captions, zooms, grade, audio, ...)
  recipe        jsonb,                -- mapped render settings (RecipeSettings shape)
  resolve_notes text,                 -- markdown: how to do the rest in DaVinci Resolve
  job_id        uuid references jobs(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
drop trigger if exists styles_set_updated_at on styles;
create trigger styles_set_updated_at
  before update on styles
  for each row execute function set_updated_at();

-- The brain analyzes styles; the gaming PC covers when it's off.
update machines set capabilities = array_append(capabilities, 'style') where name = 'brain' and not ('style' = any(capabilities));
update machines set fallback = array_append(fallback, 'style') where name = 'gaming-pc' and not ('style' = any(fallback));
