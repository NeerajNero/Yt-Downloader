-- Machines page controls who does what. `capabilities` = assigned job types
-- (edited in the PWA; worker config only seeds it on first registration),
-- `supported` = what the worker reported it can physically run, `paused` =
-- stop claiming without stopping the process.
alter table machines
  add column supported text[] not null default '{}',
  add column paused    boolean not null default false;

-- Sensible default assignment (heavy re-encodes on the gaming PC, light /
-- file-bound work on the brain, Whisper on the laptop).
update machines set capabilities = '{download,scenes,borders,suggest,postkit}' where name = 'brain';
update machines set capabilities = '{render,convert,clippack,tighten,download}' where name = 'gaming-pc';
update machines set capabilities = '{transcribe}' where name = 'nvidia-laptop';

-- Fallback assignment: job types this machine takes only when no machine that
-- has them as a primary capability is online (after a short grace period).
alter table machines add column fallback text[] not null default '{}';
update machines set fallback = '{transcribe,scenes,borders,suggest,postkit}' where name = 'gaming-pc';
