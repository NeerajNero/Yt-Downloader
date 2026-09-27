alter table machines drop column woken_at;
alter table jobs drop column clip_id;
drop table clips;
alter table videos drop column pipeline, drop column note;
