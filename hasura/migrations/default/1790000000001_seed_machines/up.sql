-- The three machines. tailscale_ip / mac_address get filled in from the
-- dashboard (or psql) once known; the render worker's MAC is needed for WoL.
insert into machines (name, os, capabilities) values
  ('brain',         'ubuntu-server', '{download}'),
  ('nvidia-laptop', 'windows-11',    '{transcribe}'),
  ('gaming-pc',     'windows-11',    '{render,llm,download}')
on conflict (name) do nothing;
