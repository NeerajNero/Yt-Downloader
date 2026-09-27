update machines set capabilities = array_remove(capabilities, 'style'), fallback = array_remove(fallback, 'style');
drop table styles;
