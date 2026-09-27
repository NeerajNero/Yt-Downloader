update machines set capabilities = array_remove(capabilities, 'plan'), fallback = array_remove(fallback, 'plan');
