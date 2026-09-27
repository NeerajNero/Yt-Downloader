-- Phase 3: recipes = saved render settings (v1 presets, formalised), optionally
-- applied automatically to every suggested clip.

create table recipes (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  description text,
  settings    jsonb not null,               -- render payload minus start/end (worker schemas.RenderPayload)
  auto_apply  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger recipes_set_updated_at
  before update on recipes
  for each row execute function set_updated_at();

alter table clips add column recipe_id uuid references recipes(id) on delete set null;
create index clips_recipe_idx on clips (recipe_id);

-- The v1 preset (presets.json) becomes the first recipe.
insert into recipes (name, description, settings) values (
  'cinematic-insta-4k-no-caption-HDR',
  'v1 preset: 4K portrait, source rotated right, centre crop, HDR look, no captions',
  '{"style": "crop", "orientation": "portrait", "resolution": "4k", "rotate": "right",
    "rotate_captions": false, "vivid_amount": 0, "trim_x": 0, "trim_y": 0, "fg_crop": 0,
    "loudness": false, "zoom": "none", "look": "hdr", "look_sharp": 50, "grade": "none",
    "captions": false, "caption_source": "auto", "caption_style": "karaoke", "caption_pos": "bottom",
    "music": "", "music_gain": 60, "duck": true}'
) on conflict (name) do nothing;

insert into recipes (name, description, settings, auto_apply) values (
  'auto-shorts-default',
  'What Auto Shorts renders: blurred pad 9:16, karaoke captions when there is speech, bars trimmed',
  '{"style": "blur", "orientation": "portrait", "resolution": "1080", "captions": true,
    "caption_source": "auto", "caption_style": "karaoke", "caption_pos": "bottom",
    "trim_x": 0, "trim_y": 0, "auto_trim": true, "captions_if_speech": true}',
  true
) on conflict (name) do nothing;
