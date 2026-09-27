-- AI edit plan job: the brain plans (Gemini), the gaming PC covers.
update machines set capabilities = array_append(capabilities, 'plan') where name = 'brain' and not ('plan' = any(capabilities));
update machines set fallback = array_append(fallback, 'plan') where name = 'gaming-pc' and not ('plan' = any(fallback));
