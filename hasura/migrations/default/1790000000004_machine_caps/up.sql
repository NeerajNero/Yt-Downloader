-- Machines page controls who does what. `capabilities` = assigned job types
-- (edited in the PWA; worker config only seeds it on first registration),
-- `supported` = what the worker reported it can physically run, `paused` =
-- stop claiming without stopping the process, `fallback` = job types this
-- machine takes only when every primary machine for them is offline.
-- Idempotent (see 0002).
alter table machines add column if not exists supported text[] not null default '{}';
alter table machines add column if not exists paused    boolean not null default false;
alter table machines add column if not exists fallback  text[] not null default '{}';

-- Sensible default assignment (heavy re-encodes on the gaming PC, light /
-- file-bound work on the brain, Whisper on the laptop).
update machines set capabilities = '{download,scenes,borders,suggest,postkit}' where name = 'brain';
update machines set capabilities = '{render,convert,clippack,tighten,download}' where name = 'gaming-pc';
update machines set capabilities = '{transcribe}' where name = 'nvidia-laptop';
update machines set fallback = '{transcribe,scenes,borders,suggest,postkit}' where name = 'gaming-pc';
